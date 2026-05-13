import { getShopifyEnv, hasShopifyEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

import { mockSyncDashboardData } from "./mock-data";
import { SyncDashboardData, SyncExecutionResult, SyncQueueItem, SyncRun } from "./types";
import { executeSyncRun } from "./service";

function normalizeVariantProductRelation(
  relation: { title?: string | null; family?: SyncQueueItem["family"] }[] | { title?: string | null; family?: SyncQueueItem["family"] } | null,
) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function getSyncDashboardData(): Promise<SyncDashboardData> {
  if (!hasSupabaseEnv()) {
    return mockSyncDashboardData;
  }

  const supabase = createAdminClient();
  const [settingsResult, productsResult, variantsResult, historyResult] = await Promise.all([
    supabase.from("app_settings").select("*").limit(1).maybeSingle(),
    supabase
      .from("products")
      .select("id,sku,title,family,sync_status,updated_at,sync_error_message")
      .in("sync_status", ["pending", "error"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("variants")
      .select("id,sku,product_id,sync_status,updated_at,sync_error_message,products(title,family)")
      .in("sync_status", ["pending", "error"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  if (productsResult.error || variantsResult.error || historyResult.error) {
    return mockSyncDashboardData;
  }

  const settings = settingsResult.data
    ? {
        shopDomain: getShopifyEnv().shopDomain ?? settingsResult.data.shop_domain,
        shopifyAdminTokenConfigured: hasShopifyEnv(),
        syncFrequencyHours: settingsResult.data.sync_frequency_hours,
        businessHoursStart: settingsResult.data.business_hours_start,
        businessHoursEnd: settingsResult.data.business_hours_end,
      }
    : mockSyncDashboardData.settings;

  const productQueue: SyncQueueItem[] = (productsResult.data ?? []).map((item) => ({
    id: item.id,
    recordType: "product",
    sku: item.sku,
    title: item.title,
    family: item.family,
    syncStatus: item.sync_status,
    updatedAt: item.updated_at,
    errorMessage: item.sync_error_message,
  }));

  const variantQueue: SyncQueueItem[] = (variantsResult.data ?? []).map((item) => {
    const product = normalizeVariantProductRelation(item.products as never);
    return {
      id: item.id,
      recordType: "variant",
      sku: item.sku,
      title: product?.title ?? null,
      family: product?.family ?? "inductors",
      syncStatus: item.sync_status,
      updatedAt: item.updated_at,
      errorMessage: item.sync_error_message,
    };
  });

  const history: SyncRun[] = (historyResult.data ?? []).map((item) => ({
    id: item.id,
    status: item.status,
    startedAt: item.started_at,
    completedAt: item.completed_at,
    recordsAttempted: item.records_attempted,
    recordsSucceeded: item.records_succeeded,
    recordsFailed: item.records_failed,
    errorMessage: item.error_message,
    triggerSource: item.trigger_source,
  }));

  return {
    settings,
    queue: [...productQueue, ...variantQueue].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    history,
    source: "supabase",
  };
}

export async function runManualSync(): Promise<SyncExecutionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: true,
      attempted: mockSyncDashboardData.queue.length,
      succeeded: mockSyncDashboardData.queue.filter((item) => item.syncStatus !== "error").length,
      failed: mockSyncDashboardData.queue.filter((item) => item.syncStatus === "error").length,
      source: "mock",
    };
  }
  return executeSyncRun("manual");
}
