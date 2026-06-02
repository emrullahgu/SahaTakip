-- ============================================================
-- 2026-06-02 — AI / RAG / Channels altyapısı
-- ============================================================

-- 1) pgvector — embedding aramaları için
create extension if not exists vector;

-- 2) AI bilgi kaynakları (NotebookLM tarzı)
create table if not exists public.ai_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid,                                 -- çoklu kiracı için (null = global)
  title        text not null,
  source       text,                                 -- 'workorder' | 'quote' | 'pdf' | 'manual' | ...
  source_id   text,                                  -- ilişkili kaydın id'si (varsa)
  content      text not null,                        -- ham metin (gerekirse chunk öncesi)
  meta         jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  created_by   uuid
);
create index if not exists ai_documents_org_idx on public.ai_documents(org_id);
create index if not exists ai_documents_source_idx on public.ai_documents(source, source_id);

-- 3) Chunk + embedding (1536 boyutlu — text-embedding-3-small varsayılan)
create table if not exists public.ai_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.ai_documents(id) on delete cascade,
  chunk_index  int not null,
  content      text not null,
  tokens       int,
  embedding    vector(1536),
  meta         jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists ai_chunks_doc_idx on public.ai_chunks(document_id);
-- IVFFlat cosine — yüklendikten sonra `analyze ai_chunks;` ile iyileştirin
create index if not exists ai_chunks_embedding_idx on public.ai_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4) Sohbet geçmişi (Asistan ekranı için)
create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  title        text,
  provider     text,                                 -- 'openai'|'claude'|'gemini'|'auto'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('system','user','assistant','tool')),
  content         text,
  tool_calls      jsonb,
  tool_name       text,
  tokens_in       int,
  tokens_out      int,
  provider        text,
  model           text,
  created_at      timestamptz not null default now()
);
create index if not exists ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

-- 5) Kanal logları (WhatsApp / Gmail / Google Chat)
create table if not exists public.channel_messages (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null check (channel in ('whatsapp','gmail','gchat','sms','push')),
  direction    text not null check (direction in ('out','in')),
  to_addr      text,
  from_addr    text,
  subject      text,
  body         text,
  status       text default 'queued' check (status in ('queued','sent','delivered','read','failed')),
  provider_id  text,
  error        text,
  meta         jsonb default '{}'::jsonb,
  related_type text,                                 -- 'workorder' | 'quote' | ...
  related_id   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists channel_messages_chan_idx on public.channel_messages(channel, created_at desc);
create index if not exists channel_messages_rel_idx on public.channel_messages(related_type, related_id);

-- 6) RPC — kosinüs benzerliği araması
create or replace function public.match_ai_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  filter_org uuid default null
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
    and (filter_org is null or d.org_id is null or d.org_id = filter_org)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 7) RLS (basit — authenticated okuyabilir, service-role yazar)
alter table public.ai_documents     enable row level security;
alter table public.ai_chunks        enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages      enable row level security;
alter table public.channel_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'ai_docs_read') then
    create policy ai_docs_read on public.ai_documents for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'ai_chunks_read') then
    create policy ai_chunks_read on public.ai_chunks for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'ai_conv_own') then
    create policy ai_conv_own on public.ai_conversations for all to authenticated
      using (user_id is null or user_id = auth.uid()) with check (user_id is null or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'ai_msg_own') then
    create policy ai_msg_own on public.ai_messages for all to authenticated
      using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and (c.user_id is null or c.user_id = auth.uid())))
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'channel_msg_read') then
    create policy channel_msg_read on public.channel_messages for select to authenticated using (true);
  end if;
end $$;
