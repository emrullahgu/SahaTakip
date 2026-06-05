-- ====================================================================
-- Mesajlaşma tamamlama: realtime (anlık mesaj) + mesaj silme + okundu bilgisi.
-- ====================================================================

-- 1) Realtime: messages + conversations tablolarını yayına ekle (anlık güncelleme)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;

-- 2) Mesaj silme: kişi kendi mesajını siler (soft — deleted_at)
alter table public.messages add column if not exists deleted_at timestamptz;
drop policy if exists "msg_sender_update" on public.messages;
create policy "msg_sender_update" on public.messages
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- 3) Okundu takibi: katılımcının son okuduğu zaman (unread sayımı için)
alter table public.conversation_participants add column if not exists last_read_at timestamptz;
