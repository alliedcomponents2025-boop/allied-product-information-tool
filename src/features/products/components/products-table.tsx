import Link from "next/link";

import { formatDateTime } from "../format";
import { ProductListItem } from "../types";
import { StatusBadge } from "./status-badge";

type ProductsTableProps = {
  items: ProductListItem[];
};

export function ProductsTable({ items }: ProductsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
        <p className="mt-2 text-sm text-slate-500">
          Try a different search or filter to find inductor products.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Variants</th>
              <th className="px-4 py-3 font-medium">Last edited by</th>
              <th className="px-4 py-3 font-medium">Last edited at</th>
              <th className="px-4 py-3 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-medium text-slate-900">
                  <Link href={`/products/${item.id}`} className="hover:text-violet-700">
                    {item.sku}
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-700">{item.title}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.status} kind="product" />
                </td>
                <td className="px-4 py-4 text-slate-700">{item.variant_count}</td>
                <td className="px-4 py-4 text-slate-700">
                  {item.last_edited_by_email ?? "Unknown"}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatDateTime(item.updated_at)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.sync_status} kind="sync" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:hidden">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.sku}</p>
                <p className="mt-1 text-sm text-slate-600">{item.title}</p>
              </div>
              <StatusBadge value={item.sync_status} kind="sync" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge value={item.status} kind="product" />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {item.variant_count} variants
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Last edited {formatDateTime(item.updated_at)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
