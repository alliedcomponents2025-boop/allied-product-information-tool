import Link from "next/link";

import { familyLabels, familyTabOrder, productStatusLabels, syncStatusLabels } from "@/features/products/config";
import { ProductsBulkPanel } from "@/features/products/components/products-bulk-panel";
import { ProductsTable } from "@/features/products/components/products-table";
import { listProducts } from "@/features/products/queries";
import { ProductStatus, SyncStatus } from "@/features/products/types";

type ProductsPageProps = {
  searchParams?: Promise<{
    family?: string;
    q?: string;
    status?: string;
    sync?: string;
    tag?: string;
    page?: string;
  }>;
};

function buildQueryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all" && value !== "") {
      search.set(key, value);
    }
  });

  return search.toString();
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = (await searchParams) ?? {};
  const family = familyTabOrder.includes(params.family as never)
    ? (params.family as keyof typeof familyLabels)
    : "inductors";
  const page = Number(params.page ?? "1");
  const filters = {
    family,
    query: params.q ?? "",
    status: (params.status as ProductStatus | "all") ?? "all",
    syncStatus: (params.sync as SyncStatus | "all") ?? "all",
    tag: params.tag ?? "all",
    page: Number.isNaN(page) ? 1 : page,
    pageSize: 50,
  };
  const result = await listProducts(filters);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Products</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage family level product records for Allied. Inductors are live in
              this phase. The remaining families are scaffolded for later work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Source {result.source}
            </span>
            <button
              type="button"
              disabled
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white opacity-60"
            >
              New product
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {familyTabOrder.map((item) => {
            const query = buildQueryString({
              family: item,
              q: params.q,
              status: params.status,
              sync: params.sync,
              tag: params.tag,
            });

            return (
              <Link
                key={item}
                href={`/products${query ? `?${query}` : ""}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  item === family
                    ? "bg-violet-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {familyLabels[item]}
              </Link>
            );
          })}
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <input type="hidden" name="family" value={family} />
          <input
            type="search"
            name="q"
            defaultValue={filters.query}
            placeholder="Search SKU or title"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All statuses</option>
            {Object.entries(productStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="sync"
            defaultValue={filters.syncStatus}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All sync states</option>
            {Object.entries(syncStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="tag"
            defaultValue={filters.tag}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All tags</option>
            {result.availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
        </form>
      </section>

      <ProductsBulkPanel items={result.items} />

      <ProductsTable items={result.items} />

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing {result.items.length} of {result.totalCount} products
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/products?${buildQueryString({
              family,
              q: filters.query,
              status: filters.status,
              sync: filters.syncStatus,
              tag: filters.tag,
              page: String(Math.max(filters.page - 1, 1)),
            })}`}
            className={`rounded-xl border px-3 py-2 text-sm ${
              filters.page <= 1
                ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Previous
          </Link>
          <span className="text-sm text-slate-600">
            Page {filters.page} of {result.totalPages}
          </span>
          <Link
            href={`/products?${buildQueryString({
              family,
              q: filters.query,
              status: filters.status,
              sync: filters.syncStatus,
              tag: filters.tag,
              page: String(Math.min(filters.page + 1, result.totalPages)),
            })}`}
            className={`rounded-xl border px-3 py-2 text-sm ${
              filters.page >= result.totalPages
                ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Next
          </Link>
        </div>
      </section>
    </div>
  );
}
