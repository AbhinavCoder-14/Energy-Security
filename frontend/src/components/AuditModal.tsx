"use client";

import { useEffect, useRef } from "react";
import { BlockMath } from "react-katex";
import { Sigma, X } from "lucide-react";
import "katex/dist/katex.min.css";
import type { CalculationTrace } from "@/lib/types";

export type AuditTopic = "brent" | "spr" | "volume" | "freight" | null;

interface Props {
  topic: AuditTopic;
  trace?: CalculationTrace | null;
  onClose: () => void;
}

const TITLES: Record<Exclude<AuditTopic, null>, string> = {
  brent: "Brent Price Impact Formula",
  spr: "Strategic Reserve Cover (SPR + Commercial)",
  volume: "Disrupted Import Volume",
  freight: "Freight & War Risk Premium",
};

function LatexBlock({ tex }: { tex: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--wr-border)] bg-[#090C10]/80 p-3.5">
      <BlockMath math={tex} />
    </div>
  );
}

export function AuditModal({ topic, trace, onClose }: Props) {
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

  const latex = trace?.latex_formulas ?? {};
  const steps = trace?.substitution_steps ?? [];

  const topicLatex: Record<Exclude<AuditTopic, null>, string | undefined> = {
    brent: latex.projected ?? latex.scarcity,
    spr: latex.spr ?? latex.commercial,
    volume: latex.v_disrupted,
    freight: latex.freight ?? latex.war,
  };

  const topicSteps: Record<Exclude<AuditTopic, null>, string[]> = {
    brent: steps.filter((s) => s.includes("P_") || s.includes("ΔP") || s.includes("Brent")),
    spr: steps.filter((s) => s.startsWith("D_")),
    volume: steps.filter((s) => s.includes("V_disrupted") || s.includes("R_max")),
    freight: steps.filter((s) => s.includes("freight") || s.includes("war") || s.includes("ΔP_f")),
  };

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
          {topicLatex[topic] && <LatexBlock tex={topicLatex[topic]!} />}

          {topicSteps[topic].length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)]">
                Substitution steps
              </p>
              <ul className="space-y-1.5 font-mono text-[12px]">
                {topicSteps[topic].map((step, i) => (
                  <li key={i} className="rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel-2)] px-3 py-2">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!topicLatex[topic] && topicSteps[topic].length === 0 && trace && (
            <p className="font-mono text-[12px]">
              {topic === "brent" && trace.formula_brent}
              {topic === "spr" && trace.formula_spr}
              {topic === "volume" && trace.formula_scarcity}
              {topic === "freight" &&
                `Freight $${trace.freight_premium_usd}/bbl + War $${trace.war_risk_premium_usd}/bbl`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
