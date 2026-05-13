"use server";

import { revalidatePath } from "next/cache";

import {
  createProductImage,
  deleteProductImage,
  deleteVariant,
  replaceProductImage,
  saveProduct,
  saveVariant,
} from "@/features/products/queries";
import { validateImageFile } from "@/features/products/image-utils";
import {
  ProductStatus,
  SaveProductInput,
  SaveVariantInput,
  ProductFamily,
} from "@/features/products/types";

export type SaveProductFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type SaveVariantFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type SaveImageFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function revalidateProductRoutes(productId: string) {
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

export async function saveProductAction(
  _: SaveProductFormState,
  formData: FormData,
): Promise<SaveProductFormState> {
  const payload: SaveProductInput = {
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    handle: String(formData.get("handle") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    status: String(formData.get("status") ?? "draft") as ProductStatus,
    description_meta: String(formData.get("description_meta") ?? "").trim(),
    datasheet_url: String(formData.get("datasheet_url") ?? "").trim(),
    info_sheet_url: String(formData.get("info_sheet_url") ?? "").trim(),
    body_html: String(formData.get("body_html") ?? "").trim(),
    tags: splitCsv(String(formData.get("tags") ?? "")),
    smart_collections: splitCsv(String(formData.get("smart_collections") ?? "")),
  };

  if (!payload.id || !payload.title || !payload.vendor) {
    return {
      status: "error",
      message: "Title, vendor, and record id are required.",
    };
  }

  const result = await saveProduct(payload);

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Save failed.",
    };
  }

  revalidateProductRoutes(payload.id);

  return {
    status: "success",
    message:
      result.source === "mock"
        ? "Saved in demo mode. Connect Supabase to persist changes."
        : "Saved. Will sync to Shopify in next batch.",
  };
}

export async function saveVariantAction(
  _: SaveVariantFormState,
  formData: FormData,
): Promise<SaveVariantFormState> {
  const productId = String(formData.get("product_id") ?? "");
  const payload: SaveVariantInput = {
    id: String(formData.get("id") ?? "").trim() || undefined,
    product_id: productId,
    sku: String(formData.get("sku") ?? "").trim(),
    option1_name: String(formData.get("option1_name") ?? "").trim(),
    option1_value: String(formData.get("option1_value") ?? "").trim(),
    position: Number(formData.get("position") ?? 1),
    price: String(formData.get("price") ?? "").trim(),
    weight: String(formData.get("weight") ?? "").trim(),
    weight_unit: String(formData.get("weight_unit") ?? "g").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    inductance: String(formData.get("inductance") ?? "").trim(),
    rated_current: String(formData.get("rated_current") ?? "").trim(),
    dcr_max: String(formData.get("dcr_max") ?? "").trim(),
    height: String(formData.get("height") ?? "").trim(),
    width: String(formData.get("width") ?? "").trim(),
    length: String(formData.get("length") ?? "").trim(),
    operating_temp_range: String(formData.get("operating_temp_range") ?? "").trim(),
    shielded: String(formData.get("shielded") ?? "").trim(),
    mounting_type: String(formData.get("mounting_type") ?? "").trim(),
    datasheet_url: String(formData.get("datasheet_url") ?? "").trim(),
  };

  if (!payload.product_id || !payload.sku) {
    return {
      status: "error",
      message: "Product id and variant SKU are required.",
    };
  }

  const result = await saveVariant(payload);

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Variant save failed.",
    };
  }

  revalidateProductRoutes(productId);

  return {
    status: "success",
    message:
      result.source === "mock"
        ? "Variant saved in demo mode."
        : "Variant saved. Will sync to Shopify in next batch.",
  };
}

export async function deleteVariantAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const variantId = String(formData.get("variant_id") ?? "");

  if (!productId || !variantId) {
    return;
  }

  await deleteVariant(variantId);
  revalidateProductRoutes(productId);
}

export async function uploadProductImageAction(
  _: SaveImageFormState,
  formData: FormData,
): Promise<SaveImageFormState> {
  const productId = String(formData.get("product_id") ?? "");
  const family = String(formData.get("family") ?? "") as ProductFamily;
  const sku = String(formData.get("sku") ?? "");
  const file = formData.get("image") as File | null;

  if (!productId || !family || !sku || !file) {
    return {
      status: "error",
      message: "Product id, family, SKU, and image file are required.",
    };
  }

  const validationError = validateImageFile(file);

  if (validationError) {
    return {
      status: "error",
      message: validationError,
    };
  }

  const result = await createProductImage({ productId, family, sku, file });

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Image upload failed.",
    };
  }

  revalidateProductRoutes(productId);

  return {
    status: "success",
    message:
      result.source === "mock"
        ? "Image upload simulated in demo mode."
        : "Image uploaded successfully.",
  };
}

export async function replaceProductImageAction(
  _: SaveImageFormState,
  formData: FormData,
): Promise<SaveImageFormState> {
  const imageId = String(formData.get("image_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const family = String(formData.get("family") ?? "") as ProductFamily;
  const sku = String(formData.get("sku") ?? "");
  const existingSequence = Number(formData.get("sequence") ?? 1);
  const file = formData.get("image") as File | null;

  if (!imageId || !productId || !family || !sku || !file) {
    return {
      status: "error",
      message: "Image replacement is missing required values.",
    };
  }

  const validationError = validateImageFile(file);

  if (validationError) {
    return {
      status: "error",
      message: validationError,
    };
  }

  const result = await replaceProductImage({
    imageId,
    productId,
    family,
    sku,
    existingSequence,
    file,
  });

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Image replace failed.",
    };
  }

  revalidateProductRoutes(productId);

  return {
    status: "success",
    message:
      result.source === "mock"
        ? "Image replace simulated in demo mode."
        : "Image replaced successfully.",
  };
}

export async function deleteProductImageAction(formData: FormData) {
  const imageId = String(formData.get("image_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");

  if (!imageId || !productId || !storagePath) {
    return;
  }

  await deleteProductImage({
    id: imageId,
    storage_path: storagePath,
  });
  revalidateProductRoutes(productId);
}
