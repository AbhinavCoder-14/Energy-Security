"use client";

import { useId, useMemo, useState } from "react";
import type { TimeSeriesData } from "@/lib/types";

type Props = {
  data: TimeSeriesData;
  /** Accent color (CSS value, defaults to war-room accent). */
  color?: string;
  /** Optional formatter for the value axis / tooltip. */
  formatValue?: (v: number) => string;
  /** Optional unit label rendered after values in the tooltip. */
  unit?: string;
  className?: string;
  height?: number;
};

const PAD = { top: 14, right: 14, bottom: 24, left: 44 };

export function TimeSeriesChart({
  data,
  color = "var(--wr-accent)",
  formatValue = (v) => v.toFixed(1),
  unit = "",
  className,
  height = 200,
}: Props) {
  const gid = useId().replace(/[:]/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const values = data.values ?? [];
  const labels = data.labels ?? [];
  const n = values.length;

  const { min, max } = useMemo(() => {
    if (n === 0) return { min: 0, max: 1 };
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (lo === hi) return { min: lo - 1, max: hi + 1 };
    const pad = (hi - lo) * 0.12;
    return { min: lo - pad, max: hi + pad };
  }, [values, n]);

  const VIEW_W = 640;
  const VIEW_H = height;
  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const linePath = useMemo(() => {
    if (n === 0) return "";
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
      .join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, min, max, n, plotW, plotH]);

  const areaPath = useMemo(() => {
    if (n === 0) return "";
    const top = values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
      .join(" ");
    return `${top} L ${x(n - 1).toFixed(2)} ${(PAD.top + plotH).toFixed(2)} L ${x(0).toFixed(
      2,
    )} ${(PAD.top + plotH).toFixed(2)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, min, max, n, plotW, plotH]);

  const yTicks = useMemo(() => {
    const ticks = 4;
    return Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks);
  }, [min, max]);

  // Sparse x labels to avoid overlap.
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  if (n === 0) {
    return (
      <div
        className={`grid place-items-center rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] font-mono text-[11px] text-[var(--wr-muted)] ${className ?? ""}`}
        style={{ height }}
      >
        No series data
      </div>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={yy}
                y2={yy}
                stroke="var(--wr-border)"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.7}
              />
              <text
                x={PAD.left - 8}
                y={yy + 3}
                textAnchor="end"
                className="fill-[var(--wr-muted)] font-mono"
                style={{ fontSize: 9 }}
              >
                {formatValue(t)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#fill-${gid})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {labels.map((lab, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={VIEW_H - 7}
              textAnchor="middle"
              className="fill-[var(--wr-muted)] font-mono"
              style={{ fontSize: 9 }}
            >
              {lab}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke={color}
              strokeWidth={1}
              opacity={0.5}
            />
            <circle cx={x(hover)} cy={y(values[hover])} r={3.5} fill={color} />
          </g>
        )}

        {/* Invisible hit targets for hover */}
        {values.map((_, i) => (
          <rect
            key={i}
            x={x(i) - plotW / (2 * Math.max(1, n - 1))}
            y={PAD.top}
            width={plotW / Math.max(1, n - 1)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {hover !== null && (
        <p className="mt-1 text-center font-mono text-[11px] text-[var(--wr-text)]">
          <span className="text-[var(--wr-muted)]">{labels[hover]}:</span>{" "}
          {formatValue(values[hover])}
          {unit}
        </p>
      )}
    </div>
  );
}
