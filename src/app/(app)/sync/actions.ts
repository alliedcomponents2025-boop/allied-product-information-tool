"use server";

import { revalidatePath } from "next/cache";

import { runManualSync } from "@/features/sync/queries";

export type ManualSyncState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function runManualSyncAction(): Promise<ManualSyncState> {
  const result = await runManualSync();

  revalidatePath("/sync");
  revalidatePath("/");

  if (!result.success) {
    return {
      status: "error",
      message: result.error ?? "Manual sync failed.",
    };
  }

  return {
    status: "success",
    message:
      result.source === "mock"
        ? `Demo sync processed ${result.attempted} queued records.`
        : `Sync processed ${result.attempted} queued records.`,
  };
}
