-- Araç yakıt/bakım fişi fotoğrafı için receipt_uri kolonu (POZ-DEV-061 ek)
alter table public.vehicle_logs
  add column if not exists receipt_uri text;

comment on column public.vehicle_logs.receipt_uri is
  'Yakıt/bakım fişi fotoğrafı — Supabase Storage (photos bucket) public URL veya local file:// (offline).';
