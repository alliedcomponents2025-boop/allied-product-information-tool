import Link from "next/link";

import { formatDateTime } from "../format";
import { DashboardActivityItem } from "../types";

type DashboardActivityFeedProps = {
  items: DashboardActivityItem[];
};

function summarizeFields(item: DashboardActivityItem) {
  const names = Object.keys(item.changed_fields ?? {}).slice(0, 4);
  return names.length > 0 ? names.join(", ") : "tracked fields";
}

export function DashboardActivityFeed({ items }: DashboardActivityFeedProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No recent activity yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.table_name}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.action}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDateTime(item.created_at)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {item.user_email ?? "Unknown user"} updated {summarizeFields(item)} on{" "}
                {item.product_id ? (
                  <Link
                    href={`/products/${item.product_id}`}
                    className="font-medium text-violet-700"
                  >
                    {item.product_sku ?? item.product_title ?? "product"}
                  </Link>
                ) : (
                  "a record"
                )}
                .
              </p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
