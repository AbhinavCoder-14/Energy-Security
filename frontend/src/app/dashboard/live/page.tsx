"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { ScenarioControlRoom } from "@/components/ScenarioControlRoom";
import { MetricsStrip } from "@/components/MetricsStrip";
import { ChokepointRiskMatrix } from "@/components/ChokepointRiskMatrix";
import { RefineryHealthCards } from "@/components/RefineryHealthCards";
import { ExecutiveBriefing } from "@/components/ExecutiveBriefing";
import { AuditModal, type AuditTopic } from "@/components/AuditModal";
import { DashboardSkeleton } from "@/components/SkeletonLoaders";
import {
  API_BASE,
  type ScenarioId,
  type UnifiedDashboardPayload,
} from "@/lib/types";

export default function LiveDashboardPage() {
  const [scenario, setScenario] = useState<ScenarioId>("baseline_peace");
  const [data, setData] = useState<UnifiedDashboardPayload | null>(null);
  const [fetchingId, setFetchingId] = useState<ScenarioId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditTopic, setAuditTopic] = useState<AuditTopic>(null);

  const initialLoading = data === null && fetchingId !== null;

  const fetchScenario = useCallback(async (id: ScenarioId) => {
    setFetchingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/simulate/${id}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as UnifiedDashboardPayload;
      setData(json);
      setScenario(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown fetch error";
      setError(
        `${msg}. Ensure the FastAPI backend is running on ${API_BASE}.`,
      );
    } finally {
      setFetchingId(null);
    }
  }, []);

  useEffect(() => {
    fetchScenario("baseline_peace");
  }, [fetchScenario]);

  return (
    <div className="theme-landing relative flex min-h-[100dvh] flex-col">
      <Navigation solid />

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-8 px-4 pb-16 pt-28 sm:px-6 lg:px-10 lg:pt-32">
        <header className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-wider text-mute">Live intelligence</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-primary lg:text-5xl">
            Live feed
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-secondary">
            Real-time simulation against the FastAPI pipeline. Trigger a scenario and watch
            economic impact, chokepoint risk, and procurement directives update together.
          </p>
        </header>

        <ScenarioControlRoom
          active={scenario}
          fetchingId={fetchingId}
          onSelect={fetchScenario}
        />

        {error && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-alert/25 bg-alert/5 px-4 py-3.5 text-[13px] text-alert"
            role="alert"
          >
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {initialLoading ? (
          <DashboardSkeleton />
        ) : (
          <div
            className={
              fetchingId
                ? "space-y-6 opacity-70 transition-opacity duration-200"
                : "space-y-6"
            }
          >
            <MetricsStrip
              impact={data?.impact_data ?? null}
              onExplain={(t) => setAuditTopic(t)}
            />

            <ChokepointRiskMatrix
              threats={data?.risk_data.active_threats ?? []}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <RefineryHealthCards
                refineries={data?.impact_data.refinery_breakdown ?? []}
              />
              <ExecutiveBriefing data={data?.orchestration_data ?? null} />
            </div>

            {data?.risk_data.system_rationale && (
              <p className="border-t border-hairline pt-5 text-center text-[13px] leading-relaxed text-mute">
                {data.risk_data.system_rationale}
              </p>
            )}
          </div>
        )}
      </main>

      <FooterSection />

      <AuditModal topic={auditTopic} onClose={() => setAuditTopic(null)} />
    </div>
  );
}
