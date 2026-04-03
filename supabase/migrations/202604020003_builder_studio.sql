create type builder_document_kind as enum ('onboarding_form', 'diet_plan', 'training_plan');

create table if not exists public.builder_documents (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  kind builder_document_kind not null,
  theme text not null default 'obsidian',
  status text not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_documents_coach_id_idx
on public.builder_documents(coach_id, updated_at desc);

create index if not exists builder_documents_client_id_idx
on public.builder_documents(client_id);

alter table public.builder_documents enable row level security;

create policy "coach manages builder documents" on public.builder_documents
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "assigned client reads sent builder documents" on public.builder_documents
for select using (client_id = auth.uid() and status = 'sent');

notify pgrst, 'reload schema';
