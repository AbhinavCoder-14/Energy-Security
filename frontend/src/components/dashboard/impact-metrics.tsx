"use client";

import { useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Info,
  TrendingUp,
  Timer,
  Droplets,
  ArrowUp,
  ArrowDown,
  Ship,
  Shield,
} from "lucide-react";
import type { Scenario, ThreatLevel } from "@/lib/war-room-data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
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
    <div
      data-metric-card
      className="wr-scanline relative overflow-hidden rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5"
    >
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
            className="w-80 rounded-md border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-3 text-[var(--wr-text)]"
          >
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent[tone] }} />
              AGENT 2 · DERIVATION
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-[var(--wr-muted)]">{math}</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative z-10 mt-4 flex items-baseline gap-1.5">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight lg:text-5xl">
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
  const sectionRef = useRef<HTMLElement>(null);
  const brent = useCountUp(scenario.brent);
  const spr = useCountUp(scenario.sprDays);
  const shortfall = useCountUp(scenario.shortfall);
  const freight = useCountUp(scenario.freightPremium ?? 0);

  const brentDelta = scenario.brent - scenario.brentBaseline;
  const brentPct =
    scenario.brentBaseline > 0
      ? Math.round((brentDelta / scenario.brentBaseline) * 100)
      : 0;
  const sprDelta = scenario.sprDays - 9.5;

  useGSAP(
    () => {
      const cards = sectionRef.current?.querySelectorAll("[data-metric-card]");
      if (!cards?.length) return;

      if (prefersReducedMotion()) {
        gsap.set(cards, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        cards,
        { autoAlpha: 0.35, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.08,
          overwrite: "auto",
        },
      );
    },
    { dependencies: [scenario.id, scenario.brent], scope: sectionRef },
  );

  return (
    <section ref={sectionRef} aria-label="Economic impact">
      <SectionHeading
        index="02"
        title="Economic impact"
        description="Modeled price shock, reserve cover, freight premium, and import shortfall from Agent 2."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="BRENT CRUDE"
          display={`$${brent.toFixed(1)}`}
          unit="/ bbl"
          sub="Spot benchmark"
          deltaText={brentDelta === 0 ? "flat" : `+$${brentDelta.toFixed(1)} · ${brentPct}%`}
          deltaDir={brentDelta > 0 ? "up" : "flat"}
          tone={scenario.posture}
          math={scenario.math.brent}
        />
        <MetricCard
          icon={<Timer className="h-4 w-4" />}
          label="STRATEGIC RESERVE"
          display={spr.toFixed(1)}
          unit="days left"
          sub="Import cover remaining"
          deltaText={sprDelta === 0 ? "at baseline" : `${sprDelta.toFixed(1)} days`}
          deltaDir={sprDelta < 0 ? "down" : "flat"}
          tone={scenario.posture}
          math={scenario.math.spr}
        />
        <MetricCard
          icon={<Droplets className="h-4 w-4" />}
          label="IMPORT SHORTFALL"
          display={shortfall.toFixed(2)}
          unit="MBPD"
          sub="Supply disrupted"
          deltaText={shortfall === 0 ? "none" : "disrupted"}
          deltaDir={scenario.shortfall > 0 ? "up" : "flat"}
          tone={scenario.posture}
          math={scenario.math.shortfall}
        />
        <MetricCard
          icon={<Ship className="h-4 w-4" />}
          label="FREIGHT PREMIUM"
          display={`$${freight.toFixed(2)}`}
          unit="/ bbl"
          sub={`War-risk ×${(scenario.warRiskMultiplier ?? 1).toFixed(2)}`}
          deltaText={freight === 0 ? "nominal" : "elevated"}
          deltaDir={freight > 0 ? "up" : "flat"}
          tone={scenario.posture}
          math={
            scenario.math.brent.includes("freight")
              ? scenario.math.brent
              : `Freight premium $${(scenario.freightPremium ?? 0).toFixed(2)}/bbl; war-risk insurance multiplier ×${(scenario.warRiskMultiplier ?? 1).toFixed(2)}.`
          }
        />
      </div>

      {(scenario.freightPremium > 0 || (scenario.warRiskMultiplier ?? 1) > 1) && (
        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[var(--wr-muted)]">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Numbers bound to Agent 2 calculation_trace — not UI guesses.
        </p>
      )}
    </section>
  );
}
