"use client";

import { AlertTriangle, Factory } from "lucide-react";
import type { DashboardPayload, RefineryImpact } from "@/lib/types";

function utilTone(pct: number): string {
  if (pct >= 90) return "var(--wr-safe)";
  if (pct >= 70) return "var(--wr-warn)";
  return "var(--wr-crit)";
}

function RefineryCard({ r }: { r: RefineryImpact }) {
  const alert = r.chemical_slate_alert === true;
  const tone = utilTone(r.capacity_utilization_pct);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 ${
        alert
          ? "border-[color:color-mix(in_oklch,var(--wr-crit)_35%,transparent)] bg-[color:color-mix(in_oklch,var(--wr-crit)_7%,transparent)]"
          : "border-[var(--wr-border)] bg-[var(--wr-panel)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
          <Factory className="h-4 w-4" style={{ color: tone }} />
          {r.refinery_name}
        </span>
        {alert && (
          <span className="inline-flex items-center gap-1 rounded-md border border-[color:color-mix(in_oklch,var(--wr-crit)_35%,transparent)] bg-[color:color-mix(in_oklch,var(--wr-crit)_14%,transparent)] px-2 py-0.5 font-mono text-[9.5px] tracking-wider text-[var(--wr-crit)]">
            <AlertTriangle className="h-3 w-3" />
            SLATE ALERT
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className="font-mono text-3xl font-semibold tabular-nums tracking-tight"
          style={{ color: tone }}
        >
          {r.capacity_utilization_pct.toFixed(0)}
        </span>
        <span className="font-mono text-sm text-[var(--wr-muted)]">% utilization</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--wr-border)]">
        <div
          className="wr-meter-fill h-full rounded-full"
          style={{ width: `${Math.min(100, r.capacity_utilization_pct)}%`, backgroundColor: tone }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11px]">
        <div>
          <p className="text-[var(--wr-muted)]">Run days left</p>
          <p className="mt-0.5 text-[15px] tabular-nums text-[var(--wr-text)]">
            {r.operating_run_days_remaining.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-[var(--wr-muted)]">Shortfall b/d</p>
          <p className="mt-0.5 text-[15px] tabular-nums text-[var(--wr-text)]">
            {r.shortfall_barrels_per_day.toLocaleString()}
          </p>
        </div>
      </div>

      {alert && r.alert_message && (
        <p className="mt-3 text-[12px] leading-snug text-[var(--wr-crit)]">{r.alert_message}</p>
      )}
    </div>
  );
}

export function RefineryHealthCards({ data }: { data: DashboardPayload }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.refinery_impacts.map((r) => (
        <RefineryCard key={r.refinery_name} r={r} />
      ))}
    </div>
  );
}
