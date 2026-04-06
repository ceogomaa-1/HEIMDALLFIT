alter table public.store_products
  add column if not exists image_url text,
  add column if not exists category text not null default 'other',
  add column if not exists inventory_count integer,
  add column if not exists inventory_unlimited boolean not null default true,
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists featured boolean not null default false,
  add column if not exists downloads_count integer not null default 0,
  add column if not exists sort_order integer not null default 0,
  add column if not exists tags text[] default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'coaching_call'
      and enumtypid = 'product_type'::regtype
  ) then
    alter type product_type add value 'coaching_call';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'bundle'
      and enumtypid = 'product_type'::regtype
  ) then
    alter type product_type add value 'bundle';
  end if;
end $$;

create or replace view public.store_analytics as
select
  sp.coach_id,
  sp.id as product_id,
  sp.title,
  sp.type,
  sp.price,
  count(o.id) as total_orders,
  coalesce(sum(o.total), 0) as total_revenue,
  count(o.id) filter (where o.status = 'completed') as completed_orders
from public.store_products sp
left join public.orders o on o.product_id = sp.id
group by sp.coach_id, sp.id, sp.title, sp.type, sp.price;

notify pgrst, 'reload schema';
