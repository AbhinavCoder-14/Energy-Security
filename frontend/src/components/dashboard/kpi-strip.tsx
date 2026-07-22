"use client";

import { AlertTriangle, Droplets, Info, Timer, TrendingUp, Wallet } from "lucide-react";
import type { DashboardPayload } from "@/lib/types";
import type { AuditTopic } from "@/components/AuditModal";

function KpiCard({
  icon,
  label,
  display,
  unit,
  sub,
  tone,
  warn,
  onAudit,
}: {
  icon: React.ReactNode;
  label: string;
  display: string;
  unit: string;
  sub: string;
  tone: string;
  warn?: boolean;
  onAudit: () => void;
}) {
  return (
    <div className="wr-scanline relative overflow-hidden rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5 transition-all duration-200 hover:border-[var(--wr-accent)]/60">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: tone }} />
      <div className="relative z-10 flex items-start justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--wr-muted)]">
          <span style={{ color: tone }}>{icon}</span>
          {label}
        </span>
        <button
          type="button"
          onClick={onAudit}
          className="flex items-center gap-1 rounded-lg border border-[var(--wr-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
          aria-label={`Explain the math behind ${label}`}
        >
          <Info className="h-3 w-3" />
          EXPLAIN
        </button>
      </div>

      <div className="relative z-10 mt-4 flex items-baseline gap-1.5">
        <span
          className="font-mono text-4xl font-semibold tabular-nums tracking-tight lg:text-5xl"
          style={warn ? { color: "var(--wr-crit)" } : undefined}
        >
          {display}
        </span>
        <span className="font-mono text-sm text-[var(--wr-muted)]">{unit}</span>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-1.5 text-[12px] text-[var(--wr-muted)]">
        {warn && <AlertTriangle className="h-3.5 w-3.5" style={{ color: "var(--wr-crit)" }} />}
        <span style={warn ? { color: "var(--wr-crit)" } : undefined}>{sub}</span>
      </div>
    </div>
  );
}

export function KpiStrip({
  data,
  onAudit,
}: {
  data: DashboardPayload;
  onAudit: (topic: AuditTopic) => void;
}) {
  const m = data.market_impact;
  const brent = m.brent_crude_price_usd ?? data.projected_brent_usd;
  const pct = m.price_increase_pct ?? 0;
  const spr = data.spr_days_remaining;
  const sprWarn = spr < 5;
  const fiscalM = (m.daily_fiscal_loss_usd ?? 0) / 1_000_000;
  const disrupted = data.v_disrupted_mbpd;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Brent Crude"
        display={`$${brent.toFixed(1)}`}
        unit="/ bbl"
        sub={
          pct > 0
            ? `+${pct.toFixed(1)}% vs baseline $${data.baseline_brent_usd.toFixed(1)}`
            : `Baseline $${data.baseline_brent_usd.toFixed(1)} · nominal`
        }
        tone={pct > 0 ? "var(--wr-crit)" : "var(--wr-safe)"}
        onAudit={() => onAudit("brent")}
      />
      <KpiCard
        icon={<Timer className="h-4 w-4" />}
        label="Reserve Countdown"
        display={spr.toFixed(1)}
        unit="days"
        sub={sprWarn ? "Critical: below 5-day floor" : "Strategic + commercial cover"}
        tone={sprWarn ? "var(--wr-crit)" : "var(--wr-warn)"}
        warn={sprWarn}
        onAudit={() => onAudit("spr")}
      />
      <KpiCard
        icon={<Wallet className="h-4 w-4" />}
        label="Daily Fiscal Loss"
        display={fiscalM > 0 ? `$${fiscalM.toFixed(1)}` : "$0.0"}
        unit="M / day"
        sub={fiscalM > 0 ? "Surge in import expenditure" : "No incremental import cost"}
        tone={fiscalM > 0 ? "var(--wr-crit)" : "var(--wr-safe)"}
        onAudit={() => onAudit("fiscal")}
      />
      <KpiCard
        icon={<Droplets className="h-4 w-4" />}
        label="Disrupted Volume"
        display={disrupted.toFixed(2)}
        unit="MBPD"
        sub={disrupted > 0 ? "Cut from inbound national supply" : "Full inbound supply intact"}
        tone={disrupted > 0 ? "var(--wr-crit)" : "var(--wr-safe)"}
        onAudit={() => onAudit("volume")}
      />
    </div>
  );
}
