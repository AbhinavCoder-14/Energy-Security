"use client";

import { useEffect, useRef } from "react";
import { BlockMath } from "react-katex";
import { Sigma, X } from "lucide-react";
import "katex/dist/katex.min.css";
import type { CalculationTrace, DashboardPayload } from "@/lib/types";

export type AuditTopic = "brent" | "spr" | "volume" | "freight" | "fiscal" | null;

interface Props {
  topic: AuditTopic;
  /** New deterministic engine payload (preferred). */
  data?: DashboardPayload | null;
  /** Legacy Agent 2 calculation trace (optional fallback). */
  trace?: CalculationTrace | null;
  onClose: () => void;
}

const TITLES: Record<Exclude<AuditTopic, null>, string> = {
  brent: "Brent Price Impact Formula",
  spr: "Strategic Reserve Countdown",
  volume: "Disrupted Import Volume",
  freight: "Freight & War Risk Premium",
  fiscal: "Daily Fiscal Loss",
};

function LatexBlock({ tex }: { tex: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-3.5">
      <BlockMath math={tex} />
    </div>
  );
}

/** Build KaTeX + substitution steps from the deterministic DashboardPayload. */
function deriveFromPayload(
  topic: Exclude<AuditTopic, null>,
  data: DashboardPayload,
): { tex?: string; steps: string[]; note?: string } {
  const m = data.market_impact;
  const base = data.baseline_brent_usd;
  const scarcity = m.scarcity_premium_usd ?? 0;
  const freight = m.freight_premium_usd_per_barrel ?? 0;
  const war = m.war_risk_premium_usd ?? 0;
  const projected = data.projected_brent_usd;

  switch (topic) {
    case "brent":
      return {
        tex: "P_{proj} = P_{base} + \\Delta P_{scarcity} + \\Delta P_{freight} + \\Delta P_{war}",
        steps: [
          `P_base = $${base.toFixed(2)}/bbl`,
          `ΔP_scarcity = $${scarcity.toFixed(2)}/bbl`,
          `ΔP_freight = $${freight.toFixed(2)}/bbl`,
          `ΔP_war = $${war.toFixed(2)}/bbl`,
          `P_proj = $${projected.toFixed(2)}/bbl  (+${(m.price_increase_pct ?? 0).toFixed(1)}%)`,
        ],
      };
    case "spr":
      return {
        tex: "D_{cover} = \\dfrac{Reserves_{bbl}}{V_{disrupted} \\times 10^6}",
        steps: [
          `V_disrupted = ${data.v_disrupted_mbpd.toFixed(3)} MBPD`,
          `Days remaining = ${data.spr_days_remaining.toFixed(1)} d`,
          data.spr_days_remaining < 5
            ? "Below the 5-day strategic floor — critical."
            : "Above the 5-day strategic floor.",
        ],
        note: "Reroute detours (e.g. +14 days via Cape of Good Hope) accelerate depletion by delaying replacement barrels.",
      };
    case "volume": {
      const contributors = data.country_breakdown
        .filter((c) => c.disrupted_volume_mbpd > 0)
        .map(
          (c) =>
            `${c.country}: ${c.volume_mbpd.toFixed(2)} × ${(c.cut_fraction * 100).toFixed(
              0,
            )}% = ${c.disrupted_volume_mbpd.toFixed(3)} MBPD`,
        );
      return {
        tex: "V_{disrupted} = \\sum_i V_i \\times cut_i",
        steps:
          contributors.length > 0
            ? [...contributors, `Σ = ${data.v_disrupted_mbpd.toFixed(3)} MBPD`]
            : ["No country supply cuts under this scenario.", "V_disrupted = 0.000 MBPD"],
      };
    }
    case "freight":
      return {
        tex: "\\Delta P_{logistics} = \\Delta P_{freight} + \\Delta P_{war}",
        steps: [
          `ΔP_freight = $${freight.toFixed(2)}/bbl`,
          `ΔP_war = $${war.toFixed(2)}/bbl`,
          `Total = $${(freight + war).toFixed(2)}/bbl`,
        ],
        note: "Freight premium reflects Cape of Good Hope re-routing (+~14 transit days) when a chokepoint is blocked.",
      };
    case "fiscal": {
      const fiscal = m.daily_fiscal_loss_usd ?? 0;
      const delta = projected - base;
      return {
        tex: "L_{daily} = \\Delta P \\times V_{import} \\times 10^6",
        steps: [
          `ΔP = P_proj − P_base = $${delta.toFixed(2)}/bbl`,
          `Daily fiscal loss = $${(fiscal / 1_000_000).toFixed(1)}M / day`,
        ],
        note: "Incremental import expenditure at the projected Brent level across daily import volume.",
      };
    }
    default:
      return { steps: [] };
  }
}

/** Legacy fallback using the old CalculationTrace latex/steps. */
function deriveFromTrace(topic: Exclude<AuditTopic, null>, trace: CalculationTrace) {
  const latex = trace.latex_formulas ?? {};
  const steps = trace.substitution_steps ?? [];
  const tex: Record<Exclude<AuditTopic, null>, string | undefined> = {
    brent: latex.projected ?? latex.scarcity,
    spr: latex.spr ?? latex.commercial,
    volume: latex.v_disrupted,
    freight: latex.freight ?? latex.war,
    fiscal: latex.projected,
  };
  const stepFilter: Record<Exclude<AuditTopic, null>, string[]> = {
    brent: steps.filter((s) => s.includes("P_") || s.includes("ΔP") || s.includes("Brent")),
    spr: steps.filter((s) => s.startsWith("D_")),
    volume: steps.filter((s) => s.includes("V_disrupted") || s.includes("R_max")),
    freight: steps.filter((s) => s.includes("freight") || s.includes("war") || s.includes("ΔP_f")),
    fiscal: steps.filter((s) => s.toLowerCase().includes("fiscal")),
  };
  return { tex: tex[topic], steps: stepFilter[topic] };
}

export function AuditModal({ topic, data, trace, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!topic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [topic, onClose]);

  if (!topic) return null;

  const derived = data
    ? deriveFromPayload(topic, data)
    : trace
      ? deriveFromTrace(topic, trace)
      : { tex: undefined, steps: [] as string[] };
  const note = "note" in derived ? derived.note : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel-2)] text-[var(--wr-muted)]">
              <Sigma className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--wr-muted)]">
                Explain This Number · Agent 2
              </p>
              <h2
                id="audit-title"
                className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--wr-text)]"
              >
                {TITLES[topic]}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--wr-border)] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
            aria-label="Close audit modal"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-[13.5px] leading-6 text-[var(--wr-muted)]">
          {derived.tex && <LatexBlock tex={derived.tex} />}

          {derived.steps.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)]">
                Substitution steps
              </p>
              <ul className="space-y-1.5 font-mono text-[12px]">
                {derived.steps.map((step, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel-2)] px-3 py-2 text-[var(--wr-text)]"
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {note && <p className="text-[12.5px] leading-relaxed">{note}</p>}

          {!derived.tex && derived.steps.length === 0 && (
            <p className="font-mono text-[12px]">No derivation available for this metric.</p>
          )}
        </div>
      </div>
    </div>
  );
}
