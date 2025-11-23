-- Create gmb_services table
create table gmb_services (
  id uuid default gen_random_uuid() primary key,
  location_id uuid references public.gmb_locations(id) not null,
  user_id uuid references auth.users not null,
  name text not null,
  category text not null,
  price numeric,
  currency text default 'USD',
  description text,
  duration_minutes integer,
  price_type text check (price_type in ('fixed', 'range', 'starting_at', 'free', 'unknown')) default 'fixed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table gmb_services enable row level security;

-- Create policies
create policy "Users can view their own services"
  on gmb_services for select
  using (auth.uid() = user_id);

create policy "Users can insert their own services"
  on gmb_services for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own services"
  on gmb_services for update
  using (auth.uid() = user_id);

create policy "Users can delete their own services"
  on gmb_services for delete
  using (auth.uid() = user_id);
