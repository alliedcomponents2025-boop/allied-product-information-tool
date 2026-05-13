import { NextResponse } from "next/server";

import { executeSyncRun } from "@/features/sync/service";

export async function GET() {
  const result = await executeSyncRun("cron");

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
