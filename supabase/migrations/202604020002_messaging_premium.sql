create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_id_idx
on public.message_attachments(message_id);

alter table public.message_attachments enable row level security;

create policy "participants read message attachments" on public.message_attachments
for select using (
  exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  )
);

create policy "participants insert message attachments" on public.message_attachments
for insert with check (
  exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and m.sender_profile_id = auth.uid()
      and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'onboarding_surveys_room_join_request_id_key'
  ) then
    alter table public.onboarding_surveys
    add constraint onboarding_surveys_room_join_request_id_key unique (room_join_request_id);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do nothing;

drop policy if exists "message attachments public read" on storage.objects;
create policy "message attachments public read" on storage.objects
for select using (bucket_id = 'message-attachments');

drop policy if exists "service role manages message attachments" on storage.objects;
create policy "service role manages message attachments" on storage.objects
for all using (bucket_id = 'message-attachments' and auth.role() = 'service_role')
with check (bucket_id = 'message-attachments' and auth.role() = 'service_role');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

notify pgrst, 'reload schema';
