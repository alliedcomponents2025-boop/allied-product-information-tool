import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import {
  mockAuditLogByProductId,
  mockDashboardOverview,
  mockImagesByProductId,
  mockProductDetails,
  mockProducts,
  mockVariantsByProductId,
} from "./mock-data";
import {
  AuditLogEntry,
  BulkProductAction,
  DashboardOverview,
  DashboardStats,
  ProductDetail,
  ProductFamily,
  ProductImage,
  ProductListFilters,
  ProductListItem,
  ProductListResponse,
  ProductVariant,
  ReplaceImageInput,
  SaveProductInput,
  SaveVariantInput,
} from "./types";
import {
  buildImageFilename,
  parseUploadDateFromFilename,
} from "./image-utils";
import {
  removeProductImage,
  uploadImageFileToStorage,
  uploadProductImage,
} from "./image-storage";

function normalizeListFilters(input?: Partial<ProductListFilters>): ProductListFilters {
  return {
    family: input?.family ?? "inductors",
    query: input?.query?.trim() ?? "",
    status: input?.status ?? "all",
    syncStatus: input?.syncStatus ?? "all",
    tag: input?.tag ?? "all",
    page: Math.max(input?.page ?? 1, 1),
    pageSize: input?.pageSize ?? 50,
  };
}

function sortByUpdatedAt(items: ProductListItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function getMockList(filters: ProductListFilters): ProductListResponse {
  const query = filters.query.toLowerCase();
  const filtered = sortByUpdatedAt(mockProducts).filter((item) => {
    if (item.family !== filters.family) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.syncStatus !== "all" && item.sync_status !== filters.syncStatus) return false;
    if (filters.tag !== "all" && !item.tags.includes(filters.tag)) return false;
    if (query && !`${item.sku} ${item.title}`.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(start, start + filters.pageSize);
  const availableTags = [...new Set(mockProducts.flatMap((item) => item.tags))].sort();

  return {
    items,
    totalCount: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / filters.pageSize)),
    availableTags,
    source: "mock",
  };
}

function mapVariantRow(item: Record<string, unknown>): ProductVariant {
  return {
    id: String(item.id),
    product_id: String(item.product_id),
    sku: String(item.sku ?? ""),
    option1_name: (item.option1_name as string | null) ?? null,
    option1_value: (item.option1_value as string | null) ?? null,
    position: Number(item.position ?? 1),
    price: item.price != null ? String(item.price) : null,
    weight: item.weight != null ? String(item.weight) : null,
    weight_unit: String(item.weight_unit ?? "g"),
    barcode: (item.barcode as string | null) ?? null,
    inventory_qty: item.inventory_qty == null ? null : Number(item.inventory_qty),
    inductance: (item.inductance as string | null) ?? null,
    rated_current: (item.rated_current as string | null) ?? null,
    dcr_max: (item.dcr_max as string | null) ?? null,
    height: (item.height as string | null) ?? null,
    width: (item.width as string | null) ?? null,
    length: (item.length as string | null) ?? null,
    operating_temp_range: (item.operating_temp_range as string | null) ?? null,
    shielded: (item.shielded as string | null) ?? null,
    mounting_type: (item.mounting_type as string | null) ?? null,
    datasheet_url: (item.datasheet_url as string | null) ?? null,
    image_url: (item.image_url as string | null) ?? null,
    sync_status: String(item.sync_status ?? "pending") as ProductVariant["sync_status"],
  };
}

function mapImageRow(item: Record<string, unknown>, publicUrl: string | null): ProductImage {
  return {
    id: String(item.id),
    product_id: String(item.product_id),
    storage_path: String(item.storage_path),
    original_filename: String(item.original_filename),
    upload_date: (item.upload_date as string | null) ?? null,
    sequence: item.sequence == null ? null : Number(item.sequence),
    shopify_media_id: (item.shopify_media_id as string | null) ?? null,
    public_url: publicUrl,
  };
}

export async function listProducts(
  rawFilters?: Partial<ProductListFilters>,
): Promise<ProductListResponse> {
  const filters = normalizeListFilters(rawFilters);

  if (!hasSupabaseEnv()) {
    return getMockList(filters);
  }

  const supabase = await createClient();
  const queryText = filters.query.trim();
  let query = supabase
    .from("products")
    .select(
      "id,family,sku,title,handle,vendor,tags,status,sync_status,updated_at,last_edited_by,variants(count)",
      { count: "exact" },
    )
    .eq("family", filters.family)
    .order("updated_at", { ascending: false });

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.syncStatus !== "all") query = query.eq("sync_status", filters.syncStatus);
  if (filters.tag !== "all") query = query.contains("tags", [filters.tag]);
  if (queryText) query = query.or(`sku.ilike.%${queryText}%,title.ilike.%${queryText}%`);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    return getMockList(filters);
  }

  const editorIds = [...new Set((data ?? []).map((item) => item.last_edited_by).filter(Boolean))];
  const emailById = new Map<string, string>();

  if (editorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users_profile")
      .select("id,email")
      .in("id", editorIds);

    profiles?.forEach((profile) => {
      emailById.set(profile.id, profile.email);
    });
  }

  const items: ProductListItem[] = (data ?? []).map((item) => ({
    id: item.id,
    family: item.family,
    sku: item.sku,
    title: item.title,
    handle: item.handle,
    vendor: item.vendor,
    tags: item.tags ?? [],
    status: item.status,
    sync_status: item.sync_status,
    updated_at: item.updated_at,
    variant_count: Array.isArray(item.variants) ? item.variants[0]?.count ?? 0 : 0,
    last_edited_by_email: item.last_edited_by ? emailById.get(item.last_edited_by) ?? null : null,
  }));

  const { data: tagsData } = await supabase
    .from("products")
    .select("tags")
    .eq("family", filters.family);
  const availableTags = [...new Set((tagsData ?? []).flatMap((item) => item.tags ?? []))].sort();

  return {
    items,
    totalCount: count ?? items.length,
    totalPages: Math.max(1, Math.ceil((count ?? items.length) / filters.pageSize)),
    availableTags,
    source: "supabase",
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (!hasSupabaseEnv()) {
    return mockDashboardOverview;
  }

  const supabase = await createClient();
  const [productsResult, recentActivityResult] = await Promise.all([
    supabase.from("products").select("id,sync_status", { count: "exact" }),
    supabase
      .from("audit_log")
      .select("id,record_id,table_name,action,user_email,created_at,changed_fields")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (productsResult.error || recentActivityResult.error) {
    return mockDashboardOverview;
  }

  const products = productsResult.data ?? [];
  const productIds = [
    ...new Set(
      (recentActivityResult.data ?? [])
        .map((entry) => entry.record_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const productLookup = new Map<string, { sku: string | null; title: string | null }>();

  if (productIds.length > 0) {
    const { data: relatedProducts } = await supabase
      .from("products")
      .select("id,sku,title")
      .in("id", productIds);

    relatedProducts?.forEach((product) => {
      productLookup.set(product.id, {
        sku: product.sku,
        title: product.title,
      });
    });
  }

  const stats: DashboardStats = {
    totalProducts: products.length,
    pendingSync: products.filter((item) => item.sync_status === "pending").length,
    syncErrors: products.filter((item) => item.sync_status === "error").length,
    recentEdits: recentActivityResult.data?.length ?? 0,
  };

  return {
    stats,
    activity: (recentActivityResult.data ?? []).map((entry) => ({
      id: entry.id,
      product_id: entry.record_id,
      product_sku: entry.record_id ? productLookup.get(entry.record_id)?.sku ?? null : null,
      product_title: entry.record_id
        ? productLookup.get(entry.record_id)?.title ?? null
        : null,
      table_name: entry.table_name,
      action: entry.action,
      user_email: entry.user_email,
      created_at: entry.created_at,
      changed_fields: entry.changed_fields ?? {},
    })),
    source: "supabase",
  };
}

export async function getProductDetail(
  id: string,
): Promise<{ product: ProductDetail | null; source: "mock" | "supabase" }> {
  if (!hasSupabaseEnv()) {
    return {
      product: mockProductDetails[id] ?? null,
      source: "mock",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    return {
      product: mockProductDetails[id] ?? null,
      source: "mock",
    };
  }

  const userIds = [data.created_by, data.last_edited_by].filter(Boolean);
  const emailById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users_profile")
      .select("id,email")
      .in("id", userIds);

    profiles?.forEach((profile) => {
      emailById.set(profile.id, profile.email);
    });
  }

  return {
    product: {
      id: data.id,
      family: data.family,
      shopify_product_id: data.shopify_product_id,
      sku: data.sku,
      title: data.title,
      handle: data.handle,
      vendor: data.vendor,
      tags: data.tags ?? [],
      status: data.status,
      body_html: data.body_html ?? "",
      description_meta: data.description_meta ?? "",
      datasheet_url: data.datasheet_url,
      info_sheet_url: data.info_sheet_url,
      smart_collections: data.smart_collections ?? [],
      sync_status: data.sync_status,
      sync_error_message: data.sync_error_message,
      last_synced_at: data.last_synced_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by_email: data.created_by ? emailById.get(data.created_by) ?? null : null,
      last_edited_by_email: data.last_edited_by ? emailById.get(data.last_edited_by) ?? null : null,
    },
    source: "supabase",
  };
}

export async function listVariantsByProductId(
  productId: string,
): Promise<{ variants: ProductVariant[]; source: "mock" | "supabase" }> {
  if (!hasSupabaseEnv()) {
    return {
      variants: mockVariantsByProductId[productId] ?? [],
      source: "mock",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });

  if (error) {
    return {
      variants: mockVariantsByProductId[productId] ?? [],
      source: "mock",
    };
  }

  return {
    variants: (data ?? []).map((item) => mapVariantRow(item)),
    source: "supabase",
  };
}

export async function listAuditLogByProductId(
  productId: string,
): Promise<{ entries: AuditLogEntry[]; source: "mock" | "supabase" }> {
  if (!hasSupabaseEnv()) {
    return {
      entries: mockAuditLogByProductId[productId] ?? [],
      source: "mock",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id,action,table_name,created_at,user_email,changed_fields")
    .eq("record_id", productId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return {
      entries: mockAuditLogByProductId[productId] ?? [],
      source: "mock",
    };
  }

  return {
    entries: (data ?? []) as AuditLogEntry[],
    source: "supabase",
  };
}

export async function listImagesByProductId(
  productId: string,
): Promise<{ images: ProductImage[]; source: "mock" | "supabase" }> {
  if (!hasSupabaseEnv()) {
    return {
      images: mockImagesByProductId[productId] ?? [],
      source: "mock",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sequence", { ascending: true });

  if (error) {
    return {
      images: mockImagesByProductId[productId] ?? [],
      source: "mock",
    };
  }

  return {
    images: (data ?? []).map((item) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(item.storage_path);

      return mapImageRow(item, publicUrl);
    }),
    source: "supabase",
  };
}

export async function saveProduct(
  input: SaveProductInput,
): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      title: input.title,
      handle: input.handle || null,
      vendor: input.vendor,
      status: input.status,
      description_meta: input.description_meta,
      datasheet_url: input.datasheet_url || null,
      info_sheet_url: input.info_sheet_url || null,
      body_html: input.body_html,
      tags: input.tags,
      smart_collections: input.smart_collections,
    })
    .eq("id", input.id);

  if (error) {
    return { success: false, source: "supabase", error: error.message };
  }

  return { success: true, source: "supabase" };
}

export async function saveVariant(
  input: SaveVariantInput,
): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const supabase = await createClient();
  const payload = {
    product_id: input.product_id,
    sku: input.sku,
    option1_name: input.option1_name || null,
    option1_value: input.option1_value || null,
    position: input.position,
    price: input.price || null,
    weight: input.weight || null,
    weight_unit: input.weight_unit || "g",
    barcode: input.barcode || null,
    inductance: input.inductance || null,
    rated_current: input.rated_current || null,
    dcr_max: input.dcr_max || null,
    height: input.height || null,
    width: input.width || null,
    length: input.length || null,
    operating_temp_range: input.operating_temp_range || null,
    shielded: input.shielded || null,
    mounting_type: input.mounting_type || null,
    datasheet_url: input.datasheet_url || null,
    image_url: input.image_url || null,
  };

  const query = input.id
    ? supabase.from("variants").update(payload).eq("id", input.id)
    : supabase.from("variants").insert(payload);
  const { error } = await query;

  if (error) {
    return { success: false, source: "supabase", error: error.message };
  }

  return { success: true, source: "supabase" };
}

export async function deleteVariant(
  variantId: string,
): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("variants").delete().eq("id", variantId);

  if (error) {
    return { success: false, source: "supabase", error: error.message };
  }

  return { success: true, source: "supabase" };
}

export async function createProductImage(input: {
  productId: string;
  family: ProductFamily;
  sku: string;
  file: File;
}): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const existing = await listImagesByProductId(input.productId);
  const sequence =
    existing.images.length === 0
      ? 1
      : Math.max(...existing.images.map((image) => image.sequence ?? 0)) + 1;
  const generatedFilename = buildImageFilename({
    sku: input.sku,
    sequence,
    originalName: input.file.name,
  });

  const result = await uploadProductImage({
    productId: input.productId,
    family: input.family,
    sku: input.sku,
    sequence,
    originalFilename: input.file.name,
    generatedFilename,
    file: input.file,
  });

  if (result.error) {
    return { success: false, source: "supabase", error: result.error };
  }

  return { success: true, source: "supabase" };
}

export async function replaceProductImage(
  input: ReplaceImageInput,
): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const generatedFilename = buildImageFilename({
    sku: input.sku,
    sequence: input.existingSequence,
    originalName: input.file.name,
  });
  const uploaded = await uploadImageFileToStorage({
    family: input.family,
    sku: input.sku,
    generatedFilename,
    file: input.file,
  });

  if (uploaded.error || !uploaded.storagePath) {
    return {
      success: false,
      source: "supabase",
      error: uploaded.error ?? "Storage upload failed.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_images")
    .update({
      storage_path: uploaded.storagePath,
      original_filename: input.file.name,
      upload_date: parseUploadDateFromFilename(generatedFilename),
      sequence: input.existingSequence,
      shopify_media_id: null,
    })
    .eq("id", input.imageId);

  if (error) {
    return { success: false, source: "supabase", error: error.message };
  }

  return { success: true, source: "supabase" };
}

export async function deleteProductImage(
  image: Pick<ProductImage, "id" | "storage_path">,
): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const result = await removeProductImage(image);

  if (!result.success) {
    return { success: false, source: "supabase", error: result.error };
  }

  return { success: true, source: "supabase" };
}

export async function bulkUpdateProducts(input: {
  productIds: string[];
  action: BulkProductAction;
}): Promise<{ success: boolean; source: "mock" | "supabase"; error?: string }> {
  if (input.productIds.length === 0) {
    return { success: false, source: "mock", error: "Choose at least one product." };
  }

  if (!hasSupabaseEnv()) {
    return { success: true, source: "mock" };
  }

  const supabase = await createClient();

  if (input.action.type === "change_status") {
    const { error } = await supabase
      .from("products")
      .update({ status: input.action.status })
      .in("id", input.productIds);

    if (error) {
      return { success: false, source: "supabase", error: error.message };
    }

    return { success: true, source: "supabase" };
  }

  if (input.action.type === "mark_resync") {
    const { error } = await supabase
      .from("products")
      .update({
        sync_status: "pending",
        sync_error_message: null,
        last_synced_at: null,
      })
      .in("id", input.productIds);

    if (error) {
      return { success: false, source: "supabase", error: error.message };
    }

    return { success: true, source: "supabase" };
  }

  const { error } = await supabase.from("products").delete().in("id", input.productIds);

  if (error) {
    return { success: false, source: "supabase", error: error.message };
  }

  return { success: true, source: "supabase" };
}
