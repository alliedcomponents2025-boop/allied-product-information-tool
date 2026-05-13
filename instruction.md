# Build: Allied Components Product Directory

## Context

I'm building an internal product data management tool for Allied Components International, a B2B manufacturer of magnetic components and connectors. The app will be used by our Operations and Sales teams to maintain product information that syncs to our Shopify store.

I am not a developer. I'll be vibe-coding this with your help. Explain your decisions as you go, write clean code with comments, and don't assume I know what something means. If you use a term, define it briefly the first time.

## Tech Stack

- **Frontend:** Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui components
- **Database:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Vercel (frontend) + Supabase (database)
- **Auth:** Supabase Auth with Microsoft (Entra ID/Azure AD) SSO so users sign in with their work accounts
- **File storage:** Supabase Storage for product images and datasheets

Use the latest stable versions. Use Server Components where it makes sense, Client Components where interactivity is needed.

## Core Concept

The app is a directory of products with two levels of data:
1. **Products** (parent level): things like product family, description, datasheet, images. Roughly 60 to 150 rows per product family.
2. **Variants** (child level): specific SKUs within a product, with their own specs like inductance, DCR, dimensions. Roughly 2,000 to 7,000 variants per family.

Products have many variants (one to many relationship). When viewing a product, the user sees all its variants in a table below the product details.

## Product Families

There are 6 product families, each with its own schema for variant level fields (because different magnetic components have different specs):

1. **Inductors** (power inductors, wire wound, toroidal, high frequency coils)
2. **Common Mode Chokes & EMI** (line filters, ferrite beads, common mode chokes)
3. **Transformers**
4. **LAN & Telecom Magnetics**
5. **Connectors** (RJ45, USB, others)
6. **Other**

**Start by building only the Inductors family fully.** The other 5 families will follow the same pattern but with different variant fields. Architect the code so adding a new family later is easy (e.g., variant schemas defined as configuration, not hardcoded everywhere).

## Database Schema (Supabase / Postgres)

Create these tables:

### `products` table
- `id` (uuid, primary key, auto generated)
- `family` (text, enum: 'inductors', 'common_mode_chokes', 'transformers', 'lan_magnetics', 'connectors', 'other')
- `shopify_product_id` (text, nullable, unique) the Shopify GID like `gid://shopify/Product/12345`
- `sku` (text, unique, required) the product/series identifier like "TC210"
- `title` (text, required)
- `handle` (text, unique) URL safe slug for Shopify
- `vendor` (text, default: 'Allied Components International')
- `tags` (text[], array of tags)
- `status` (text, enum: 'active', 'draft', 'archived', default: 'draft')
- `body_html` (text) product description, HTML allowed
- `description_meta` (text) short SEO description
- `datasheet_url` (text, nullable)
- `info_sheet_url` (text, nullable) internal only, not synced to Shopify
- `smart_collections` (text[])
- `sync_status` (text, enum: 'pending', 'synced', 'error', default: 'pending')
- `sync_error_message` (text, nullable)
- `last_synced_at` (timestamp, nullable)
- `created_at` (timestamp, default: now())
- `updated_at` (timestamp, default: now())
- `created_by` (uuid, references auth.users)
- `last_edited_by` (uuid, references auth.users)

### `variants` table
- `id` (uuid, primary key, auto generated)
- `product_id` (uuid, foreign key to products.id, on delete cascade)
- `shopify_variant_id` (text, nullable, unique)
- `sku` (text, unique, required) the variant SKU like "TC210-101"
- `option1_name` (text) typically "Inductance" or similar
- `option1_value` (text)
- `position` (integer, default: 1) display order
- `price` (decimal, nullable)
- `weight` (decimal, nullable)
- `weight_unit` (text, default: 'g')
- `barcode` (text, nullable)
- `inventory_qty` (integer, nullable) read only, synced FROM Shopify
- **Inductor specific spec fields:**
  - `inductance` (text)
  - `rated_current` (text)
  - `dcr_max` (text)
  - `height` (text)
  - `width` (text)
  - `length` (text)
  - `operating_temp_range` (text)
  - `shielded` (text)
  - `mounting_type` (text)
  - `datasheet_url` (text)
- `sync_status` (text, enum: 'pending', 'synced', 'error', default: 'pending')
- `sync_error_message` (text, nullable)
- `last_synced_at` (timestamp, nullable)
- `created_at` (timestamp, default: now())
- `updated_at` (timestamp, default: now())

**Note:** Store inductor specific fields directly as columns for now. Later families will use additional columns. Don't use JSONB for spec fields. Ops needs to filter and sort on them.

### `product_images` table
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key to products.id, on delete cascade)
- `storage_path` (text) path in Supabase Storage
- `original_filename` (text) like "TC210_20260513_01.jpg"
- `upload_date` (date) extracted from filename
- `sequence` (integer) extracted from filename, 1 based
- `shopify_media_id` (text, nullable) for sync tracking
- `created_at` (timestamp, default: now())

### `audit_log` table
- `id` (uuid, primary key)
- `table_name` (text) 'products' or 'variants'
- `record_id` (uuid)
- `action` (text, enum: 'create', 'update', 'delete')
- `changed_fields` (jsonb) `{field_name: {old: x, new: y}}`
- `user_id` (uuid, references auth.users)
- `user_email` (text)
- `created_at` (timestamp, default: now())

### `users_profile` table (extends Supabase auth.users)
- `id` (uuid, primary key, references auth.users.id)
- `email` (text)
- `display_name` (text)
- `role` (text, enum: 'admin', 'ops', 'sales', 'viewer', default: 'viewer')
- `created_at` (timestamp)

Set up Row Level Security (RLS) policies:
- Viewers: can SELECT all tables
- Sales: can SELECT all, can UPDATE products (specific fields like description, tags, info_sheet_url)
- Ops: can SELECT/INSERT/UPDATE all product and variant tables
- Admins: full access including DELETE

Create database triggers:
- On `products` or `variants` UPDATE: write to `audit_log` with the diff of changed fields, set `last_edited_by` to current user
- On `products` or `variants` UPDATE: set `sync_status` to 'pending' and clear `last_synced_at` so the sync job picks it up
- On `products` or `variants` INSERT: also write to audit_log

## Authentication & Permissions

- Sign in via Microsoft Entra ID SSO (Supabase Auth supports this via the Azure provider)
- First time sign in creates a `users_profile` row with role 'viewer' by default
- Admin can change roles in a settings page
- On every page, show the user's email and role in a top right nav menu with sign out

## UI Requirements

### Brand & Design
- **Brand color:** Purple `#5B2D8E` (primary), `#471C8F` (darker variant)
- Use this in headers, primary buttons, highlights. Don't overdo it. Most UI should be neutral grays/whites.
- Use Tailwind CSS with shadcn/ui components for everything
- Clean, modern, professional look. Think Linear or Notion, not Bootstrap circa 2015
- The company is referred to as **"Allied"** in UI text, never "ACI"
- Tone: professional and direct. No dashes (em or en) in any UI copy or content
- Sans serif font (Inter is fine)

### Pages & Routes

**`/` (dashboard)**
- Stats cards: total products, products pending sync, products with sync errors, recently edited
- Recent activity feed from audit_log
- Quick links to each product family list

**`/products`**
- Tabbed view by family (Inductors, Common Mode Chokes, etc.). Start with only Inductors functional
- For active family: searchable, sortable, filterable table of products
- Columns: SKU, Title, Status, Variant count, Last edited by, Last edited at, Sync status (with colored badge)
- Pagination (50 per page)
- Search by SKU or title (fuzzy)
- Filter by status, sync status, tags
- "+ New Product" button (admin/ops only)
- Bulk select with bulk actions: change status, delete, mark for re sync

**`/products/[id]` (product detail / edit page)**
- Top section: Product fields in a clean form (left column: identifiers/title/handle, right column: status/tags/dates)
- Description: rich text editor for `body_html` (use a library like Tiptap)
- Datasheet & Info Sheet: file upload fields that store to Supabase Storage and save URL
- Images section: upload zone for product images, displays existing images as thumbnails with delete buttons. Image filename auto generated from SKU + today's date + sequence number
- Variants section: table of all variants for this product, inline editable cells, "+ Add Variant" button
- Save button (top right, sticky): saves all changes in one transaction
- Audit log: collapsed section at bottom showing recent edits to this product
- Sync status banner at top: shows last sync time, errors if any, manual "Sync to Shopify Now" button (admin only)

**`/variants` (optional bulk variant view)**
- Cross product variants table for power users
- Searchable, sortable across all variants in a family
- Inline editing for spec fields
- Useful for "find all variants where inductance > 10uH"

**`/sync`**
- Shows the sync queue (records with sync_status = 'pending')
- Manual sync trigger
- Sync history (when did each sync run, how many records, any errors)
- This page is admin only

**`/settings`**
- User management (admins only): list users, change roles
- Shopify connection settings: API token, shop domain (admin only, encrypted in DB)
- Sync schedule: how often to run auto sync (default every 2 hours)

**`/audit`**
- Searchable, filterable audit log
- Filter by user, table, date range, action type
- Click row to see full diff

### Component Behaviors

- All edits autosave with debounce (1 second after last keystroke) OR have a clear "Save" button with unsaved changes warning. **Pick one approach and stick with it.** Recommend the explicit Save button for this app, since edits are deliberate.
- After save, show a toast: "Saved. Will sync to Shopify in next batch."
- Loading states everywhere (skeleton loaders, not spinners)
- Empty states with helpful copy ("No variants yet. Add one to get started.")
- Error states with retry buttons, never silent failures
- Confirm dialogs for destructive actions (delete product, delete variant)
- Keyboard shortcuts where sensible (Cmd+S to save, / to search, Esc to close dialogs)

### Mobile
- Fully responsive
- Tables collapse to card views on small screens
- Primary use case is desktop but mobile should work for quick reference

## Image Handling

- Images upload to a Supabase Storage bucket called `product-images`
- Folder structure: `{family}/{sku}/{filename}`
- On upload, filename is automatically generated as `{SKU}_{YYYYMMDD}_{NN}.{ext}` where NN is the next sequence number
- Original filename is shown to the user but stored according to the convention
- Image preview, replace, delete actions
- Max file size: 20MB per image (reject larger with friendly error)
- Allowed extensions: `.jpg`, `.jpeg`, `.png`
- Replacing an image: marks the old image's `shopify_media_id` for deletion on next sync, then uploads new

## Shopify Sync (separate concern, build this LAST)

After the main app works, add a sync job that:

1. Runs as a Vercel Cron job every 2 hours during business hours
2. Queries products and variants where `sync_status = 'pending'`
3. For each one, calls Shopify Admin GraphQL API:
   - `productUpdate` for product level fields
   - `productVariantUpdate` for variant level fields
   - `metafieldsSet` for custom metafields
   - `productCreateMedia` / `productDeleteMedia` for images
4. Handles rate limits (Shopify allows 2 requests/sec on standard plans) with a queue and 500ms delay
5. On success: updates `sync_status = 'synced'`, sets `last_synced_at`, stores any returned IDs
6. On error: sets `sync_status = 'error'`, stores the error message, sends email to admin via Resend or Supabase Edge Function
7. **Stops on first error** for that record but continues with the next record
8. **Sync direction:**
   - Most fields: app to Shopify (one way)
   - `inventory_qty`: Shopify to app (one way, read only in app)
   - Never two way sync any field
9. **Field mapping** stored as a TypeScript config object so it's easy to see what maps where. Example structure:
   ```ts
   const inductorVariantFieldMapping = {
     inductance: { shopifyType: 'metafield', namespace: 'custom', key: 'inductance' },
     rated_current: { shopifyType: 'metafield', namespace: 'custom', key: 'rated_current' },
     price: { shopifyType: 'variantField', field: 'price' },
     // etc.
   };
   ```

## Notifications

- On any product or variant change, send a Microsoft Teams notification via incoming webhook to a configured channel
- Webhook URL stored in settings table (admin can edit)
- Message format: "Dong updated TC210 Series (changed: title, datasheet_url) at 2:34 PM"
- Use Adaptive Card format for nice formatting
- This fires on database trigger or via Supabase realtime subscription. Choose the more reliable approach

## Data Import (one time)

Build a CLI script or admin page that:
1. Accepts a CSV file in the Shopify export format
2. Parses it, creating products and variants in the database
3. Skips rows that already exist (matched by SKU)
4. Reports: X products created, Y variants created, Z errors with details
5. Does NOT trigger Shopify sync (since data came from Shopify originally)

I'll use this to import ~150 inductor products and ~2,000 variants from an existing CSV.

## Development Approach

Build this in **phases**, not all at once. Confirm with me after each phase before moving to the next.

**Phase 1: Foundation (start here)**
- Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- Set up Supabase project (give me clear instructions on what to do in the Supabase dashboard)
- Create the database schema with migrations
- Set up Supabase Auth with Microsoft SSO (clear instructions for Azure AD app registration)
- Build the basic layout: sidebar nav, top bar, auth protected routes
- Confirm: "Phase 1 done, ready for Phase 2?"

**Phase 2: Products CRUD**
- Build the `/products` list page (just inductors family for now)
- Build the `/products/[id]` detail/edit page (product fields only, no variants yet)
- Confirm working before moving on

**Phase 3: Variants CRUD**
- Add the variants table on the product detail page
- Inline editing, add/delete variants
- Audit logging for changes

**Phase 4: Image handling**
- Supabase Storage setup
- Upload, display, replace, delete images on product detail page

**Phase 5: Bulk operations & dashboard**
- Dashboard stats
- Bulk select/edit on products page
- Audit log page

**Phase 6: CSV import**
- Build the one time import tool
- Test with my real data

**Phase 7: Shopify sync**
- Field mapping config
- Cron job
- Sync queue page
- Error handling and notifications

**Phase 8: Teams notifications**
- Webhook integration
- Adaptive card messages

## Constraints & Preferences

- **No dashes anywhere in UI copy or content.** Em dashes, en dashes, hyphens are all forbidden except inside technical terms like "10G Base-T" or hyphenated SKUs like "TC210-101". This is a hard rule.
- Avoid emojis in UI unless used as functional icons (status indicators)
- Date format: `May 13, 2026` or `2026-05-13`, never `05/13/26`
- Use 24 hour time format
- Prefer plain language over jargon in error messages and tooltips
- Don't add features I didn't ask for
- If you have a strong opinion about a design choice, tell me first before implementing

## What I need from you in your first response

1. Confirm you understand the scope
2. List any clarifying questions
3. List what you'll need from me to start Phase 1 (e.g., "create a Supabase account first", "have your Microsoft tenant admin ready to register an app")
4. Estimate how long Phase 1 will take
5. DO NOT start coding yet. Wait for my green light after I answer your questions.