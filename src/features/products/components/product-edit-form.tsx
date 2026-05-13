"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ProductDetail } from "../types";
import {
  saveProductAction,
  type SaveProductFormState,
} from "@/app/(app)/products/[id]/actions";
import { formatDateTime } from "../format";
import { StatusBadge } from "./status-badge";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

type ProductEditFormProps = {
  product: ProductDetail;
  source: "mock" | "supabase";
};

export function ProductEditForm({ product, source }: ProductEditFormProps) {
  const initialState: SaveProductFormState = {
    status: "idle",
    message: "",
  };
  const [state, formAction] = useActionState(saveProductAction, initialState);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSavedState = state.status === "success";
  const showUnsavedChanges = hasUnsavedChanges && !isSavedState;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      key={`${product.id}-${state.status}-${state.message}`}
      id="product-edit-form"
      ref={formRef}
      action={formAction}
      onChange={() => setHasUnsavedChanges(true)}
      className="space-y-6"
    >
      <input type="hidden" name="id" value={product.id} />

      <div className="sticky top-20 z-10 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">{product.title}</h2>
            <StatusBadge value={product.status} kind="product" />
            <StatusBadge value={product.sync_status} kind="sync" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {source === "mock"
              ? "Demo data mode is active"
              : `Last saved ${formatDateTime(product.updated_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showUnsavedChanges ? (
            <span className="text-sm font-medium text-amber-700">Unsaved changes</span>
          ) : (
            <span className="text-sm text-slate-500">No pending edits</span>
          )}
          <SaveButton disabled={!showUnsavedChanges} />
        </div>
      </div>

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

      {product.sync_error_message ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="text-lg font-semibold text-rose-900">Sync needs attention</h3>
          <p className="mt-2 text-sm leading-6 text-rose-800">
            {product.sync_error_message}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Product details</h3>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">SKU</span>
              <input
                value={product.sku}
                disabled
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Title</span>
              <input
                name="title"
                defaultValue={product.title}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Handle</span>
              <input
                name="handle"
                defaultValue={product.handle ?? ""}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Vendor</span>
              <input
                name="vendor"
                defaultValue={product.vendor}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={product.status}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Publishing</h3>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Tags</span>
              <input
                name="tags"
                defaultValue={product.tags.join(", ")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Smart collections</span>
              <input
                name="smart_collections"
                defaultValue={product.smart_collections.join(", ")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">SEO description</span>
              <textarea
                name="description_meta"
                defaultValue={product.description_meta}
                rows={4}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Datasheet URL</span>
                <input
                  name="datasheet_url"
                  defaultValue={product.datasheet_url ?? ""}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Info sheet URL</span>
                <input
                  name="info_sheet_url"
                  defaultValue={product.info_sheet_url ?? ""}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                />
              </label>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Description</h3>
        <p className="mt-2 text-sm text-slate-500">
          Rich text editor will be added later. This phase uses HTML source editing.
        </p>
        <textarea
          name="body_html"
          defaultValue={product.body_html}
          rows={10}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm text-slate-900"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Sync details</h3>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Shopify product id</dt>
              <dd className="mt-1 text-slate-900">
                {product.shopify_product_id ?? "Not connected"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last synced</dt>
              <dd className="mt-1 text-slate-900">
                {formatDateTime(product.last_synced_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated at</dt>
              <dd className="mt-1 text-slate-900">{formatDateTime(product.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Created at</dt>
              <dd className="mt-1 text-slate-900">{formatDateTime(product.created_at)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Activity</h3>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Created by</dt>
              <dd className="mt-1 text-slate-900">
                {product.created_by_email ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last edited by</dt>
              <dd className="mt-1 text-slate-900">
                {product.last_edited_by_email ?? "Unknown"}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </form>
  );
}
