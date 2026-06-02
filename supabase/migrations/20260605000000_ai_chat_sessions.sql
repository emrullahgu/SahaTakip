-- AI chat session persistence
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Yeni sohbet',
  pinned boolean not null default false,
  message_count int not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id bigserial primary key,
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_idx on public.ai_chat_sessions(user_id, last_message_at desc nulls last);
create index if not exists ai_chat_messages_session_idx on public.ai_chat_messages(session_id, created_at);

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists ai_chat_sessions_own on public.ai_chat_sessions;
create policy ai_chat_sessions_own on public.ai_chat_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_chat_messages_own on public.ai_chat_messages;
create policy ai_chat_messages_own on public.ai_chat_messages
  for all to authenticated
  using (exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists ai_chat_sessions_service on public.ai_chat_sessions;
create policy ai_chat_sessions_service on public.ai_chat_sessions for all to service_role using (true) with check (true);
drop policy if exists ai_chat_messages_service on public.ai_chat_messages;
create policy ai_chat_messages_service on public.ai_chat_messages for all to service_role using (true) with check (true);

-- Trigger: keep counters in sync
create or replace function public.ai_chat_messages_after_insert()
returns trigger language plpgsql as $$
begin
  update public.ai_chat_sessions
    set message_count = message_count + 1,
        last_message_at = new.created_at,
        updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists ai_chat_messages_after_insert_t on public.ai_chat_messages;
create trigger ai_chat_messages_after_insert_t
after insert on public.ai_chat_messages
for each row execute function public.ai_chat_messages_after_insert();
