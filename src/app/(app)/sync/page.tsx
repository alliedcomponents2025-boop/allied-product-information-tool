import { formatDateTime } from "@/features/products/format";
import { ManualSyncCard } from "@/features/sync/components/manual-sync-card";
import { getSyncDashboardData } from "@/features/sync/queries";

export default async function SyncPage() {
  const syncData = await getSyncDashboardData();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Sync</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review the Shopify sync queue, recent run history, and current
              sync settings. This phase builds the internal sync workflow before
              turning on the full Shopify API job.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Source {syncData.source}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Settings snapshot</h3>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Shop domain</dt>
              <dd className="mt-1 text-slate-900">
                {syncData.settings.shopDomain ?? "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Admin token</dt>
              <dd className="mt-1 text-slate-900">
                {syncData.settings.shopifyAdminTokenConfigured
                  ? "Configured"
                  : "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Frequency</dt>
              <dd className="mt-1 text-slate-900">
                Every {syncData.settings.syncFrequencyHours} hours
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Business hours</dt>
              <dd className="mt-1 text-slate-900">
                {String(syncData.settings.businessHoursStart).padStart(2, "0")}:00 to{" "}
                {String(syncData.settings.businessHoursEnd).padStart(2, "0")}:00
              </dd>
            </div>
          </dl>
        </article>

        <ManualSyncCard />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Sync queue</h3>
          <span className="text-sm text-slate-500">
            {syncData.queue.length} queued records
          </span>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncData.queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No queued records right now.
                  </td>
                </tr>
              ) : (
                syncData.queue.map((item) => (
                  <tr key={`${item.recordType}-${item.id}`}>
                    <td className="px-4 py-4 capitalize text-slate-700">
                      {item.recordType}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">{item.sku}</td>
                    <td className="px-4 py-4 text-slate-700">{item.title ?? "Untitled"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.syncStatus}</td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.errorMessage ?? "None"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Sync history</h3>
          <span className="text-sm text-slate-500">
            {syncData.history.length} recent runs
          </span>
        </div>
        <div className="mt-5 grid gap-4">
          {syncData.history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No sync runs recorded yet.
            </div>
          ) : (
            syncData.history.map((run) => (
              <article
                key={run.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {run.status}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {run.triggerSource}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(run.startedAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  Attempted {run.recordsAttempted}, succeeded {run.recordsSucceeded},
                  failed {run.recordsFailed}.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {run.errorMessage ?? "No run level error message."}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
