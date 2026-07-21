"use client";

import { useEffect, useState } from "react";
import { Reveal } from "./reveal";

const locations = [
  { city: "Strait of Hormuz", region: "Persian Gulf", latency: "21M b/d" },
  { city: "Strait of Malacca", region: "Southeast Asia", latency: "16M b/d" },
  { city: "Suez Canal", region: "Egypt", latency: "9M b/d" },
  { city: "Bab-el-Mandeb", region: "Red Sea", latency: "6M b/d" },
  { city: "Turkish Straits", region: "Bosphorus", latency: "3M b/d" },
  { city: "Panama Canal", region: "Central America", latency: "1M b/d" },
];

export function InfrastructureSection() {
  const [activeLocation, setActiveLocation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLocation((prev) => (prev + 1) % locations.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Maritime chokepoints
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-wide mb-8">
              The world runs
              <br />
              through six gates.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              Over 60% of seaborne crude passes through a handful of narrow straits.
              Aegis scores chokepoint threat from live news signals and scenario models.
            </p>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">6</div>
                <div className="text-sm text-muted-foreground">Chokepoints</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">60%</div>
                <div className="text-sm text-muted-foreground">Seaborne crude</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">3</div>
                <div className="text-sm text-muted-foreground">Agent pipeline</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="border border-foreground/10">
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Chokepoint Monitor</span>
                <span className="flex items-center gap-2 text-xs font-mono text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Simulation ready
                </span>
              </div>

              <div>
                {locations.map((location, index) => (
                  <div
                    key={location.city}
                    className={`px-6 py-5 border-b border-foreground/5 last:border-b-0 flex items-center justify-between transition-all duration-300 ${
                      activeLocation === index ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          activeLocation === index ? "bg-foreground" : "bg-foreground/20"
                        }`}
                      />
                      <div>
                        <div className="font-medium">{location.city}</div>
                        <div className="text-sm text-muted-foreground">{location.region}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{location.latency}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
