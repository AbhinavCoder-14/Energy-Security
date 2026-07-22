"use client";

import { useMemo } from "react";
import {
  Map,
  MapArc,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip,
  type MapArcDatum,
} from "@/components/ui/mapcn-map-arc";
import type { DashboardPayload, MapFeatureStatus } from "@/lib/types";

/** India delivery hub in [lng, lat] (backend emits [lat, lng]). */
const INDIA_HUB: [number, number] = [72.8777, 19.076];

const STATUS_COLOR: Record<MapFeatureStatus, string> = {
  Clear: "#10b981",
  Elevated: "#f59e0b",
  "Critical Blockade": "#ef4444",
};

/** Backend coordinates are [lat, lng]; MapLibre needs [lng, lat]. */
function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

export function WorldMapPanel({ data }: { data: DashboardPayload }) {
  const arcs = useMemo<MapArcDatum[]>(
    () =>
      data.procurement_directives.recommended_actions.map((a, i) => ({
        id: `reroute-${i}-${a.origin_name}`,
        from: toLngLat(a.origin_coordinates),
        to: INDIA_HUB,
      })),
    [data.procurement_directives.recommended_actions],
  );

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)]">
      <Map
        theme="light"
        center={[60, 18]}
        zoom={2.4}
        attributionControl={false}
        className="h-full w-full"
      >
        <MapControls position="bottom-right" showZoom showCompass />

        {arcs.length > 0 && (
          <MapArc
            data={arcs}
            curvature={0.28}
            paint={{
              "line-color": "#2563eb",
              "line-width": 2,
              "line-opacity": 0.75,
              "line-dasharray": [2, 2],
            }}
            interactive={false}
          />
        )}

        {/* India delivery hub */}
        <MapMarker longitude={INDIA_HUB[0]} latitude={INDIA_HUB[1]}>
          <MarkerContent>
            <div className="size-3 rounded-full border-2 border-white bg-blue-600 shadow-md" />
            <MarkerLabel
              position="top"
              className="rounded-sm bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900 backdrop-blur"
            >
              India (Import Hub)
            </MarkerLabel>
          </MarkerContent>
        </MapMarker>

        {/* Reroute origins */}
        {data.procurement_directives.recommended_actions.map((a, i) => {
          const [lng, lat] = toLngLat(a.origin_coordinates);
          return (
            <MapMarker key={`origin-${i}`} longitude={lng} latitude={lat}>
              <MarkerContent>
                <div className="size-2.5 rounded-full border-2 border-white bg-emerald-500 shadow" />
                <MarkerTooltip>
                  <div className="text-[11px]">
                    <p className="font-semibold">{a.origin_name}</p>
                    <p className="opacity-80">
                      {a.crude_grade} · {a.volume_mbpd.toFixed(2)} MBPD · {a.transit_days}d
                    </p>
                  </div>
                </MarkerTooltip>
              </MarkerContent>
            </MapMarker>
          );
        })}

        {/* Chokepoints */}
        {data.map_features.map((f) => {
          const [lng, lat] = toLngLat(f.coordinates);
          const color = STATUS_COLOR[f.status];
          const critical = f.status === "Critical Blockade";
          return (
            <MapMarker key={f.id} longitude={lng} latitude={lat}>
              <MarkerContent>
                <span className="relative flex size-3.5 items-center justify-center">
                  {critical && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span
                    className="relative inline-flex size-3 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: color }}
                  />
                </span>
                <MarkerTooltip>
                  <div className="max-w-56 text-[11px]">
                    <p className="font-semibold">{f.name}</p>
                    <p className="opacity-80">
                      {f.status} · risk {f.risk_level.toFixed(0)}
                    </p>
                    {f.threat_driver && <p className="mt-0.5 opacity-70">{f.threat_driver}</p>}
                    {f.disrupted_volume_mbpd > 0 && (
                      <p className="mt-0.5 opacity-80">
                        Disrupted {f.disrupted_volume_mbpd.toFixed(2)} MBPD
                      </p>
                    )}
                  </div>
                </MarkerTooltip>
              </MarkerContent>
            </MapMarker>
          );
        })}
      </Map>

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel)]/90 px-3 py-2 font-mono text-[10px] text-[var(--wr-muted)] backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR.Clear }} />
          Clear
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR.Elevated }} />
          Elevated
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: STATUS_COLOR["Critical Blockade"] }}
          />
          Critical blockade
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: "#2563eb" }} />
          Reroute path
        </span>
      </div>
    </div>
  );
}
