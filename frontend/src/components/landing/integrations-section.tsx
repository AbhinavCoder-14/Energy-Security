"use client";

import { Reveal } from "./reveal";

const integrations = [
  { name: "Lloyd's List", category: "Maritime Intelligence" },
  { name: "Kpler", category: "Commodity Flows" },
  { name: "EIA", category: "Energy Data" },
  { name: "OPEC", category: "Production Quotas" },
  { name: "TankerTrackers", category: "Vessel Tracking" },
  { name: "Reuters", category: "News Signals" },
  { name: "Bloomberg", category: "Market Data" },
  { name: "MarineTraffic", category: "AIS Feeds" },
  { name: "IEA", category: "Reserve Stocks" },
  { name: "Platts", category: "Price Benchmarks" },
  { name: "NOAA", category: "Weather Risk" },
  { name: "ACLED", category: "Conflict Events" },
];

export function IntegrationsSection() {
  return (
    <section id="integrations" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <Reveal className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Data sources
            <span className="w-8 h-px bg-foreground/30" />
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-wide mb-6">
            Every signal that
            <br />
            moves the market.
          </h2>
          <p className="text-xl text-muted-foreground">
            Fused from the world&apos;s authoritative energy, maritime, and conflict feeds, in real time.
          </p>
        </Reveal>
      </div>

      <div className="w-full mb-6">
        <div className="flex gap-6 marquee">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {integrations.map((integration) => (
                <div
                  key={`${integration.name}-${setIndex}`}
                  className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group"
                >
                  <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                    {integration.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{integration.category}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-6 marquee-reverse">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {[...integrations].reverse().map((integration) => (
                <div
                  key={`${integration.name}-reverse-${setIndex}`}
                  className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group"
                >
                  <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                    {integration.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{integration.category}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
