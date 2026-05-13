"use client";

import { useActionState } from "react";

import {
  runManualSyncAction,
  type ManualSyncState,
} from "@/app/(app)/sync/actions";

export function ManualSyncCard() {
  const initialState: ManualSyncState = { status: "idle", message: "" };
  const [state, formAction, pending] = useActionState(runManualSyncAction, initialState);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Manual sync</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Trigger the queue processor now. This phase scaffolds the workflow and
        sync run history before the full Shopify API integration is added.
      </p>
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Running sync..." : "Run sync now"}
        </button>

        {state.status !== "idle" ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {state.message}
          </div>
        ) : null}
      </form>
    </article>
  );
}
