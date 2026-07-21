"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { mapPayloadToScenario, scenarios as catalogScenarios, type Scenario } from "@/lib/war-room-data";
import { SCENARIO_CATALOG, type PipelineMeta, type ScenarioId } from "@/lib/types";
import { formatApiError, simulateStream } from "@/lib/api";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { ScenarioTriggers } from "./scenario-triggers";
import { ImpactMetrics } from "./impact-metrics";
import { ChokepointMatrix } from "./chokepoint-matrix";
import { RefineryHealth } from "./refinery-health";
import { ExecutiveBrief } from "./executive-brief";
import { SectionHeading } from "./section-heading";
import { Arc } from "@/components/ui/arc";

const STAGE_LABELS: Record<string, string> = {
  ingest: "Ingesting intelligence",
  risk: "Agent 1 — risk parse",
  impact: "Agent 2 — impact math",
  orchestration: "Agent 3 — procurement",
  done: "Pipeline complete",
};

export function WarRoom() {
  const [activeId, setActiveId] = useState<string>(SCENARIO_CATALOG[0].id);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState<string | null>(null);
  const [active, setActive] = useState<Scenario | null>(null);
  const [meta, setMeta] = useState<PipelineMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const runScenario = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLaunchingId(id);
    setPipelineStage("ingest");
    setError(null);

    try {
      const payload = await simulateStream(id as ScenarioId, {
        signal: ac.signal,
        mock: process.env.NEXT_PUBLIC_FORCE_MOCK === "1" ? true : undefined,
        onProgress: (p) => setPipelineStage(p.stage),
      });
      const mapped = mapPayloadToScenario(payload, SCENARIO_CATALOG);
      setActive(mapped);
      setMeta(payload.meta);
      setActiveId(id);
      setPipelineStage(null);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(formatApiError(e));
      setPipelineStage(null);
    } finally {
      setLaunchingId(null);
    }
  }, []);

  useEffect(() => {
    runScenario(SCENARIO_CATALOG[0].id);
    return () => abortRef.current?.abort();
  }, [runScenario]);

  const handleLaunch = useCallback(
    (id: string) => {
      if (id === activeId && !error) return;
      if (id === launchingId) return;
      runScenario(id);
    },
    [activeId, error, launchingId, runScenario],
  );

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set("[data-wr-reveal]", { opacity: 1, y: 0 });
        gsap.set(".wr-batch", { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        "[data-wr-reveal]",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.1 },
      );

      const batchTargets = gsap.utils.toArray<HTMLElement>(".wr-batch");
      if (batchTargets.length === 0) return;

      gsap.set(batchTargets, { opacity: 0, y: 22 });
      ScrollTrigger.batch(batchTargets, {
        start: "top 85%",
        once: true,
        onEnter: (elements) => {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.08,
            overwrite: "auto",
          });
        },
      });
    },
    { scope: rootRef, dependencies: [active?.id] },
  );

  const sourceBadge =
    meta?.demo_mode || meta?.agent1_source === "fallback"
      ? { label: "DEMO SAFETY NET", tone: "var(--wr-warn)" }
      : { label: "LIVE TELEMETRY", tone: "var(--wr-safe)" };

  const initialLoading = !active && !error;

  return (
    <div className="theme-landing flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navigation solid />

      <main ref={rootRef} className="war-room flex-1">
        <div className="wr-grid-bg min-h-full">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pb-12 pt-28 lg:gap-10 lg:px-10 lg:pt-32">
            <header data-wr-reveal className="flex max-w-3xl flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
                  Supply chain resilience
                </p>
                {meta && (
                  <span
                    className="rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wider"
                    style={{
                      color: sourceBadge.tone,
                      borderColor: `color-mix(in oklch, ${sourceBadge.tone} 35%, transparent)`,
                      backgroundColor: `color-mix(in oklch, ${sourceBadge.tone} 12%, transparent)`,
                    }}
                  >
                    {sourceBadge.label}
                  </span>
                )}
                {meta && (
                  <span className="font-mono text-[10px] text-[var(--wr-muted)]">
                    {meta.latency_ms.total.toFixed(0)} ms · A1 {meta.agent1_source} · A3{" "}
                    {meta.agent3_source}
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl tracking-tight text-[var(--wr-text)] lg:text-5xl">
                War room
              </h1>
              <p className="text-[15px] leading-relaxed text-[var(--wr-muted)]">
                Run a geopolitical shock simulation. Watch price, reserves, and chokepoint
                risk update as the three-agent pipeline delivers a decision-grade brief.
              </p>
            </header>

            <div data-wr-reveal>
              <ScenarioTriggers
                scenarios={catalogScenarios}
                activeId={activeId}
                launchingId={launchingId}
                onLaunch={handleLaunch}
              />
            </div>

            {launchingId && pipelineStage && (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] px-4 py-3"
                aria-live="polite"
              >
                <Arc className="size-5 text-[var(--wr-accent)]" aria-hidden />
                <div>
                  <p className="font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
                    Pipeline
                  </p>
                  <p className="text-[14px] text-[var(--wr-text)]">
                    {STAGE_LABELS[pipelineStage] ?? pipelineStage}
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
                  <p className="font-medium">Simulation unavailable</p>
                  <p className="mt-1 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {initialLoading && (
              <div className="flex flex-col items-center gap-4 py-16" aria-busy="true">
                <Arc className="size-10 text-foreground" role="status" aria-label="Loading" />
                <p className="font-mono text-xs tracking-widest text-muted-foreground">
                  Initializing war room pipeline
                </p>
              </div>
            )}

            {active && (
              <>
                <div data-wr-reveal>
                  <ImpactMetrics scenario={active} />
                </div>

                <section aria-label="Tactical brief">
                  <div className="wr-batch">
                    <SectionHeading
                      index="03"
                      title="Tactical brief"
                      description="Where risk sits on the water, how plants are holding, and what to do next."
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                    <ChokepointMatrix scenario={active} />
                    <RefineryHealth scenario={active} />
                  </div>

                  <div className="mt-4 lg:mt-5">
                    <ExecutiveBrief scenario={active} />
                  </div>

                  {active.intelSnippets && active.intelSnippets.length > 0 && (
                    <div className="wr-batch mt-4 rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel)] p-5 lg:mt-5">
                      <p className="font-mono text-[10px] tracking-widest text-[var(--wr-muted)]">
                        AGENT 1 · INTEL SNIPPETS
                      </p>
                      <ul className="mt-3 space-y-2">
                        {active.intelSnippets.map((s, i) => (
                          <li
                            key={`${s.route_name}-${i}`}
                            className="text-[13px] leading-snug text-[var(--wr-text)]"
                          >
                            <span className="font-mono text-[10px] text-[var(--wr-muted)]">
                              {s.route_name.replace(/_/g, " ")}
                            </span>
                            <span className="mx-1.5 opacity-40">·</span>
                            {s.title}
                            {s.source ? (
                              <span className="text-[var(--wr-muted)]"> ({s.source})</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
