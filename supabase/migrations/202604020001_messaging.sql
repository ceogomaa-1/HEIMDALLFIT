create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  last_message_preview text,
  last_message_at timestamptz not null default now(),
  last_sender_profile_id uuid references public.profiles(id) on delete set null,
  coach_last_seen_at timestamptz,
  client_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "participants read conversations" on public.conversations
for select using (coach_id = auth.uid() or client_id = auth.uid());

create policy "participants update conversations" on public.conversations
for update using (coach_id = auth.uid() or client_id = auth.uid())
with check (coach_id = auth.uid() or client_id = auth.uid());

create policy "participants read messages" on public.messages
for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  )
);

create policy "participants insert messages" on public.messages
for insert with check (
  sender_profile_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  )
);

notify pgrst, 'reload schema';
