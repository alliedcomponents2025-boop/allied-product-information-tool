-- Image fields for the "store both URL and file" model.
--
-- variants.image_url:
--   Each variant in Matrixify exports carries its own Shopify CDN image URL.
--   This column stores that URL so the variant editor can render a thumbnail.
--   When we download the file into Supabase Storage in a later step, this URL
--   gets rewritten to point to the local copy.
--
-- product_images.source_url:
--   For images that originated outside the app (imported from Shopify CDN
--   during backfill), this records the original source URL as an audit trail.
--   For images uploaded directly through the app it stays null.

alter table public.variants
  add column if not exists image_url text;

alter table public.product_images
  add column if not exists source_url text;
