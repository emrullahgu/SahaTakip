-- ====================================================================
-- Araç kartına kasko ve son bakım bilgisi alanları.
-- Saha ekibi muayene/sigortaya ek olarak kaskoyu ve son bakımın
-- tarihi/km'si/yapılan işlemleri/ücretini de araç formundan girebilsin.
-- ====================================================================
alter table public.vehicles
  add column if not exists kasko_due_at      date,
  add column if not exists last_service_at   date,
  add column if not exists last_service_km   numeric,
  add column if not exists last_service_note text,
  add column if not exists last_service_cost numeric;
