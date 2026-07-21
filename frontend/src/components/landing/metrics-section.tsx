"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

function GsapCounter({
  end,
  suffix = "",
  prefix = "",
}: {
  end: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const obj = { v: 0 };
      const paint = () => {
        el.textContent = `${prefix}${Math.floor(obj.v).toLocaleString()}${suffix}`;
      };
      paint();
      if (prefersReducedMotion()) {
        obj.v = end;
        paint();
        return;
      }
      gsap.to(obj, {
        v: end,
        duration: 2,
        ease: "power3.out",
        onUpdate: paint,
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    },
    { scope: ref },
  );

  return <div ref={ref} className="text-6xl lg:text-8xl font-display tracking-wide" />;
}

const metrics = [
  { value: 1284, suffix: "", prefix: "", label: "Tankers tracked in real time" },
  { value: 21, suffix: "M b/d", prefix: "", label: "Crude flow under watch" },
  { value: 94, suffix: "s", prefix: "", label: "To model a full shock" },
  { value: 63, suffix: "", prefix: "", label: "Scenarios simulated today" },
];

export function MetricsSection() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="studio" className="relative py-24 lg:py-32 border-y border-foreground/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-24">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Live intelligence
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-wide">
              Resilience you
              <br />
              can measure.
            </h2>
          </Reveal>
          <div className="flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            <span className="text-foreground/30">|</span>
            <span suppressHydrationWarning>{time}</span>
          </div>
        </div>

        <Reveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/10">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-background p-8 lg:p-12">
              <GsapCounter end={metric.value} suffix={metric.suffix} prefix={metric.prefix} />
              <div className="mt-4 text-lg text-muted-foreground">{metric.label}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
