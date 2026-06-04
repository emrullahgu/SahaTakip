-- ====================================================================
-- Soft delete (deleted_at) + Mühendis (engineer) yazma/silme yetkisi
-- Bölüm 2: "Her kayıt yetkili roller (Yönetici ve Mühendis) tarafından
-- silinebilmeli. Saha personeli sadece kendi eklediğini silebilsin."
-- Hard delete yerine deleted_at damgalanır (geri alınabilir + denetlenebilir).
-- ====================================================================

-- 1) Soft-delete sütunları (nullable → mevcut veriyi bozmaz)
alter table public.customers    add column if not exists deleted_at timestamptz;
alter table public.quotes       add column if not exists deleted_at timestamptz;
alter table public.work_orders  add column if not exists deleted_at timestamptz;

create index if not exists idx_customers_deleted_at   on public.customers(deleted_at);
create index if not exists idx_quotes_deleted_at      on public.quotes(deleted_at);
create index if not exists idx_work_orders_deleted_at on public.work_orders(deleted_at);

-- 2) RLS: 'engineer' rolü de admin/manager gibi tüm kayıtları yazıp silebilir.
--    Saha (field) kullanıcısı created_by = auth.uid() ile yalnız kendi kaydını.
drop policy if exists "customers_manager_write" on public.customers;
create policy "customers_manager_write" on public.customers
  for all using (public.user_role() in ('admin','manager','engineer'));

drop policy if exists "quotes_owner_write" on public.quotes;
create policy "quotes_owner_write" on public.quotes
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager','engineer'));

drop policy if exists "quote_lines_owner_write" on public.quote_lines;
create policy "quote_lines_owner_write" on public.quote_lines
  for all using (
    exists (select 1 from public.quotes q where q.id = quote_id
            and (q.created_by = auth.uid() or public.user_role() in ('admin','manager','engineer')))
  );

drop policy if exists "wo_owner_write" on public.work_orders;
create policy "wo_owner_write" on public.work_orders
  for all using (created_by = auth.uid() or public.user_role() in ('admin','manager','engineer'));

drop policy if exists "wo_mat_owner_write" on public.work_order_materials;
create policy "wo_mat_owner_write" on public.work_order_materials
  for all using (
    exists (select 1 from public.work_orders w where w.id = work_order_id
            and (w.created_by = auth.uid() or public.user_role() in ('admin','manager','engineer')))
  );
