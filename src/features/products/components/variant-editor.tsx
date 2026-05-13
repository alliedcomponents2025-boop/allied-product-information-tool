"use client";

import { useActionState, useMemo, useState } from "react";

import {
  deleteVariantAction,
  saveVariantAction,
  type SaveVariantFormState,
} from "@/app/(app)/products/[id]/actions";
import { ProductVariant } from "../types";
import { StatusBadge } from "./status-badge";

type VariantEditorProps = {
  productId: string;
  variants: ProductVariant[];
};

type VariantDraft = {
  id?: string;
  sku: string;
  option1_name: string;
  option1_value: string;
  position: string;
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
  sync_status?: ProductVariant["sync_status"];
  inventory_qty?: number | null;
};

function toDraft(variant: ProductVariant): VariantDraft {
  return {
    id: variant.id,
    sku: variant.sku,
    option1_name: variant.option1_name ?? "",
    option1_value: variant.option1_value ?? "",
    position: String(variant.position),
    price: variant.price ?? "",
    weight: variant.weight ?? "",
    weight_unit: variant.weight_unit,
    barcode: variant.barcode ?? "",
    inductance: variant.inductance ?? "",
    rated_current: variant.rated_current ?? "",
    dcr_max: variant.dcr_max ?? "",
    height: variant.height ?? "",
    width: variant.width ?? "",
    length: variant.length ?? "",
    operating_temp_range: variant.operating_temp_range ?? "",
    shielded: variant.shielded ?? "",
    mounting_type: variant.mounting_type ?? "",
    datasheet_url: variant.datasheet_url ?? "",
    image_url: variant.image_url ?? "",
    sync_status: variant.sync_status,
    inventory_qty: variant.inventory_qty,
  };
}

const emptyDraft = (position: number): VariantDraft => ({
  sku: "",
  option1_name: "Inductance",
  option1_value: "",
  position: String(position),
  price: "",
  weight: "",
  weight_unit: "g",
  barcode: "",
  inductance: "",
  rated_current: "",
  dcr_max: "",
  height: "",
  width: "",
  length: "",
  operating_temp_range: "",
  shielded: "",
  mounting_type: "",
  datasheet_url: "",
  image_url: "",
  sync_status: "pending",
  inventory_qty: null,
});

type SaveButtonProps = {
  label: string;
};

function SaveButton({ label }: SaveButtonProps) {
  return (
    <button
      type="submit"
      className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
    >
      {label}
    </button>
  );
}

function VariantRow({
  productId,
  draft,
  onChange,
  onRemoveDraft,
}: {
  productId: string;
  draft: VariantDraft;
  onChange: (next: VariantDraft) => void;
  onRemoveDraft?: () => void;
}) {
  const initialState: SaveVariantFormState = { status: "idle", message: "" };
  const [state, formAction] = useActionState(saveVariantAction, initialState);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction}>
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="id" value={draft.id ?? ""} />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-3">
            {draft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.image_url}
                alt={draft.sku || "Variant image"}
                className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                No image
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-slate-900">
                {draft.sku || "New variant"}
              </h4>
              {draft.sync_status ? (
                <StatusBadge value={draft.sync_status} kind="sync" />
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Inventory {draft.inventory_qty ?? "N/A"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRemoveDraft ? (
              <button
                type="button"
                onClick={onRemoveDraft}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Remove draft
              </button>
            ) : null}
            <SaveButton label={draft.id ? "Save variant" : "Add variant"} />
          </div>
        </div>

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

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {[
            ["sku", "Variant SKU"],
            ["option1_name", "Option name"],
            ["option1_value", "Option value"],
            ["position", "Position"],
            ["price", "Price"],
            ["weight", "Weight"],
            ["weight_unit", "Weight unit"],
            ["barcode", "Barcode"],
            ["inductance", "Inductance"],
            ["rated_current", "Rated current"],
            ["dcr_max", "DCR max"],
            ["height", "Height"],
            ["width", "Width"],
            ["length", "Length"],
            ["operating_temp_range", "Temp range"],
            ["shielded", "Shielded"],
            ["mounting_type", "Mounting type"],
            ["datasheet_url", "Datasheet URL"],
            ["image_url", "Image URL"],
          ].map(([name, label]) => (
            <label key={name} className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <input
                name={name}
                value={draft[name as keyof VariantDraft] as string}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    [name]: event.target.value,
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </label>
          ))}
        </div>
      </form>

      {!onRemoveDraft && draft.id ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <form action={deleteVariantAction}>
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="variant_id" value={draft.id} />
            <button
              type="submit"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
            >
              Delete variant
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function VariantEditor({ productId, variants }: VariantEditorProps) {
  const [draftVariants, setDraftVariants] = useState<VariantDraft[]>(() =>
    variants.map((variant) => toDraft(variant)),
  );

  const nextPosition = useMemo(() => {
    return draftVariants.length === 0
      ? 1
      : Math.max(...draftVariants.map((variant) => Number(variant.position) || 0)) + 1;
  }, [draftVariants]);

  function updateDraft(index: number, next: VariantDraft) {
    setDraftVariants((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Variants</h3>
          <p className="mt-1 text-sm text-slate-500">
            Edit inductor SKUs and their specs directly in the product page.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setDraftVariants((current) => [...current, emptyDraft(nextPosition)])
          }
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
        >
          Add variant
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {draftVariants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h4 className="text-lg font-semibold text-slate-900">No variants yet</h4>
            <p className="mt-2 text-sm text-slate-500">
              Add one to start building the inductor SKU table.
            </p>
          </div>
        ) : (
          draftVariants.map((draft, index) => (
            <VariantRow
              key={draft.id ?? `draft-${index}`}
              productId={productId}
              draft={draft}
              onChange={(next) => updateDraft(index, next)}
              onRemoveDraft={
                draft.id
                  ? undefined
                  : () =>
                      setDraftVariants((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
