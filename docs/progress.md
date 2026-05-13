# Build Progress

## Current Phase

Phase 7 wrap up and live app smoke testing before Phase 8 Teams notifications.

## Last Updated

2026-05-14

## Completed

- Reviewed the full product directory prompt in `instruction.md`
- Scaffolded the Next.js app in this workspace
- Added the base app shell and navigation structure
- Added Supabase environment helpers and auth client scaffolding
- Added a shadcn style component baseline with a shared button component
- Added the first database migration for core schema, triggers, and RLS
- Added setup instructions for Supabase and Microsoft SSO
- Verified `npm run lint`
- Verified `npm run build`
- Added inductor product domain types, config, and mock fallback data
- Built `/products` with family tabs, search, filters, table, and pagination shell
- Built `/products/[id]` with explicit save flow, unsaved changes warning, and keyboard save shortcut
- Added server side product query helpers with live Supabase mode and mock fallback mode
- Added product save server action for product level fields
- Added variant data types, mock data, and query helpers
- Built inline variant editing on `/products/[id]`
- Added add variant and delete variant flows
- Added recent audit log preview on the product detail page
- Added product image types, mock data, and storage helper utilities
- Built image upload, replace, and delete actions
- Added image gallery and upload controls to the product detail page
- Added dashboard stats and recent activity feed
- Added quick links by product family on the dashboard
- Added bulk product selection and bulk actions on the products page
- Added bulk status change and mark for resync actions
- Added a Shopify CSV import CLI
- Added dry run mode and JSON summary output
- Added CSV import documentation and command examples
- Added sync foundation tables for settings and sync runs
- Added Shopify field mapping config for products and inductor variants
- Built the `/sync` page with settings snapshot, queue, history, and manual trigger
- Added a cron route scaffold for sync execution
- Resolved Microsoft Entra SSO blocker by rotating the Azure client secret in Supabase (2026-05-13)
- Applied both migrations to live Supabase via SQL Editor; confirmed all 7 public tables exist
- Fixed `flag_record_for_sync` trigger before applying migration 1 so sync completions are no longer overwritten back to pending
- Promoted the signed in Microsoft account to `admin` role with `display_name = Dong`

## In Progress

- Smoke testing the live app against imported data

## Recently Completed (this session, continued)

- Created the `product-images` Supabase Storage bucket (public, 20 MB limit, jpeg/png only)
- Added storage RLS policies for authenticated upload/update/delete and public read on the bucket via migration `20260514000000_phase_4_storage_policies.sql`
- Added `variants.image_url` and `product_images.source_url` columns via migration `20260514010000_variant_image_url.sql`
- Backfilled `variants.image_url` from the CSV's `Variant Image` column for 7491 of 7500 variants. The 9 unfilled variants simply have no image in Shopify. Sync queue cleaned up afterward (0 pending).
- Updated the variant editor UI to render a thumbnail preview at the top of each variant row plus an editable `image_url` input field. Threaded the field through `types.ts`, `queries.ts`, `actions.ts`, and `mock-data.ts`. Importer now maps `Variant Image` to `image_url` for future runs.

## Recently Completed (this session)

- Rewrote `scripts/import-shopify-csv.mjs` for Matrixify CSV format with family classification via Smart Collections (priority order: transformer, rj45-usb-connectors, lan-telecom-magnetics, CMC, inductor, fallback to other)
- Imported all 912 products and 7500 variants from `Products.csv` with zero errors (35 minute runtime). 22 duplicate variant SKUs were correctly auto-skipped. Family distribution: 310 inductors, 188 connectors, 187 transformers, 96 lan_magnetics, 94 common_mode_chokes, 37 other.
- Fixed an auth gating bug: `src/app/page.tsx` was re-exporting the dashboard from `(app)/page.tsx`, which bypassed the `(app)/layout.tsx` auth wrapper at the root URL. Removed the re-export so `/` now correctly resolves to `(app)/page.tsx` with the auth layout. Confirmed redirect to `/login` works in incognito.
- Hardened the auth check in `src/app/(app)/layout.tsx` to also redirect on getUser errors (not just null user), and added `export const dynamic = "force-dynamic"` so route segments are never cached across sessions.
- Backfilled `products.datasheet_url` from variant datasheets for 909 products and cleared the sync queue. Verified that `datasheet_url` is intentionally absent from the sync mapping, so empty product-level datasheet URLs were never a risk to push to Shopify.
- Identified two Shopify data hygiene issues to revisit later: (1) duplicate product listings sharing variant SKUs (`vcmb81-series` vs `vcmb81-vcmbe81-series`, `pq3225-pfc-apq3225-3840-a` vs `apq3225-3840-a`), which caused 22 variants to be silently dropped on import for the second listing; (2) one product, MLBY02 Series, has 5 variants but no datasheet metafield in Shopify so it stays blank. Not blockers for current work.

## Next Checkpoint (pick up here next session)

1. Smoke test the app at `http://localhost:3000`:
   - Confirm the dashboard stats reflect 912 products and 0 pending sync (everything was imported with sync_status synced)
   - Open one inductor product (e.g., browse to the products page, pick an SMTC or SMTC3726 series), change a field such as title or tags, save, verify the success toast and that the audit log entry shows the diff
   - Try uploading a small JPG to the product images section (this is the first time the `product-images` storage bucket will be touched; if it does not exist yet, create it in Supabase Storage as a public bucket)
   - Click into `/audit` and confirm the entry from the edit shows up
2. Verify the family filtering on `/products` works for all six tabs (only inductors had data before; now all six families have data).
3. After smoke testing succeeds, decide between:
   - Phase 8 Teams notifications
   - Polish the Phase 7 sync page copy since real Shopify sync is now wired
   - Expand the variants schema for the other five families so their family-specific specs (e.g., turns_ratio for transformers, ports for connectors) have a home (currently dropped on import)

## Current Blockers

- None. Sign in works, schema is applied, admin role is in place. Waiting on the user to point the importer at the Shopify CSV.

## Notes For Future Sessions

- This file is the persistent checkpoint log
- The main setup guide is in `docs/phase-1-setup.md`
- Database SQL lives under `supabase/migrations`
- The CSV importer (`scripts/import-shopify-csv.mjs`) requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env` (already set)
- The CSV importer is currently optimized for inductor records and may need column mapping tweaks once the real CSV is inspected
- Real Shopify sync execution is wired for existing Shopify product and variant ids; the sync trigger bug fix is part of migration 1 applied on 2026-05-13
- The Microsoft Entra fix is documented in `docs/auth-troubleshooting.md` if the symptom returns
- If image upload fails on smoke test, the `product-images` Supabase Storage bucket likely does not exist yet. Create it as a public bucket via Supabase dashboard, Storage section. Folder convention is `{family}/{sku}/{filename}`.
- The sync page (`/sync`) and the manual sync card still have stale "this phase scaffolds the workflow" copy that should be cleaned up since real Shopify sync is now wired. Treat as polish before Phase 8.
