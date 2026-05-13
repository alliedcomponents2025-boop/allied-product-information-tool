create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_family') then
    create type public.product_family as enum (
      'inductors',
      'common_mode_chokes',
      'transformers',
      'lan_magnetics',
      'connectors',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type public.product_status as enum ('active', 'draft', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'sync_status') then
    create type public.sync_status as enum ('pending', 'synced', 'error');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type public.audit_action as enum ('create', 'update', 'delete');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'ops', 'sales', 'viewer');
  end if;
end
$$;

create table if not exists public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  family public.product_family not null,
  shopify_product_id text unique,
  sku text not null unique,
  title text not null,
  handle text unique,
  vendor text not null default 'Allied Components International',
  tags text[] not null default '{}',
  status public.product_status not null default 'draft',
  body_html text not null default '',
  description_meta text not null default '',
  datasheet_url text,
  info_sheet_url text,
  smart_collections text[] not null default '{}',
  sync_status public.sync_status not null default 'pending',
  sync_error_message text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  last_edited_by uuid references auth.users (id)
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  shopify_variant_id text unique,
  sku text not null unique,
  option1_name text,
  option1_value text,
  position integer not null default 1,
  price numeric(12, 2),
  weight numeric(12, 3),
  weight_unit text not null default 'g',
  barcode text,
  inventory_qty integer,
  inductance text,
  rated_current text,
  dcr_max text,
  height text,
  width text,
  length text,
  operating_temp_range text,
  shielded text,
  mounting_type text,
  datasheet_url text,
  sync_status public.sync_status not null default 'pending',
  sync_error_message text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  upload_date date,
  sequence integer,
  shopify_media_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action public.audit_action not null,
  changed_fields jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users (id),
  user_email text,
  created_at timestamptz not null default now()
);

create index if not exists products_family_idx on public.products (family);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_sync_status_idx on public.products (sync_status);
create index if not exists variants_product_id_idx on public.variants (product_id);
create index if not exists variants_sync_status_idx on public.variants (sync_status);
create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (select role from public.users_profile where id = auth.uid()),
    'viewer'::public.app_role
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.flag_record_for_sync()
returns trigger
language plpgsql
as $$
declare
  meta_only boolean;
begin
  meta_only := (
    to_jsonb(new) - ARRAY['sync_status', 'sync_error_message', 'last_synced_at', 'updated_at']::text[]
  ) = (
    to_jsonb(old) - ARRAY['sync_status', 'sync_error_message', 'last_synced_at', 'updated_at']::text[]
  );

  if meta_only then
    return new;
  end if;

  new.sync_status = 'pending';
  new.sync_error_message = null;
  new.last_synced_at = null;

  if tg_table_name = 'products' then
    new.last_edited_by = auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.log_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed jsonb := '{}'::jsonb;
  key text;
  old_value jsonb;
  new_value jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, changed_fields, user_id, user_email)
    values (
      tg_table_name,
      new.id,
      'create',
      jsonb_build_object('new', to_jsonb(new)),
      auth.uid(),
      auth.jwt() ->> 'email'
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.audit_log (table_name, record_id, action, changed_fields, user_id, user_email)
    values (
      tg_table_name,
      old.id,
      'delete',
      jsonb_build_object('old', to_jsonb(old)),
      auth.uid(),
      auth.jwt() ->> 'email'
    );
    return old;
  end if;

  for key in
    select jsonb_object_keys(to_jsonb(new))
  loop
    old_value := to_jsonb(old) -> key;
    new_value := to_jsonb(new) -> key;

    if old_value is distinct from new_value then
      changed := changed || jsonb_build_object(
        key,
        jsonb_build_object('old', old_value, 'new', new_value)
      );
    end if;
  end loop;

  insert into public.audit_log (table_name, record_id, action, changed_fields, user_id, user_email)
  values (
    tg_table_name,
    new.id,
    'update',
    changed,
    auth.uid(),
    auth.jwt() ->> 'email'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_variants_updated_at on public.variants;
create trigger set_variants_updated_at
  before update on public.variants
  for each row execute procedure public.set_updated_at();

drop trigger if exists products_flag_sync on public.products;
create trigger products_flag_sync
  before update on public.products
  for each row execute procedure public.flag_record_for_sync();

drop trigger if exists variants_flag_sync on public.variants;
create trigger variants_flag_sync
  before update on public.variants
  for each row execute procedure public.flag_record_for_sync();

drop trigger if exists audit_products_changes on public.products;
create trigger audit_products_changes
  after insert or update or delete on public.products
  for each row execute procedure public.log_audit_entry();

drop trigger if exists audit_variants_changes on public.variants;
create trigger audit_variants_changes
  after insert or update or delete on public.variants
  for each row execute procedure public.log_audit_entry();

alter table public.users_profile enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_images enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "users can view profiles" on public.users_profile;
create policy "users can view profiles"
  on public.users_profile
  for select
  to authenticated
  using (true);

drop policy if exists "admins can manage profiles" on public.users_profile;
create policy "admins can manage profiles"
  on public.users_profile
  for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "authenticated can read products" on public.products;
create policy "authenticated can read products"
  on public.products
  for select
  to authenticated
  using (true);

drop policy if exists "ops and admins can insert products" on public.products;
create policy "ops and admins can insert products"
  on public.products
  for insert
  to authenticated
  with check (public.current_app_role() in ('ops', 'admin'));

drop policy if exists "sales ops admins can update products" on public.products;
create policy "sales ops admins can update products"
  on public.products
  for update
  to authenticated
  using (public.current_app_role() in ('sales', 'ops', 'admin'))
  with check (public.current_app_role() in ('sales', 'ops', 'admin'));

drop policy if exists "admins can delete products" on public.products;
create policy "admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "authenticated can read variants" on public.variants;
create policy "authenticated can read variants"
  on public.variants
  for select
  to authenticated
  using (true);

drop policy if exists "ops and admins can insert variants" on public.variants;
create policy "ops and admins can insert variants"
  on public.variants
  for insert
  to authenticated
  with check (public.current_app_role() in ('ops', 'admin'));

drop policy if exists "ops and admins can update variants" on public.variants;
create policy "ops and admins can update variants"
  on public.variants
  for update
  to authenticated
  using (public.current_app_role() in ('ops', 'admin'))
  with check (public.current_app_role() in ('ops', 'admin'));

drop policy if exists "admins can delete variants" on public.variants;
create policy "admins can delete variants"
  on public.variants
  for delete
  to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "authenticated can read product images" on public.product_images;
create policy "authenticated can read product images"
  on public.product_images
  for select
  to authenticated
  using (true);

drop policy if exists "ops and admins can manage product images" on public.product_images;
create policy "ops and admins can manage product images"
  on public.product_images
  for all
  to authenticated
  using (public.current_app_role() in ('ops', 'admin'))
  with check (public.current_app_role() in ('ops', 'admin'));

drop policy if exists "authenticated can read audit log" on public.audit_log;
create policy "authenticated can read audit log"
  on public.audit_log
  for select
  to authenticated
  using (true);

drop policy if exists "admins can manage audit log" on public.audit_log;
create policy "admins can manage audit log"
  on public.audit_log
  for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
