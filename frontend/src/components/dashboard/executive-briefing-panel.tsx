"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Compass, Ship } from "lucide-react";
import type { DashboardPayload, RouteAlternative } from "@/lib/types";

function buildBriefingText(data: DashboardPayload): string {
  const d = data.procurement_directives;
  const lines: string[] = [];
  lines.push("AEGIS ENERGY — CABINET EXECUTIVE BRIEFING");
  lines.push(`Scenario: ${data.scenario_id}`);
  lines.push(`Timestamp: ${data.timestamp}`);
  lines.push("");
  lines.push("EXECUTIVE MEMO:");
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
    <div className="rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--wr-accent)] font-mono text-[11px] font-semibold text-white">
            {a.priority_rank}
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--wr-text)]">
            <Ship className="h-3.5 w-3.5 text-[var(--wr-muted)]" />
            {a.origin_name}
          </span>
        </div>
        <span className="rounded-sm bg-[var(--wr-panel)] px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-[var(--wr-muted)]">
          {a.crude_grade}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <div>
          <p className="text-[var(--wr-muted)]">Volume</p>
          <p className="mt-0.5 tabular-nums text-[var(--wr-text)]">{a.volume_mbpd.toFixed(2)}</p>
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

export function ExecutiveBriefingPanel({ data }: { data: DashboardPayload }) {
  const [copied, setCopied] = useState(false);
  const d = data.procurement_directives;

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
    <div className="rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
          Cabinet executive briefing
        </p>
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

      <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[var(--wr-text)]">
        {d.actionable_memo}
      </p>

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
