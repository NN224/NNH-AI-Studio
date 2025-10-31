-- Migration: Create notifications table
-- Created: 2025-01-02
-- Description: Table for storing user notifications (new reviews, sync status, errors, etc.)

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('review', 'sync', 'error', 'info', 'success', 'warning')),
  title text not null,
  message text not null,
  link text,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- RLS Policies
do $$ begin
  create policy "Users can view their own notifications"
    on public.notifications
    for select
    using (auth.uid() = user_id);

  create policy "Users can insert their own notifications"
    on public.notifications
    for insert
    with check (auth.uid() = user_id);

  create policy "Users can update their own notifications"
    on public.notifications
    for update
    using (auth.uid() = user_id);

  create policy "Users can delete their own notifications"
    on public.notifications
    for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Indexes
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- Function to get unread count (for performance)
create or replace function get_unread_notifications_count(p_user_id uuid)
returns integer as $$
  select count(*)::integer
  from public.notifications
  where user_id = p_user_id and read = false;
$$ language sql security definer;

