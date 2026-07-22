"use client";

import { LineChart, TrendingUp } from "lucide-react";
import type { DashboardPayload } from "@/lib/types";
import { TimeSeriesChart } from "./time-series-chart";

export function AnalyticsGraphs({ data }: { data: DashboardPayload }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <div className="rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
            <LineChart className="h-4 w-4" style={{ color: "var(--wr-warn)" }} />
            Strategic reserve depletion
          </p>
          <span className="font-mono text-[11px] tabular-nums text-[var(--wr-text)]">
            {data.spr_days_remaining.toFixed(1)} d cover
          </span>
        </div>
        <TimeSeriesChart
          data={data.spr_depletion_curve}
          color="var(--wr-warn)"
          unit=" days"
          formatValue={(v) => v.toFixed(0)}
        />
      </div>

      <div className="rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
            <TrendingUp className="h-4 w-4" style={{ color: "var(--wr-crit)" }} />
            Brent price projection
          </p>
          <span className="font-mono text-[11px] tabular-nums text-[var(--wr-text)]">
            ${data.projected_brent_usd.toFixed(1)} / bbl
          </span>
        </div>
        <TimeSeriesChart
          data={data.price_projection_curve}
          color="var(--wr-crit)"
          unit=" /bbl"
          formatValue={(v) => `$${v.toFixed(0)}`}
        />
      </div>
    </div>
  );
}
