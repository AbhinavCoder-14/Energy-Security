"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertOctagon } from "lucide-react";
import {
  COMMAND_SCENARIOS,
  type CommandScenarioId,
  type DashboardPayload,
} from "@/lib/types";
import { formatApiError, getLiveTelemetry, simulateScenario } from "@/lib/api";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { Arc } from "@/components/ui/arc";
import { AuditModal, type AuditTopic } from "@/components/AuditModal";
import { CommandHeader } from "./command-header";
import { ScenarioControlBar } from "./scenario-control-bar";
import { KpiStrip } from "./kpi-strip";
import { WorldMapPanel } from "./world-map-panel";
import { AnalyticsGraphs } from "./analytics-graphs";
import { SovereignDependencyGrid } from "./sovereign-dependency-grid";
import { RefineryHealthCards } from "./refinery-health-cards";
import { ExecutiveBriefingPanel } from "./executive-briefing-panel";
import { SectionHeading } from "./section-heading";

const DEFAULT_ID: CommandScenarioId = "live_telemetry";

export function WarRoom() {
  const [activeId, setActiveId] = useState<CommandScenarioId>(DEFAULT_ID);
  const [launchingId, setLaunchingId] = useState<CommandScenarioId | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditTopic, setAuditTopic] = useState<AuditTopic>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const run = useCallback(async (id: CommandScenarioId) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLaunchingId(id);
    setError(null);

    const scenario = COMMAND_SCENARIOS.find((s) => s.id === id);
    const mock = process.env.NEXT_PUBLIC_FORCE_MOCK === "1" ? true : undefined;

    try {
      const payload =
        scenario?.kind === "live"
          ? await getLiveTelemetry({ signal: ac.signal, mock })
          : await simulateScenario(id, { signal: ac.signal, mock });
      setData(payload);
      setActiveId(id);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(formatApiError(e));
    } finally {
      setLaunchingId(null);
    }
  }, []);

  useEffect(() => {
    run(DEFAULT_ID);
    return () => abortRef.current?.abort();
  }, [run]);

  const handleSelect = useCallback(
    (id: CommandScenarioId) => {
      if (id === launchingId) return;
      run(id);
    },
    [launchingId, run],
  );

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set("[data-wr-reveal]", { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        "[data-wr-reveal]",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", stagger: 0.09 },
      );
    },
    { scope: rootRef, dependencies: [data?.scenario_id] },
  );

  const initialLoading = !data && !error;

  return (
    <div className="theme-landing flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navigation solid />

      <main ref={rootRef} className="war-room flex-1">
        <div className="wr-grid-bg min-h-full">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pb-12 pt-28 lg:gap-10 lg:px-10 lg:pt-32">
            <CommandHeader
              isLive={data?.is_live_telemetry ?? true}
              brentSource={data?.brent_data_source}
            />

            <div data-wr-reveal>
              <ScenarioControlBar
                activeId={activeId}
                launchingId={launchingId}
                onSelect={handleSelect}
              />
            </div>

            {launchingId && (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] px-4 py-3"
                aria-live="polite"
              >
                <Arc className="size-5 text-[var(--wr-accent)]" aria-hidden />
                <div>
                  <p className="font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
                    Engine
                  </p>
                  <p className="text-[14px] text-[var(--wr-text)]">
                    {launchingId === "live_telemetry"
                      ? "Fetching live telemetry baseline"
                      : "Running deterministic shock simulation"}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-3 rounded-2xl border border-alert/25 bg-alert/5 px-4 py-3.5 text-[13px] text-alert"
                role="alert"
              >
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium">Command center unavailable</p>
                  <p className="mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {initialLoading && (
              <div className="flex flex-col items-center gap-4 py-16" aria-busy="true">
                <Arc className="size-10 text-foreground" role="status" aria-label="Loading" />
                <p className="font-mono text-xs tracking-widest text-muted-foreground">
                  Initializing command center telemetry
                </p>
              </div>
            )}

            {data && (
              <>
                <div data-wr-reveal>
                  <KpiStrip data={data} onAudit={setAuditTopic} />
                </div>

                <section aria-label="Geospatial threat board">
                  <SectionHeading
                    index="01"
                    title="Threat board"
                    description="Chokepoint risk on the water and deterministic reroute paths into India."
                  />
                  <WorldMapPanel data={data} />
                </section>

                <section aria-label="Projections">
                  <SectionHeading
                    index="02"
                    title="Projections"
                    description="Strategic reserve depletion and Brent price escalation over the projection window."
                  />
                  <AnalyticsGraphs data={data} />
                </section>

                <section aria-label="Sovereign dependency and refineries">
                  <SectionHeading
                    index="03"
                    title="Structural exposure"
                    description="Sovereign crude dependency, chemical slate risk, and refinery run-days."
                  />
                  <div className="flex flex-col gap-4 lg:gap-5">
                    <SovereignDependencyGrid data={data} />
                    <RefineryHealthCards data={data} />
                  </div>
                </section>

                <section aria-label="Executive briefing">
                  <SectionHeading
                    index="04"
                    title="Executive briefing"
                    description="Cabinet-ready memo and ranked procurement reroute directives."
                  />
                  <ExecutiveBriefingPanel data={data} />
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      <FooterSection />

      <AuditModal topic={auditTopic} data={data} onClose={() => setAuditTopic(null)} />
    </div>
  );
}
