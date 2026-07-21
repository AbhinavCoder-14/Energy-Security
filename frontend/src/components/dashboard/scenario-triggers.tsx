"use client";

import { Check, Loader2, Play } from "lucide-react";
import type { Scenario, ThreatLevel } from "@/lib/war-room-data";
import { SectionHeading } from "./section-heading";

const dot: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

type Props = {
  scenarios: Scenario[];
  activeId: string;
  launchingId: string | null;
  onLaunch: (id: string) => void;
};

export function ScenarioTriggers({ scenarios, activeId, launchingId, onLaunch }: Props) {
  return (
    <section aria-label="Scenario trigger room">
      <SectionHeading
        index="01"
        title="Trigger room"
        description="Pick a geopolitical scenario to run through the resilience pipeline."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {scenarios.map((s) => {
          const active = s.id === activeId;
          const launching = s.id === launchingId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onLaunch(s.id)}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-md border p-4 text-left transition-all duration-300 ${
                active
                  ? "border-transparent bg-[var(--wr-panel-2)] shadow-[0_0_0_1px_var(--wr-accent),0_8px_30px_-12px_rgba(0,0,0,0.25)]"
                  : "border-[var(--wr-border)] bg-[var(--wr-panel)] hover:border-[var(--wr-accent)]/60 hover:bg-[var(--wr-panel-2)]"
              }`}
              style={active ? { boxShadow: "inset 0 0 0 1px " + dot[s.posture] } : undefined}
            >
              {launching && <span className="wr-sweep pointer-events-none absolute inset-0" />}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${active ? "wr-pulse" : ""}`}
                    style={{ backgroundColor: dot[s.posture] }}
                  />
                  <span className="font-mono text-[10px] tracking-wider text-[var(--wr-muted)]">
                    {s.codename}
                  </span>
                </div>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-sm border transition-colors ${
                    active
                      ? "border-transparent"
                      : "border-[var(--wr-border)] text-[var(--wr-muted)] group-hover:text-[var(--wr-text)]"
                  }`}
                  style={active ? { backgroundColor: dot[s.posture], color: "var(--wr-bg)" } : undefined}
                >
                  {launching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </span>
              </div>

              <h3 className="mt-3 font-display text-xl leading-tight tracking-wide">{s.name}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--wr-muted)]">{s.summary}</p>

              <div className="mt-3 flex items-center gap-2 font-mono text-[10px] tracking-wider">
                <span
                  className="rounded-sm px-1.5 py-0.5"
                  style={{
                    color: dot[s.posture],
                    backgroundColor: "color-mix(in oklch, " + dot[s.posture] + " 14%, transparent)",
                  }}
                >
                  {launching ? "LAUNCHING…" : active ? "SIMULATION ACTIVE" : "STANDBY"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
