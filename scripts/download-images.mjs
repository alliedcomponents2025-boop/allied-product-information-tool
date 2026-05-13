// One time backfill: download every product and variant image from Shopify CDN
// and rehost in our Supabase Storage bucket so the app becomes the source of
// truth for image bytes. Idempotent: re-running picks up where it left off by
// skipping records that already point at our storage.

import { createClient } from "@supabase/supabase-js";

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

function sanitizeForPath(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extensionFromUrlOrType(url, contentType) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const cleanUrl = String(url).split("?")[0];
  if (/\.png$/i.test(cleanUrl)) return "png";
  return "jpg";
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchAllWithPagination(table, select, filter) {
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

async function downloadAndUpload({ sourceUrl, storagePath, contentTypeOverride }) {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${sourceUrl}`);
  }
  const contentType = contentTypeOverride || res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (upload.error) {
    throw new Error(`upload failed: ${upload.error.message}`);
  }
}

function supabasePublicUrl(storagePath) {
  return `${SUPABASE_PUBLIC_PREFIX}${storagePath}`;
}

async function processVariants() {
  console.log("\n=== Variants phase ===");
  const variants = await fetchAllWithPagination(
    "variants",
    "id,sku,image_url,product_id,products(family,sku)",
    (q) => q.not("image_url", "is", null),
  );

  // Skip variants whose image_url already points at our storage
  const todo = variants.filter((v) => !String(v.image_url || "").startsWith(SUPABASE_PUBLIC_PREFIX));
  console.log(`Total variants with image_url:    ${variants.length}`);
  console.log(`Already migrated, skipping:       ${variants.length - todo.length}`);
  console.log(`To process this run:              ${todo.length}`);

  let success = 0;
  let failed = 0;
  const errSamples = [];

  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (v) => {
        const family = v.products?.family || "other";
        const productSku = sanitizeForPath(v.products?.sku || "unknown");
        const variantSku = sanitizeForPath(v.sku || v.id);
        const ext = extensionFromUrlOrType(v.image_url);
        const filename = `${variantSku}_${todayStamp()}_01.${ext}`;
        const storagePath = `${family}/${productSku}/variants/${filename}`;
        await downloadAndUpload({ sourceUrl: v.image_url, storagePath });
        const newUrl = supabasePublicUrl(storagePath);
        const { error } = await supabase.from("variants").update({ image_url: newUrl }).eq("id", v.id);
        if (error) throw new Error(`db update: ${error.message}`);
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") success += 1;
      else {
        failed += 1;
        if (errSamples.length < 5) errSamples.push(r.reason?.message ?? String(r.reason));
      }
    }
    process.stdout.write(`\r  variants: ${success} ok, ${failed} failed, ${success + failed}/${todo.length}`);
  }
  console.log();
  if (errSamples.length) {
    console.log("  Sample errors:");
    for (const e of errSamples) console.log(`    - ${e}`);
  }

  // Reset sync flags on the migrated variants so the queue stays clean
  if (success > 0) {
    console.log("  Clearing pending sync flags...");
    const ids = todo.slice(0, success).map((v) => v.id);
    const nowIso = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase
        .from("variants")
        .update({ sync_status: "synced", last_synced_at: nowIso })
        .in("id", batch);
    }
  }
}

async function processProducts() {
  console.log("\n=== Products phase ===");
  // Each product gets one hero image, taken from its lowest position variant
  // that has an image_url. We skip products that already have a product_images
  // row, so this is idempotent.
  const products = await fetchAllWithPagination("products", "id,sku,family");
  const variants = await fetchAllWithPagination(
    "variants",
    "product_id,position,image_url",
    (q) => q.not("image_url", "is", null),
  );
  const productImages = await fetchAllWithPagination("product_images", "product_id");
  const alreadyHas = new Set(productImages.map((r) => r.product_id));

  // For each product pick lowest position variant with an image
  const byProduct = new Map();
  for (const v of variants) {
    const cur = byProduct.get(v.product_id);
    if (!cur || (v.position ?? 9999) < (cur.position ?? 9999)) {
      byProduct.set(v.product_id, v);
    }
  }

  const todo = products.filter((p) => !alreadyHas.has(p.id) && byProduct.has(p.id));
  console.log(`Total products:                   ${products.length}`);
  console.log(`Already have a product_images row: ${alreadyHas.size}`);
  console.log(`To process this run:              ${todo.length}`);

  let success = 0;
  let failed = 0;
  const errSamples = [];

  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const variant = byProduct.get(p.id);
        if (!variant) throw new Error("no source variant image");
        const sourceUrl = variant.image_url;
        const family = p.family || "other";
        const productSku = sanitizeForPath(p.sku || "unknown");
        const ext = extensionFromUrlOrType(sourceUrl);
        const filename = `${productSku}_${todayStamp()}_01.${ext}`;
        const storagePath = `${family}/${productSku}/${filename}`;
        await downloadAndUpload({ sourceUrl, storagePath });
        const { error } = await supabase.from("product_images").insert({
          product_id: p.id,
          storage_path: storagePath,
          original_filename: filename,
          upload_date: new Date().toISOString().slice(0, 10),
          sequence: 1,
          source_url: sourceUrl,
        });
        if (error) throw new Error(`db insert: ${error.message}`);
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") success += 1;
      else {
        failed += 1;
        if (errSamples.length < 5) errSamples.push(r.reason?.message ?? String(r.reason));
      }
    }
    process.stdout.write(`\r  products: ${success} ok, ${failed} failed, ${success + failed}/${todo.length}`);
  }
  console.log();
  if (errSamples.length) {
    console.log("  Sample errors:");
    for (const e of errSamples) console.log(`    - ${e}`);
  }
}

async function finalSummary() {
  console.log("\n=== Final state ===");
  const [variantsWithLocal, productImagesCount, pendingVariants] = await Promise.all([
    supabase
      .from("variants")
      .select("id", { count: "exact", head: true })
      .like("image_url", `${SUPABASE_PUBLIC_PREFIX}%`),
    supabase.from("product_images").select("id", { count: "exact", head: true }),
    supabase.from("variants").select("id", { count: "exact", head: true }).eq("sync_status", "pending"),
  ]);
  console.log(`Variants with local image_url:  ${variantsWithLocal.count}`);
  console.log(`product_images rows:            ${productImagesCount.count}`);
  console.log(`Pending variants in queue:      ${pendingVariants.count}`);
}

(async () => {
  const started = Date.now();
  console.log(`Started at: ${new Date().toISOString()}`);
  await processVariants();
  await processProducts();
  await finalSummary();
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nFinished in ${minutes} minutes.`);
})().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
