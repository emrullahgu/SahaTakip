-- ============================================================================
-- İş emri: ÇOKLU iş öncesi/sonrası foto + servis formu fotosu kalıcılığı
-- ----------------------------------------------------------------------------
-- NewServiceScreen usta'nın istediği kadar öncesi/sonrası foto + servis formu
-- fotosu yüklüyor; ancak work_orders'ta yalnız tekil before_photo/after_photo
-- vardı ve form_photo hiç kaydedilmiyordu → fazla fotolar ve servis formu fotosu
-- DB senkronunda KAYBOLUYORDU. Bu migration kalıcı kolonları ekler.
-- ============================================================================

alter table public.work_orders
  add column if not exists before_photos jsonb default '[]'::jsonb,
  add column if not exists after_photos  jsonb default '[]'::jsonb,
  add column if not exists form_photo     text;
