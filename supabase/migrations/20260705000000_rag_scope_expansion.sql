-- =============================================================
-- RAG kapsam genişletme: geçmiş teklifler + web sitesi + is_public korpus
-- =============================================================
-- Faz 4: Bot "geçmiş teklifleri ve web sitesini öğrensin" gereksinimi. Şimdiye dek
-- otomatik ingest yalnız customer/work_order/sales_visit'i kapsıyordu. Burada:
--   (1) ai_ingest_queue entity_type'a 'quote','product','website' eklenir.
--   (2) quotes üzerinde RAG enqueue trigger + mevcut tekliflerin backfill'i (worker
--       fmtQuote ile kalemleri/​toplamı/​durumu metne çevirip indeksler).
--   (3) ai_documents.is_public kolonu: public web botu YALNIZ is_public=true korpustan
--       yanıt versin (müşteri PII'li iç korpus public bota sızmasın). Web sitesi içeriği
--       is_public=true; iç veriler (müşteri/iş emri/teklif) is_public=false kalır.
--   (4) match_ai_chunks_public RPC: yalnız is_public chunk'larda benzerlik araması.

-- ── (1) ingest kuyruğu kapsamı ──────────────────────────────
alter table public.ai_ingest_queue drop constraint if exists ai_ingest_queue_entity_type_check;
alter table public.ai_ingest_queue add constraint ai_ingest_queue_entity_type_check
  check (entity_type in ('customer','work_order','sales_visit','quote','product','website'));

-- ── (3) is_public korpus ayrımı ─────────────────────────────
alter table public.ai_documents add column if not exists is_public boolean not null default false;
create index if not exists ai_documents_public_idx on public.ai_documents(is_public) where is_public;

-- ── (4) public benzerlik araması (yalnız is_public) ─────────
-- Public web botu service_role ile bunu çağırır; iç korpus (PII) ASLA dönmez.
create or replace function public.match_ai_chunks_public(
  query_embedding vector(1536),
  match_count int default 6
) returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  meta jsonb,
  doc_title text,
  doc_source text
) language sql stable as $$
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.meta,
    d.title as doc_title,
    d.source as doc_source
  from public.ai_chunks c
  join public.ai_documents d on d.id = c.document_id
  where c.embedding is not null
    and d.is_public = true
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ── (2) quotes → RAG enqueue trigger ────────────────────────
-- Payload yalnız quote satırı; worker fmtQuote kalemleri (quote_lines) service_role ile
-- ayrıca çeker. soft-delete (deleted_at) UPDATE'i 'delete' op'una çevrilir ki gizlenen
-- teklif korpustan da düşsün.
create or replace function public.enqueue_quote_rag()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    values ('quote', old.id::text, 'delete', to_jsonb(old));
    return old;
  end if;
  -- soft-delete edilmiş teklif korpustan silinsin
  if (new.deleted_at is not null) then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    values ('quote', new.id::text, 'delete', to_jsonb(new));
    return new;
  end if;
  insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
  values ('quote', new.id::text, 'upsert', to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists trg_enqueue_quote_rag on public.quotes;
create trigger trg_enqueue_quote_rag
  after insert or update or delete on public.quotes
  for each row execute function public.enqueue_quote_rag();

-- ── mevcut tekliflerin backfill'i (yalnız aktif olanlar) ────
insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
select 'quote', q.id::text, 'upsert', to_jsonb(q)
from public.quotes q
where q.deleted_at is null;
