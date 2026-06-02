-- 2026-06-07 — exec_readonly_sql forbidden regex daraltma.
-- Önceki regex `\bcreate\b` gibi geniş paternler kullanıyordu;
-- `created_at` veya `create_quote` gibi gerçek SELECT'leri yanlışlıkla reddediyordu.
-- Yeni regex DDL anahtar kelimelerinin arkasına geçerli bir hedef (table/view/...) şart koşar.

create or replace function public.exec_readonly_sql(p_sql text, p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_result jsonb;
begin
  -- Trailing semicolon temizle
  v_clean := regexp_replace(p_sql, ';\s*$', '');

  -- Çoklu statement engeli
  if position(';' in v_clean) > 0 then
    raise exception 'Birden fazla statement yasak.';
  end if;

  -- SELECT veya WITH ile başlamalı
  if v_clean !~* '^\s*(select|with)\b' then
    raise exception 'Sadece SELECT/CTE destekleniyor.';
  end if;

  -- Daraltılmış yasaklı anahtar kelimeler:
  if v_clean ~* '\b(insert\s+into|update\s+\w|delete\s+from|drop\s+(table|view|index|schema|function|trigger|sequence|materialized)|truncate\s+\w|alter\s+(table|view|index|schema|function|sequence)|create\s+(table|view|index|schema|function|trigger|sequence|materialized|or\s+replace)|grant\s+\w|revoke\s+\w|merge\s+into|copy\s+\w|vacuum|call\s+\w)\b' then
    raise exception 'Yasakli anahtar kelime tespit edildi.';
  end if;

  -- Limit ekleme: zaten LIMIT varsa dokunma; yoksa LIMIT p_limit ekle
  if v_clean !~* '\blimit\s+\d+' then
    v_clean := v_clean || format(' LIMIT %s', greatest(1, least(p_limit, 200)));
  end if;

  -- Read-only — JSON dön
  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', v_clean) into v_result;

  return v_result;
end;
$$;

revoke all on function public.exec_readonly_sql(text, int) from public, anon;
grant execute on function public.exec_readonly_sql(text, int) to service_role;
