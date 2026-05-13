# Auth Troubleshooting

## Current Status

Microsoft Entra sign in is working as of 2026-05-13.

## Root Cause

The `Unable to exchange external code: 1.AR` error was caused by a stale or invalid
Azure client secret stored in the Supabase Azure provider. The original secret value
either expired, was rotated in Azure without being updated in Supabase, or was never
copied correctly from Azure's one time reveal.

## Fix

1. Azure portal → App registrations → the project app → Certificates & secrets
2. Client secrets tab → + New client secret
3. Copy the Value column immediately (not the Secret ID)
4. Supabase dashboard → Authentication → Providers → Azure (or Microsoft Entra)
5. Paste into the Secret Value field
6. Save

## How To Read The Original Symptom

The browser landed at:

```text
http://localhost:3000/#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%253A+1.AR&sb=
```

Translation:

- The `#` (hash fragment, not query string) means Supabase could not give the app a
  code to exchange. It bounced back to the Site URL with the error.
- `1.AR` is the start of the Azure authorization code Supabase received.
- The failure occurred when Supabase POSTed that code to Azure's token endpoint and
  Azure rejected it.

So Microsoft sign in itself succeeded. Azure handed Supabase a code. Supabase failed
to trade that code for a token because Azure rejected the request, almost always due
to a wrong client secret on Supabase's side.

## Diagnostic Order For Future Cases

If this error appears again:

1. Rotate the Azure client secret first. This fixes about 90% of cases.
2. Verify the Azure URL field in Supabase matches the Azure app's supported account
   type. Use `https://login.microsoftonline.com/<tenant-id>` for single tenant or
   `https://login.microsoftonline.com/common` for multi tenant.
3. Verify the Azure client ID in Supabase matches the Application (client) ID in
   Azure.
4. If you have access, check Azure portal → Microsoft Entra ID → Monitoring →
   Sign in logs → Service principal sign ins. The AADSTS code in the failure reason
   is the exact cause.
5. Supabase Auth Logs at
   `https://supabase.com/dashboard/project/<ref>/logs/auth-logs` can also surface
   the error if Azure's logs are not accessible.

## Notes

- Azure shows client secret values only once at creation. Always copy the Value
  column, never the Secret ID column.
- The Azure redirect URI for this project is
  `https://yiyudiqjehdqxjishclr.supabase.co/auth/v1/callback`.
- The app requests `openid profile email` scopes.
- Azure ID token optional claims are configured for `email` and
  `preferred_username`.
