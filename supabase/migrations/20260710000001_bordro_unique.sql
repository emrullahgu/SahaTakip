-- =============================================================
-- bordro_aylik: (employee_id, period) tekilliği — aynı personel+ay tek satır
-- =============================================================
-- saveBordro upsert'i onConflict:(employee_id,period) ile çalışır; bu UNIQUE kısıt
-- mükerrer bordro satırını (maaş toplamının çift sayılması) DB düzeyinde engeller.
-- Tablo yeni oluşturulduğundan mevcut mükerrer kayıt yoktur; doğrudan eklenebilir.
create unique index if not exists bordro_aylik_emp_period_uniq
  on public.bordro_aylik(employee_id, period);
