"use client";

import { Shield, Lock, Eye, FileCheck } from "lucide-react";
import { Reveal } from "./reveal";

const securityFeatures = [
  {
    icon: Shield,
    title: "Air-gapped deployment",
    description: "Run the entire resilience core inside your own sovereign perimeter, offline if required.",
  },
  {
    icon: Lock,
    title: "End-to-end encryption",
    description: "AES-256 encryption for data at rest and TLS 1.3 in transit across every feed.",
  },
  {
    icon: Eye,
    title: "Clearance-based access",
    description: "Granular role and clearance controls. Every query is authenticated and audited.",
  },
  {
    icon: FileCheck,
    title: "Auditable intelligence",
    description: "Every number is traceable to its source math, no black-box outputs.",
  },
];

const certifications = ["SOC 2", "ISO 27001", "FedRAMP", "ITAR", "GDPR"];

export function SecuritySection() {
  return (
    <section id="security" className="relative py-24 lg:py-32 bg-foreground/[0.02] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Security
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-wide mb-8">
              Built for
              <br />
              national stakes.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              When the decisions shape energy security, the intelligence has to be trusted.
              Sovereign-grade controls are built into every layer of the core.
            </p>

            <div className="flex flex-wrap gap-3">
              {certifications.map((cert) => (
                <span key={cert} className="px-4 py-2 border border-foreground/10 text-sm font-mono">
                  {cert}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal stagger className="grid gap-6">
            {securityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-6 border border-foreground/10 hover:border-foreground/20 transition-all duration-500 group"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center border border-foreground/10 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 group-hover:translate-x-1 transition-transform duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
