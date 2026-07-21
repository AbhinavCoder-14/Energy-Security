"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** vertical travel distance in px */
  y?: number;
  /** delay before the tween starts (seconds) */
  delay?: number;
  /** stagger the wrapper's direct children instead of the wrapper itself */
  stagger?: boolean;
  id?: string;
};

/**
 * Scroll-triggered reveal built on GSAP + ScrollTrigger. Replaces the v0
 * IntersectionObserver / mount-flag reveals. Honors prefers-reduced-motion by
 * snapping straight to the visible state.
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
  stagger = false,
  id,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const targets: gsap.TweenTarget = stagger
        ? Array.from(el.children)
        : el;

      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay,
          ease: "power3.out",
          stagger: stagger ? 0.1 : 0,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} id={id} className={className}>
      {children}
    </div>
  );
}
