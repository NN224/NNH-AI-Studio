-- Create Products Table
create table if not exists public.gmb_products (
  id uuid not null default gen_random_uuid(),
  location_id uuid references public.gmb_locations(id) not null,
  user_id uuid references auth.users not null,
  name text not null,
  category text not null,
  price numeric,
  currency text default 'USD',
  description text,
  image_url text,
  product_url text,
  status text check (status in ('active', 'draft')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint gmb_products_pkey primary key (id)
);

-- Add indexes
create index if not exists idx_gmb_products_location_id on public.gmb_products(location_id);

-- Enable RLS
alter table public.gmb_products enable row level security;

-- Create Policies (Assuming authenticated users can access)
create policy "Enable read access for authenticated users"
on public.gmb_products for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.gmb_products for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on public.gmb_products for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on public.gmb_products for delete
to authenticated
using (true);
