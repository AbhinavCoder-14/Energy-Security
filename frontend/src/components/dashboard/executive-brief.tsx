"use client";

import ReactMarkdown from "react-markdown";
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
      : "Act on these directives in order. Highest urgency first — slate chemistry matched.";

  return (
    <div
      ref={rootRef}
      className="wr-batch rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-6 lg:p-8"
    >
      <header className="mb-6 max-w-3xl">
        <h3 className="font-display text-2xl tracking-tight text-[var(--wr-text)] lg:text-3xl">
          What to do next
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--wr-muted)]">{summary}</p>
        {scenario.memo && (
          <div className="mt-4 rounded-xl border border-[var(--wr-border)] bg-[var(--wr-bg)]/40 p-4">
            <p className="mb-3 font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
              AGENT 3 · EXECUTIVE MEMO
            </p>
            <div className="memo-md text-[13px] leading-relaxed text-[var(--wr-text)]">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h4 className="mb-2 font-display text-lg tracking-tight text-[var(--wr-text)]">
                      {children}
                    </h4>
                  ),
                  h2: ({ children }) => (
                    <h4 className="mb-2 font-display text-lg tracking-tight text-[var(--wr-text)]">
                      {children}
                    </h4>
                  ),
                  h3: ({ children }) => (
                    <h4 className="mb-2 font-display text-base tracking-tight text-[var(--wr-text)]">
                      {children}
                    </h4>
                  ),
                  h4: ({ children }) => (
                    <h5 className="mb-2 mt-3 font-medium text-[var(--wr-text)]">{children}</h5>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2.5 last:mb-0 text-[var(--wr-muted)]">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--wr-text)]">{children}</strong>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 list-decimal space-y-1.5 pl-5 text-[var(--wr-muted)]">
                      {children}
                    </ol>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 list-disc space-y-1.5 pl-5 text-[var(--wr-muted)]">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                }}
              >
                {scenario.memo}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenario.brief.map((d, i) => {
          const priority = priorityMeta[d.priority];
          return (
            <li
              key={`${scenario.id}-${d.action}-${i}`}
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
              {d.source_region && (
                <p className="mt-1 font-mono text-[11px] text-[var(--wr-muted)]">
                  {d.source_region}
                </p>
              )}
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--wr-muted)]">
                {d.detail}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-[var(--wr-muted)]">
                {typeof d.volume_mbpd === "number" && (
                  <span className="rounded-md border border-[var(--wr-border)] px-1.5 py-0.5">
                    {d.volume_mbpd} MBPD
                  </span>
                )}
                {typeof d.estimated_delivery_days === "number" && (
                  <span className="rounded-md border border-[var(--wr-border)] px-1.5 py-0.5">
                    {d.estimated_delivery_days}d transit
                  </span>
                )}
                {typeof d.financial_cost_multiplier === "number" && (
                  <span className="rounded-md border border-[var(--wr-border)] px-1.5 py-0.5">
                    ×{d.financial_cost_multiplier.toFixed(2)} cost
                  </span>
                )}
              </div>
              {d.crude_slate_compatibility && (
                <p className="mt-2 text-[11px] leading-snug text-[var(--wr-accent)]">
                  Slate: {d.crude_slate_compatibility}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
