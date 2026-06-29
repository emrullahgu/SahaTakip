-- =============================================================
-- Ofis Takip (Notion benzeri ofis çalışma alanı) — sunucu tabloları + RLS
-- =============================================================
-- Ofis ekibinin (admin/manager/engineer) ortak çalışma alanı:
--   office_pages    : iç içe sayfalar + blok editör içeriği (blocks jsonb)
--   office_boards   : kanban panolar (columns jsonb — kolon + kart)
--   office_meetings : toplantı notları (attendees + action_items jsonb)
-- Saha personeli bu modülü GÖRMEZ (uygulama sekmesi gizli) ve yazamaz (RLS).
-- Okuma tüm authenticated'a açık; yazma yalnız ofis rollerine (Kural 8 — yetkili işlem).

-- Ofis rolü kontrolü için yardımcı (tekrarı azaltır, SECURITY DEFINER değil — RLS içinde inline).
create or replace function public.is_office_member()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager', 'engineer')
  );
$$;

-- ── SAYFALAR ────────────────────────────────────────────────
create table if not exists public.office_pages (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references public.office_pages(id) on delete cascade,
  title           text not null default 'Adsız sayfa',
  icon            text not null default '📄',
  blocks          jsonb not null default '[]'::jsonb,
  is_favorite     boolean not null default false,
  archived        boolean not null default false,
  order_index     bigint not null default 0,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists office_pages_parent_idx on public.office_pages(parent_id, order_index);
create index if not exists office_pages_archived_idx on public.office_pages(archived);

alter table public.office_pages enable row level security;

drop policy if exists office_pages_read on public.office_pages;
create policy office_pages_read on public.office_pages for select to authenticated using (true);

drop policy if exists office_pages_write on public.office_pages;
create policy office_pages_write on public.office_pages for all to authenticated
  using (public.is_office_member())
  with check (public.is_office_member());

-- ── PANOLAR ─────────────────────────────────────────────────
create table if not exists public.office_boards (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'Adsız pano',
  icon            text not null default '📋',
  description     text,
  columns         jsonb not null default '[]'::jsonb,
  archived        boolean not null default false,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists office_boards_created_idx on public.office_boards(created_at desc);

alter table public.office_boards enable row level security;

drop policy if exists office_boards_read on public.office_boards;
create policy office_boards_read on public.office_boards for select to authenticated using (true);

drop policy if exists office_boards_write on public.office_boards;
create policy office_boards_write on public.office_boards for all to authenticated
  using (public.is_office_member())
  with check (public.is_office_member());

-- ── TOPLANTI NOTLARI ────────────────────────────────────────
create table if not exists public.office_meetings (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'Toplantı',
  date            date not null default current_date,
  time            text,
  attendees       jsonb not null default '[]'::jsonb,
  notes           text not null default '',
  action_items    jsonb not null default '[]'::jsonb,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists office_meetings_date_idx on public.office_meetings(date desc);

alter table public.office_meetings enable row level security;

drop policy if exists office_meetings_read on public.office_meetings;
create policy office_meetings_read on public.office_meetings for select to authenticated using (true);

drop policy if exists office_meetings_write on public.office_meetings;
create policy office_meetings_write on public.office_meetings for all to authenticated
  using (public.is_office_member())
  with check (public.is_office_member());
