"use client";

import { useEffect, useRef } from "react";
import { Sigma, X } from "lucide-react";

export type AuditTopic = "brent" | "spr" | "volume" | null;

interface Props {
  topic: AuditTopic;
  onClose: () => void;
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-hairline/70 bg-canvas/60 p-3.5 font-mono text-[12.5px] leading-6 text-primary">
      {children}
    </pre>
  );
}

const CONTENT: Record<
  Exclude<AuditTopic, null>,
  { title: string; body: React.ReactNode }
> = {
  brent: {
    title: "Brent Price Impact Formula",
    body: (
      <div className="space-y-3 text-[13.5px] leading-6 text-secondary">
        <p>
          Projected crude price change is the sum of three deterministic
          components. No LLM estimation is used at this stage.
        </p>
        <Formula>{`P_total = P_base + dP_scarcity + dP_freight + P_war_risk`}</Formula>
        <ul className="list-disc space-y-2 pl-5 marker:text-mute">
          <li>
            <strong className="text-primary">Scarcity:</strong>{" "}
            <code className="font-mono text-[12.5px] text-primary">
              (V_disrupted / V_global) x 120
            </code>{" "}
            with V_global at 102 MBPD.
          </li>
          <li>
            <strong className="text-primary">Freight:</strong>{" "}
            <code className="font-mono text-[12.5px] text-primary">
              C_base x ((D_reroute - D_base) / D_base) x severity
            </code>{" "}
            (Hormuz 12d to Cape 26d).
          </li>
          <li>
            <strong className="text-primary">War risk:</strong>{" "}
            <code className="font-mono text-[12.5px] text-primary">
              P_base x (RiskScore x 0.0015)
            </code>
            .
          </li>
        </ul>
      </div>
    ),
  },
  spr: {
    title: "Strategic Petroleum Reserve Decay",
    body: (
      <div className="space-y-3 text-[13.5px] leading-6 text-secondary">
        <p>National reserve cover clock, expressed in days remaining:</p>
        <Formula>{`Days = SPR_Inventory / Daily_Shortfall
     = 39,000,000 / V_import_shortfall`}</Formula>
        <p>
          Baseline peace (zero shortfall) pins cover at{" "}
          <strong className="text-primary">9.5 days</strong>. The ring turns
          amber under 8 days and red under 5 days.
        </p>
      </div>
    ),
  },
  volume: {
    title: "Affected Import Shortfall",
    body: (
      <div className="space-y-3 text-[13.5px] leading-6 text-secondary">
        <p>For each threatened route in the dependency matrix:</p>
        <Formula>{`route_vol = import_share x 5.0 MBPD x (risk_score / 100)
total_MBPD = sum(route_vol)`}</Formula>
        <p>
          Hormuz carries 45% of India&apos;s import share, Bab-el-Mandeb 15%.
          Severity scales linearly with Agent 1&apos;s 0 to 100 risk score.
        </p>
      </div>
    ),
  },
};

export function AuditModal({ topic, onClose }: Props) {
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
  const c = CONTENT[topic];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-scale-in rounded-2xl border border-hairline bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-2 text-secondary">
              <Sigma className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-mute">
                Explain This Number · Agent 2
              </p>
              <h2
                id="audit-title"
                className="mt-1 text-[18px] font-semibold tracking-subhead text-primary"
              >
                {c.title}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline text-mute transition-colors hover:border-hairline-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4">{c.body}</div>
      </div>
    </div>
  );
}
