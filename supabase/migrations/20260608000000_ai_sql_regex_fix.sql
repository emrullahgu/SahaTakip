-- 2026-06-08 — exec_readonly_sql regex fix.
-- Önceki versiyonda `^\s*(select|with)\b` paterni PG'de beklenenden farklı
-- davranıyor ve "SELECT now()" gibi temel sorguları bile reddediyordu.
-- Burada başlangıç kontrolünü düz string fonksiyonlarına çeviriyor,
-- yasaklı kelime kontrolünü ARE yerine basit alternasyonla yapıyoruz.

create or replace function public.exec_readonly_sql(p_sql text, p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_lower text;
  v_result jsonb;
begin
  -- Trailing whitespace + semicolon temizle
  v_clean := regexp_replace(p_sql, ';\s*$', '');
  v_clean := btrim(v_clean);
  v_lower := lower(v_clean);

  -- Çoklu statement engeli
  if position(';' in v_clean) > 0 then
    raise exception 'Birden fazla statement yasak.';
  end if;

  -- SELECT veya WITH ile başlamalı (basit substring)
  if not (v_lower like 'select %' or v_lower like 'select(%' or v_lower = 'select' or
          v_lower like 'with %' or v_lower like 'with(%') then
    raise exception 'Sadece SELECT/CTE destekleniyor.';
  end if;

  -- Yasaklı DDL/DML kelimeleri (her biri arkasında en az bir geçerli token gerekir)
  if v_lower ~ '(^|[^a-z_])insert[[:space:]]+into[[:space:]]' or
     v_lower ~ '(^|[^a-z_])update[[:space:]]+[a-z_]' or
     v_lower ~ '(^|[^a-z_])delete[[:space:]]+from[[:space:]]' or
     v_lower ~ '(^|[^a-z_])drop[[:space:]]+(table|view|index|schema|function|trigger|sequence|materialized)[[:space:]]' or
     v_lower ~ '(^|[^a-z_])truncate[[:space:]]+[a-z_]' or
     v_lower ~ '(^|[^a-z_])alter[[:space:]]+(table|view|index|schema|function|sequence)[[:space:]]' or
     v_lower ~ '(^|[^a-z_])create[[:space:]]+(table|view|index|schema|function|trigger|sequence|materialized|or[[:space:]]+replace)[[:space:]]' or
     v_lower ~ '(^|[^a-z_])grant[[:space:]]+' or
     v_lower ~ '(^|[^a-z_])revoke[[:space:]]+' or
     v_lower ~ '(^|[^a-z_])merge[[:space:]]+into[[:space:]]' or
     v_lower ~ '(^|[^a-z_])copy[[:space:]]+' or
     v_lower ~ '(^|[^a-z_])vacuum([[:space:]]|$)' or
     v_lower ~ '(^|[^a-z_])call[[:space:]]+'
  then
    raise exception 'Yasakli anahtar kelime tespit edildi.';
  end if;

  -- Limit ekleme
  if v_lower !~ '[[:space:]]limit[[:space:]]+[0-9]+' then
    v_clean := v_clean || format(' LIMIT %s', greatest(1, least(p_limit, 200)));
  end if;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', v_clean) into v_result;
  return v_result;
end;
$$;

revoke all on function public.exec_readonly_sql(text, int) from public, anon;
grant execute on function public.exec_readonly_sql(text, int) to service_role;
