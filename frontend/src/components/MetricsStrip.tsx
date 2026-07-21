"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import type { DisruptionImpactPayload } from "@/lib/types";

interface Props {
  impact: DisruptionImpactPayload | null;
  onExplain: (topic: "brent" | "spr" | "volume") => void;
}

function useGsapTicker(
  value: number | undefined,
  formatter: (n: number) => string,
) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (value === undefined) {
      el.textContent = "--";
      return;
    }

    tweenRef.current?.kill();

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const from = prev.current ?? value;

    if (reduced || from === value) {
      el.textContent = formatter(value);
      prev.current = value;
      return;
    }

    const obj = { val: from };
    tweenRef.current = gsap.to(obj, {
      val: value,
      duration: 0.65,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = formatter(obj.val);
      },
      onComplete: () => {
        prev.current = value;
      },
    });

    return () => {
      tweenRef.current?.kill();
    };
  }, [value, formatter]);

  return ref;
}

function Card({
  eyebrow,
  onInfo,
  children,
  className,
}: {
  eyebrow: string;
  onInfo: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "metric-card panel group relative overflow-hidden p-5 sm:p-6",
        "transition-colors duration-200 hover:border-hairline-strong",
        className || "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="tracking-label font-mono text-[11px] font-medium uppercase text-mute">
          {eyebrow}
        </p>
        <button
          type="button"
          onClick={onInfo}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-hairline text-mute transition-colors hover:border-hairline-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hairline-strong"
          aria-label={`Explain ${eyebrow}`}
          title="Explain this number"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {children}
    </div>
  );
}

function SprRing({ days }: { days: number }) {
  const max = 15;
  const pct = Math.max(0, Math.min(1, days / max));
  const size = 68;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone =
    days >= 8
      ? { ring: "rgb(var(--safe))", text: "text-safe" }
      : days >= 5
        ? { ring: "rgb(var(--amber))", text: "text-amber" }
        : { ring: "rgb(var(--alert))", text: "text-alert" };

  const ringRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const prevDays = useRef<number | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return;

    tweenRef.current?.kill();

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const from = prevDays.current ?? days;

    if (reduced || from === days) {
      ring.style.strokeDashoffset = `${c * (1 - pct)}`;
      label.textContent = days.toFixed(1);
      prevDays.current = days;
      return;
    }

    const obj = { val: from };
    tweenRef.current = gsap.to(obj, {
      val: days,
      duration: 0.65,
      ease: "power2.out",
      onUpdate: () => {
        const p = Math.max(0, Math.min(1, obj.val / max));
        ring.style.strokeDashoffset = `${c * (1 - p)}`;
        label.textContent = obj.val.toFixed(1);
      },
      onComplete: () => {
        prevDays.current = days;
      },
    });

    return () => {
      tweenRef.current?.kill();
    };
  }, [days, c, max, pct]);

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--hairline-strong) / 0.5)"
          strokeWidth={stroke}
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span
        ref={labelRef}
        className={`absolute font-mono text-[13px] font-semibold ${tone.text}`}
      >
        {days.toFixed(1)}
      </span>
    </div>
  );
}

const fmtPrice = (n: number) => `$${n.toFixed(2)}`;
const fmtDays = (n: number) => n.toFixed(1);
const fmtVolume = (n: number) => n.toFixed(2);

export function MetricsStrip({ impact, onExplain }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const didEntrance = useRef(false);
  const m = impact?.market_metrics;
  const brent = m?.brent_crude_price_usd;
  const pct = m?.price_increase_pct ?? 0;
  const days = impact?.total_days_of_reserve_cover;
  const volume = impact?.affected_import_volume_mbpd;
  const volumePct =
    volume !== undefined ? (volume / 5.0) * 100 : undefined;

  const brentRef = useGsapTicker(brent, fmtPrice);
  const daysRef = useGsapTicker(days, fmtDays);
  const volumeRef = useGsapTicker(volume, fmtVolume);

  const up = pct > 0;
  const daysTone = "text-primary";

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || !impact || didEntrance.current) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      didEntrance.current = true;
      return;
    }

    const cards = root.querySelectorAll(".metric-card");
    gsap.fromTo(
      cards,
      { y: 12 },
      {
        y: 0,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
        clearProps: "transform",
        overwrite: "auto",
        onComplete: () => {
          didEntrance.current = true;
        },
      },
    );
  }, [impact]);

  return (
    <section ref={sectionRef} className="grid gap-5 md:grid-cols-3">
      <Card eyebrow="Brent Crude · $/bbl" onInfo={() => onExplain("brent")}>
        <div className="mt-4 flex items-baseline gap-3">
          <span
            ref={brentRef}
            className="tnum font-mono text-[32px] font-semibold leading-none tracking-heading text-primary sm:text-[34px]"
          >
            {brent !== undefined ? fmtPrice(brent) : "--"}
          </span>
          {pct !== 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-2/60 px-2 py-0.5 font-mono text-[11px] font-medium tracking-data text-secondary">
              {up ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden />
              )}
              {up ? "+" : ""}
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline pt-4 font-mono text-[11px] tracking-data text-mute">
          <span>
            Freight{" "}
            <span className="text-secondary">
              +${m ? m.freight_premium_usd_per_barrel.toFixed(2) : "0.00"}
            </span>
          </span>
          <span>
            War risk{" "}
            <span className="text-secondary">
              x{m ? m.war_risk_insurance_multiplier.toFixed(2) : "1.00"}
            </span>
          </span>
        </div>
      </Card>

      <Card eyebrow="Strategic Reserve Cover" onInfo={() => onExplain("spr")}>
        <div className="mt-4 flex items-center gap-5">
          {days !== undefined ? (
            <SprRing days={days} />
          ) : (
            <div className="h-[68px] w-[68px] shrink-0 rounded-full border-[6px] border-hairline-strong/40" />
          )}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                ref={daysRef}
                className={`tnum font-mono text-[34px] font-semibold leading-none tracking-heading ${daysTone}`}
              >
                {days !== undefined ? fmtDays(days) : "--"}
              </span>
              <span className="text-[13px] text-secondary">days</span>
            </div>
            <p className="mt-2 font-mono text-[11px] tracking-data text-mute">
              SPR inventory / daily shortfall
            </p>
          </div>
        </div>
      </Card>

      <Card eyebrow="Affected Import Shortfall" onInfo={() => onExplain("volume")}>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            ref={volumeRef}
            className="tnum font-mono text-[32px] font-semibold leading-none tracking-heading text-primary sm:text-[34px]"
          >
            {volume !== undefined ? fmtVolume(volume) : "--"}
          </span>
          <span className="text-[13px] tracking-prose text-secondary">MBPD</span>
          {volumePct !== undefined && volumePct > 0 && (
            <span className="inline-flex items-center rounded-md border border-hairline bg-surface-2/60 px-2 py-0.5 font-mono text-[11px] font-medium tracking-data text-secondary">
              {volumePct.toFixed(0)}% of imports
            </span>
          )}
        </div>
        <p className="mt-4 border-t border-hairline pt-4 font-mono text-[11px] tracking-data text-mute">
          Million barrels per day disrupted vs 5.00 baseline
        </p>
      </Card>
    </section>
  );
}
