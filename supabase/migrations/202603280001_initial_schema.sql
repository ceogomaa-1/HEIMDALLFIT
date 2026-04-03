create extension if not exists "pgcrypto";

create type profile_role as enum ('coach', 'client', 'admin');
create type client_status as enum ('pending', 'active', 'archived');
create type product_type as enum ('ebook', 'merch', 'program');
create type photo_status as enum ('queued', 'processing', 'ready', 'failed');
create type annotation_kind as enum ('arrow', 'circle', 'text');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role profile_role not null,
  full_name text not null,
  avatar_url text,
  push_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.coaches (
  id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text,
  bio text,
  specialty text,
  banner_url text,
  brand_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  room_id text not null unique check (room_id ~ '^[A-Z0-9]{8}$'),
  room_name text not null,
  brand_tagline text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  status client_status not null default 'pending',
  current_weight numeric(6,2),
  created_at timestamptz not null default now()
);

create table if not exists public.room_join_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_name text,
  client_email text,
  client_phone text,
  invite_token text unique,
  accepted_at timestamptz,
  client_profile_id uuid references public.profiles(id) on delete set null,
  status client_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_surveys (
  id uuid primary key default gen_random_uuid(),
  room_join_request_id uuid references public.room_join_requests(id) on delete cascade,
  age integer not null,
  weight numeric(6,2) not null,
  injuries text not null,
  goals text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  sport text not null,
  rounds integer,
  round_seconds integer,
  rest_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists public.program_blocks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title text not null,
  block_type text not null,
  notes text,
  video_url text,
  position integer not null default 0
);

create table if not exists public.drill_library (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  sport text not null,
  title text not null,
  description text,
  video_url text
);

create table if not exists public.weight_cut_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  target_weight numeric(6,2) not null,
  recorded_weight numeric(6,2) not null,
  water_intake_ml integer,
  sodium_mg integer,
  logged_at timestamptz not null default now()
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  original_url text not null,
  processed_url text,
  status photo_status not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.photo_annotations (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.progress_photos(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  kind annotation_kind not null,
  x numeric(6,2) not null,
  y numeric(6,2) not null,
  width numeric(6,2),
  height numeric(6,2),
  label text,
  color text default '#00A3FF',
  created_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(10,2) not null,
  stripe_price_id text,
  type product_type not null,
  asset_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  product_id uuid references public.store_products(id) on delete set null,
  stripe_checkout_session_id text,
  total numeric(10,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  stripe_subscription_id text not null,
  status text not null,
  current_period_end timestamptz
);

create table if not exists public.coach_contacts_imports (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  contact_label text not null,
  contact_email text,
  contact_phone text,
  deep_link text not null,
  fallback_url text not null,
  invite_status text not null default 'ready',
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.rooms enable row level security;
alter table public.clients enable row level security;
alter table public.room_join_requests enable row level security;
alter table public.onboarding_surveys enable row level security;
alter table public.programs enable row level security;
alter table public.drill_library enable row level security;
alter table public.weight_cut_logs enable row level security;
alter table public.progress_photos enable row level security;
alter table public.photo_annotations enable row level security;
alter table public.store_products enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.coach_contacts_imports enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "profiles self read" on public.profiles
for select using (auth.uid() = id);

create policy "coaches manage own record" on public.coaches
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "coach rooms visible to owner" on public.rooms
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "clients visible to assigned coach or self" on public.clients
for select using (coach_id = auth.uid() or id = auth.uid());

create policy "coach manages clients" on public.clients
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach manages room joins" on public.room_join_requests
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach reads onboarding surveys" on public.onboarding_surveys
for select using (
  exists (
    select 1 from public.room_join_requests r
    where r.id = room_join_request_id and r.coach_id = auth.uid()
  )
);

create policy "coach manages programs" on public.programs
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach manages drill library" on public.drill_library
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "client and coach read weight logs" on public.weight_cut_logs
for select using (
  client_id = auth.uid() or
  exists (select 1 from public.clients c where c.id = client_id and c.coach_id = auth.uid())
);

create policy "client and coach read progress photos" on public.progress_photos
for select using (
  client_id = auth.uid() or
  exists (select 1 from public.clients c where c.id = client_id and c.coach_id = auth.uid())
);

create policy "client can upload own progress photos" on public.progress_photos
for insert with check (client_id = auth.uid());

create policy "coach manages annotations" on public.photo_annotations
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach manages store products" on public.store_products
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach reads own orders" on public.orders
for select using (coach_id = auth.uid());

create policy "coach reads own subscriptions" on public.subscriptions
for select using (coach_id = auth.uid());

create policy "coach manages contact imports" on public.coach_contacts_imports
for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

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

insert into storage.buckets (id, name, public)
values
  ('progress-photos', 'progress-photos', false),
  ('drill-videos', 'drill-videos', false),
  ('marketplace-assets', 'marketplace-assets', false),
  ('coach-branding', 'coach-branding', false)
on conflict (id) do nothing;
