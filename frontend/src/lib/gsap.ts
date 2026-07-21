"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Central GSAP registration. Import { gsap, ScrollTrigger, useGSAP } from here
 * so plugins are only ever registered once on the client.
 *
 * Never import this module from a Server Component — only from `"use client"`
 * files (or via `next/dynamic(..., { ssr: false })`).
 */
let registered = false;
function ensureRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  registered = true;
}
ensureRegistered();

/** True when the user has requested reduced motion. Safe to call during render. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger, useGSAP };
