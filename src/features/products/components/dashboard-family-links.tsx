import Link from "next/link";

import { familyLabels, familyTabOrder } from "../config";

export function DashboardFamilyLinks() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Quick links</h3>
      <div className="mt-5 grid gap-3">
        {familyTabOrder.map((family) => (
          <Link
            key={family}
            href={`/products?family=${family}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
          >
            {familyLabels[family]}
          </Link>
        ))}
      </div>
    </article>
  );
}
