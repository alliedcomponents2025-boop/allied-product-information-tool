"use client";

import { useActionState } from "react";

import {
  deleteProductImageAction,
  replaceProductImageAction,
  type SaveImageFormState,
  uploadProductImageAction,
} from "@/app/(app)/products/[id]/actions";
import { ProductDetail, ProductImage } from "../types";

type ProductImagesManagerProps = {
  product: ProductDetail;
  images: ProductImage[];
  source: "mock" | "supabase";
};

function ImageActionMessage({
  status,
  message,
}: {
  status: SaveImageFormState["status"];
  message: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        status === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {message}
    </div>
  );
}

function ReplaceImageForm({
  product,
  image,
}: {
  product: ProductDetail;
  image: ProductImage;
}) {
  const initialState: SaveImageFormState = { status: "idle", message: "" };
  const [state, formAction] = useActionState(replaceProductImageAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="image_id" value={image.id} />
      <input type="hidden" name="product_id" value={product.id} />
      <input type="hidden" name="family" value={product.family} />
      <input type="hidden" name="sku" value={product.sku} />
      <input type="hidden" name="sequence" value={image.sequence ?? 1} />
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-slate-600">
          Replace image
        </span>
        <input
          type="file"
          name="image"
          accept=".jpg,.jpeg,.png"
          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
      >
        Replace
      </button>
      <ImageActionMessage status={state.status} message={state.message} />
    </form>
  );
}

export function ProductImagesManager({
  product,
  images,
  source,
}: ProductImagesManagerProps) {
  const initialState: SaveImageFormState = { status: "idle", message: "" };
  const [uploadState, uploadAction] = useActionState(
    uploadProductImageAction,
    initialState,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Images</h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload JPG or PNG images up to 20 MB. Stored filename follows the SKU,
            date, and sequence rule.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Source {source}
        </span>
      </div>

      <form action={uploadAction} className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="family" value={product.family} />
        <input type="hidden" name="sku" value={product.sku} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Add image
              </span>
              <input
                type="file"
                name="image"
                accept=".jpg,.jpeg,.png"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
              />
            </label>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            Upload image
          </button>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          Generated format: {product.sku}_YYYYMMDD_NN.jpg
        </div>
        <div className="mt-4">
          <ImageActionMessage
            status={uploadState.status}
            message={uploadState.message}
          />
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {images.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center md:col-span-2 xl:col-span-3">
            <h4 className="text-lg font-semibold text-slate-900">No images yet</h4>
            <p className="mt-2 text-sm text-slate-500">
              Upload the first product image to start the gallery.
            </p>
          </div>
        ) : (
          images.map((image) => (
            <article
              key={image.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
            >
              <div className="aspect-[4/3] bg-slate-200">
                {image.public_url ? (
                  <img
                    src={image.public_url}
                    alt={image.original_filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Preview unavailable
                  </div>
                )}
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {image.original_filename}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{image.storage_path}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sequence {image.sequence ?? "N/A"}
                  </p>
                </div>

                <ReplaceImageForm product={product} image={image} />

                <form action={deleteProductImageAction}>
                  <input type="hidden" name="image_id" value={image.id} />
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="storage_path" value={image.storage_path} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                  >
                    Delete image
                  </button>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
