"use client";

import { healthThreat, type Scenario, type ThreatLevel } from "@/lib/war-room-data";
import { useMeterStagger } from "./use-scenario-motion";

const barColor: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

export function RefineryHealth({ scenario }: { scenario: Scenario }) {
  const rootRef = useMeterStagger(scenario.id);

  return (
    <div
      ref={rootRef}
      className="wr-batch flex h-full flex-col rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-6 lg:p-7"
    >
      <header className="mb-6">
        <h3 className="font-display text-2xl tracking-tight text-[var(--wr-text)]">
          Refinery health
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--wr-muted)]">
          Structural intake score and feedstock status for key plants.
        </p>
      </header>

      <ul className="flex flex-1 flex-col divide-y divide-[var(--wr-border)]">
        {scenario.refineries.map((r) => {
          const tone = healthThreat(r.health);
          const color = barColor[tone];
          return (
            <li key={r.name} className="py-4 first:pt-0 last:pb-0" data-stagger>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium tracking-tight text-[var(--wr-text)]">
                    {r.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--wr-muted)]">
                    {r.location}
                    <span className="mx-1.5 opacity-40" aria-hidden>
                      ·
                    </span>
                    {r.crude}
                  </p>
                </div>
                <span
                  className="tnum shrink-0 font-mono text-2xl font-semibold tabular-nums leading-none"
                  style={{ color }}
                >
                  {r.health}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--wr-bg)]">
                  <div
                    data-meter
                    data-value={r.health}
                    className="h-full w-full origin-left rounded-full will-change-transform"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <span className="shrink-0 text-[12px] font-medium" style={{ color }}>
                  {r.status}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
