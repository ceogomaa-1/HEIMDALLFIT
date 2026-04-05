alter table public.coaches
add column if not exists marketplace_gallery jsonb not null default '[]'::jsonb;

alter table public.coaches
add column if not exists achievements jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
