"use client";

import { useEffect, useState } from "react";
import { ShieldHalf } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function useClock(timeZone: string, label: string) {
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const t = d.toLocaleTimeString("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setValue(`${t} ${label}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone, label]);
  return value;
}

export function Header() {
  const utc = useClock("UTC", "UTC");
  const ist = useClock("Asia/Kolkata", "IST");

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-2 text-primary shadow-inset-top">
            <ShieldHalf className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-mute">
              Intelligence Core
            </p>
            <h1 className="truncate text-[15px] font-semibold leading-5 tracking-subhead text-primary sm:text-[17px]">
              Aegis Energy: Supply Chain Resilience Core
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-1.5 md:flex">
            <time className="tnum font-mono text-[12px] text-secondary">
              {utc || "--:--:-- UTC"}
            </time>
            <span className="h-3 w-px bg-hairline-strong" aria-hidden />
            <time className="tnum font-mono text-[12px] text-secondary">
              {ist || "--:--:-- IST"}
            </time>
          </div>

          <span className="inline-flex items-center gap-2 rounded-lg border border-safe/20 bg-safe/10 px-2.5 py-1.5 text-[11px] font-medium text-safe sm:text-[12px]">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-safe" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
            </span>
            <span className="hidden sm:inline">System State: </span>Active
            Monitoring
          </span>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
