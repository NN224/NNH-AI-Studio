```
-- Create Messages Table (for unified messaging)
create table if not exists public.gmb_messages (
  id uuid not null default gen_random_uuid(),
  location_id uuid references public.gmb_locations(id) not null,
  user_id uuid references auth.users not null,
  sender_name text not null,
  sender_avatar_url text,
  platform text check (platform in ('google', 'whatsapp', 'website')) default 'google',
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint gmb_messages_pkey primary key (id)
);

-- Add indexes
create index if not exists idx_gmb_messages_location_id on public.gmb_messages(location_id);
create index if not exists idx_gmb_messages_created_at on public.gmb_messages(created_at);

-- Enable RLS
alter table public.gmb_messages enable row level security;

-- Create Policies
create policy "Enable read access for authenticated users"
on public.gmb_messages for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.gmb_messages for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on public.gmb_messages for update
to authenticated
using (true);
