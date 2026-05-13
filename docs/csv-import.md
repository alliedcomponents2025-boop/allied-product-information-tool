# CSV Import

## Purpose

This project includes a one time CLI importer for Shopify export CSV files.

The script:

- reads a Shopify style CSV export
- groups rows into products and variants
- creates missing products
- creates missing variants
- skips existing product and variant SKUs
- prints a JSON summary at the end

## Command

```bash
node scripts/import-shopify-csv.mjs --file /path/to/shopify-export.csv --dry-run
```

To run the real import:

```bash
node scripts/import-shopify-csv.mjs --file /path/to/shopify-export.csv
```

Optional family override:

```bash
node scripts/import-shopify-csv.mjs --file /path/to/shopify-export.csv --family inductors
```

## Required Environment Variables

The script uses the Supabase service role so it can bypass normal app auth.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

## Safe First Run

1. Export your Shopify CSV
2. Run the importer with `--dry-run`
3. Review the JSON summary
4. If the summary looks correct, run again without `--dry-run`

## Current Mapping Notes

This first pass assumes:

- one product family per import run
- product SKU comes from `Product SKU` when available
- otherwise product SKU is derived from `Handle` or the prefix of `Variant SKU`
- inductor spec columns such as `Rated Current` or `DCR Max` may exist in custom CSV columns

## Current Limitations

- This importer is optimized for `inductors`
- It does not yet import images
- It does not yet attach datasheet files into Supabase Storage
- It uses a practical first pass field mapping and may need adjustment once we inspect your real CSV
