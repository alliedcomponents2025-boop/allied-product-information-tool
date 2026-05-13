# Allied Product Internal Tool

Internal product data management tool for Allied Components International.

## Current Status

This repo is in Phase 1 foundation work.

- Next.js app scaffolded
- Base app shell added
- Supabase helpers added
- Initial SQL migration added
- Setup guides added for Supabase and Microsoft SSO

Progress is tracked in [docs/progress.md](/Users/dongnghiem/allied-product-internal-tool/docs/progress.md).

## Stack

- Next.js 16 with App Router and TypeScript
- Tailwind CSS 4
- Supabase for Postgres, Auth, and Storage

## Local Setup

1. Copy `.env.example` to `.env.local`
2. Fill in the Supabase values
3. Install dependencies with `npm install`
4. Start the app with `npm run dev`

## Phase 1 Scope

- Project scaffold
- Protected app layout
- Supabase auth wiring
- Initial database migration
- Setup documentation for Supabase and Microsoft Entra ID

## Notes

- UI copy avoids dashes where practical. Technical identifiers such as route paths, enum values, file names, and SKUs still use standard technical naming where needed.
- Shopify sync is intentionally deferred to a later phase.
