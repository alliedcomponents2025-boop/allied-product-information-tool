// Download the 909 unique images from Shopify CDN into Supabase Storage.
// Works through the images table: for each row with storage_path IS NULL,
// fetch its source_url, upload, set storage_path. Then update all references:
//   - product_images.storage_path  -> matches images.storage_path
//   - variants.image_url           -> Supabase public URL for the new file
// Idempotent: re-running picks up only rows that still have a null
// storage_path.

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
const PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

function publicUrlOf(storagePath) {
  return `${PUBLIC_PREFIX}${storagePath}`;
}

function extensionFromUrlOrType(url, contentType) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const clean = String(url).split("?")[0];
  if (/\.png$/i.test(clean)) return "png";
  return "jpg";
}

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

async function processOne(image) {
  const res = await fetch(image.source_url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${image.source_url}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = extensionFromUrlOrType(image.source_url, contentType);
  const storagePath = `shared/${image.id}.${ext}`;
  const bytes = await res.arrayBuffer();

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (upload.error) throw new Error(`upload: ${upload.error.message}`);

  const { error: imgErr } = await supabase
    .from("images")
    .update({ storage_path: storagePath })
    .eq("id", image.id);
  if (imgErr) throw new Error(`images update: ${imgErr.message}`);

  const publicUrl = publicUrlOf(storagePath);

  // Update all variants pointing at this image
  const { error: varErr } = await supabase
    .from("variants")
    .update({ image_url: publicUrl })
    .eq("image_id", image.id);
  if (varErr) throw new Error(`variants update: ${varErr.message}`);

  // Update all product_images pointing at this image
  const { error: piErr } = await supabase
    .from("product_images")
    .update({ storage_path: storagePath })
    .eq("image_id", image.id);
  if (piErr) throw new Error(`product_images update: ${piErr.message}`);
}

(async () => {
  const started = Date.now();
  console.log(`Started: ${new Date().toISOString()}`);

  const todo = await fetchAll(
    "images",
    "id,source_url",
    (q) => q.is("storage_path", null),
  );
  console.log(`Images to download this run: ${todo.length}`);

  let ok = 0;
  let failed = 0;
  const errSamples = [];

  // Parallel batches of 5 so we don't hammer Shopify CDN
  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(processOne));
    for (const r of results) {
      if (r.status === "fulfilled") ok += 1;
      else {
        failed += 1;
        if (errSamples.length < 5) errSamples.push(r.reason?.message ?? String(r.reason));
      }
    }
    process.stdout.write(`\r  ${ok} ok, ${failed} failed, ${ok + failed}/${todo.length}`);
  }
  console.log();
  if (errSamples.length) {
    console.log("Sample errors:");
    for (const e of errSamples) console.log(`  - ${e}`);
  }

  // Clear any pending sync flags caused by the variant updates
  console.log("\nClearing pending sync flags on variants...");
  const { count: pending } = await supabase
    .from("variants")
    .select("id", { count: "exact", head: true })
    .eq("sync_status", "pending");
  if (pending && pending > 0) {
    const pendingVars = await fetchAll("variants", "id", (q) => q.eq("sync_status", "pending"));
    const ids = pendingVars.map((v) => v.id);
    const nowIso = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase
        .from("variants")
        .update({ sync_status: "synced", last_synced_at: nowIso })
        .in("id", batch);
    }
    console.log(`  Cleared ${ids.length} pending variants`);
  } else {
    console.log("  No pending variants to clear.");
  }

  // Final stats
  console.log("\nFinal state:");
  const [imgsTotal, imgsLocal, piWithPath, varsLocal] = await Promise.all([
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }).not("storage_path", "is", null),
    supabase.from("product_images").select("id", { count: "exact", head: true }).like("storage_path", "shared/%"),
    supabase.from("variants").select("id", { count: "exact", head: true }).like("image_url", `${PUBLIC_PREFIX}%`),
  ]);
  console.log(`  images rows total:                       ${imgsTotal.count}`);
  console.log(`  images with storage_path set:            ${imgsLocal.count}`);
  console.log(`  product_images with shared/* path:       ${piWithPath.count}`);
  console.log(`  variants with Supabase image_url:        ${varsLocal.count}`);

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nFinished in ${minutes} minutes.`);
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
