import { cn } from "@/lib/utils";

import { ProductStatus, SyncStatus } from "../types";

type StatusBadgeProps = {
  value: ProductStatus | SyncStatus;
  kind: "product" | "sync";
};

const styles = {
  active: "bg-emerald-100 text-emerald-800",
  draft: "bg-amber-100 text-amber-900",
  archived: "bg-slate-200 text-slate-700",
  pending: "bg-amber-100 text-amber-900",
  synced: "bg-emerald-100 text-emerald-800",
  error: "bg-rose-100 text-rose-800",
} as const;

export function StatusBadge({ value, kind }: StatusBadgeProps) {
  const label = value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[value],
        kind === "sync" ? "min-w-20 justify-center" : "",
      )}
    >
      {label}
    </span>
  );
}
