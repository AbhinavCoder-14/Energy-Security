"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Ban,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Compass,
  Ship,
  ShieldAlert,
} from "lucide-react";
import type { DashboardPayload, RouteAlternative } from "@/lib/types";

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 font-display text-xl tracking-tight text-[var(--wr-text)]">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 font-display text-lg tracking-tight text-[var(--wr-text)]">
      {children}
    </h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-4 font-medium text-[var(--wr-text)]">{children}</h4>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="mb-1.5 mt-3 text-[13px] font-semibold text-[var(--wr-text)]">
      {children}
    </h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2.5 last:mb-0 text-[13.5px] leading-relaxed text-[var(--wr-muted)]">
      {children}
    </p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--wr-text)]">{children}</strong>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[13.5px] text-[var(--wr-muted)]">
      {children}
    </ol>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-[var(--wr-muted)]">
      {children}
    </ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
};

function buildBriefingText(data: DashboardPayload): string {
  const d = data.procurement_directives;
  const lines: string[] = [];
  lines.push("AEGIS ENERGY — CABINET EXECUTIVE BRIEFING");
  lines.push(`Scenario: ${data.scenario_id}`);
  lines.push(`Timestamp: ${data.timestamp}`);
  lines.push(
    `Brent: $${data.projected_brent_usd.toFixed(2)} (+${data.market_impact.price_increase_pct.toFixed(1)}%)`,
  );
  lines.push(`Disrupted: ${data.v_disrupted_mbpd.toFixed(3)} MBPD`);
  lines.push(`SPR runway: ${data.spr_days_remaining.toFixed(1)} days`);
  lines.push("");
  lines.push(d.actionable_memo);
  lines.push("");
  lines.push("RECOMMENDED PROCUREMENT ACTIONS:");
  d.recommended_actions.forEach((a) => {
    lines.push(
      `  ${a.priority_rank}. ${a.origin_name} — ${a.crude_grade}, ${a.volume_mbpd.toFixed(
        2,
      )} MBPD, ${a.transit_days}d transit, $${a.freight_usd_per_bbl.toFixed(
        2,
      )}/bbl freight, slate: ${a.slate_compatibility}`,
    );
    if (a.justification) lines.push(`     ${a.justification}`);
  });
  return lines.join("\n");
}

function ActionCard({ a }: { a: RouteAlternative }) {
  return (
    <div className="rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-4 transition-colors hover:border-[var(--wr-accent)]/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--wr-accent)] font-mono text-[11px] font-semibold text-white">
            {a.priority_rank}
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--wr-text)]">
            <Ship className="h-3.5 w-3.5 text-[var(--wr-muted)]" />
            {a.origin_name.replace(/_/g, " ")}
          </span>
        </div>
        <span className="rounded-sm bg-[var(--wr-panel)] px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-[var(--wr-muted)]">
          {a.crude_grade}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <div>
          <p className="text-[var(--wr-muted)]">Volume</p>
          <p className="mt-0.5 tabular-nums text-[var(--wr-text)]">
            {a.volume_mbpd.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[var(--wr-muted)]">Transit</p>
          <p className="mt-0.5 tabular-nums text-[var(--wr-text)]">{a.transit_days}d</p>
        </div>
        <div>
          <p className="text-[var(--wr-muted)]">Freight</p>
          <p className="mt-0.5 tabular-nums text-[var(--wr-text)]">
            ${a.freight_usd_per_bbl.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--wr-muted)]">
        <Compass className="h-3 w-3" />
        Slate match: <span className="text-[var(--wr-text)]">{a.slate_compatibility}</span>
      </div>

      {a.justification && (
        <p className="mt-2 text-[12px] leading-snug text-[var(--wr-muted)]">{a.justification}</p>
      )}
    </div>
  );
}

function DecisionList({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in oklch, ${tone} 30%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${tone} 7%, transparent)`,
      }}
    >
      <p
        className="mb-2.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider"
        style={{ color: tone }}
      >
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-[13px] leading-snug text-[var(--wr-text)]"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: tone }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Derive Cabinet do / don't lists from payload when memo is thin. */
function deriveDecisionLists(data: DashboardPayload): {
  authorize: string[];
  avoid: string[];
} {
  const actions = [...data.procurement_directives.recommended_actions].sort(
    (a, b) => a.priority_rank - b.priority_rank,
  );
  const authorize = actions.map(
    (a) =>
      `Authorize ${a.origin_name.replace(/_/g, " ")} — ${a.volume_mbpd.toFixed(
        2,
      )} MBPD of ${a.crude_grade} (${a.transit_days}d, $${a.freight_usd_per_bbl.toFixed(
        2,
      )}/bbl). ${a.justification || a.slate_compatibility}`,
  );

  const avoid: string[] = [];
  if (data.lost_grades.some((g) => g.toLowerCase().includes("heavy"))) {
    avoid.push(
      "Do not substitute Light-Sweet barrels onto Jamnagar / Paradip heavy-sour cokers.",
    );
  }
  if (data.v_disrupted_mbpd > 0) {
    avoid.push(
      "Do not defer SPR bridge draw while waiting for the chokepoint to reopen.",
    );
    avoid.push(
      "Do not allow commercial cover to breach the 5-day operational floor without Cabinet notice.",
    );
  }
  if (data.is_live_telemetry) {
    authorize.push("Maintain routine live Brent + chokepoint intelligence refresh.");
    avoid.push("Do not pre-emptively release SPR or reprice freight on rumor alone.");
  }

  return { authorize, avoid };
}

export function ExecutiveBriefingPanel({ data }: { data: DashboardPayload }) {
  const [copied, setCopied] = useState(false);
  const d = data.procurement_directives;
  const fiscalM = (data.market_impact.daily_fiscal_loss_usd ?? 0) / 1_000_000;
  const decisions = useMemo(() => deriveDecisionLists(data), [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildBriefingText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
            Cabinet executive briefing
          </p>
          <p className="mt-1 font-mono text-[10.5px] text-[var(--wr-muted)]">
            {data.scenario_id.replace(/_/g, " ")} · {data.timestamp}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--wr-border)] px-2.5 py-1 font-mono text-[10.5px] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" style={{ color: "var(--wr-safe)" }} />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy briefing
            </>
          )}
        </button>
      </div>

      {/* Situation strip for officials */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Projected Brent",
            value: `$${data.projected_brent_usd.toFixed(1)}`,
            sub: `+${data.market_impact.price_increase_pct.toFixed(1)}%`,
          },
          {
            label: "Import shortfall",
            value: `${data.v_disrupted_mbpd.toFixed(2)}`,
            sub: "MBPD disrupted",
          },
          {
            label: "SPR runway",
            value: `${data.spr_days_remaining.toFixed(1)}d`,
            sub: data.spr_days_remaining < 5 ? "Below 5-day floor" : "Cover remaining",
          },
          {
            label: "Daily fiscal hit",
            value: fiscalM > 0 ? `$${fiscalM.toFixed(1)}M` : "$0",
            sub: "incremental / day",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] px-3 py-2.5"
          >
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--wr-muted)]">
              {k.label}
            </p>
            <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--wr-text)]">
              {k.value}
            </p>
            <p className="font-mono text-[10px] text-[var(--wr-muted)]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Rendered markdown memo */}
      <div className="mt-5 rounded-xl border border-[var(--wr-border)] bg-[var(--wr-bg)]/40 p-4 lg:p-5">
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
          <ShieldAlert className="h-3.5 w-3.5" />
          AGENT 3 · EXECUTIVE MEMO
        </p>
        <div className="memo-md">
          <ReactMarkdown components={markdownComponents}>{d.actionable_memo}</ReactMarkdown>
        </div>
      </div>

      {/* Explicit do / don't for officials (always visible, even if memo already covers it) */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <DecisionList
          title="Authorize / do"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="var(--wr-safe)"
          items={decisions.authorize}
        />
        <DecisionList
          title="Do not"
          icon={<Ban className="h-3.5 w-3.5" />}
          tone="var(--wr-crit)"
          items={decisions.avoid}
        />
      </div>

      {d.recommended_actions.length > 0 && (
        <>
          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--wr-muted)]">
            Ranked procurement actions
          </p>
          <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {[...d.recommended_actions]
              .sort((a, b) => a.priority_rank - b.priority_rank)
              .map((a, i) => (
                <ActionCard key={`${a.origin_name}-${i}`} a={a} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
