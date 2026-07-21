/**
 * Resolves the current `--foreground` design token to an `r, g, b` string so
 * Canvas 2D fills track the active theme instead of a hardcoded black.
 * Falls back to near-black if the probe can't be measured (e.g. during SSR).
 */
export function foregroundRgb(): string {
  if (typeof window === "undefined") return "18, 18, 18";
  const probe = document.createElement("span");
  probe.style.color = "oklch(var(--foreground))";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = computed.match(/(\d+(?:\.\d+)?)/g);
  if (match && match.length >= 3) {
    return `${Math.round(+match[0])}, ${Math.round(+match[1])}, ${Math.round(+match[2])}`;
  }
  return "18, 18, 18";
}

/** True when the user prefers reduced motion. */
export function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
