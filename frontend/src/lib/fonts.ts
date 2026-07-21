import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { cn } from "@/lib/utils";

export { GeistMono, GeistSans };

/**
 * CSS variable classes applied to <html>. Geist ships locally so it always
 * resolves offline. Instrument Sans/Serif + JetBrains Mono (v0 parity) are
 * loaded at runtime via <link> in the root layout and referenced through the
 * --font-sans / --font-mono / --font-display tokens in globals.css, with Geist
 * as the fallback.
 */
export const fontVariables = cn(GeistSans.variable, GeistMono.variable);
