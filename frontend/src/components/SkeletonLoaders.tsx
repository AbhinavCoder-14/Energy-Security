"use client";

function Block({ className }: { className?: string }) {
  return (
    <div
      className={`shimmer-track panel ${className || ""}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading resilience dashboard"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Block className="h-48" />
        <Block className="h-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
        </div>
        <Block className="h-[26rem]" />
      </div>
    </div>
  );
}
