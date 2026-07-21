"use client";

import { Arc } from "@/components/ui/arc";

export function WarRoomLoader() {
  return (
    <div className="theme-landing flex min-h-[100dvh] flex-col bg-background text-foreground">
      <main
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4"
        aria-busy="true"
      >
        <Arc
          className="size-12 text-foreground"
          role="status"
          aria-label="Loading"
        />
        <p
          className="font-mono text-xs tracking-widest text-muted-foreground"
          aria-live="polite"
        >
          Initializing war room
        </p>
      </main>
    </div>
  );
}
