import { AuditLogEntry } from "../types";
import { formatDateTime } from "../format";

type AuditLogPreviewProps = {
  entries: AuditLogEntry[];
  source: "mock" | "supabase";
};

function formatChangedFields(entry: AuditLogEntry) {
  return Object.keys(entry.changed_fields ?? {}).slice(0, 4).join(", ");
}

export function AuditLogPreview({ entries, source }: AuditLogPreviewProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Recent audit log</h3>
          <p className="mt-1 text-sm text-slate-500">
            Source {source}. Full audit page comes in a later phase.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No audit entries yet for this product.
          </div>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {entry.table_name}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {entry.action}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {entry.user_email ?? "Unknown user"} changed{" "}
                {formatChangedFields(entry) || "tracked fields"}.
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
