alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Users can read their audit logs'
  ) then
    create policy "Users can read their audit logs" on public.audit_logs
      for select
      using (coalesce(user_id, auth.uid()) = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Authenticated users can append audit logs'
  ) then
    create policy "Authenticated users can append audit logs" on public.audit_logs
      for insert
      with check (auth.role() = 'authenticated');
  end if;
end
$$;

