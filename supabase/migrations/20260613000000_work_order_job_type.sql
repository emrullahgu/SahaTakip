-- ====================================================================
-- İş emri türü (job_type): FIELD=saha (check-in zorunlu), OFFICE=ofis,
-- REMOTE=uzaktan destek. Bölüm 3: ofis/uzaktan işler lokasyon gerektirmez.
-- ====================================================================
alter table public.work_orders
  add column if not exists job_type text not null default 'FIELD';

-- Geçerli değer kısıtı (yanlış tür yazılamaz)
do $$ begin
  alter table public.work_orders
    add constraint work_orders_job_type_chk check (job_type in ('FIELD','OFFICE','REMOTE'));
exception when duplicate_object then null; end $$;
