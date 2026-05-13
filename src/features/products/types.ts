export type ProductFamily =
  | "inductors"
  | "common_mode_chokes"
  | "transformers"
  | "lan_magnetics"
  | "connectors"
  | "other";

export type ProductStatus = "active" | "draft" | "archived";
export type SyncStatus = "pending" | "synced" | "error";
export type UserRole = "admin" | "ops" | "sales" | "viewer";

export type ProductListItem = {
  id: string;
  family: ProductFamily;
  sku: string;
  title: string;
  handle: string | null;
  vendor: string;
  tags: string[];
  status: ProductStatus;
  sync_status: SyncStatus;
  updated_at: string;
  variant_count: number;
  last_edited_by_email: string | null;
};

export type ProductDetail = {
  id: string;
  family: ProductFamily;
  shopify_product_id: string | null;
  sku: string;
  title: string;
  handle: string | null;
  vendor: string;
  tags: string[];
  status: ProductStatus;
  body_html: string;
  description_meta: string;
  datasheet_url: string | null;
  info_sheet_url: string | null;
  smart_collections: string[];
  sync_status: SyncStatus;
  sync_error_message: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  last_edited_by_email: string | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  option1_name: string | null;
  option1_value: string | null;
  position: number;
  price: string | null;
  weight: string | null;
  weight_unit: string;
  barcode: string | null;
  inventory_qty: number | null;
  inductance: string | null;
  rated_current: string | null;
  dcr_max: string | null;
  height: string | null;
  width: string | null;
  length: string | null;
  operating_temp_range: string | null;
  shielded: string | null;
  mounting_type: string | null;
  datasheet_url: string | null;
  image_url: string | null;
  sync_status: SyncStatus;
};

export type AuditLogEntry = {
  id: string;
  action: "create" | "update" | "delete";
  table_name: string;
  created_at: string;
  user_email: string | null;
  changed_fields: Record<string, unknown>;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  original_filename: string;
  upload_date: string | null;
  sequence: number | null;
  shopify_media_id: string | null;
  public_url: string | null;
};

export type ProductListFilters = {
  family: ProductFamily;
  query: string;
  status: ProductStatus | "all";
  syncStatus: SyncStatus | "all";
  tag: string;
  page: number;
  pageSize: number;
};

export type ProductListResponse = {
  items: ProductListItem[];
  totalCount: number;
  totalPages: number;
  availableTags: string[];
  source: "mock" | "supabase";
};

export type DashboardStats = {
  totalProducts: number;
  pendingSync: number;
  syncErrors: number;
  recentEdits: number;
};

export type DashboardActivityItem = {
  id: string;
  product_id: string | null;
  product_sku: string | null;
  product_title: string | null;
  table_name: string;
  action: "create" | "update" | "delete";
  user_email: string | null;
  created_at: string;
  changed_fields: Record<string, unknown>;
};

export type DashboardOverview = {
  stats: DashboardStats;
  activity: DashboardActivityItem[];
  source: "mock" | "supabase";
};

export type SaveProductInput = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  status: ProductStatus;
  description_meta: string;
  datasheet_url: string;
  info_sheet_url: string;
  body_html: string;
  tags: string[];
  smart_collections: string[];
};

export type SaveVariantInput = {
  id?: string;
  product_id: string;
  sku: string;
  option1_name: string;
  option1_value: string;
  position: number;
  price: string;
  weight: string;
  weight_unit: string;
  barcode: string;
  inductance: string;
  rated_current: string;
  dcr_max: string;
  height: string;
  width: string;
  length: string;
  operating_temp_range: string;
  shielded: string;
  mounting_type: string;
  datasheet_url: string;
  image_url: string;
};

export type ReplaceImageInput = {
  imageId: string;
  productId: string;
  family: ProductFamily;
  sku: string;
  existingSequence: number;
  file: File;
};

export type BulkProductAction =
  | { type: "change_status"; status: ProductStatus }
  | { type: "mark_resync" }
  | { type: "delete" };
