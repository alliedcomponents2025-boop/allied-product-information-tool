import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
];

function parseArgs(argv) {
  const args = {
    file: "",
    dryRun: false,
    family: "inductors",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      args.file = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--family") {
      args.family = argv[index + 1] ?? "inductors";
      index += 1;
    }
  }

  return args;
}

function ensureEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function splitTags(value) {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductSku(row) {
  const explicitSeries = normalizeText(row["Product SKU"]);

  if (explicitSeries) return explicitSeries;

  const handle = normalizeText(row["Handle"]);
  if (handle) return handle.toUpperCase().replace(/[^A-Z0-9]+/g, "");

  const variantSku = normalizeText(row["Variant SKU"]);
  if (!variantSku) return "";

  return variantSku.split("-")[0];
}

function mapProduct(row, family) {
  const sku = getProductSku(row);
  const title = normalizeText(row["Title"]) || sku;
  const handle = normalizeText(row["Handle"]) || toSlug(title || sku);

  return {
    family,
    shopify_product_id: normalizeText(row["Product ID"]) || null,
    sku,
    title,
    handle: handle || null,
    vendor:
      normalizeText(row["Vendor"]) || "Allied Components International",
    tags: splitTags(row["Tags"]),
    status: normalizeText(row["Status"]).toLowerCase() || "draft",
    body_html: normalizeText(row["Body (HTML)"]),
    description_meta:
      normalizeText(row["SEO Description"]) ||
      normalizeText(row["Body (HTML)"]).replace(/<[^>]+>/g, "").slice(0, 160),
    datasheet_url: normalizeText(row["Variant Tax Code"]) || null,
    info_sheet_url: null,
    smart_collections: [],
    sync_status: "synced",
    sync_error_message: null,
    last_synced_at: null,
  };
}

function mapVariant(row, productId) {
  const variantSku = normalizeText(row["Variant SKU"]);

  return {
    product_id: productId,
    shopify_variant_id: normalizeText(row["Variant ID"]) || null,
    sku: variantSku,
    option1_name: normalizeText(row["Option1 Name"]) || "Inductance",
    option1_value: normalizeText(row["Option1 Value"]) || null,
    position: Number(row["Variant Position"] || row["Variant Grams"] || 1),
    price: normalizeText(row["Variant Price"]) || null,
    weight: normalizeText(row["Variant Grams"]) || null,
    weight_unit: "g",
    barcode: normalizeText(row["Variant Barcode"]) || null,
    inventory_qty: row["Variant Inventory Qty"]
      ? Number(row["Variant Inventory Qty"])
      : null,
    inductance:
      normalizeText(row["Option1 Value"]) ||
      normalizeText(row["Inductance"]) ||
      null,
    rated_current: normalizeText(row["Rated Current"]) || null,
    dcr_max: normalizeText(row["DCR Max"]) || null,
    height: normalizeText(row["Height"]) || null,
    width: normalizeText(row["Width"]) || null,
    length: normalizeText(row["Length"]) || null,
    operating_temp_range: normalizeText(row["Operating Temp Range"]) || null,
    shielded: normalizeText(row["Shielded"]) || null,
    mounting_type: normalizeText(row["Mounting Type"]) || null,
    datasheet_url: normalizeText(row["Variant Tax Code"]) || null,
    sync_status: "synced",
    sync_error_message: null,
    last_synced_at: null,
  };
}

async function loadCsv(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    throw new Error("Usage: node scripts/import-shopify-csv.mjs --file <path> [--dry-run] [--family inductors]");
  }

  ensureEnv();

  const rows = await loadCsv(args.file);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
  );

  const grouped = new Map();

  for (const row of rows) {
    const productSku = getProductSku(row);
    const variantSku = normalizeText(row["Variant SKU"]);

    if (!productSku || !variantSku) {
      continue;
    }

    if (!grouped.has(productSku)) {
      grouped.set(productSku, []);
    }

    grouped.get(productSku).push(row);
  }

  let productsCreated = 0;
  let variantsCreated = 0;
  let skippedProducts = 0;
  const errors = [];

  for (const [productSku, productRows] of grouped.entries()) {
    const firstRow = productRows[0];
    const productPayload = mapProduct(firstRow, args.family);

    const existingProduct = await supabase
      .from("products")
      .select("id,sku")
      .eq("sku", productSku)
      .maybeSingle();

    let productId = existingProduct.data?.id ?? null;

    if (!productId) {
      if (!args.dryRun) {
        const inserted = await supabase
          .from("products")
          .insert(productPayload)
          .select("id")
          .single();

        if (inserted.error || !inserted.data) {
          errors.push({
            sku: productSku,
            scope: "product",
            message: inserted.error?.message ?? "Unknown product insert error",
          });
          continue;
        }

        productId = inserted.data.id;

        await supabase
          .from("products")
          .update({
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", productId);
      } else {
        productId = `dry-run-${productSku}`;
      }

      productsCreated += 1;
    } else {
      skippedProducts += 1;
    }

    for (const row of productRows) {
      const variantSku = normalizeText(row["Variant SKU"]);
      const existingVariant = await supabase
        .from("variants")
        .select("id,sku")
        .eq("sku", variantSku)
        .maybeSingle();

      if (existingVariant.data?.id) {
        continue;
      }

      const variantPayload = mapVariant(row, productId);

      if (!args.dryRun) {
        const insertedVariant = await supabase.from("variants").insert(variantPayload);

        if (insertedVariant.error) {
          errors.push({
            sku: variantSku,
            scope: "variant",
            message: insertedVariant.error.message,
          });
          continue;
        }
      }

      variantsCreated += 1;
    }
  }

  const summary = {
    file: args.file,
    dryRun: args.dryRun,
    family: args.family,
    totalRows: rows.length,
    groupedProducts: grouped.size,
    productsCreated,
    variantsCreated,
    skippedProducts,
    errors,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
