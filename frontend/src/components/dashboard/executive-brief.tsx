"use client";

import { FileText, ChevronRight } from "lucide-react";
import type { Directive, Scenario } from "@/lib/war-room-data";

const priorityColor: Record<Directive["priority"], string> = {
  CRITICAL: "var(--wr-crit)",
  HIGH: "var(--wr-warn)",
  MONITOR: "var(--wr-safe)",
};

export function ExecutiveBrief({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex h-full flex-col rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
          <FileText className="h-4 w-4" style={{ color: "var(--wr-accent)" }} />
          EXECUTIVE BRIEF
        </span>
        <span className="font-mono text-[10px] text-[var(--wr-muted)]">AGENT 3</span>
      </div>

      <div className="mb-4 border-l-2 border-[var(--wr-accent)] pl-3">
        <p className="font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
          CLASSIFICATION · DECISION-GRADE
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--wr-text)]">
          {scenario.posture === "safe"
            ? "No active intervention required. Sustain posture and monitoring cadence."
            : "Immediate action recommended. Directives ordered by operational priority."}
        </p>
      </div>

      <ol className="flex flex-1 flex-col gap-2.5">
        {scenario.brief.map((d, i) => (
          <li
            key={d.action}
            className="rounded-sm border border-[var(--wr-border)] bg-[var(--wr-bg)]/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] tabular-nums text-[var(--wr-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider"
                style={{
                  color: priorityColor[d.priority],
                  backgroundColor:
                    "color-mix(in oklch, " + priorityColor[d.priority] + " 14%, transparent)",
                }}
              >
                {d.priority}
              </span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-[var(--wr-muted)]" />
            </div>
            <p className="mt-2 text-[13px] font-medium leading-snug text-[var(--wr-text)]">
              {d.action}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--wr-muted)]">{d.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
