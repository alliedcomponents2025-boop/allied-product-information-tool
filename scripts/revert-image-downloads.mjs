// Roll back the partial Path B image download:
// 1. Restore variants.image_url to their original Shopify CDN URLs (looked up
//    from Products.csv by shopify_variant_id).
// 2. Delete every object in the product-images bucket.
// 3. Delete any product_images rows that got created (none expected since the
//    products phase never started, but we clean defensively).
// 4. Clear pending sync flags so the queue stays at 0.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);
const BUCKET = "product-images";
const SUPABASE_PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

async function fetchAll(table, select, filter) {
  const all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function listAllStorageFiles(folder = "", depth = 0) {
  if (depth > 8) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error || !data) return [];
  let out = [];
  for (const item of data) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      out = out.concat(await listAllStorageFiles(fullPath, depth + 1));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

(async () => {
  console.log("=== Step 1: Read CSV and build shopify_variant_id -> Shopify CDN URL map ===");
  const csv = fs.readFileSync("Products.csv", "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true });
  const idToOriginal = new Map();
  for (const r of rows) {
    const vid = String(r["Variant ID"] || "").trim();
    const url = String(r["Variant Image"] || "").trim();
    if (vid && url) idToOriginal.set(vid, url);
  }
  console.log(`  Map size: ${idToOriginal.size}`);

  console.log("\n=== Step 2: Find variants currently pointing to Supabase Storage ===");
  const localVariants = await fetchAll(
    "variants",
    "id,shopify_variant_id",
    (q) => q.like("image_url", `${SUPABASE_PUBLIC_PREFIX}%`),
  );
  console.log(`  Variants to restore: ${localVariants.length}`);

  console.log("\n=== Step 3: Restore Shopify CDN URLs in batches of 100 ===");
  let restored = 0;
  let unmatched = 0;
  for (let i = 0; i < localVariants.length; i += 100) {
    const batch = localVariants.slice(i, i + 100);
    await Promise.all(
      batch.map(async (v) => {
        const originalUrl = idToOriginal.get(String(v.shopify_variant_id || ""));
        if (!originalUrl) {
          unmatched += 1;
          return;
        }
        await supabase.from("variants").update({ image_url: originalUrl }).eq("id", v.id);
        restored += 1;
      }),
    );
    process.stdout.write(`\r  ${restored} restored, ${unmatched} unmatched`);
  }
  console.log();

  console.log("\n=== Step 4: Clear pending sync flags on those variants ===");
  const ids = localVariants.map((v) => v.id);
  const nowIso = new Date().toISOString();
  let cleared = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await supabase
      .from("variants")
      .update({ sync_status: "synced", last_synced_at: nowIso })
      .in("id", batch);
    cleared += batch.length;
    process.stdout.write(`\r  ${cleared}/${ids.length}`);
  }
  console.log();

  console.log("\n=== Step 5: Delete any product_images rows that were created ===");
  const pi = await fetchAll("product_images", "id");
  if (pi.length > 0) {
    console.log(`  Deleting ${pi.length} product_images rows`);
    await supabase.from("product_images").delete().in("id", pi.map((r) => r.id));
  } else {
    console.log("  No product_images rows to delete.");
  }

  console.log("\n=== Step 6: List and delete all files in the storage bucket ===");
  const files = await listAllStorageFiles();
  console.log(`  Files found in bucket: ${files.length}`);
  if (files.length > 0) {
    let deleted = 0;
    for (let i = 0; i < files.length; i += 100) {
      const batch = files.slice(i, i + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) console.error(`  Error deleting batch: ${error.message}`);
      else deleted += batch.length;
      process.stdout.write(`\r  ${deleted}/${files.length}`);
    }
    console.log();
  }

  console.log("\n=== Final verification ===");
  const [stillLocal, pendingVariants] = await Promise.all([
    supabase.from("variants").select("id", { count: "exact", head: true }).like("image_url", `${SUPABASE_PUBLIC_PREFIX}%`),
    supabase.from("variants").select("id", { count: "exact", head: true }).eq("sync_status", "pending"),
  ]);
  const remainingFiles = await listAllStorageFiles();
  console.log(`Variants still pointing to Supabase Storage: ${stillLocal.count}`);
  console.log(`Pending variants:                            ${pendingVariants.count}`);
  console.log(`Files remaining in bucket:                   ${remainingFiles.length}`);
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
