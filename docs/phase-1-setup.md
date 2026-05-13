# Phase 1 Setup Guide

This guide covers the outside of code setup you need for Phase 1.

## 1. Create A Supabase Project

1. Sign in to Supabase
2. Create a new project
3. Choose a project name such as `allied-product-internal-tool`
4. Save the database password somewhere safe
5. After the project is ready, copy:
   - Project URL
   - Anon key
   - Service role key

Add those values to `.env.local`.

## 2. Run The Database Migration

You can run the SQL from `supabase/migrations/20260513020000_phase_1_foundation.sql` in the Supabase SQL editor.

Later, if you want, we can add the Supabase CLI and run migrations locally.

## 3. Configure Microsoft Entra ID

In Azure:

1. Go to Entra ID
2. Open App registrations
3. Create a new registration
4. Name it `Allied Product Internal Tool`
5. Set the redirect URI type to `Web`
6. Add this callback URL:

```text
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

7. Save the application
8. Copy the `Application (client) ID`
9. Create a new client secret and copy its value

## 4. Add Azure Provider In Supabase

In Supabase:

1. Open Authentication
2. Open Sign In / Providers
3. Enable Microsoft
4. Paste the Azure client ID
5. Paste the Azure client secret
6. Set scopes to `email openid profile`
7. Save

## 5. Add Allowed URLs

In Supabase authentication URL settings, add:

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - Your future production URL on Vercel

In Azure app authentication, also add:

- `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

## 6. First User Role Flow

The first time a user signs in:

- Supabase creates the auth user
- A trigger creates a `users_profile` row
- The default role is `viewer`

An admin can promote users later.

## 7. What Phase 1 Gives You

- Protected layout shell
- Dashboard placeholder
- Route structure for key pages
- Supabase auth client scaffolding
- Initial schema, triggers, and RLS policies
