-- ============================================================================
-- GÜVENLİK: Yetki yükseltme (privilege escalation) açığını kapat
-- ----------------------------------------------------------------------------
-- Sorun: profiles_update_own politikası `for update using (id = auth.uid())`
-- olup WITH CHECK ve sütun kısıtı içermiyordu. Bu yüzden herhangi bir kullanıcı
-- doğrudan PostgREST UPDATE ile kendi satırında role='admin',
-- approval_status='approved' yazıp yetki yükseltebiliyordu (self-kayıt açık
-- olduğundan dışarıdan biri bile). Detay: SISTEM-DENETIM-RAPORU.md (Madde 1).
--
-- Çözüm: BEFORE UPDATE trigger'ı ile hassas sütunlar (role/approval_status/
-- approved_at/approved_by/rejection_reason) doğrudan client UPDATE'inde eski
-- değerlerine sabitlenir. Bu sütunlar yalnızca SECURITY DEFINER RPC'leri
-- (set_user_role / set_user_approval — içlerinde admin/manager kontrolü var)
-- üzerinden değişebilir; o fonksiyonlar owner (postgres) olarak çalıştığı için
-- current_user 'authenticated'/'anon' DEĞİLDİR ve trigger onları muaf tutar.
-- ============================================================================

create or replace function public.protect_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- PostgREST client çağrıları 'authenticated' (veya 'anon') rolüyle gelir.
  -- SECURITY DEFINER RPC'leri owner rolüyle (ör. postgres) çalışır → muaf.
  if current_user in ('authenticated', 'anon') then
    new.role             := old.role;
    new.approval_status  := old.approval_status;
    new.approved_at      := old.approved_at;
    new.approved_by      := old.approved_by;
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_cols on public.profiles;
create trigger trg_protect_profile_privileged_cols
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_cols();
