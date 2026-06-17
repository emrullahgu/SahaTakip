-- ====================================================================
-- POZ-DEV-039 — Teklif -> Is Emri idempotency (cift is emri onleme)
-- ====================================================================
-- acceptQuoteAndCreateWorkOrder yalnizca LOKAL in-memory state'e bakarak
-- idempotency garanti ediyordu; iki cihaz/oturum es zamanli kabul ettiginde
-- her ikisi de farkli lokal max-sequence'ten farkli IE numarasi uretip iki
-- ayri is emri satiri yaratabiliyordu (DB seviyesinde garanti yoktu).
--
-- Cozum: work_orders'a kaynak teklif izi (source_quote_id) + partial unique
-- index. NULL kaynaklar (manuel is emirleri) kisitlanmaz; bir teklikten
-- ikinci accept 23505 (unique_violation) ile reddedilir.

alter table public.work_orders
  add column if not exists source_quote_id text;

-- NOT: prod'da mevcut cift kayit varsa once el ile tekillestirin; aksi halde
-- bu unique index olusmaz (CREATE UNIQUE INDEX hata verir).
create unique index if not exists uq_work_orders_source_quote
  on public.work_orders(source_quote_id)
  where source_quote_id is not null;
