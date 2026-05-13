-- Storage policies for the product-images bucket.
-- The bucket itself is created via the Supabase API (public bucket, 20 MB limit,
-- only jpeg and png MIME types allowed). These policies grant authenticated users
-- the ability to upload, update, and delete objects inside that bucket, plus a
-- public read policy so the storefront and other consumers can serve image URLs.

drop policy if exists "authenticated can upload to product-images" on storage.objects;
create policy "authenticated can upload to product-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "authenticated can update product-images" on storage.objects;
create policy "authenticated can update product-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "authenticated can delete product-images" on storage.objects;
create policy "authenticated can delete product-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "anyone can read product-images" on storage.objects;
create policy "anyone can read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');
