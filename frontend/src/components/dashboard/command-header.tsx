"use client";

import { useEffect, useState } from "react";
import { Activity, Radio } from "lucide-react";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmt(now: Date | null, tz: string) {
  if (!now) return "--:--:--";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(now);
}

type Props = {
  isLive: boolean;
  brentSource?: string | null;
};

export function CommandHeader({ isLive, brentSource }: Props) {
  const now = useClock();

  return (
    <header data-wr-reveal className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] font-medium tracking-wider"
            style={{
              color: isLive ? "var(--wr-safe)" : "var(--wr-crit)",
              borderColor: `color-mix(in oklch, ${isLive ? "var(--wr-safe)" : "var(--wr-crit)"} 35%, transparent)`,
              backgroundColor: `color-mix(in oklch, ${isLive ? "var(--wr-safe)" : "var(--wr-crit)"} 12%, transparent)`,
            }}
          >
            {isLive ? (
              <Radio className="h-3 w-3 wr-pulse" aria-hidden />
            ) : (
              <Activity className="h-3 w-3 wr-pulse" aria-hidden />
            )}
            {isLive ? "MODE: LIVE TELEMETRY" : "MODE: CRISIS SHOCK SIMULATION"}
          </span>
          {brentSource && (
            <span className="font-mono text-[10px] tracking-wider text-[var(--wr-muted)]">
              Brent feed · {brentSource}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums text-[var(--wr-muted)]">
          <span>
            <span className="opacity-60">UTC</span> {fmt(now, "UTC")}
          </span>
          <span>
            <span className="opacity-60">IST</span> {fmt(now, "Asia/Kolkata")}
          </span>
        </div>
      </div>

      <div className="max-w-3xl">
        <p className="font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
          National supply chain resilience core
        </p>
        <h1 className="mt-1 font-display text-4xl leading-tight tracking-tight text-[var(--wr-text)] lg:text-5xl">
          Aegis Energy Command Center
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--wr-muted)]">
          Live steady-state telemetry with a deterministic what-if shock engine. Trigger a
          chokepoint scenario to watch price, reserves, refineries, and reroute options update.
        </p>
      </div>
    </header>
  );
}
