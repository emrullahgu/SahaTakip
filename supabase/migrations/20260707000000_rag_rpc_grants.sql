-- =============================================================
-- RAG benzerlik RPC'lerini yalnız service_role'a kilitle (derinlik savunması)
-- =============================================================
-- SORUN (adversarial inceleme Y1): Postgres'te fonksiyonlar varsayılan olarak PUBLIC
-- (anon dahil) EXECUTE ile oluşur. match_ai_chunks ve match_ai_chunks_public için REVOKE
-- yoktu → anon, publishable key ile PostgREST üzerinden /rest/v1/rpc/match_ai_chunks_public
-- çağırıp public-chat edge fn'inin captcha + IP rate-limit'ini ATLAYABİLİR (DB CPU/DoS yüzeyi).
-- Bugün PII gelmiyor (SECURITY INVOKER + ai_chunks RLS anon'a 0 satır verir) ama savunma tek
-- bir RLS politikasına bağlı kalıyordu. Public RAG yolu YALNIZ edge fn'in service_role'una ait.
--
-- NOT: İmza eşleşmesi önemli — match_ai_chunks(vector,int,uuid) 3 argümanlı (20260602),
-- match_ai_chunks_public(vector,int) 2 argümanlı (20260705).

revoke all on function public.match_ai_chunks_public(vector, int) from public, anon, authenticated;
grant execute on function public.match_ai_chunks_public(vector, int) to service_role;

revoke all on function public.match_ai_chunks(vector, int, uuid) from public, anon, authenticated;
grant execute on function public.match_ai_chunks(vector, int, uuid) to service_role;
