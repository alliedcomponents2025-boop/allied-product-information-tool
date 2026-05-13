import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];

const CMC_COLLECTIONS = new Set([
  "ferrite-beads-search",
  "smd-common-mode-chokes",
  "common-mode-chokes-with-or-without-base",
  "common-mode-chokes-with-encased-core",
  "common-mode-chokes-1",
  "line-filter",
  "line-filters-current-sensing-transformers",
  "current-compensated-common-mode-chokes",
  "flat-wire-common-mode-chokes",
  "mini-radial-line-filters",
  "smd-line-filter",
]);

const INDUCTOR_COLLECTIONS = new Set([
  "inductors-search",
  "high-frequency-coils",
  "air-core",
  "wire-wound-inductors",
  "thin-film-high-srf-and-high-q",
  "multilayer-inductors-ferrite-beads",
  "through-hole-inductors-chokes-pfc-flat-wire",
  "toroidal-inductors-common-mode-chokes",
  "shielded-power-chip",
  "shielded-low-dcr",
  "shielded-low-profile",
  "shielded-flat-wire",
  "shielded-ultra-high-current",
  "shielded-multilayer",
  "shielded-dual-winding",
  "non-shielded-power",
  "power-inductors",
  "small-radial-bobbin-coils",
  "molded-chip",
  "ceramic-multilayer",
  "ferrite-core-open-type",
  "ferrite-core-open-type-low-profile",
  "axial-coated-inductors",
  "axial-power-chokes",
  "axial-molded-inductors",
  "axial-shielded-inductors",
  "axial-shielded-power-chokes",
  "axial-high-current-chokes",
  "radial-drum-core-chokes",
  "radial-shielded-bobbin-coils",
  "radial-flat-coils",
  "rod-core-high-current-chokes",
  "flat-wire-high-current-power-chokes",
  "pfc-and-other",
  "high-temperature-inductors",
  "low-loss-inductors",
  "coupled-inductors",
  "inductors-with-base",
  "standard-inductors",
  "ceramic-core-wire-wound",
  "low-resistance",
  "smd-power-inductors",
  "inductors",
]);

function classifyFamily(smartCollections) {
  if (smartCollections.includes("transformer")) return "transformers";
  if (smartCollections.includes("rj45-usb-connectors")) return "connectors";
  if (smartCollections.includes("lan-telecom-magnetics")) return "lan_magnetics";
  if (smartCollections.some((c) => CMC_COLLECTIONS.has(c))) return "common_mode_chokes";
  if (smartCollections.some((c) => INDUCTOR_COLLECTIONS.has(c))) return "inductors";
  return "other";
}

function parseArgs(argv) {
  const args = { file: "", dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      args.file = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
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

function text(value) {
  return String(value ?? "").trim();
}

function splitCsvList(value) {
  return text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickFirstFilled(row, keys) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return null;
}

function parsePrice(raw) {
  const value = text(raw);
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num === 0) return null;
  return num;
}

function parseWeight(raw) {
  const value = text(raw);
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (num === 0) return null;
  return num;
}

function mapProduct(masterRow) {
  const title = text(masterRow["Title"]);
  const handle = text(masterRow["Handle"]);
  const sku = title || handle.toUpperCase();
  const tags = splitCsvList(masterRow["Tags"]);
  const smartCollections = splitCsvList(masterRow["Smart Collections"]);
  const family = classifyFamily(smartCollections);
  const status = text(masterRow["Status"]).toLowerCase();

  return {
    family,
    shopify_product_id: text(masterRow["ID"]) || null,
    sku,
    title: title || sku,
    handle: handle || null,
    vendor: text(masterRow["Vendor"]) || "Allied Components International",
    tags,
    status: ["active", "draft", "archived"].includes(status) ? status : "draft",
    body_html: text(masterRow["Body HTML"]),
    description_meta: text(masterRow["Metafield: description_tag [string]"]) ||
      text(masterRow["Body HTML"]).replace(/<[^>]+>/g, "").slice(0, 160),
    datasheet_url: null,
    info_sheet_url: null,
    smart_collections: smartCollections,
    sync_status: "synced",
    sync_error_message: null,
    last_synced_at: new Date().toISOString(),
  };
}

function mapVariant(row, productId, position) {
  const variantSku = text(row["Option1 Value"]);
  const optionName = text(row["Option1 Name"]) || "Part Number";
  const optionValue = text(row["Option1 Value"]) || null;
  const inventoryQtyRaw = text(row["Variant Inventory Qty"]);
  const inventoryQty = inventoryQtyRaw ? Number(inventoryQtyRaw) : null;

  return {
    product_id: productId,
    shopify_variant_id: text(row["Variant ID"]) || null,
    sku: variantSku,
    option1_name: optionName,
    option1_value: optionValue,
    position: Number(row["Variant Position"]) || position,
    price: parsePrice(row["Variant Price"]),
    weight: parseWeight(row["Variant Weight"]),
    weight_unit: text(row["Variant Weight Unit"]) || "g",
    barcode: text(row["Variant Barcode"]) || null,
    inventory_qty: Number.isFinite(inventoryQty) ? inventoryQty : null,
    inductance: pickFirstFilled(row, [
      "Variant Metafield: custom.inductance [single_line_text_field]",
      "Variant Metafield: custom.inductance_20 [single_line_text_field]",
      "Variant Metafield: custom.inductance20 [single_line_text_field]",
      "Variant Metafield: custom.inductance_minimum [single_line_text_field]",
    ]),
    rated_current: pickFirstFilled(row, [
      "Variant Metafield: custom.rated_current [single_line_text_field]",
      "Variant Metafield: custom.rated_current_idc [single_line_text_field]",
      "Variant Metafield: custom.output_current [string]",
      "Variant Metafield: custom.output__current [single_line_text_field]",
    ]),
    dcr_max: pickFirstFilled(row, [
      "Variant Metafield: custom.dcr_max [single_line_text_field]",
    ]),
    height: pickFirstFilled(row, [
      "Variant Metafield: custom.height [single_line_text_field]",
    ]),
    width: pickFirstFilled(row, [
      "Variant Metafield: custom.width [single_line_text_field]",
    ]),
    length: pickFirstFilled(row, [
      "Variant Metafield: custom.length [single_line_text_field]",
    ]),
    operating_temp_range: pickFirstFilled(row, [
      "Variant Metafield: custom.op_temp_range [single_line_text_field]",
    ]),
    shielded: pickFirstFilled(row, [
      "Variant Metafield: custom.shielded [single_line_text_field]",
    ]),
    mounting_type: pickFirstFilled(row, [
      "Variant Metafield: custom.mounting_type [single_line_text_field]",
    ]),
    datasheet_url: pickFirstFilled(row, [
      "Variant Metafield: custom.datasheet_url1 [single_line_text_field]",
      "Variant Metafield: custom.datasheet_url [string]",
    ]),
    image_url: text(row["Variant Image"]) || null,
    sync_status: "synced",
    sync_error_message: null,
    last_synced_at: new Date().toISOString(),
  };
}

async function loadCsv(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, "utf8");
  return parse(content, { columns: true, skip_empty_lines: true, bom: true });
}

function groupByProduct(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const handle = text(row["Handle"]);
    if (!handle) continue;
    if (!grouped.has(handle)) {
      grouped.set(handle, { masterRow: null, variantRows: [] });
    }
    const bucket = grouped.get(handle);
    if (text(row["Top Row"]).toLowerCase() === "true") {
      bucket.masterRow = row;
    }
    bucket.variantRows.push(row);
  }
  for (const [, bucket] of grouped) {
    if (!bucket.masterRow && bucket.variantRows.length > 0) {
      bucket.masterRow = bucket.variantRows[0];
    }
  }
  return grouped;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    throw new Error("Usage: node scripts/import-shopify-csv.mjs --file <path> [--dry-run]");
  }
  ensureEnv();

  const rows = await loadCsv(args.file);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
  );

  const grouped = groupByProduct(rows);

  let productsCreated = 0;
  let productsSkipped = 0;
  let variantsCreated = 0;
  let variantsSkipped = 0;
  const errors = [];
  const familyTally = new Map();

  for (const [handle, { masterRow, variantRows }] of grouped) {
    const productPayload = mapProduct(masterRow);
    if (!productPayload.sku) {
      errors.push({ handle, scope: "product", message: "No SKU could be derived." });
      continue;
    }

    familyTally.set(productPayload.family, (familyTally.get(productPayload.family) || 0) + 1);

    let productId = null;
    const existingProduct = args.dryRun
      ? { data: null }
      : await supabase
          .from("products")
          .select("id")
          .eq("sku", productPayload.sku)
          .maybeSingle();

    if (existingProduct.data?.id) {
      productId = existingProduct.data.id;
      productsSkipped += 1;
    } else if (!args.dryRun) {
      const inserted = await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();

      if (inserted.error || !inserted.data) {
        errors.push({
          handle,
          sku: productPayload.sku,
          scope: "product",
          message: inserted.error?.message ?? "Unknown product insert error",
        });
        continue;
      }

      productId = inserted.data.id;
      productsCreated += 1;
    } else {
      productId = `dry-run-${productPayload.sku}`;
      productsCreated += 1;
    }

    let position = 0;
    for (const row of variantRows) {
      position += 1;
      const variantSku = text(row["Option1 Value"]);
      if (!variantSku) {
        continue;
      }

      const existingVariant = args.dryRun
        ? { data: null }
        : await supabase
            .from("variants")
            .select("id")
            .eq("sku", variantSku)
            .maybeSingle();

      if (existingVariant.data?.id) {
        variantsSkipped += 1;
        continue;
      }

      const variantPayload = mapVariant(row, productId, position);

      if (!args.dryRun) {
        const insertedVariant = await supabase.from("variants").insert(variantPayload);
        if (insertedVariant.error) {
          errors.push({
            handle,
            productSku: productPayload.sku,
            variantSku,
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
    totalRowsInCsv: rows.length,
    distinctProducts: grouped.size,
    productsCreated,
    productsSkipped,
    variantsCreated,
    variantsSkipped,
    familyDistribution: Object.fromEntries(familyTally),
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
