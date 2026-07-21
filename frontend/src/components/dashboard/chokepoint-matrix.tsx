"use client";

import { threatOf, type Scenario, type ThreatLevel } from "@/lib/war-room-data";
import { useMeterStagger } from "./use-scenario-motion";

const barColor: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

const statusLabel: Record<ThreatLevel, string> = {
  safe: "Clear",
  warn: "Elevated",
  crit: "Critical",
};

export function ChokepointMatrix({ scenario }: { scenario: Scenario }) {
  const rootRef = useMeterStagger(scenario.id);

  return (
    <div
      ref={rootRef}
      className="wr-batch flex h-full flex-col rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-6 lg:p-7"
    >
      <header className="mb-6">
        <h3 className="font-display text-2xl tracking-tight text-[var(--wr-text)]">
          Shipping routes
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--wr-muted)]">
          Risk score for each maritime chokepoint under this scenario.
        </p>
      </header>

      <ul className="flex flex-1 flex-col gap-5">
        {scenario.chokepoints.map((c) => {
          const tone = threatOf(c.risk);
          const color = barColor[tone];
          return (
            <li key={c.name} data-stagger>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium tracking-tight text-[var(--wr-text)]">
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--wr-muted)]">
                    {c.route}
                    <span className="mx-1.5 opacity-40" aria-hidden>
                      ·
                    </span>
                    <span className="tnum font-mono">{c.flow}</span>
                  </p>
                  {c.driver && (
                    <p className="mt-1 text-[12px] leading-snug text-[var(--wr-muted)]/90">
                      {c.driver}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      color,
                      backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
                    }}
                  >
                    {statusLabel[tone]}
                  </span>
                  <span
                    className="tnum font-mono text-[13px] font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {c.risk}
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--wr-bg)]">
                <div
                  data-meter
                  data-value={c.risk}
                  className="h-full w-full origin-left rounded-full will-change-transform"
                  style={{ backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
