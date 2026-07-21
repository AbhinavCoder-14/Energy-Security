"use client";

import type { Directive, Scenario } from "@/lib/war-room-data";
import { useScenarioStagger } from "./use-scenario-motion";

const priorityMeta: Record<
  Directive["priority"],
  { label: string; color: string }
> = {
  CRITICAL: { label: "Critical", color: "var(--wr-crit)" },
  HIGH: { label: "High", color: "var(--wr-warn)" },
  MONITOR: { label: "Monitor", color: "var(--wr-safe)" },
};

export function ExecutiveBrief({ scenario }: { scenario: Scenario }) {
  const rootRef = useScenarioStagger(scenario.id, { y: 12, stagger: 0.06 });

  const summary =
    scenario.posture === "safe"
      ? "No intervention needed. Hold current procurement and monitoring posture."
      : "Act on these directives in order. Highest urgency first.";

  return (
    <div
      ref={rootRef}
      className="wr-batch rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-6 lg:p-8"
    >
      <header className="mb-6 max-w-2xl">
        <h3 className="font-display text-2xl tracking-tight text-[var(--wr-text)] lg:text-3xl">
          What to do next
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--wr-muted)]">{summary}</p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {scenario.brief.map((d, i) => {
          const priority = priorityMeta[d.priority];
          return (
            <li
              key={`${scenario.id}-${d.action}`}
              data-stagger
              className="flex flex-col rounded-xl border border-[var(--wr-border)] bg-[var(--wr-bg)]/50 p-5 transition-colors duration-200 hover:bg-[var(--wr-panel-2)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="tnum font-mono text-[12px] tabular-nums text-[var(--wr-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: priority.color,
                    backgroundColor: `color-mix(in oklch, ${priority.color} 12%, transparent)`,
                  }}
                >
                  {priority.label}
                </span>
              </div>
              <p className="mt-3 text-balance text-[15px] font-medium leading-snug tracking-tight text-[var(--wr-text)]">
                {d.action}
              </p>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--wr-muted)]">
                {d.detail}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
