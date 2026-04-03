alter table public.room_join_requests
add column if not exists client_name text,
add column if not exists invite_token text unique,
add column if not exists accepted_at timestamptz,
add column if not exists client_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists room_join_requests_invite_token_idx
on public.room_join_requests(invite_token);
