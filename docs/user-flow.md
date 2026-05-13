# User Flow

## Simple System Flow

```text
User Browser
    |
    v
Vercel / Next.js app
    |
    +--> Supabase Auth
    |       |
    |       v
    |   Microsoft sign in
    |
    +--> Supabase Postgres
    |       |
    |       +--> products
    |       +--> variants
    |       +--> product_images
    |       +--> audit_log
    |       +--> users_profile
    |
    +--> Supabase Storage
    |       |
    |       +--> product images
    |       +--> datasheets
    |
    +--> Vercel Cron
            |
            v
        Shopify Admin API
```

## Request Flow

```text
1. User opens the app URL
2. Vercel serves the Next.js app
3. App checks Supabase session
4. If not signed in:
   Browser -> Supabase Auth -> Microsoft -> Supabase Auth -> App
5. If signed in:
   App -> Supabase Postgres -> Data returned to page
6. User edits product, variant, or image data
7. Browser sends form action to Vercel
8. Vercel writes changes to Supabase
9. Supabase triggers:
   - update timestamps
   - set sync_status to pending
   - write audit log
10. Later Vercel Cron runs sync job
11. Sync job sends pending changes to Shopify
12. Shopify result is written back to Supabase
```

## One Product Edit Example

```text
Browser
  -> open /products/TC210
  -> page rendered by Vercel
  -> product data loaded from Supabase
  -> user changes title
  -> user clicks Save
  -> server action runs on Vercel
  -> product row updated in Supabase
  -> audit log row created in Supabase
  -> sync_status becomes pending
  -> later cron sync sends change to Shopify
```
