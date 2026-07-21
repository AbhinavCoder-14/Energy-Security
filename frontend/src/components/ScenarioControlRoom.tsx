"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  Loader2,
  OctagonAlert,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ScenarioId } from "@/lib/types";

interface Props {
  active: ScenarioId;
  fetchingId: ScenarioId | null;
  onSelect: (id: ScenarioId) => void;
}

type StatusTone = "safe" | "alert" | "amber";

type ScenarioCard = {
  id: ScenarioId;
  icon: LucideIcon;
  label: string;
  subtitle: string;
  metricEyebrow: string;
  metricNumber: string;
  statusLabel: string;
  statusTone: StatusTone;
};

const STATUS_BADGE: Record<StatusTone, string> = {
  safe: "border-safe/25 bg-safe/10 text-safe",
  alert: "border-alert/25 bg-alert/10 text-alert",
  amber: "border-amber/25 bg-amber/10 text-amber",
};

const SCENARIO_CARDS: ScenarioCard[] = [
  {
    id: "baseline_peace",
    icon: Zap,
    label: "Baseline peace",
    subtitle: "Standard operational flow",
    metricEyebrow: "Supply shortfall",
    metricNumber: "0.0 MBPD",
    statusLabel: "Nominal",
    statusTone: "safe",
  },
  {
    id: "strait_of_hormuz_closure",
    icon: OctagonAlert,
    label: "Strait of Hormuz closure",
    subtitle: "Acute maritime blockade",
    metricEyebrow: "Estimated impact",
    metricNumber: "2.25 MBPD",
    statusLabel: "Critical",
    statusTone: "alert",
  },
  {
    id: "bab_el_mandeb_escalation",
    icon: TriangleAlert,
    label: "Bab-el-Mandeb escalation",
    subtitle: "Red Sea transit conflict",
    metricEyebrow: "Routing delay",
    metricNumber: "+14 days",
    statusLabel: "High Risk",
    statusTone: "amber",
  },
];

export function ScenarioControlRoom({ active, fetchingId, onSelect }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isFetching = fetchingId !== null;

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const cards = root.querySelectorAll(".scenario-preview-card");
    gsap.fromTo(
      cards,
      { y: 10, opacity: 0.92 },
      {
        y: 0,
        opacity: 1,
        duration: 0.45,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "transform,opacity",
        overwrite: "auto",
      },
    );
  }, []);

  return (
    <section className="panel p-6 sm:p-[1.55rem]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl tracking-tight text-primary lg:text-[1.75rem]">
          Geopolitical scenario control
        </h2>

        {isFetching && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 font-sans text-[11px] tracking-[0.04rem] text-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Recalculating
          </span>
        )}
      </div>

      <div
        ref={gridRef}
        role="tablist"
        aria-label="Geopolitical scenario triggers"
        className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {SCENARIO_CARDS.map((card) => {
          const isActive = active === card.id;
          const isThisFetching = fetchingId === card.id;
          const Icon = card.icon;

          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-busy={isThisFetching}
              onClick={() => onSelect(card.id)}
              className={[
                "scenario-preview-card group relative flex flex-col rounded-2xl border bg-surface p-5 text-left transition-all duration-200 sm:p-5",
                "hover:border-hairline-strong hover:bg-surface-2/35",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                "active:scale-[0.995]",
                isActive
                  ? "border-hairline-strong bg-surface-2/55 shadow-inset-top"
                  : "border-hairline opacity-90 hover:opacity-100",
                isThisFetching ? "border-hairline-strong" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={[
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors duration-200",
                      isActive
                        ? "border-hairline-strong bg-canvas/60 text-primary"
                        : "border-hairline bg-canvas/40 text-mute group-hover:text-secondary",
                    ].join(" ")}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4 stroke-[1.75]" />
                  </span>

                  <div className="min-w-0 pt-0.5">
                    <span className="block text-balance text-[14px] font-semibold leading-snug tracking-[0.04rem] text-primary">
                      {card.label}
                    </span>
                    <p className="mt-1.5 text-[12.5px] leading-[1.45] tracking-[0.04rem] text-secondary">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={[
                    "shrink-0 rounded-lg border px-2 py-1 text-[10.5px] font-medium leading-none tracking-[0.04rem]",
                    STATUS_BADGE[card.statusTone],
                  ].join(" ")}
                >
                  {card.statusLabel}
                </span>
              </div>

              <div
                className={[
                  "mt-4 rounded-lg border px-3 py-2.5 transition-colors duration-200",
                  isActive
                    ? "border-hairline/90 bg-canvas/50"
                    : "border-hairline/70 bg-canvas/30 group-hover:border-hairline group-hover:bg-canvas/40",
                ].join(" ")}
              >
                <p className="text-[11px] font-medium leading-tight tracking-[0.04rem] text-mute">
                  {card.metricEyebrow}
                </p>
                <p className="tnum mt-1 font-sans text-[18px] font-semibold leading-tight tracking-[0.04rem] text-primary">
                  {card.metricNumber}
                </p>
              </div>

              {isThisFetching && (
                <span className="absolute bottom-5 right-5">
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin text-mute"
                    aria-hidden
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
