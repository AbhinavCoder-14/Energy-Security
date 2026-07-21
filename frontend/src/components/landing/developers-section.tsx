"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Reveal } from "./reveal";

const codeExamples = [
  {
    label: "Install",
    code: `npm install @aegis/sdk

# or
yarn add @aegis/sdk
pnpm add @aegis/sdk`,
  },
  {
    label: "Initialize",
    code: `import { Aegis } from '@aegis/sdk'

const aegis = new Aegis({
  apiKey: process.env.AEGIS_KEY
})`,
  },
  {
    label: "Simulate",
    code: `const shock = await aegis.simulate({
  scenario: 'hormuz_blockade',
  horizon: '90d',
  outputs: [
    'brent_shock',
    'spr_cover'
  ]
})

console.log('Brent:', shock.brent)`,
  },
];

const features = [
  { title: "TypeScript native", description: "Full type safety with auto-generated scenario types." },
  { title: "Auditable outputs", description: "Every figure ships with its source math." },
  { title: "Streaming feeds", description: "Subscribe to live chokepoint and price signals." },
  { title: "Air-gap ready", description: "Deploy inside sovereign, offline environments." },
];

const codeAnimationStyles = `
  .dev-code-line {
    opacity: 0;
    transform: translateX(-8px);
    animation: devLineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes devLineReveal {
    to { opacity: 1; transform: translateX(0); }
  }
  .dev-code-char {
    opacity: 0;
    filter: blur(8px);
    animation: devCharReveal 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes devCharReveal {
    to { opacity: 1; filter: blur(0); }
  }
`;

export function DevelopersSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developers" className="relative py-24 lg:py-32 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: codeAnimationStyles }} />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Intelligence API
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-wide mb-8">
              Wire resilience
              <br />
              <span className="text-muted-foreground">into your stack.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Run simulations, stream chokepoint risk, and pull directives directly
              from the resilience core with a clean, fully-typed SDK.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {features.map((feature) => (
                <div key={feature.title}>
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:sticky lg:top-32">
            <div className="border border-foreground/10">
              <div className="flex items-center border-b border-foreground/10">
                {codeExamples.map((example, idx) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-6 py-4 text-sm font-mono transition-colors relative ${
                      activeTab === idx ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {example.label}
                    {activeTab === idx && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                    )}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-4 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-8 font-mono text-sm bg-foreground/[0.01] min-h-[220px]">
                <pre className="text-foreground/80">
                  {codeExamples[activeTab].code.split("\n").map((line, lineIndex) => (
                    <div
                      key={`${activeTab}-${lineIndex}`}
                      className="leading-loose dev-code-line"
                      style={{ animationDelay: `${lineIndex * 80}ms` }}
                    >
                      <span className="inline-flex">
                        {line.split("").map((char, charIndex) => (
                          <span
                            key={`${activeTab}-${lineIndex}-${charIndex}`}
                            className="dev-code-char"
                            style={{ animationDelay: `${lineIndex * 80 + charIndex * 15}ms` }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm">
              <a href="#" className="text-foreground hover:underline underline-offset-4">
                Read the docs
              </a>
              <span className="text-foreground/20">|</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                View on GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
