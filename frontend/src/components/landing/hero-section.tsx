"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AnimatedSphere } from "./animated-sphere";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

const words = ["anticipate", "model", "withstand", "secure"];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Entrance sequence
  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set("[data-hero]", { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        "[data-hero]",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
        },
      );
    },
    { scope: rootRef },
  );

  // Per-word char-in when the cycling word changes
  useGSAP(
    () => {
      const el = wordRef.current;
      if (!el) return;
      const chars = el.querySelectorAll("[data-char]");
      if (prefersReducedMotion()) {
        gsap.set(chars, { opacity: 1, y: 0, filter: "blur(0px)" });
        return;
      }
      gsap.fromTo(
        chars,
        { opacity: 0, yPercent: 100, filter: "blur(12px)" },
        {
          opacity: 1,
          yPercent: 0,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.05,
        },
      );
    },
    { dependencies: [wordIndex], scope: wordRef },
  );

  return (
    <section
      ref={rootRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[800px] lg:h-[800px] opacity-40 pointer-events-none">
        <AnimatedSphere />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-32 lg:py-40 w-full">
        <div data-hero className="mb-8">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            Geopolitical energy situational awareness
          </span>
        </div>

        <div className="mb-12">
          <h1
            data-hero
            className="text-[clamp(3rem,12vw,10rem)] font-display leading-[0.9] tracking-wide"
          >
            <span className="block">The core to</span>
            <span className="block">
              {" "}
              <span className="relative inline-block">
                <span ref={wordRef} key={wordIndex} className="inline-flex">
                  {words[wordIndex].split("").map((char, i) => (
                    <span
                      key={`${wordIndex}-${i}`}
                      data-char
                      className="inline-block"
                    >
                      {char}
                    </span>
                  ))}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-foreground/10" />
              </span>
            </span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <p
            data-hero
            className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl"
          >
            The situational awareness terminal for energy security. Simulate supply
            shocks, model refinery resilience, and act before the disruption hits.
          </p>

          <div data-hero className="flex flex-col sm:flex-row items-start gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-foreground px-14 text-base text-background hover:bg-foreground/90 has-[>svg]:px-14 group"
            >
              <a href="/dashboard">
                Launch War Room
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
            >
              <a href="#how-it-works">How the pipeline works</a>
            </Button>
          </div>
        </div>
      </div>

      <div data-hero className="absolute bottom-24 left-0 right-0">
        <div className="flex gap-16 marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16">
              {[
                { value: "21M", label: "barrels/day monitored", company: "CHOKEPOINTS" },
                { value: "94s", label: "to model a full shock", company: "PIPELINE" },
                { value: "3", label: "Indian refineries modeled", company: "STRUCTURAL" },
                { value: "6", label: "shipping routes scored", company: "MARITIME" },
              ].map((stat) => (
                <div key={`${stat.company}-${i}`} className="flex items-baseline gap-4">
                  <span className="text-4xl lg:text-5xl font-display">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                    <span className="block font-mono text-xs mt-1">{stat.company}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
