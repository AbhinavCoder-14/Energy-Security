"use client";

import { Ship } from "lucide-react";
import { threatOf, type Scenario, type ThreatLevel } from "@/lib/war-room-data";

const color: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

const label: Record<ThreatLevel, string> = {
  safe: "CLEAR",
  warn: "ELEVATED",
  crit: "CRITICAL",
};

export function ChokepointMatrix({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex h-full flex-col rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
          <Ship className="h-4 w-4" style={{ color: "var(--wr-accent)" }} />
          CHOKEPOINT RISK MATRIX
        </span>
        <span className="font-mono text-[10px] text-[var(--wr-muted)]">AGENT 1</span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3.5">
        {scenario.chokepoints.map((c) => {
          const tone = threatOf(c.risk);
          return (
            <div key={c.name}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[var(--wr-text)]">{c.name}</span>
                  <span className="font-mono text-[10px] text-[var(--wr-muted)]">{c.route}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--wr-muted)]">{c.flow}</span>
                  <span
                    className="w-16 text-right font-mono text-[11px] font-semibold tabular-nums"
                    style={{ color: color[tone] }}
                  >
                    {label[tone]}
                  </span>
                </div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-[var(--wr-bg)]">
                <div
                  className="wr-meter-fill absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${c.risk}%`, backgroundColor: color[tone] }}
                />
                <span className="absolute inset-y-0 left-[40%] w-px bg-[var(--wr-border)]" />
                <span className="absolute inset-y-0 left-[70%] w-px bg-[var(--wr-border)]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
