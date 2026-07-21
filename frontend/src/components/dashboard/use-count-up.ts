"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Smoothly animates a numeric value whenever `target` changes, via a GSAP tween.
 * Initializes to `target` so server and first client render match (no hydration
 * mismatch), and snaps instantly when the user prefers reduced motion.
 */
export function useCountUp(target: number, duration = 1.1) {
  const [value, setValue] = useState(target);
  const objRef = useRef({ v: target });

  useEffect(() => {
    if (objRef.current.v === target) return;

    if (prefersReducedMotion()) {
      objRef.current.v = target;
      setValue(target);
      return;
    }

    const tween = gsap.to(objRef.current, {
      v: target,
      duration,
      ease: "power3.out",
      onUpdate: () => setValue(objRef.current.v),
    });

    return () => {
      tween.kill();
      objRef.current.v = target;
    };
  }, [target, duration]);

  return value;
}
