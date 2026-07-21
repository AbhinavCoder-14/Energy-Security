"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * On `scenarioId` change: reset `[data-meter]` fills to scaleX 0, then stagger
 * fill to `data-value` (0–100). Uses transform only (origin left).
 */
export function useMeterStagger(scenarioId: string) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const meters = root.querySelectorAll<HTMLElement>("[data-meter]");
      if (meters.length === 0) return;

      const read = (el: Element) =>
        Math.max(0, Math.min(100, Number(el.getAttribute("data-value") || 0))) /
        100;

      if (prefersReducedMotion()) {
        meters.forEach((el) => {
          gsap.set(el, { scaleX: read(el), transformOrigin: "left center" });
        });
        return;
      }

      gsap.set(meters, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(meters, {
        scaleX: (_i, el) => read(el),
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.05,
        overwrite: "auto",
      });
    },
    { dependencies: [scenarioId], scope: rootRef },
  );

  return rootRef;
}

/**
 * Stagger fade/slide of `[data-stagger]` children when `scenarioId` changes.
 */
export function useScenarioStagger(
  scenarioId: string,
  opts?: { y?: number; duration?: number; stagger?: number },
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const y = opts?.y ?? 10;
  const duration = opts?.duration ?? 0.45;
  const stagger = opts?.stagger ?? 0.07;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const items = root.querySelectorAll<HTMLElement>("[data-stagger]");
      if (items.length === 0) return;

      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        items,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          ease: "power2.out",
          stagger,
          overwrite: "auto",
        },
      );
    },
    { dependencies: [scenarioId], scope: rootRef },
  );

  return rootRef;
}
