-- Normalize images. Many products and variants share the same physical image
-- (a product family typically has one photo that every variant in the family
-- uses). Storing one row per shared image lets us dedupe, eventually download
-- each image to Supabase Storage only once, and keep references stable when
-- the underlying file moves.
--
-- Schema:
--   images
--     id           uuid primary key
--     source_url   the canonical external URL (e.g. Shopify CDN), unique
--     storage_path our local Supabase Storage path, null until downloaded
--     created_at   when the row was first seen
--
--   variants.image_id     -> images.id (one image per variant)
--   product_images.image_id -> images.id (a product can have many image rows)
--
-- We keep variants.image_url around for now as a denormalized display value;
-- code reading it continues to work unchanged. A follow up migration can drop
-- that column once readers switch to joining through images.

create table if not exists public.images (
  id           uuid primary key default gen_random_uuid(),
  source_url   text unique,
  storage_path text,
  created_at   timestamptz not null default now()
);

alter table public.variants
  add column if not exists image_id uuid references public.images (id) on delete set null;

alter table public.product_images
  add column if not exists image_id uuid references public.images (id) on delete set null;

create index if not exists variants_image_id_idx on public.variants (image_id);
create index if not exists product_images_image_id_idx on public.product_images (image_id);

alter table public.images enable row level security;

drop policy if exists "authenticated can read images" on public.images;
create policy "authenticated can read images"
  on public.images
  for select
  to authenticated
  using (true);

drop policy if exists "ops and admins can manage images" on public.images;
create policy "ops and admins can manage images"
  on public.images
  for all
  to authenticated
  using (public.current_app_role() in ('ops', 'admin'))
  with check (public.current_app_role() in ('ops', 'admin'));
