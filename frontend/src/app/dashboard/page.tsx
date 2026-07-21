"use client";

import dynamic from "next/dynamic";

/**
 * GSAP must stay out of the RSC/server vendor graph. Load the war room
 * client-only so Next never tries to open `.next/server/vendor-chunks/gsap.js`.
 */
const WarRoom = dynamic(
  () =>
    import("@/components/dashboard/war-room").then((m) => m.WarRoom),
  {
    ssr: false,
    loading: () => (
      <main className="war-room flex min-h-screen items-center justify-center">
        <span className="font-mono text-xs tracking-widest text-[var(--wr-muted)]">
          INITIALIZING WAR ROOM…
        </span>
      </main>
    ),
  },
);

export default function DashboardPage() {
  return <WarRoom />;
}
