-- protect_profile_privileged_cols SECURITY DEFINER oldugu icin icinde current_user her zaman
-- fonksiyon sahibi (postgres) gorunuyordu; 'authenticated' kontrolu hic tutmuyordu ve
-- giris yapmis herkes kendi profilinde role/approval_status degistirebiliyordu.
-- INVOKER yapinca PostgREST cagrilari 'authenticated' olarak gorunur ve kolonlar korunur;
-- set_user_approval gibi SECURITY DEFINER RPC'ler owner rolunde calistigi icin muaf kalir.
alter function public.protect_profile_privileged_cols() security invoker;
