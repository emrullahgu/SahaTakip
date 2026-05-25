-- =====================================================================
-- SahaTakip — Storage Buckets Setup
-- Bu dosyayı Supabase Dashboard > SQL Editor'de tek seferlik çalıştırın.
-- =====================================================================
-- "photos" bucket'ı public read; foto yükleme akışları için.
-- "documents" / "signatures" / "customer-docs" private; imza/belge için.
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('photos',        'photos',        true),
  ('documents',     'documents',     false),
  ('signatures',    'signatures',    false),
  ('customer-docs', 'customer-docs', false)
on conflict (id) do update set public = excluded.public;

-- =====================================================================
-- Storage RLS — authenticated kullanıcılar yükleyebilsin, herkes okuyabilsin
-- (photos public; diğerleri auth.uid() ile sahibi okur/yazar)
-- =====================================================================

-- photos: public read, authenticated insert/update/delete
drop policy if exists "photos_read_public"    on storage.objects;
drop policy if exists "photos_write_auth"     on storage.objects;
drop policy if exists "photos_update_auth"    on storage.objects;
drop policy if exists "photos_delete_auth"    on storage.objects;

create policy "photos_read_public"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos_write_auth"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "photos_update_auth"
  on storage.objects for update
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "photos_delete_auth"
  on storage.objects for delete
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

-- documents / signatures / customer-docs: authenticated read & write
do $$
declare b text;
begin
  foreach b in array array['documents','signatures','customer-docs']
  loop
    execute format($f$ drop policy if exists "%1$s_read_auth" on storage.objects; $f$, b);
    execute format($f$ drop policy if exists "%1$s_write_auth" on storage.objects; $f$, b);
    execute format($f$ drop policy if exists "%1$s_update_auth" on storage.objects; $f$, b);
    execute format($f$ drop policy if exists "%1$s_delete_auth" on storage.objects; $f$, b);

    execute format($f$
      create policy "%1$s_read_auth"
        on storage.objects for select
        using (bucket_id = '%1$s' and auth.role() = 'authenticated');
    $f$, b);
    execute format($f$
      create policy "%1$s_write_auth"
        on storage.objects for insert
        with check (bucket_id = '%1$s' and auth.role() = 'authenticated');
    $f$, b);
    execute format($f$
      create policy "%1$s_update_auth"
        on storage.objects for update
        using (bucket_id = '%1$s' and auth.role() = 'authenticated');
    $f$, b);
    execute format($f$
      create policy "%1$s_delete_auth"
        on storage.objects for delete
        using (bucket_id = '%1$s' and auth.role() = 'authenticated');
    $f$, b);
  end loop;
end$$;
