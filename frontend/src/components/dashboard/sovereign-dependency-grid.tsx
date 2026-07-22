"use client";

import type { CountrySupplyShare, DashboardPayload } from "@/lib/types";

function gradeTone(grade: string): string {
  const g = grade.toLowerCase();
  if (g.includes("heavy")) return "var(--wr-crit)";
  if (g.includes("medium")) return "var(--wr-warn)";
  if (g.includes("light")) return "var(--wr-safe)";
  return "var(--wr-accent)";
}

function CountryRow({ c }: { c: CountrySupplyShare }) {
  const severed = c.cut_fraction > 0;
  const tone = gradeTone(c.crude_grade);
  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        severed
          ? "border-[color:color-mix(in_oklch,var(--wr-crit)_35%,transparent)] bg-[color:color-mix(in_oklch,var(--wr-crit)_8%,transparent)]"
          : "border-[var(--wr-border)] bg-[var(--wr-panel-2)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-[14px] font-semibold text-[var(--wr-text)] ${
              severed ? "line-through decoration-[var(--wr-crit)]/70" : ""
            }`}
          >
            {c.country}
          </span>
          {severed && (
            <span className="rounded-sm bg-[color:color-mix(in_oklch,var(--wr-crit)_16%,transparent)] px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[var(--wr-crit)]">
              SEVERED
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide"
            style={{
              color: tone,
              backgroundColor: `color-mix(in oklch, ${tone} 14%, transparent)`,
            }}
          >
            {c.crude_grade}
          </span>
          <span className="font-mono text-[10.5px] text-[var(--wr-muted)]">
            {c.primary_route.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-[18px] font-semibold tabular-nums text-[var(--wr-text)]">
          {c.import_share_pct.toFixed(0)}%
        </p>
        <p className="font-mono text-[10.5px] tabular-nums text-[var(--wr-muted)]">
          {c.volume_mbpd.toFixed(2)} MBPD
        </p>
      </div>

      {/* share meter */}
      <div className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-[var(--wr-border)]">
        <div
          className="wr-meter-fill h-full rounded-full"
          style={{
            width: `${Math.min(100, c.import_share_pct)}%`,
            backgroundColor: severed ? "var(--wr-crit)" : tone,
          }}
        />
      </div>
    </div>
  );
}

export function SovereignDependencyGrid({ data }: { data: DashboardPayload }) {
  return (
    <div className="rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
          Sovereign import dependency
        </p>
        <span className="font-mono text-[11px] tabular-nums text-[var(--wr-text)]">
          {data.national_import_dependence_pct.toFixed(0)}% import-dependent
        </span>
      </div>
      <div className="grid gap-2.5">
        {data.country_breakdown.map((c) => (
          <CountryRow key={c.country} c={c} />
        ))}
      </div>
      {data.lost_grades.length > 0 && (
        <p className="mt-4 font-mono text-[11px] text-[var(--wr-crit)]">
          Severed grades: {data.lost_grades.join(", ")}
        </p>
      )}
    </div>
  );
}
