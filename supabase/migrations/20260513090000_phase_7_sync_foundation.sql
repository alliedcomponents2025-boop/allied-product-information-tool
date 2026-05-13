create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  shop_domain text,
  shopify_admin_token text,
  teams_webhook_url text,
  sync_frequency_hours integer not null default 2,
  business_hours_start integer not null default 8,
  business_hours_end integer not null default 18,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_attempted integer not null default 0,
  records_succeeded integer not null default 0,
  records_failed integer not null default 0,
  error_message text,
  trigger_source text not null default 'manual',
  created_by uuid references auth.users (id)
);

create index if not exists sync_runs_started_at_idx on public.sync_runs (started_at desc);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute procedure public.set_updated_at();

alter table public.app_settings enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "authenticated can read app settings" on public.app_settings;
create policy "authenticated can read app settings"
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists "admins can manage app settings" on public.app_settings;
create policy "admins can manage app settings"
  on public.app_settings
  for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "authenticated can read sync runs" on public.sync_runs;
create policy "authenticated can read sync runs"
  on public.sync_runs
  for select
  to authenticated
  using (true);

drop policy if exists "admins can manage sync runs" on public.sync_runs;
create policy "admins can manage sync runs"
  on public.sync_runs
  for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
