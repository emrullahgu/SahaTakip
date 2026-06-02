-- 20260603000000_ai_ingest_queue.sql
-- Otomatik RAG akışı: customers / work_orders / sales_visits kayıtları
-- ai_ingest_queue'ya yazılır, worker edge function bunları işler.

create table if not exists public.ai_ingest_queue (
  id           bigserial primary key,
  entity_type  text not null check (entity_type in ('customer','work_order','sales_visit')),
  entity_id    text not null,
  op           text not null check (op in ('upsert','delete')),
  payload      jsonb not null default '{}'::jsonb,
  attempts     int  not null default 0,
  last_error   text,
  enqueued_at  timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists ai_ingest_queue_pending_idx
  on public.ai_ingest_queue(processed_at, enqueued_at)
  where processed_at is null;

create index if not exists ai_ingest_queue_entity_idx
  on public.ai_ingest_queue(entity_type, entity_id);

-- ───────────────────────────────────────────────────────────
-- Trigger fonksiyonları
-- ───────────────────────────────────────────────────────────
create or replace function public.enqueue_customer_rag()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    values ('customer', old.id::text, 'delete', to_jsonb(old));
    return old;
  end if;

  insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
  values ('customer', new.id::text, 'upsert', to_jsonb(new));
  return new;
end;
$$;

create or replace function public.enqueue_work_order_rag()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    values ('work_order', old.id::text, 'delete', to_jsonb(old));
    return old;
  end if;

  insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
  values ('work_order', new.id::text, 'upsert', to_jsonb(new));
  return new;
end;
$$;

create or replace function public.enqueue_sales_visit_rag()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    values ('sales_visit', old.id::text, 'delete', to_jsonb(old));
    return old;
  end if;

  insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
  values ('sales_visit', new.id::text, 'upsert', to_jsonb(new));
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────
-- Trigger'lar (idempotent)
-- ───────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customers') then
    drop trigger if exists trg_customers_rag on public.customers;
    create trigger trg_customers_rag
      after insert or update or delete on public.customers
      for each row execute function public.enqueue_customer_rag();
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='work_orders') then
    drop trigger if exists trg_work_orders_rag on public.work_orders;
    create trigger trg_work_orders_rag
      after insert or update or delete on public.work_orders
      for each row execute function public.enqueue_work_order_rag();
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='sales_visits') then
    drop trigger if exists trg_sales_visits_rag on public.sales_visits;
    create trigger trg_sales_visits_rag
      after insert or update or delete on public.sales_visits
      for each row execute function public.enqueue_sales_visit_rag();
  end if;
end $$;

-- ───────────────────────────────────────────────────────────
-- RLS: Sadece service_role görsün/yazsın.
-- ───────────────────────────────────────────────────────────
alter table public.ai_ingest_queue enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_ingest_queue' and policyname='ai_queue_service') then
    create policy ai_queue_service on public.ai_ingest_queue
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- ───────────────────────────────────────────────────────────
-- Mevcut kayıtları kuyruğa al (backfill, idempotent: zaten kuyruğa
-- girmiş entity_id'leri tekrar enqueue etmez).
-- ───────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customers') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    select 'customer', c.id::text, 'upsert', to_jsonb(c)
    from public.customers c
    where not exists (
      select 1 from public.ai_ingest_queue q
      where q.entity_type='customer' and q.entity_id = c.id::text
    );
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='work_orders') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    select 'work_order', w.id::text, 'upsert', to_jsonb(w)
    from public.work_orders w
    where not exists (
      select 1 from public.ai_ingest_queue q
      where q.entity_type='work_order' and q.entity_id = w.id::text
    );
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='sales_visits') then
    insert into public.ai_ingest_queue(entity_type, entity_id, op, payload)
    select 'sales_visit', s.id::text, 'upsert', to_jsonb(s)
    from public.sales_visits s
    where not exists (
      select 1 from public.ai_ingest_queue q
      where q.entity_type='sales_visit' and q.entity_id = s.id::text
    );
  end if;
end $$;
