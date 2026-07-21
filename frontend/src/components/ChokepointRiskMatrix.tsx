"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { RouteRisk } from "@/lib/types";

const ROUTE_META: Record<string, { name: string; corridor: string }> = {
  Strait_of_Hormuz: { name: "Strait of Hormuz", corridor: "Persian Gulf · 45% import share" },
  Bab_el_Mandeb: { name: "Bab-el-Mandeb", corridor: "Red Sea · 15% import share" },
  Suez_Canal: { name: "Suez Canal", corridor: "Mediterranean · 8% import share" },
};

function tone(score: number) {
  if (score >= 70) return { bar: "bg-alert", text: "text-alert", ring: "border-alert/25 bg-alert/10", label: "CRITICAL" };
  if (score >= 40) return { bar: "bg-amber", text: "text-amber", ring: "border-amber/25 bg-amber/10", label: "ELEVATED" };
  return { bar: "bg-safe", text: "text-safe", ring: "border-safe/25 bg-safe/10", label: "NOMINAL" };
}

interface Props {
  threats: RouteRisk[];
}

export function ChokepointRiskMatrix({ threats }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-2xl tracking-tight text-primary">
          Chokepoint risk matrix
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {threats.map((t) => {
          const meta = ROUTE_META[t.route_name] ?? {
            name: t.route_name.replace(/_/g, " "),
            corridor: "Maritime transit corridor",
          };
          const score = t.base_risk_score;
          const c = tone(score);
          const up = t.risk_delta > 0;
          return (
            <article
              key={t.route_name}
              className="panel p-5 transition-colors duration-200 hover:border-hairline-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold tracking-subhead text-primary">
                    {meta.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-mute">
                    {meta.corridor}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] font-medium tracking-wide ${c.ring} ${c.text}`}
                >
                  {c.label}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className={`tnum font-mono text-[40px] font-semibold leading-none tracking-heading ${c.text}`}>
                    {score.toFixed(0)}
                  </span>
                  <span className="font-mono text-[13px] text-mute">/100</span>
                </div>
                {t.risk_delta !== 0 && (
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[12px] font-medium",
                      up ? "bg-alert/12 text-alert" : "bg-safe/12 text-safe",
                    ].join(" ")}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" aria-hidden />
                    )}
                    {up ? "+" : ""}
                    {t.risk_delta.toFixed(1)} vs 30d
                  </span>
                )}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-hairline-strong/40">
                <div
                  className={`h-full rounded-full ${c.bar} transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
                />
              </div>

              <div className="mt-4 space-y-1 border-t border-hairline/60 pt-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                  Primary Threat Driver
                </p>
                <p className="text-[13px] leading-5 text-secondary">
                  {t.primary_threat_driver}
                </p>
              </div>

              <p className="mt-3 font-mono text-[11px] text-mute">
                Model confidence{" "}
                <span className="text-secondary">
                  {t.confidence_score.toFixed(0)}%
                </span>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
