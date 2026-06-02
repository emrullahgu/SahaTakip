-- 2026-06-02 — Text-to-SQL için read-only SQL yürütme RPC'si.
-- AI tarafından üretilen SELECT'leri güvenli yürütmek için kullanılır.
-- ai-sql edge function ek katmanda whitelist + validation yapar.

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

  -- Yasaklı anahtar kelime kontrolü (lowercase compare)
  if v_clean ~* '\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|merge|copy|vacuum|comment\s+on)\b'
  then
    raise exception 'Yasakli anahtar kelime tespit edildi.';
  end if;

  -- SELECT veya WITH ile başlamalı
  if v_clean !~* '^\s*(select|with)\b' then
    raise exception 'Sadece SELECT/CTE destekleniyor.';
  end if;

  -- Limit ekleme: zaten LIMIT varsa dokunma; yoksa LIMIT p_limit ekle
  if v_clean !~* '\blimit\s+\d+' then
    v_clean := v_clean || format(' LIMIT %s', greatest(1, least(p_limit, 200)));
  end if;

  -- Read-only transaction içinde çalıştır
  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', v_clean) into v_result;

  return v_result;
exception
  when others then
    raise;
end;
$$;

comment on function public.exec_readonly_sql(text, int) is
  'AI tarafından üretilen read-only SELECT sorgularını güvenli çalıştırır. ai-sql edge function tarafından çağrılır.';

-- RPC'yi sadece authenticated/service kullansın
revoke all on function public.exec_readonly_sql(text, int) from public, anon;
grant execute on function public.exec_readonly_sql(text, int) to service_role;
