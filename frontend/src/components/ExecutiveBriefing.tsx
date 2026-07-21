"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ExecutiveSummary, ProcurementAction } from "@/lib/types";

interface Props {
  data: ExecutiveSummary | null;
}

type MemoKpi = { label: string; value: string };

const PRIORITY_BADGE: Record<number, string> = {
  1: "border-alert/25 bg-alert/10 text-alert",
  2: "border-amber/25 bg-amber/10 text-amber",
  3: "border-hairline bg-surface-2 text-secondary",
};

function extractMemoKpis(memo: string): MemoKpi[] {
  const kpis: MemoKpi[] = [];

  const mbpd = memo.match(/\*\*([\d.]+)\s*MBPD\*\*/i);
  if (mbpd) kpis.push({ label: "Import at risk", value: `${mbpd[1]} MBPD` });

  const days = memo.match(/\*\*([\d.]+)\s*days?\*\*/i);
  if (days) kpis.push({ label: "Reserve cover", value: `${days[1]} days` });

  const scenario = memo.match(/\*\*CRISIS ALERT:\*\*\s*([^\n*]+)/i);
  if (scenario) {
    kpis.push({
      label: "Scenario",
      value: scenario[1].trim().replace(/_/g, " ").toLowerCase(),
    });
  }

  return kpis.slice(0, 3);
}

function formatRegion(region: string) {
  return region.replace(/_/g, " ");
}

function ActionCard({ action }: { action: ProcurementAction }) {
  const priorityClass =
    PRIORITY_BADGE[action.priority_rank] ??
    "border-hairline bg-surface-2 text-secondary";

  return (
    <li className="rounded-xl border border-hairline bg-canvas/40 p-4 transition-colors duration-200 hover:border-hairline-strong hover:bg-canvas/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={[
              "grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-[11px] font-semibold tracking-[0.04rem]",
              priorityClass,
            ].join(" ")}
            aria-label={`Priority ${action.priority_rank}`}
          >
            {action.priority_rank}
          </span>
          <h4 className="text-[14px] font-semibold leading-snug tracking-[0.04rem] text-primary">
            {action.action_type}
          </h4>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <MetricBadge label="Volume" value={`${action.volume_mbpd} MBPD`} mono />
        <MetricBadge
          label="Delivery"
          value={`${action.estimated_delivery_days}d`}
          mono
        />
        <MetricBadge
          label="Cost factor"
          value={`×${action.financial_cost_multiplier}`}
          mono
        />
      </div>

      <p className="mt-3 text-[12px] leading-snug tracking-[0.04rem] text-mute">
        {formatRegion(action.source_region)}
        <span className="text-mute" aria-hidden>
          {" "}
          ·{" "}
        </span>
        {action.crude_slate_compatibility}
      </p>

      <p className="mt-2.5 max-w-[65ch] text-[13px] leading-[1.55] tracking-[0.04rem] text-secondary">
        {action.action_justification}
      </p>
    </li>
  );
}

function MetricBadge({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex flex-col gap-0.5 rounded-lg border border-hairline bg-surface-2/80 px-2.5 py-1.5">
      <span className="text-[10px] font-medium leading-none tracking-[0.04rem] text-mute">
        {label}
      </span>
      <span
        className={[
          "text-[12px] font-semibold leading-none tracking-[0.04rem] text-primary",
          mono ? "tnum font-mono" : "font-sans",
        ].join(" ")}
      >
        {value}
      </span>
    </span>
  );
}

function MemoKpiStrip({ kpis }: { kpis: MemoKpi[] }) {
  if (kpis.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Key briefing metrics">
      {kpis.map((kpi) => (
        <span
          key={kpi.label}
          className="inline-flex flex-col gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2"
        >
          <span className="text-[10px] font-medium leading-none tracking-[0.04rem] text-mute">
            {kpi.label}
          </span>
          <span
            className={[
              "text-[13px] font-semibold leading-none tracking-[0.04rem] text-primary",
              kpi.value.match(/\d/) ? "tnum font-mono" : "font-sans capitalize",
            ].join(" ")}
          >
            {kpi.value}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ExecutiveBriefing({ data }: Props) {
  const [copied, setCopied] = useState(false);

  const memoKpis = useMemo(
    () => (data?.actionable_memo ? extractMemoKpis(data.actionable_memo) : []),
    [data?.actionable_memo],
  );

  const sortedActions = useMemo(
    () =>
      data?.recommended_actions
        .slice()
        .sort((a, b) => a.priority_rank - b.priority_rank) ?? [],
    [data?.recommended_actions],
  );

  const copyMemo = async () => {
    if (!data?.actionable_memo) return;
    try {
      await navigator.clipboard.writeText(data.actionable_memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section
      className="panel flex h-full flex-col overflow-hidden bg-surface"
      aria-label="Executive briefing"
    >
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-hairline bg-surface-2/60 text-mute">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[18px] tracking-tight text-primary">
              Executive briefing
            </h2>
            <p className="mt-0.5 text-[11px] tracking-[0.04rem] text-mute">
              Strategic directive & procurement plan
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={copyMemo}
          disabled={!data}
          aria-label={copied ? "Memo copied" : "Copy briefing memo"}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 text-[12px] font-medium tracking-[0.04rem] text-secondary transition-colors duration-200 hover:border-hairline-strong hover:bg-canvas hover:text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-safe" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy memo
            </>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {data ? (
          <>
            <MemoKpiStrip kpis={memoKpis} />

            <article className="max-w-[65ch] text-[14px] leading-[1.65] tracking-[0.04rem] text-secondary">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h3 className="mb-3 text-balance text-[16px] font-semibold leading-snug tracking-[0.04rem] text-primary normal-case">
                      {children}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="mb-2 mt-5 text-balance text-[15px] font-semibold leading-snug tracking-[0.04rem] text-primary normal-case">
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="mb-2 mt-4 text-[14px] font-semibold leading-snug tracking-[0.04rem] text-primary normal-case">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-secondary">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-primary">
                      {children}
                    </strong>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 list-decimal space-y-2 pl-5 marker:text-mute">
                      {children}
                    </ol>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 list-disc space-y-2 pl-5 marker:text-mute">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="pl-0.5 text-secondary">{children}</li>
                  ),
                  code: ({ children }) => (
                    <code className="tnum rounded-md border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-primary">
                      {children}
                    </code>
                  ),
                }}
              >
                {data.actionable_memo}
              </ReactMarkdown>
            </article>

            {sortedActions.length > 0 && (
              <section
                className="mt-6 border-t border-hairline pt-5"
                aria-labelledby="procurement-actions-heading"
              >
                <h3
                  id="procurement-actions-heading"
                  className="text-[13px] font-semibold tracking-[0.04rem] text-primary"
                >
                  Recommended procurement actions
                </h3>
                <p className="mt-1 text-[12px] tracking-[0.04rem] text-mute">
                  Ranked by operational urgency
                </p>
                <ul className="mt-4 space-y-3">
                  {sortedActions.map((action) => (
                    <ActionCard
                      key={`${action.priority_rank}-${action.action_type}-${action.source_region}`}
                      action={action}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface-2/30 px-6 py-10 text-center">
            <p className="text-[14px] font-medium tracking-[0.04rem] text-secondary">
              Awaiting orchestration payload
            </p>
            <p className="mt-1.5 max-w-[36ch] text-[12px] leading-relaxed tracking-[0.04rem] text-mute">
              Run a scenario to generate the executive memo and procurement
              recommendations.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
