import { createAdminClient } from "@/lib/supabase/admin";
import { hasShopifyEnv } from "@/lib/env";
import { productFieldMapping, inductorVariantFieldMapping } from "./shopify-mapping";
import { shopifyGraphQL } from "./shopify-client";
import { SyncExecutionResult } from "./types";

const PRODUCT_UPDATE_MUTATION = `
  mutation ProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VARIANT_BULK_UPDATE_MUTATION = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeShopifyStatus(status: string) {
  if (status === "active") return "ACTIVE";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

function buildProductUpdatePayload(product: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    id: product.shopify_product_id,
  };

  for (const [localField, mapping] of Object.entries(productFieldMapping)) {
    const value = product[localField];

    if (mapping.field === "descriptionHtml") {
      payload.descriptionHtml = value ?? "";
      continue;
    }

    if (mapping.field === "status") {
      payload.status = normalizeShopifyStatus(String(value ?? "draft"));
      continue;
    }

    payload[mapping.field] = value;
  }

  payload.tags = Array.isArray(product.tags) ? product.tags : [];
  return payload;
}

function buildVariantUpdatePayload(variant: Record<string, unknown>) {
  const metafields = Object.entries(inductorVariantFieldMapping)
    .map(([field, mapping]) => {
      if (mapping.shopifyType !== "metafield") {
        return null;
      }

      const value = variant[field];
      if (!value) return null;
      return {
        namespace: mapping.namespace,
        key: mapping.key,
        type: "single_line_text_field",
        value: String(value),
      };
    })
    .filter(Boolean);

  return {
    id: variant.shopify_variant_id,
    price: variant.price ?? undefined,
    barcode: variant.barcode ?? undefined,
    metafields,
  };
}

async function markProductSynced(productId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("products")
    .update({
      sync_status: "synced",
      sync_error_message: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", productId);
}

async function markProductError(productId: string, message: string) {
  const supabase = createAdminClient();
  await supabase
    .from("products")
    .update({
      sync_status: "error",
      sync_error_message: message,
    })
    .eq("id", productId);
}

async function markVariantSynced(variantId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("variants")
    .update({
      sync_status: "synced",
      sync_error_message: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", variantId);
}

async function markVariantError(variantId: string, message: string) {
  const supabase = createAdminClient();
  await supabase
    .from("variants")
    .update({
      sync_status: "error",
      sync_error_message: message,
    })
    .eq("id", variantId);
}

async function syncProduct(product: Record<string, unknown>) {
  if (!product.shopify_product_id) {
    await markProductError(String(product.id), "Missing Shopify product id.");
    return false;
  }

  const data = await shopifyGraphQL<{
    productUpdate: {
      product: { id: string } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>({
    query: PRODUCT_UPDATE_MUTATION,
    variables: {
      product: buildProductUpdatePayload(product),
    },
  });

  if (data.productUpdate.userErrors.length > 0) {
    await markProductError(
      String(product.id),
      data.productUpdate.userErrors.map((item) => item.message).join("; "),
    );
    return false;
  }

  await markProductSynced(String(product.id));
  return true;
}

async function syncVariant(
  variant: Record<string, unknown> & { products?: { shopify_product_id?: string | null }[] | { shopify_product_id?: string | null } | null },
) {
  const relation = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  const productShopifyId = relation?.shopify_product_id;

  if (!productShopifyId) {
    await markVariantError(String(variant.id), "Missing parent Shopify product id.");
    return false;
  }

  if (!variant.shopify_variant_id) {
    await markVariantError(String(variant.id), "Missing Shopify variant id.");
    return false;
  }

  const data = await shopifyGraphQL<{
    productVariantsBulkUpdate: {
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>({
    query: VARIANT_BULK_UPDATE_MUTATION,
    variables: {
      productId: productShopifyId,
      variants: [buildVariantUpdatePayload(variant)],
    },
  });

  if (data.productVariantsBulkUpdate.userErrors.length > 0) {
    await markVariantError(
      String(variant.id),
      data.productVariantsBulkUpdate.userErrors.map((item) => item.message).join("; "),
    );
    return false;
  }

  await markVariantSynced(String(variant.id));
  return true;
}

export async function executeSyncRun(triggerSource: "manual" | "cron"): Promise<SyncExecutionResult> {
  if (!hasShopifyEnv()) {
    return {
      success: false,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      error: "Missing Shopify environment variables.",
      source: "supabase",
    };
  }

  const supabase = createAdminClient();
  const runStart = await supabase
    .from("sync_runs")
    .insert({
      status: "running",
      trigger_source: triggerSource,
      records_attempted: 0,
      records_succeeded: 0,
      records_failed: 0,
    })
    .select("id")
    .single();

  if (runStart.error || !runStart.data) {
    return {
      success: false,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      error: runStart.error?.message ?? "Could not create sync run.",
      source: "supabase",
    };
  }

  const [productsResult, variantsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("family", "inductors")
      .in("sync_status", ["pending", "error"])
      .order("updated_at", { ascending: true }),
    supabase
      .from("variants")
      .select("*,products(shopify_product_id)")
      .in("sync_status", ["pending", "error"])
      .order("updated_at", { ascending: true }),
  ]);

  if (productsResult.error || variantsResult.error) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message:
          productsResult.error?.message || variantsResult.error?.message || "Queue load failed.",
      })
      .eq("id", runStart.data.id);

    return {
      success: false,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      error: productsResult.error?.message || variantsResult.error?.message || "Queue load failed.",
      source: "supabase",
    };
  }

  const products = productsResult.data ?? [];
  const variants = variantsResult.data ?? [];
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    attempted += 1;
    try {
      if (await syncProduct(product)) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      await markProductError(
        String(product.id),
        error instanceof Error ? error.message : "Unknown Shopify sync error.",
      );
    }
    await sleep(500);
  }

  for (const variant of variants) {
    attempted += 1;
    try {
      if (await syncVariant(variant)) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      await markVariantError(
        String(variant.id),
        error instanceof Error ? error.message : "Unknown Shopify sync error.",
      );
    }
    await sleep(500);
  }

  await supabase
    .from("sync_runs")
    .update({
      status: failed > 0 ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      records_attempted: attempted,
      records_succeeded: succeeded,
      records_failed: failed,
      error_message: failed > 0 ? "One or more records failed during Shopify sync." : null,
    })
    .eq("id", runStart.data.id);

  return {
    success: failed === 0,
    attempted,
    succeeded,
    failed,
    error: failed > 0 ? "One or more records failed during Shopify sync." : undefined,
    source: "supabase",
  };
}
