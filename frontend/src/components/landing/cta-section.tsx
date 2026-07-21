"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AnimatedTetrahedron } from "./animated-tetrahedron";
import { Reveal } from "./reveal";

export function CtaSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="relative border border-foreground" onMouseMove={handleMouseMove}>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(0,0,0,0.15), transparent 40%)`,
              }}
            />

            <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex-1">
                  <h2 className="text-4xl lg:text-7xl font-display tracking-wide mb-8 leading-[0.95]">
                    See the fallout
                    <br />
                    before it happens.
                  </h2>

                  <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                    Step into the war room and run your first supply-shock simulation.
                    Intelligence built for the moments that matter most.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
                    >
                      <a href="/dashboard">
                        Launch War Room
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 px-8 text-base rounded-full border-foreground/20 hover:bg-foreground/5"
                    >
                      Request a briefing
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-8 font-mono">
                    Cleared access, deployed in your perimeter
                  </p>
                </div>

                <div className="hidden lg:flex items-center justify-center w-[500px] h-[500px] -mr-16">
                  <AnimatedTetrahedron />
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 border-b border-l border-foreground/10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-t border-r border-foreground/10" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
