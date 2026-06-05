-- ====================================================================
-- Aynı isimde tek kullanıcı: signup öncesi isim müsaitlik kontrolü.
-- RLS profiles select'i kısıtlı olduğundan anon kullanıcı doğrudan sorgulayamaz;
-- security definer RPC ile (yalnız boolean döner, veri sızdırmaz) kontrol edilir.
-- ====================================================================
create or replace function public.is_name_available(p_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles
    where lower(trim(normalize(full_name, NFC))) = lower(trim(normalize(p_name, NFC)))
  );
$$;
revoke all on function public.is_name_available(text) from public;
grant execute on function public.is_name_available(text) to anon, authenticated;
