"use server";

import { revalidatePath } from "next/cache";

import { bulkUpdateProducts } from "@/features/products/queries";
import { ProductStatus } from "@/features/products/types";

export type BulkActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getSelectedProductIds(formData: FormData) {
  return formData
    .getAll("selected_product_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function bulkProductsAction(
  _: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const productIds = getSelectedProductIds(formData);
  const actionType = String(formData.get("bulk_action") ?? "");
  const status = String(formData.get("status") ?? "") as ProductStatus;

  if (productIds.length === 0) {
    return {
      status: "error",
      message: "Select at least one product first.",
    };
  }

  const action =
    actionType === "change_status"
      ? { type: "change_status" as const, status }
      : actionType === "mark_resync"
        ? { type: "mark_resync" as const }
        : actionType === "delete"
          ? { type: "delete" as const }
          : null;

  if (!action) {
    return {
      status: "error",
      message: "Choose a valid bulk action.",
    };
  }

  const result = await bulkUpdateProducts({
    productIds,
    action,
  });

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Bulk action failed.",
    };
  }

  revalidatePath("/products");
  revalidatePath("/");

  return {
    status: "success",
    message:
      result.source === "mock"
        ? "Bulk action simulated in demo mode."
        : "Bulk action completed.",
  };
}
