"use client";

import { useRef } from "react";
import {
  Info,
  TrendingUp,
  Timer,
  Droplets,
  ArrowUp,
  ArrowDown,
  Shield,
} from "lucide-react";
import type { Scenario, ThreatLevel } from "@/lib/war-room-data";
import type { AuditTopic } from "@/components/AuditModal";
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
  badge,
  onAudit,
}: {
  icon: React.ReactNode;
  label: string;
  display: string;
  unit: string;
  sub: string;
  deltaText: string;
  deltaDir: "up" | "down" | "flat";
  tone: ThreatLevel;
  badge?: string;
  onAudit: () => void;
}) {
  return (
    <div
      data-metric-card
      className="wr-scanline relative overflow-hidden rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5 transition-all duration-200 hover:border-slate-700"
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent[tone] }} />
      <div className="relative z-10 flex items-start justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
          <span style={{ color: accent[tone] }}>{icon}</span>
          {label}
        </span>

        <button
          type="button"
          onClick={onAudit}
          className="flex items-center gap-1 rounded-lg border border-[var(--wr-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
          aria-label={`Audit the math behind ${label}`}
        >
          <Info className="h-3 w-3" />
          AUDIT
        </button>
      </div>

      {badge && (
        <span className="relative z-10 mt-2 inline-flex rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          {badge}
        </span>
      )}

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

export function ImpactMetrics({
  scenario,
  onAudit,
}: {
  scenario: Scenario;
  onAudit: (topic: AuditTopic) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const liveSpot = scenario.liveBrentSpot ?? scenario.brentBaseline;
  const simulated = scenario.brent;
  const brentSpot = useCountUp(liveSpot);
  const brentSim = useCountUp(simulated);
  const spr = useCountUp(scenario.sprDays);
  const commercial = useCountUp(scenario.commercialDays ?? scenario.sprDays);
  const shortfall = useCountUp(scenario.shortfall);
  const freightWar = useCountUp(
    (scenario.freightPremium ?? 0) + (scenario.warRiskPremium ?? 0),
  );

  const brentDelta = simulated - liveSpot;
  const brentPct =
    liveSpot > 0 ? Math.round((brentDelta / liveSpot) * 100) : 0;

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

  const liveBadge = scenario.brentDataSource
    ? `LIVE API: $${liveSpot.toFixed(2)} · ${scenario.brentDataSource}`
    : undefined;

  return (
    <section ref={sectionRef} aria-label="Economic impact">
      <SectionHeading
        index="02"
        title="Economic impact"
        description="Live Brent spot vs simulated shock, reserve cover split, import shortfall, and freight/war premium."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Brent Crude"
          display={`$${brentSim.toFixed(1)}`}
          unit="/ bbl"
          sub={`Spot $${brentSpot.toFixed(1)} → simulated shock`}
          deltaText={brentDelta === 0 ? "flat" : `+$${brentDelta.toFixed(1)} · ${brentPct}%`}
          deltaDir={brentDelta > 0 ? "up" : "flat"}
          tone={scenario.posture}
          badge={liveBadge}
          onAudit={() => onAudit("brent")}
        />
        <MetricCard
          icon={<Timer className="h-4 w-4" />}
          label="Reserve Cover"
          display={spr.toFixed(1)}
          unit="SPR days"
          sub={`Commercial buffer ${commercial.toFixed(1)} days`}
          deltaText={`${spr.toFixed(1)} / ${commercial.toFixed(1)} d`}
          deltaDir="flat"
          tone={scenario.posture}
          onAudit={() => onAudit("spr")}
        />
        <MetricCard
          icon={<Droplets className="h-4 w-4" />}
          label="Import Shortfall"
          display={shortfall.toFixed(3)}
          unit="MBPD"
          sub="V_disrupted refinery exposure"
          deltaText={shortfall === 0 ? "none" : "disrupted"}
          deltaDir={scenario.shortfall > 0 ? "up" : "flat"}
          tone={scenario.posture}
          onAudit={() => onAudit("volume")}
        />
        <MetricCard
          icon={<Shield className="h-4 w-4" />}
          label="Freight & War Risk"
          display={`$${freightWar.toFixed(2)}`}
          unit="/ bbl"
          sub={`Freight $${(scenario.freightPremium ?? 0).toFixed(2)} + War $${(scenario.warRiskPremium ?? 0).toFixed(2)}`}
          deltaText={freightWar === 0 ? "nominal" : "elevated"}
          deltaDir={freightWar > 0 ? "up" : "flat"}
          tone={scenario.posture}
          onAudit={() => onAudit("freight")}
        />
      </div>

      {scenario.calculationTrace && (
        <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[var(--wr-muted)]">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Numbers bound to Agent 2 calculation_trace — click AUDIT on any card for KaTeX derivation.
        </p>
      )}
    </section>
  );
}
