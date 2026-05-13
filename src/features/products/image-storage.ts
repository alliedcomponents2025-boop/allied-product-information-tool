import { createClient } from "@/lib/supabase/server";

import { buildImageStoragePath, parseUploadDateFromFilename } from "./image-utils";
import { ProductFamily, ProductImage } from "./types";

const bucketName = "product-images";

export async function uploadImageFileToStorage({
  family,
  sku,
  generatedFilename,
  file,
}: {
  family: ProductFamily;
  sku: string;
  generatedFilename: string;
  file: File;
}): Promise<{ storagePath?: string; error?: string }> {
  const supabase = await createClient();
  const storagePath = buildImageStoragePath({ family, sku, filename: generatedFilename });
  const bytes = await file.arrayBuffer();
  const uploadResult = await supabase.storage
    .from(bucketName)
    .upload(storagePath, bytes, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadResult.error) {
    return { error: uploadResult.error.message };
  }

  return { storagePath };
}

export async function uploadProductImage({
  productId,
  family,
  sku,
  sequence,
  originalFilename,
  generatedFilename,
  file,
}: {
  productId: string;
  family: ProductFamily;
  sku: string;
  sequence: number;
  originalFilename: string;
  generatedFilename: string;
  file: File;
}): Promise<{ image?: ProductImage; error?: string }> {
  const upload = await uploadImageFileToStorage({
    family,
    sku,
    generatedFilename,
    file,
  });

  if (upload.error || !upload.storagePath) {
    return { error: upload.error ?? "Storage upload failed." };
  }
  const supabase = await createClient();

  const insertResult = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      storage_path: upload.storagePath,
      original_filename: originalFilename,
      upload_date: parseUploadDateFromFilename(generatedFilename),
      sequence,
    })
    .select("*")
    .single();

  if (insertResult.error) {
    await supabase.storage.from(bucketName).remove([upload.storagePath]);
    return { error: insertResult.error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(upload.storagePath);

  return {
    image: {
      id: insertResult.data.id,
      product_id: insertResult.data.product_id,
      storage_path: insertResult.data.storage_path,
      original_filename: insertResult.data.original_filename,
      upload_date: insertResult.data.upload_date,
      sequence: insertResult.data.sequence,
      shopify_media_id: insertResult.data.shopify_media_id,
      public_url: publicUrl,
    },
  };
}

export async function removeProductImage(
  image: Pick<ProductImage, "id" | "storage_path">,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const deleteRow = await supabase.from("product_images").delete().eq("id", image.id);

  if (deleteRow.error) {
    return { success: false, error: deleteRow.error.message };
  }

  const deleteFile = await supabase.storage.from(bucketName).remove([image.storage_path]);

  if (deleteFile.error) {
    return { success: false, error: deleteFile.error.message };
  }

  return { success: true };
}
