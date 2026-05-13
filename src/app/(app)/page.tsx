import { DashboardActivityFeed } from "@/features/products/components/dashboard-activity-feed";
import { DashboardFamilyLinks } from "@/features/products/components/dashboard-family-links";
import { getDashboardOverview } from "@/features/products/queries";

const statNotes = {
  totalProducts: "Product family records in the directory",
  pendingSync: "Records waiting for the next Shopify sync batch",
  syncErrors: "Records that need sync review",
  recentEdits: "Recent tracked changes in the audit log",
};

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const stats = [
    {
      label: "Total products",
      value: String(overview.stats.totalProducts),
      note: statNotes.totalProducts,
    },
    {
      label: "Pending sync",
      value: String(overview.stats.pendingSync),
      note: statNotes.pendingSync,
    },
    {
      label: "Sync errors",
      value: String(overview.stats.syncErrors),
      note: statNotes.syncErrors,
    },
    {
      label: "Recent edits",
      value: String(overview.stats.recentEdits),
      note: statNotes.recentEdits,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-linear-to-r from-violet-900 to-violet-700 px-6 py-8 text-white">
        <p className="text-sm font-medium text-violet-100">Phase 5 dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold">Allied product directory</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100">
          This dashboard gives operations and sales a quick read on product volume,
          sync state, and recent edits across the catalog.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{stat.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <DashboardActivityFeed items={overview.activity} />
        <DashboardFamilyLinks />
      </section>
    </div>
  );
}
