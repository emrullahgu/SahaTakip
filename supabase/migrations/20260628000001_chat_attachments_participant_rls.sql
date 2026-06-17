-- ====================================================================
-- chat-attachments IDOR düzeltmesi — katılımcı-scope'lu storage RLS
-- ====================================================================
-- Önceki policy (20260615 chat_messaging): chat_attach_read yalnız
-- "bucket_id='chat-attachments' and auth.uid() is not null" → mesajı okuyamayan
-- biri bile altındaki dosyayı storage üzerinden signed-URL ile okuyabiliyordu.
-- messages RLS'i (msg_participant_read) zaten katılımcı-scope'lu; storage'ı aynı
-- sınıra çekiyoruz. messaging.ts: messages.attachment_url = storage object name (path).

-- READ: dosya, bir mesajın attachment_url'si ile eşleşmeli VE o mesajın
-- conversation'ına katılımcı olunmalı.
drop policy if exists "chat_attach_read" on storage.objects;
create policy "chat_attach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments' and exists (
      select 1 from public.messages m
      where m.attachment_url = storage.objects.name
        and public.is_conversation_participant(m.conversation_id)
    )
  );

-- WRITE: yükleme anında mesaj henüz yok (önce upload, sonra sendMessage). Bu yüzden
-- write'ı path-prefix=owner ile sınırla: kullanıcı yalnız kendi {uid}/ klasörüne yazar
-- (messaging.ts path daima me.id ile başlar).
drop policy if exists "chat_attach_write" on storage.objects;
create policy "chat_attach_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: kullanıcı yalnız kendi yüklediği dosyayı silebilir.
drop policy if exists "chat_attach_delete" on storage.objects;
create policy "chat_attach_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
