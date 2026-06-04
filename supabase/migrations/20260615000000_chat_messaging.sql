-- ====================================================================
-- #4: Kullanıcılar arası + toplu (grup) mesajlaşma + dosya ekleri.
-- conversations (sohbet) · conversation_participants (katılımcılar) · messages.
-- RLS: yalnız katılımcılar okur/yazar. Ekler chat-attachments bucket'ında.
-- ====================================================================

-- Sohbetler
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,                          -- grup adı (birebir sohbette null)
  is_group boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

-- Katılımcılar
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  added_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_convparts_user on public.conversation_participants(user_id);

-- Mesajlar
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  body text,
  attachment_url text,                 -- chat-attachments içindeki dosya yolu (path)
  attachment_type text,                -- image | pdf | file
  attachment_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- Katılımcı mı? (security definer → RLS recursion'ı önler)
create or replace function public.is_conversation_participant(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants p
                 where p.conversation_id = conv and p.user_id = auth.uid());
$$;
revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- conversations: katılımcı veya oluşturan görür; herkes oluşturabilir
drop policy if exists "conv_participant_read" on public.conversations;
create policy "conv_participant_read" on public.conversations
  for select using (public.is_conversation_participant(id) or created_by = auth.uid());
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_insert" on public.conversations
  for insert with check (created_by = auth.uid());
drop policy if exists "conv_participant_update" on public.conversations;
create policy "conv_participant_update" on public.conversations
  for update using (public.is_conversation_participant(id) or created_by = auth.uid());

-- participants: katılımcı listeyi görür; oluşturan ekler / kişi kendini ekleyebilir
drop policy if exists "convpart_read" on public.conversation_participants;
create policy "convpart_read" on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id) or user_id = auth.uid());
drop policy if exists "convpart_insert" on public.conversation_participants;
create policy "convpart_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );
drop policy if exists "convpart_delete" on public.conversation_participants;
create policy "convpart_delete" on public.conversation_participants
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

-- messages: katılımcı okur; katılımcı kendi adına yazar
drop policy if exists "msg_participant_read" on public.messages;
create policy "msg_participant_read" on public.messages
  for select using (public.is_conversation_participant(conversation_id));
drop policy if exists "msg_participant_insert" on public.messages;
create policy "msg_participant_insert" on public.messages
  for insert with check (public.is_conversation_participant(conversation_id) and sender_id = auth.uid());

-- ekler için bucket (private) + authenticated okuma/yazma
insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', false)
  on conflict (id) do nothing;
drop policy if exists "chat_attach_read" on storage.objects;
create policy "chat_attach_read" on storage.objects
  for select using (bucket_id = 'chat-attachments' and auth.uid() is not null);
drop policy if exists "chat_attach_write" on storage.objects;
create policy "chat_attach_write" on storage.objects
  for insert with check (bucket_id = 'chat-attachments' and auth.uid() is not null);
