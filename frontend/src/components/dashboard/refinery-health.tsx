"use client";

import { Factory } from "lucide-react";
import { healthThreat, type Scenario, type ThreatLevel } from "@/lib/war-room-data";

const color: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

export function RefineryHealth({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex h-full flex-col rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
          <Factory className="h-4 w-4" style={{ color: "var(--wr-accent)" }} />
          REFINERY STRUCTURAL HEALTH
        </span>
        <span className="font-mono text-[10px] text-[var(--wr-muted)]">AGENT 1</span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {scenario.refineries.map((r) => {
          const tone = healthThreat(r.health);
          return (
            <div
              key={r.name}
              className="flex flex-col justify-between rounded-sm border border-[var(--wr-border)] bg-[var(--wr-bg)]/50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-medium text-[var(--wr-text)]">{r.name}</div>
                  <div className="font-mono text-[10px] text-[var(--wr-muted)]">{r.location}</div>
                </div>
                <span
                  className="font-mono text-lg font-semibold tabular-nums leading-none"
                  style={{ color: color[tone] }}
                >
                  {r.health}
                </span>
              </div>

              <div className="mt-3">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--wr-panel-2)]">
                  <div
                    className="wr-meter-fill absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${r.health}%`, backgroundColor: color[tone] }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[var(--wr-muted)]">{r.crude}</span>
                  <span className="font-mono text-[10px] font-medium" style={{ color: color[tone] }}>
                    {r.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
