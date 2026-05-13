// Populate the new images table by deduplicating variants.image_url. Then link
// variants.image_id to the matching image row, and create one product_images
// row per product pointing at that product's hero image (the lowest-position
// variant's image).

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

(async () => {
  console.log("=== Step 1: Fetch all variants with image_url ===");
  const variants = await fetchAll(
    "variants",
    "id,product_id,position,image_url",
    (q) => q.not("image_url", "is", null),
  );
  console.log(`  ${variants.length} variants with image_url`);

  const uniqueUrls = [...new Set(variants.map((v) => v.image_url))];
  console.log(`  ${uniqueUrls.length} unique source URLs`);

  console.log("\n=== Step 2: Upsert image rows (one per unique URL) ===");
  let upserted = 0;
  for (let i = 0; i < uniqueUrls.length; i += 200) {
    const batch = uniqueUrls.slice(i, i + 200).map((url) => ({ source_url: url }));
    const { error } = await supabase.from("images").upsert(batch, { onConflict: "source_url" });
    if (error) {
      console.error("  upsert error:", error.message);
      process.exit(1);
    }
    upserted += batch.length;
    process.stdout.write(`\r  upserted ${upserted}/${uniqueUrls.length}`);
  }
  console.log();

  console.log("\n=== Step 3: Build source_url -> image_id map ===");
  const images = await fetchAll("images", "id,source_url");
  const urlToImageId = new Map(images.map((r) => [r.source_url, r.id]));
  console.log(`  Loaded ${images.length} image rows`);

  console.log("\n=== Step 4: Set variants.image_id ===");
  let linked = 0;
  let failed = 0;
  for (let i = 0; i < variants.length; i += 100) {
    const batch = variants.slice(i, i + 100);
    const results = await Promise.all(
      batch.map(async (v) => {
        const image_id = urlToImageId.get(v.image_url);
        if (!image_id) return { error: "no image_id for url" };
        return supabase.from("variants").update({ image_id }).eq("id", v.id);
      }),
    );
    for (const r of results) {
      if (r.error) failed += 1;
      else linked += 1;
    }
    process.stdout.write(`\r  linked ${linked}, failed ${failed}, ${linked + failed}/${variants.length}`);
  }
  console.log();

  console.log("\n=== Step 5: Clear pending sync flags from the variant linking ===");
  const ids = variants.map((v) => v.id);
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

  console.log("\n=== Step 6: Create one product_images row per product ===");
  // Pick each product's lowest-position variant that has an image
  const heroByProduct = new Map();
  for (const v of variants) {
    if (!v.image_url) continue;
    const cur = heroByProduct.get(v.product_id);
    if (!cur || (v.position ?? 9999) < (cur.position ?? 9999)) {
      heroByProduct.set(v.product_id, v);
    }
  }
  console.log(`  Products with at least one hero variant: ${heroByProduct.size}`);

  // Skip products that already have a product_images row
  const existingPI = await fetchAll("product_images", "product_id");
  const alreadyHas = new Set(existingPI.map((r) => r.product_id));
  const toCreate = [...heroByProduct.entries()]
    .filter(([pid]) => !alreadyHas.has(pid))
    .map(([product_id, variant]) => ({
      product_id,
      image_id: urlToImageId.get(variant.image_url),
      storage_path: variant.image_url,  // for now, point at the source URL; future download will overwrite
      original_filename: "shopify-cdn-source",
      upload_date: new Date().toISOString().slice(0, 10),
      sequence: 1,
      source_url: variant.image_url,
    }));
  console.log(`  Rows to insert: ${toCreate.length}`);

  if (toCreate.length > 0) {
    let inserted = 0;
    for (let i = 0; i < toCreate.length; i += 200) {
      const batch = toCreate.slice(i, i + 200);
      const { error } = await supabase.from("product_images").insert(batch);
      if (error) {
        console.error("  insert error:", error.message);
        break;
      }
      inserted += batch.length;
      process.stdout.write(`\r  inserted ${inserted}/${toCreate.length}`);
    }
    console.log();
  }

  console.log("\n=== Final verification ===");
  const [imagesCount, variantsLinked, piCount, pendingV] = await Promise.all([
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("variants").select("id", { count: "exact", head: true }).not("image_id", "is", null),
    supabase.from("product_images").select("id", { count: "exact", head: true }),
    supabase.from("variants").select("id", { count: "exact", head: true }).eq("sync_status", "pending"),
  ]);
  console.log(`  images table rows:                       ${imagesCount.count}`);
  console.log(`  variants with image_id set:              ${variantsLinked.count}`);
  console.log(`  product_images rows:                     ${piCount.count}`);
  console.log(`  Pending variants:                        ${pendingV.count}`);
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
