"use client";

import { useActionState, useMemo, useState } from "react";

import { bulkProductsAction, type BulkActionState } from "@/app/(app)/products/actions";
import { ProductListItem } from "../types";

type ProductsBulkPanelProps = {
  items: ProductListItem[];
};

export function ProductsBulkPanel({ items }: ProductsBulkPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const initialState: BulkActionState = { status: "idle", message: "" };
  const [state, formAction] = useActionState(bulkProductsAction, initialState);
  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items.length, selectedIds.length],
  );

  function toggleSelection(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk actions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select products on this page to change status or mark them for resync.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {selectedIds.length} selected
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <select
            name="bulk_action"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="change_status">Change status</option>
            <option value="mark_resync">Mark for resync</option>
          </select>
          <select
            name="status"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            Apply
          </button>
        </div>

        {selectedIds.map((productId) => (
          <input
            key={productId}
            type="hidden"
            name="selected_product_ids"
            value={productId}
          />
        ))}

        {state.status !== "idle" ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {state.message}
          </div>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all products"
          />
          <span className="font-medium text-slate-700">Select all on this page</span>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  aria-label={`Select ${item.sku}`}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.sku}</p>
                  <p className="text-sm text-slate-500">{item.title}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">{item.status}</div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
