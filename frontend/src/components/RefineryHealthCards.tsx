"use client";

import { AlertTriangle, FlaskConical } from "lucide-react";
import type { RefineryImpact } from "@/lib/types";

/* Static domain knowledge (crude slate + nameplate capacity) mirrored from
   backend INDIA_REFINERY_SLATE_MATRIX. Not a live calculation. */
const REFINERY_META: Record<
  string,
  { name: string; slate: string; slateKind: "sour" | "blend"; capacityKbpd: number }
> = {
  IOCL_Paradip: {
    name: "IOCL Paradip",
    slate: "Heavy-Sour",
    slateKind: "sour",
    capacityKbpd: 300,
  },
  RIL_Jamnagar: {
    name: "RIL Jamnagar",
    slate: "Ultra-Heavy Sour",
    slateKind: "sour",
    capacityKbpd: 1240,
  },
  BPCL_Kochi: {
    name: "BPCL Kochi",
    slate: "Medium-Sour / Light-Sweet",
    slateKind: "blend",
    capacityKbpd: 310,
  },
};

function runTone(days: number) {
  if (days < 5) return "text-alert";
  if (days < 8) return "text-amber";
  return "text-safe";
}

interface Props {
  refineries: RefineryImpact[];
}

export function RefineryHealthCards({ refineries }: Props) {
  return (
    <section className="flex h-full flex-col">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-2xl tracking-tight text-primary">
          Refinery structural health
        </h2>
      </div>

      <div className="grid flex-1 gap-3">
        {refineries.map((r) => {
          const meta = REFINERY_META[r.refinery_name] ?? {
            name: r.refinery_name.replace(/_/g, " "),
            slate: "Unspecified",
            slateKind: "blend" as const,
            capacityKbpd: 0,
          };
          const util = Math.max(0, Math.min(100, r.capacity_utilization_pct));
          const lowRun = r.operating_run_days_remaining < 5;

          return (
            <article
              key={r.refinery_name}
              className="panel p-4 transition-colors duration-200 hover:border-hairline-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold tracking-subhead text-primary">
                    {meta.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-mute">
                    {meta.capacityKbpd.toLocaleString()} kbpd nameplate
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] font-medium",
                    meta.slateKind === "sour"
                      ? "border-amber/20 bg-amber/10 text-amber"
                      : "border-hairline-strong bg-surface-2 text-secondary",
                  ].join(" ")}
                >
                  <FlaskConical className="h-3 w-3" aria-hidden />
                  {meta.slate}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-mute">Capacity utilization</span>
                  <span className="tnum text-secondary">{util.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-strong/40">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      util < 85 ? "bg-amber" : "bg-safe"
                    }`}
                    style={{ width: `${util}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-hairline/60 pt-3">
                <div className="flex items-center gap-2">
                  {lowRun && (
                    <AlertTriangle className="h-3.5 w-3.5 text-alert" aria-hidden />
                  )}
                  <span className="font-mono text-[11px] text-mute">Run-days</span>
                  <span
                    className={`tnum font-mono text-[15px] font-semibold ${runTone(
                      r.operating_run_days_remaining,
                    )}`}
                  >
                    {r.operating_run_days_remaining.toFixed(1)}
                  </span>
                </div>
                <span className="tnum font-mono text-[11px] text-mute">
                  {r.shortfall_barrels_per_day.toLocaleString()} bbl/d short
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
