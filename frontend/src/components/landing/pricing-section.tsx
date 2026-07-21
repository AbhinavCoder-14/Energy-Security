"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const plans = [
  {
    name: "Analyst",
    description: "For single-desk research teams",
    price: { monthly: 0, annual: 0 },
    features: [
      "3 saved scenarios",
      "Daily feed refresh",
      "Chokepoint risk matrix",
      "Standard briefs",
      "Community support",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Command",
    description: "For energy trading and strategy",
    price: { monthly: 2900, annual: 2400 },
    features: [
      "Unlimited scenarios",
      "Scenario simulations",
      "Refinery health tracking",
      "Auditable math on every metric",
      "Executive brief generation",
      "Priority support",
      "Full API access",
    ],
    cta: "Request access",
    popular: true,
  },
  {
    name: "Sovereign",
    description: "For governments and national reserves",
    price: { monthly: null, annual: null },
    features: [
      "Everything in Command",
      "Air-gapped deployment",
      "24/7 dedicated analysts",
      "Custom feed integration",
      "Clearance-based access",
      "On-premise option",
      "Security audit",
      "Classified data handling",
    ],
    cta: "Contact command",
    popular: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-20">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Access tiers
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-wide text-foreground mb-6">
            Clearance for every
            <br />
            <span className="text-stroke">command level</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            From a single analyst desk to a national reserve authority. Scale your clearance as the stakes rise.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-16">
          <span className={`text-sm transition-colors ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 bg-foreground/10 rounded-full p-1 transition-colors hover:bg-foreground/20"
          >
            <div
              className={`w-5 h-5 bg-foreground rounded-full transition-transform duration-300 ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm transition-colors ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Annual
          </span>
          {isAnnual && (
            <span className="ml-2 px-2 py-1 bg-foreground text-background text-xs font-mono">Save 17%</span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-foreground/10">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative p-8 lg:p-12 bg-background ${
                plan.popular ? "md:-my-4 md:py-12 lg:py-16 border-2 border-foreground" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-foreground text-background text-xs font-mono uppercase tracking-widest">
                  Most Popular
                </span>
              )}

              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl text-foreground mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="mb-8 pb-8 border-b border-foreground/10">
                {plan.price.monthly !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl lg:text-6xl text-foreground">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                ) : (
                  <span className="font-display text-4xl text-foreground">Custom</span>
                )}
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                  plan.popular
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          All tiers include encrypted feeds, audit logging, and continuous signal updates.{" "}
          <a href="#" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Compare all capabilities
          </a>
        </p>
      </div>
    </section>
  );
}
