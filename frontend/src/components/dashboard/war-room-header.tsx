"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Radio } from "lucide-react";
import type { ThreatLevel } from "@/lib/war-room-data";

const postureLabel: Record<ThreatLevel, string> = {
  safe: "DEFCON 5 · STEADY",
  warn: "DEFCON 3 · ELEVATED",
  crit: "DEFCON 1 · CRITICAL",
};

const postureColor: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

export function WarRoomHeader({ posture }: { posture: ThreatLevel }) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { hour12: false }) + " UTC";
    setClock(fmt());
    const id = setInterval(() => setClock(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 border-b border-[var(--wr-border)] bg-[var(--wr-panel)]/70 px-4 py-3 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <a
          href="/"
          className="flex items-center gap-2 text-[var(--wr-muted)] transition-colors hover:text-[var(--wr-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden font-mono text-xs sm:inline">EXIT</span>
        </a>
        <div className="h-6 w-px bg-[var(--wr-border)]" />
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg leading-none tracking-wide">Aegis Energy</span>
          <span className="font-mono text-[10px] text-[var(--wr-muted)]">CORE</span>
        </div>
        {/* <span className="hidden font-mono text-xs text-[var(--wr-muted)] md:inline">
          / Supply Chain Resilience War Room
        </span> */}
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
          {/* <span
            className="rounded-sm border px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider"
            style={{
              color: postureColor[posture],
              borderColor: postureColor[posture],
              backgroundColor:
                "color-mix(in oklch, " + postureColor[posture] + " 12%, transparent)",
            }}
          >
            {postureLabel[posture]}
          </span> */}
        <span
          className="font-mono text-xs tabular-nums text-[var(--wr-text)]"
          suppressHydrationWarning
        >
          {clock}
        </span>
      </div>
    </header>
  );
}
