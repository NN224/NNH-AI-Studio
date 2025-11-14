create table if not exists public.sync_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sync_status_user_id on public.sync_status(user_id);
create index if not exists idx_sync_status_status on public.sync_status(status);

alter table public.sync_status enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sync_status'
      and policyname = 'Users can manage their sync status rows'
  ) then
    create policy "Users can manage their sync status rows" on public.sync_status
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_sync_status_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_status_updated_at on public.sync_status;
create trigger trg_sync_status_updated_at
before update on public.sync_status
for each row
execute procedure public.set_sync_status_updated_at();

