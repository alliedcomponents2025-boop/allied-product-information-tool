import { ProductFamily, SyncStatus } from "@/features/products/types";

export type ShopifyAppSettings = {
  shopDomain: string | null;
  shopifyAdminTokenConfigured: boolean;
  syncFrequencyHours: number;
  businessHoursStart: number;
  businessHoursEnd: number;
};

export type SyncQueueItem = {
  id: string;
  recordType: "product" | "variant";
  sku: string;
  title: string | null;
  family: ProductFamily;
  syncStatus: SyncStatus;
  updatedAt: string;
  errorMessage: string | null;
};

export type SyncRun = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  recordsAttempted: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessage: string | null;
  triggerSource: string;
};

export type SyncDashboardData = {
  settings: ShopifyAppSettings;
  queue: SyncQueueItem[];
  history: SyncRun[];
  source: "mock" | "supabase";
};

export type SyncExecutionResult = {
  success: boolean;
  attempted: number;
  succeeded: number;
  failed: number;
  error?: string;
  source: "mock" | "supabase";
};
