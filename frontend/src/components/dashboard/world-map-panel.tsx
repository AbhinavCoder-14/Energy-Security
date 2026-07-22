"use client";

import { useMemo, useState } from "react";
import { X, Route, Anchor, AlertTriangle, Ship } from "lucide-react";
import {
  Map,
  MapArc,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  type MapArcDatum,
} from "@/components/ui/mapcn-map-arc";
import type {
  CountrySupplyShare,
  DashboardPayload,
  MapFeature,
  MapFeatureStatus,
  RouteAlternative,
} from "@/lib/types";

/** India delivery hub in [lng, lat] (backend emits [lat, lng]). */
const INDIA_HUB: [number, number] = [72.8777, 19.076];

/** Approximate export hubs for sovereign suppliers — [lat, lng] to match backend. */
const SUPPLY_ORIGIN_COORDS: Record<string, [number, number]> = {
  Iraq: [30.5, 47.8],
  Russia: [44.72, 37.78],
  Saudi: [26.64, 50.16],
  UAE: [25.12, 56.33],
  Diversified_Others: [1.29, 103.85],
};

const STATUS_COLOR: Record<MapFeatureStatus, string> = {
  Clear: "#10b981",
  Elevated: "#f59e0b",
  "Critical Blockade": "#ef4444",
};

type Selection =
  | { kind: "chokepoint"; feature: MapFeature }
  | { kind: "supply"; country: CountrySupplyShare }
  | { kind: "reroute"; action: RouteAlternative }
  | null;

/** Backend coordinates are [lat, lng]; MapLibre needs [lng, lat]. */
function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

function pretty(name: string) {
  return name.replace(/_/g, " ");
}

export function WorldMapPanel({ data }: { data: DashboardPayload }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [showSupply, setShowSupply] = useState(true);
  const [showReroutes, setShowReroutes] = useState(true);

  const isShock = !data.is_live_telemetry && data.v_disrupted_mbpd > 0;

  const supplyCountries = useMemo(
    () =>
      data.country_breakdown.filter(
        (c) => c.country !== "Diversified_Others" && SUPPLY_ORIGIN_COORDS[c.country],
      ),
    [data.country_breakdown],
  );

  const supplyArcs = useMemo<MapArcDatum[]>(() => {
    if (!showSupply) return [];
    return supplyCountries.map((c) => ({
      id: `supply-${c.country}`,
      from: toLngLat(SUPPLY_ORIGIN_COORDS[c.country]),
      to: INDIA_HUB,
      severed: c.cut_fraction > 0 ? 1 : 0,
    }));
  }, [supplyCountries, showSupply]);

  const rerouteArcs = useMemo<MapArcDatum[]>(() => {
    if (!showReroutes || data.procurement_directives.recommended_actions.length === 0) {
      return [];
    }
    // When a chokepoint is selected, only highlight related reroutes (show all if none selected)
    const actions = data.procurement_directives.recommended_actions;
    return actions.map((a, i) => ({
      id: `reroute-${i}-${a.origin_name}`,
      from: toLngLat(a.origin_coordinates),
      to: INDIA_HUB,
    }));
  }, [data.procurement_directives.recommended_actions, showReroutes]);

  const focusReroutes =
    selection?.kind === "chokepoint" &&
    (selection.feature.status !== "Clear" || selection.feature.disrupted_volume_mbpd > 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)]">
      <div className="relative h-[480px] w-full lg:h-[520px]">
        <Map
          theme="light"
          center={[60, 18]}
          zoom={2.35}
          attributionControl={false}
          className="h-full w-full"
        >
          <MapControls position="bottom-right" showZoom showCompass />

          {/* Active / severed sovereign supply arcs */}
          {supplyArcs.length > 0 && (
            <MapArc
              data={supplyArcs}
              curvature={0.22}
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "severed"], 1],
                  "#ef4444",
                  "#64748b",
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "severed"], 1],
                  2.5,
                  1.5,
                ],
                "line-opacity": [
                  "case",
                  ["==", ["get", "severed"], 1],
                  0.55,
                  0.45,
                ],
              }}
              interactive={false}
            />
          )}

          {/* Alternate / emergency reroute arcs */}
          {rerouteArcs.length > 0 && (
            <MapArc
              data={rerouteArcs}
              curvature={0.32}
              paint={{
                "line-color": "#2563eb",
                "line-width": focusReroutes ? 3 : 2,
                "line-opacity": 0.85,
                "line-dasharray": [2, 2],
              }}
              interactive={false}
            />
          )}

          {/* India hub */}
          <MapMarker longitude={INDIA_HUB[0]} latitude={INDIA_HUB[1]}>
            <MarkerContent>
              <div className="size-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md" />
              <MarkerLabel
                position="top"
                className="rounded-sm bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900 backdrop-blur"
              >
                India (Import Hub)
              </MarkerLabel>
            </MarkerContent>
          </MapMarker>

          {/* Sovereign supply origins */}
          {showSupply &&
            supplyCountries.map((c) => {
              const [lng, lat] = toLngLat(SUPPLY_ORIGIN_COORDS[c.country]);
              const severed = c.cut_fraction > 0;
              const selected =
                selection?.kind === "supply" && selection.country.country === c.country;
              return (
                <MapMarker
                  key={`supply-${c.country}`}
                  longitude={lng}
                  latitude={lat}
                  onClick={() => setSelection({ kind: "supply", country: c })}
                >
                  <MarkerContent>
                    <div
                      className={`size-3 rounded-full border-2 border-white shadow transition-transform ${
                        selected ? "scale-125" : ""
                      } ${severed ? "bg-rose-500" : "bg-slate-600"}`}
                    />
                    <MarkerLabel
                      position="bottom"
                      className={`rounded-sm px-1 py-0.5 text-[9px] font-medium backdrop-blur ${
                        severed
                          ? "bg-rose-50/90 text-rose-700 line-through"
                          : "bg-white/85 text-slate-800"
                      }`}
                    >
                      {pretty(c.country)}
                    </MarkerLabel>
                  </MarkerContent>
                </MapMarker>
              );
            })}

          {/* Alternate supply / SPR origins */}
          {showReroutes &&
            data.procurement_directives.recommended_actions.map((a, i) => {
              const [lng, lat] = toLngLat(a.origin_coordinates);
              const selected =
                selection?.kind === "reroute" &&
                selection.action.origin_name === a.origin_name;
              return (
                <MapMarker
                  key={`reroute-${i}`}
                  longitude={lng}
                  latitude={lat}
                  onClick={() => setSelection({ kind: "reroute", action: a })}
                >
                  <MarkerContent>
                    <div
                      className={`size-3 rounded-full border-2 border-white bg-emerald-500 shadow transition-transform ${
                        selected ? "scale-125 ring-2 ring-emerald-300" : ""
                      }`}
                    />
                    <MarkerLabel
                      position="top"
                      className="rounded-sm bg-emerald-50/90 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 backdrop-blur"
                    >
                      P{a.priority_rank} · {pretty(a.origin_name)}
                    </MarkerLabel>
                  </MarkerContent>
                </MapMarker>
              );
            })}

          {/* Chokepoints — clickable */}
          {data.map_features.map((f) => {
            const [lng, lat] = toLngLat(f.coordinates);
            const color = STATUS_COLOR[f.status];
            const critical =
              f.status === "Critical Blockade" || f.disrupted_volume_mbpd > 0;
            const selected =
              selection?.kind === "chokepoint" && selection.feature.id === f.id;
            return (
              <MapMarker
                key={f.id}
                longitude={lng}
                latitude={lat}
                onClick={() => setSelection({ kind: "chokepoint", feature: f })}
              >
                <MarkerContent>
                  <span className="relative flex size-4 items-center justify-center">
                    {(critical || selected) && (
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span
                      className={`relative inline-flex size-3.5 rounded-full border-2 border-white shadow transition-transform ${
                        selected ? "scale-125" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  </span>
                  <MarkerPopup closeButton={false}>
                    <div className="max-w-52 text-[11px] text-[var(--wr-text)]">
                      <p className="font-semibold">{pretty(f.name)}</p>
                      <p className="opacity-70">
                        {f.status} · risk {f.risk_level.toFixed(0)}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--wr-accent)]">
                        Click for alternate paths & options
                      </p>
                    </div>
                  </MarkerPopup>
                </MarkerContent>
              </MapMarker>
            );
          })}
        </Map>

        {/* Layer toggles */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
          <div className="rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel)]/95 px-3 py-2 font-mono text-[10px] text-[var(--wr-muted)] backdrop-blur">
            <p className="mb-1.5 font-medium uppercase tracking-wider text-[var(--wr-text)]">
              Layers
            </p>
            <label className="flex cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={showSupply}
                onChange={(e) => setShowSupply(e.target.checked)}
                className="accent-[var(--wr-accent)]"
              />
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-slate-500" />
                Current supply
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={showReroutes}
                onChange={(e) => setShowReroutes(e.target.checked)}
                className="accent-[var(--wr-accent)]"
                disabled={data.procurement_directives.recommended_actions.length === 0}
              />
              <span className="flex items-center gap-1.5">
                <span
                  className="h-0.5 w-3"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg,#2563eb 0 4px,transparent 4px 7px)",
                  }}
                />
                Alternate paths
              </span>
            </label>
          </div>

          <div className="rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel)]/95 px-3 py-2 font-mono text-[10px] text-[var(--wr-muted)] backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR.Clear }} />
              Clear
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLOR.Elevated }}
              />
              Elevated
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLOR["Critical Blockade"] }}
              />
              Critical / severed
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Alternate origin
            </span>
          </div>
        </div>

        {/* Hint */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel)]/90 px-3 py-1.5 font-mono text-[10px] text-[var(--wr-muted)] backdrop-blur">
          {isShock
            ? "Click a blocked chokepoint or green alternate origin for options"
            : "Click a supply origin or chokepoint for details · run a shock to see alternate paths"}
        </div>
      </div>

      {/* Interactive detail drawer */}
      {selection && (
        <SelectionPanel
          selection={selection}
          data={data}
          onClose={() => setSelection(null)}
          onSelectReroute={(action) => setSelection({ kind: "reroute", action })}
        />
      )}
    </div>
  );
}

function SelectionPanel({
  selection,
  data,
  onClose,
  onSelectReroute,
}: {
  selection: Exclude<Selection, null>;
  data: DashboardPayload;
  onClose: () => void;
  onSelectReroute: (a: RouteAlternative) => void;
}) {
  return (
    <div className="border-t border-[var(--wr-border)] bg-[var(--wr-panel)] p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {selection.kind === "chokepoint" && (
            <ChokepointDetail
              feature={selection.feature}
              data={data}
              onSelectReroute={onSelectReroute}
            />
          )}
          {selection.kind === "supply" && (
            <SupplyDetail country={selection.country} isLive={data.is_live_telemetry} />
          )}
          {selection.kind === "reroute" && <RerouteDetail action={selection.action} />}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--wr-border)] text-[var(--wr-muted)] transition-colors hover:border-[var(--wr-accent)] hover:text-[var(--wr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChokepointDetail({
  feature,
  data,
  onSelectReroute,
}: {
  feature: MapFeature;
  data: DashboardPayload;
  onSelectReroute: (a: RouteAlternative) => void;
}) {
  const blocked =
    feature.status !== "Clear" || feature.disrupted_volume_mbpd > 0 || !data.is_live_telemetry;

  const featureKey = feature.name.toLowerCase().replace(/[\s-]+/g, "_");
  const cutCountries = data.country_breakdown.filter((c) => {
    if (c.cut_fraction <= 0) return false;
    const route = c.primary_route.toLowerCase();
    // Match chokepoint name tokens inside primary_route (e.g. Strait_of_Hormuz, Hormuz+Red_Sea)
    if (route.includes(featureKey) || featureKey.includes(route.split("+")[0])) return true;
    if (featureKey.includes("hormuz") && route.includes("hormuz")) return true;
    if (featureKey.includes("mandeb") && route.includes("mandeb")) return true;
    if (feature.disrupted_volume_mbpd > 0 && c.disrupted_volume_mbpd > 0) return true;
    return false;
  });
  // Deduplicate if broad match pulled everyone — prefer route-linked when available
  const routeLinked = cutCountries.filter((c) => {
    const route = c.primary_route.toLowerCase();
    return (
      route.includes(featureKey) ||
      (featureKey.includes("hormuz") && route.includes("hormuz")) ||
      (featureKey.includes("mandeb") && route.includes("mandeb"))
    );
  });
  const severedList = routeLinked.length > 0 ? routeLinked : cutCountries;
  const alts = data.procurement_directives.recommended_actions;

  return (
    <div className="w-full">
      <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--wr-muted)]">
        <Anchor className="h-3.5 w-3.5" />
        Chokepoint
      </p>
      <h3 className="mt-1 font-display text-2xl tracking-tight text-[var(--wr-text)]">
        {pretty(feature.name)}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px]">
        <span
          className="rounded-md px-2 py-0.5"
          style={{
            color: STATUS_COLOR[feature.status],
            backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[feature.status]} 14%, transparent)`,
          }}
        >
          {feature.status}
        </span>
        <span className="rounded-md border border-[var(--wr-border)] px-2 py-0.5 text-[var(--wr-muted)]">
          Risk {feature.risk_level.toFixed(0)}
        </span>
        {feature.disrupted_volume_mbpd > 0 && (
          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-600">
            {feature.disrupted_volume_mbpd.toFixed(2)} MBPD disrupted
          </span>
        )}
      </div>
      {feature.threat_driver && (
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--wr-muted)]">
          {feature.threat_driver}
        </p>
      )}

      {severedList.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)]">
            Severed inbound supply
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {severedList.map((c) => (
              <span
                key={c.country}
                className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-2.5 py-1.5 font-mono text-[11px] text-[var(--wr-text)]"
              >
                {pretty(c.country)} · −{c.disrupted_volume_mbpd.toFixed(2)} MBPD ·{" "}
                {c.crude_grade}
              </span>
            ))}
          </div>
        </div>
      )}

      {blocked && alts.length > 0 ? (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)]">
            <Route className="h-3.5 w-3.5" style={{ color: "var(--wr-accent)" }} />
            Alternate paths available — click to inspect
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...alts]
              .sort((a, b) => a.priority_rank - b.priority_rank)
              .map((a) => (
                <button
                  key={a.origin_name}
                  type="button"
                  onClick={() => onSelectReroute(a)}
                  className="rounded-xl border border-[var(--wr-border)] bg-[var(--wr-panel-2)] p-3 text-left transition-colors hover:border-[var(--wr-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wr-accent)]"
                >
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--wr-text)]">
                    <span className="grid h-5 w-5 place-items-center rounded bg-[var(--wr-accent)] font-mono text-[10px] text-white">
                      {a.priority_rank}
                    </span>
                    {pretty(a.origin_name)}
                  </p>
                  <p className="mt-1.5 font-mono text-[10.5px] text-[var(--wr-muted)]">
                    {a.crude_grade} · {a.volume_mbpd.toFixed(2)} MBPD · {a.transit_days}d · $
                    {a.freight_usd_per_bbl.toFixed(2)}/bbl
                  </p>
                </button>
              ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-[var(--wr-muted)]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wr-warn)]" />
            Blue dashed arcs on the map are emergency alternate routes into India. Prefer
            grade-matched Heavy-Sour replacements for Jamnagar / Paradip.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--wr-muted)]">
          {data.is_live_telemetry
            ? "Steady state — no alternate-path directives. Run a shock scenario to generate emergency routes."
            : "No alternate routes attached to this chokepoint under the current shock."}
        </p>
      )}
    </div>
  );
}

function SupplyDetail({
  country,
  isLive,
}: {
  country: CountrySupplyShare;
  isLive: boolean;
}) {
  const severed = country.cut_fraction > 0;
  return (
    <div>
      <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--wr-muted)]">
        <Ship className="h-3.5 w-3.5" />
        Sovereign supply origin
      </p>
      <h3 className="mt-1 font-display text-2xl tracking-tight text-[var(--wr-text)]">
        {pretty(country.country)}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px]">
        <span className="rounded-md border border-[var(--wr-border)] px-2 py-0.5">
          {country.crude_grade}
        </span>
        <span className="rounded-md border border-[var(--wr-border)] px-2 py-0.5">
          {country.import_share_pct.toFixed(0)}% share · {country.volume_mbpd.toFixed(2)} MBPD
        </span>
        <span className="rounded-md border border-[var(--wr-border)] px-2 py-0.5">
          via {pretty(country.primary_route)}
        </span>
        {severed && (
          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-600">
            Severed {(country.cut_fraction * 100).toFixed(0)}% (−
            {country.disrupted_volume_mbpd.toFixed(2)} MBPD)
          </span>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--wr-muted)]">
        {severed
          ? `This origin is cut under the active shock. Grey/red arcs mark lost barrels; use green alternate origins to backfill ${country.crude_grade} demand.`
          : isLive
            ? "Nominal flow into India under live telemetry. Solid grey arcs show current borrowing paths."
            : "This origin remains intact under the active shock."}
      </p>
    </div>
  );
}

function RerouteDetail({ action }: { action: RouteAlternative }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--wr-muted)]">
        <Route className="h-3.5 w-3.5" style={{ color: "var(--wr-accent)" }} />
        Alternate path · Priority {action.priority_rank}
      </p>
      <h3 className="mt-1 font-display text-2xl tracking-tight text-[var(--wr-text)]">
        {pretty(action.origin_name)}
      </h3>
      <div className="mt-3 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Volume", value: `${action.volume_mbpd.toFixed(2)} MBPD` },
          { label: "Transit", value: `${action.transit_days} days` },
          { label: "Freight", value: `$${action.freight_usd_per_bbl.toFixed(2)}/bbl` },
          { label: "Grade", value: action.crude_grade },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-[var(--wr-border)] bg-[var(--wr-panel-2)] px-3 py-2"
          >
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--wr-muted)]">
              {k.label}
            </p>
            <p className="mt-0.5 font-mono text-[13px] tabular-nums text-[var(--wr-text)]">
              {k.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-[var(--wr-text)]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)]">
          Slate ·{" "}
        </span>
        {action.slate_compatibility}
      </p>
      {action.justification && (
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--wr-muted)]">
          {action.justification}
        </p>
      )}
    </div>
  );
}
