-- ====================================================================
-- AI tabloları RLS + SECURITY DEFINER sertleştirme (üretim güvenlik denetimi)
-- ====================================================================
-- Canlı DB denetiminde bulundu:
--  1) ai_messages WITH CHECK 'true' idi → authenticated kullanıcı BAŞKASININ
--     konuşmasına (conversation_id) mesaj INSERT/UPDATE edebiliyordu. USING
--     katılımcı kontrolü yapıyor ama WITH CHECK yapmıyordu (IDOR/bütünlük).
--  2) 4 SECURITY DEFINER fonksiyonu sabit search_path olmadan tanımlıydı →
--     search_path injection: kötü niyetli kullanıcı erken bir şemaya nesne koyup
--     definer (yetkili) bağlamda çalışan fonksiyonu kaçırabilir. Davranış
--     değişmeden search_path sabitlenir (tüm referanslar zaten şema-nitelikli).
-- ====================================================================

-- 1) ai_messages: WITH CHECK USING ile aynı katılım kontrolüne çekilir.
drop policy if exists ai_msg_own on public.ai_messages;
create policy ai_msg_own on public.ai_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and (c.user_id is null or c.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and (c.user_id is null or c.user_id = auth.uid())
    )
  );

-- 2) SECURITY DEFINER fonksiyonlara sabit search_path.
--    _ai_invoke_edge net.http_post + public._ai_vault çağırır → net + public gerekir.
alter function public._ai_invoke_edge(text, jsonb) set search_path = public, net, pg_temp;
--    enqueue_* fonksiyonları yalnız public.ai_ingest_queue'ya yazar.
alter function public.enqueue_customer_rag()     set search_path = public, pg_temp;
alter function public.enqueue_sales_visit_rag()  set search_path = public, pg_temp;
alter function public.enqueue_work_order_rag()    set search_path = public, pg_temp;
