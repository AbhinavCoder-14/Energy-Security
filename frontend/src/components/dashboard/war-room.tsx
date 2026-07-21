"use client";

import { useCallback, useRef, useState } from "react";
import { scenarios } from "@/lib/war-room-data";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { ScenarioTriggers } from "./scenario-triggers";
import { ImpactMetrics } from "./impact-metrics";
import { ChokepointMatrix } from "./chokepoint-matrix";
import { RefineryHealth } from "./refinery-health";
import { ExecutiveBrief } from "./executive-brief";
import { SectionHeading } from "./section-heading";

export function WarRoom() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rootRef = useRef<HTMLElement>(null);

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  const handleLaunch = useCallback(
    (id: string) => {
      if (id === activeId || id === launchingId) return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setLaunchingId(id);
      timers.current.push(
        setTimeout(() => {
          setActiveId(id);
          setLaunchingId(null);
        }, 620),
      );
    },
    [activeId, launchingId],
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
    { scope: rootRef },
  );

  return (
    <div className="theme-landing flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navigation solid />

      <main ref={rootRef} className="war-room flex-1">
        <div className="wr-grid-bg min-h-full">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pb-12 pt-28 lg:gap-10 lg:px-10 lg:pt-32">
            <header data-wr-reveal className="max-w-2xl">
              <p className="font-mono text-[11px] tracking-wider text-[var(--wr-muted)]">
                Supply chain resilience
              </p>
              <h1 className="mt-2 font-display text-4xl tracking-tight text-[var(--wr-text)] lg:text-5xl">
                War room
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--wr-muted)]">
                Run a geopolitical shock simulation. Watch price, reserves, and chokepoint
                risk update as the three-agent pipeline delivers a decision-grade brief.
              </p>
            </header>

            <div data-wr-reveal>
              <ScenarioTriggers
                scenarios={scenarios}
                activeId={activeId}
                launchingId={launchingId}
                onLaunch={handleLaunch}
              />
            </div>

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
            </section>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
