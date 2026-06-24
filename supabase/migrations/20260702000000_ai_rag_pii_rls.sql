-- =============================================================
-- ai_documents / ai_chunks / channel_messages: PII sızıntısını kapat.
-- =============================================================
-- SORUN (CRITICAL, canlı): 20260602000000_ai_rag.sql politikaları SELECT'i HER
-- authenticated kullanıcıya veriyordu (`using (true)`). RAG korpusu (ai_documents.content)
-- müşteri PII'si içeriyor: ai-rag-worker fmtCustomer vergi no/telefon/e-posta/adresi düz
-- metin yazıyor. En düşük yetkili 'field'/'viewer' hesabı bile PostgREST ile
--   select content from ai_documents
-- çalıştırıp TÜM müşteri PII'sini sızdırabiliyordu. channel_messages (WhatsApp/Gmail/gchat
-- mesaj gövdeleri) de aynı sınıf. Bu, 20260627'nin app_settings için kapattığı sızıntının
-- birebir aynısı, RAG için açık kalmıştı.
--
-- COZUM: client-doğrudan SELECT'i kısıtla. Bu korpusları YALNIZ edge fonksiyonları
-- (ai-rag / ai-rag-worker / ai-tools) service_role ile okuyor (RLS bypass) — client kodu
-- (src/) bu tablolara HİÇ doğrudan erişmiyor (grep: 0). Dolayısıyla daraltma hiçbir
-- uygulama işlevini bozmaz; bilgi-tabanı listesi zaten ai-rag edge 'list' aksiyonundan gelir.
--   * ai_documents / ai_chunks → yalnız admin (PII).
--   * channel_messages → admin + manager (operasyonel mesaj logları).

-- ai_documents — admin-only okuma
drop policy if exists ai_docs_read on public.ai_documents;
drop policy if exists ai_docs_read_admin on public.ai_documents;
create policy ai_docs_read_admin on public.ai_documents for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ai_chunks — admin-only okuma (chunk'lar ai_documents.content'in parçalarıdır)
drop policy if exists ai_chunks_read on public.ai_chunks;
drop policy if exists ai_chunks_read_admin on public.ai_chunks;
create policy ai_chunks_read_admin on public.ai_chunks for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- channel_messages — admin + manager okuma
drop policy if exists channel_msg_read on public.channel_messages;
drop policy if exists channel_msg_read_staff on public.channel_messages;
create policy channel_msg_read_staff on public.channel_messages for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')));

-- NOT: Yazma yolu değişmedi — ingest/worker service_role ile yazar (RLS bypass).
-- NOT: Bu migration öncesi korpus tüm kullanıcılara okunabildiyse, hassas müşteri verisi
-- görüntülenmiş olabilir; gerekirse korpusu yeniden üretin (ai-rag-worker yeniden ingest).
