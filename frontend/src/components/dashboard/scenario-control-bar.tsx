"use client";

import { Activity, Check, Loader2, Zap } from "lucide-react";
import { COMMAND_SCENARIOS, type CommandScenarioId, type ThreatLevel } from "@/lib/types";

const dot: Record<ThreatLevel, string> = {
  safe: "var(--wr-safe)",
  warn: "var(--wr-warn)",
  crit: "var(--wr-crit)",
};

type Props = {
  activeId: CommandScenarioId;
  launchingId: CommandScenarioId | null;
  onSelect: (id: CommandScenarioId) => void;
};

export function ScenarioControlBar({ activeId, launchingId, onSelect }: Props) {
  return (
    <section aria-label="Scenario control room">
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--wr-muted)]">
        Scenario control room
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COMMAND_SCENARIOS.map((s) => {
          const active = s.id === activeId;
          const launching = s.id === launchingId;
          const tone = dot[s.severity];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={active}
              disabled={launching}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 ${
                active
                  ? "border-transparent bg-[var(--wr-panel-2)]"
                  : "border-[var(--wr-border)] bg-[var(--wr-panel)] hover:border-[var(--wr-accent)]/60 hover:bg-[var(--wr-panel-2)]"
              } disabled:cursor-not-allowed`}
              style={active ? { boxShadow: `inset 0 0 0 1px ${tone}` } : undefined}
            >
              {launching && <span className="wr-sweep pointer-events-none absolute inset-0" />}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${active ? "wr-pulse" : ""}`}
                    style={{ backgroundColor: tone }}
                  />
                  <span className="font-mono text-[10px] tracking-wider text-[var(--wr-muted)]">
                    {s.codename}
                  </span>
                </div>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-sm border"
                  style={
                    active
                      ? { backgroundColor: tone, color: "var(--wr-bg)", borderColor: "transparent" }
                      : { borderColor: "var(--wr-border)", color: "var(--wr-muted)" }
                  }
                >
                  {launching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : s.kind === "live" ? (
                    <Activity className="h-3.5 w-3.5" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                </span>
              </div>

              <h3 className="mt-3 text-[15px] font-semibold leading-tight tracking-tight text-[var(--wr-text)]">
                {s.label}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--wr-muted)]">
                {s.blurb}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
