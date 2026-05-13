# Build Progress

## Current Phase

Phase 7 wrap up and live app smoke testing before Phase 8 Teams notifications.

## Last Updated

2026-05-13

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

- Importing real Shopify product data into Supabase via `scripts/import-shopify-csv.mjs`

## Next Checkpoint (pick up here next session)

1. Locate the Shopify CSV export on disk. The user will know where it lives.
2. Dry run the importer first, with the CSV path filled in:

   ```bash
   cd /Users/dongnghiem/allied-product-internal-tool && node scripts/import-shopify-csv.mjs --file <csv-path> --dry-run
   ```

3. Review the JSON summary that prints (productsCreated, variantsCreated, productsSkipped, errors). Confirm counts are in the expected ballpark (around 150 inductor products and around 2000 variants) and that the errors list is empty or only contains anomalies the user can explain.
4. If the dry run looks correct, run for real by removing the `--dry-run` flag.
5. Smoke test the app at `http://localhost:3000`:
   - Confirm the dashboard stats reflect the imported counts
   - Open one product, change a field such as title or tags, save, verify the success toast and that the audit log entry shows the diff
   - Try uploading a small JPG to the product images section (this is the first time the `product-images` storage bucket will be touched; if it does not exist yet, create it in Supabase Storage as a public bucket)
   - Click into `/audit` and confirm the entry from the edit shows up
6. After smoke testing succeeds, decide whether to start Phase 8 Teams notifications or polish the Phase 7 sync page copy first.

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
