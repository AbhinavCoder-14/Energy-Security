"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, TrendingUp, Timer, Droplets, ArrowUp, ArrowDown } from "lucide-react";
import type { Scenario, ThreatLevel } from "@/lib/war-room-data";
import { SectionHeading } from "./section-heading";
import { useCountUp } from "./use-count-up";

const accent: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

function MetricCard({
  icon,
  label,
  display,
  unit,
  sub,
  deltaText,
  deltaDir,
  tone,
  math,
}: {
  icon: React.ReactNode;
  label: string;
  display: string;
  unit: string;
  sub: string;
  deltaText: string;
  deltaDir: "up" | "down" | "flat";
  tone: ThreatLevel;
  math: string;
}) {
  return (
    <div className="wr-scanline relative overflow-hidden rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent[tone] }} />
      <div className="relative z-10 flex items-start justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
          <span style={{ color: accent[tone] }}>{icon}</span>
          {label}
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-sm border border-[var(--wr-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)]"
              aria-label={`Explain the math behind ${label}`}
            >
              <Info className="h-3 w-3" />
              EXPLAIN
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-72 rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-3 text-[var(--wr-text)]"
          >
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent[tone] }} />
              AGENT 2 · DERIVATION
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--wr-muted)]">{math}</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative z-10 mt-4 flex items-baseline gap-1.5">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-wide lg:text-5xl">
          {display}
        </span>
        <span className="font-mono text-sm text-[var(--wr-muted)]">{unit}</span>
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between">
        <span className="text-[12px] text-[var(--wr-muted)]">{sub}</span>
        <span
          className="flex items-center gap-1 font-mono text-[12px] font-medium tabular-nums"
          style={{ color: deltaDir === "flat" ? "var(--wr-muted)" : accent[tone] }}
        >
          {deltaDir === "up" && <ArrowUp className="h-3 w-3" />}
          {deltaDir === "down" && <ArrowDown className="h-3 w-3" />}
          {deltaText}
        </span>
      </div>
    </div>
  );
}

export function ImpactMetrics({ scenario }: { scenario: Scenario }) {
  const brent = useCountUp(scenario.brent);
  const spr = useCountUp(scenario.sprDays);
  const shortfall = useCountUp(scenario.shortfall);

  const brentDelta = scenario.brent - scenario.brentBaseline;
  const brentPct = Math.round((brentDelta / scenario.brentBaseline) * 100);
  const sprDelta = scenario.sprDays - 92;

  return (
    <section aria-label="Economic impact">
      <SectionHeading
        index="02"
        title="Economic impact"
        description="Modeled price shock, reserve cover, and import shortfall for the active scenario."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="BRENT CRUDE SHOCK"
          display={`$${brent.toFixed(0)}`}
          unit="/ bbl"
          sub="Spot benchmark"
          deltaText={brentDelta === 0 ? "flat" : `+$${brentDelta} · ${brentPct}%`}
          deltaDir={brentDelta > 0 ? "up" : "flat"}
          tone={scenario.posture}
          math={scenario.math.brent}
        />
        <MetricCard
          icon={<Timer className="h-4 w-4" />}
          label="STRATEGIC RESERVE COVER"
          display={spr.toFixed(0)}
          unit="days left"
          sub="Import cover remaining"
          deltaText={sprDelta === 0 ? "at target" : `${sprDelta} days`}
          deltaDir={sprDelta < 0 ? "down" : "flat"}
          tone={scenario.posture}
          math={scenario.math.spr}
        />
        <MetricCard
          icon={<Droplets className="h-4 w-4" />}
          label="IMPORT SHORTFALL"
          display={shortfall.toFixed(1)}
          unit="M b/d"
          sub="Supply disrupted"
          deltaText={shortfall === 0 ? "none" : "disrupted"}
          deltaDir={scenario.shortfall > 0 ? "up" : "flat"}
          tone={scenario.posture}
          math={scenario.math.shortfall}
        />
      </div>
    </section>
  );
}
