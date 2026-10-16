"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Car, ExternalLink, Footprints } from "lucide-react";
import type { Profile } from "@/lib/routing/types";
import type { PlaceRoutesView } from "@/lib/routing/view";
import { osmPlaceLink, osmPlaceLinkLabel } from "@/lib/osmLinks";
import { attractionStyle } from "./attractionIcons";

type Leaflet = typeof import("leaflet");

export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  /** Pre-formatted straight-line distance from the hotel (null when the hotel has no pin). */
  distance: string | null;
  /** Saved road routes (A* / Dijkstra on OpenStreetMap). Optional so the plain map works without them. */
  routes?: PlaceRoutesView;
};

type Pin = { latitude: number; longitude: number };

type Props = {
  hotelName: string;
  hotel: { latitude: number; longitude: number } | null;
  places: NearbyPlace[];
  /** Show the numbered list next to the map (public page). The owner overview shows only the map. */
  showList?: boolean;
  testId?: string;
};

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const HOTEL_PIN =
  '<svg width="36" height="46" viewBox="0 0 36 46" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" aria-hidden="true"><path d="M18 0C8 0 0 8 0 18c0 13 18 28 18 28s18-15 18-28C36 8 28 0 18 0z" fill="#c8312b"/><circle cx="18" cy="18" r="7" fill="#fff"/></svg>';

const MODE_LABEL: Record<Profile, string> = { walk: "Walk", drive: "Drive" };
const ROUTE_COLOR = "#0a5bd8";

/** Numbered round marker; only numbers and our own colour constants go into the HTML. */
const numberedIcon = (n: number, color: string) =>
  `<div style="width:30px;height:30px;border-radius:9999px;background:${color};color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)">${n}</div>`;

/** The distance text for one place in one travel mode, falling back to the straight line. */
function distanceText(p: NearbyPlace, mode: Profile): { main: string; straight: string | null; road: boolean } | null {
  const route = p.routes?.[mode] ?? null;
  if (route) {
    const main = mode === "walk" ? `${route.distance}${route.duration ? ` · ~${route.duration} walk` : ""}` : `${route.distance} by car`;
    return { main, straight: p.distance ? `${p.distance} straight line` : null, road: true };
  }
  if (p.distance) return { main: `${p.distance} straight line`, straight: null, road: false };
  return null;
}

/** Popup content is built from text nodes so owner-entered text can never inject HTML. */
function popupNode(p: NearbyPlace, index: number, mode: Profile, hotel: Pin | null): HTMLElement {
  const box = document.createElement("div");
  box.style.minWidth = "170px";
  const title = document.createElement("strong");
  title.textContent = `${index + 1}. ${p.name}`;
  title.style.display = "block";
  box.appendChild(title);
  const meta = document.createElement("div");
  const dist = distanceText(p, mode);
  meta.textContent = dist ? `${p.category} · ${dist.main}${dist.road ? "" : " from the hotel"}` : p.category;
  meta.style.color = "#555";
  box.appendChild(meta);
  if (p.description) {
    const note = document.createElement("div");
    note.textContent = p.description;
    note.style.marginTop = "4px";
    box.appendChild(note);
  }
  const link = document.createElement("a");
  link.href = osmPlaceLink(p, hotel, mode);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = osmPlaceLinkLabel(hotel);
  link.style.display = "inline-block";
  link.style.marginTop = "6px";
  box.appendChild(link);
  return box;
}

export default function NearbyMap({ hotelName, hotel, places, showList = true, testId = "nearby-map" }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const layerRef = useRef<ReturnType<Leaflet["layerGroup"]> | null>(null);
  const routeLayerRef = useRef<ReturnType<Leaflet["layerGroup"]> | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Profile>("walk");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const modeRef = useRef<Profile>(mode);
  modeRef.current = mode;
  const hasRoutes = places.some((p) => p.routes?.state === "ok");

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
      if (cancelled || !mapEl.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, { center: [20, 0], zoom: 2, scrollWheelZoom: false });
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      map.on("focus", () => map.scrollWheelZoom.enable());
      map.on("blur", () => map.scrollWheelZoom.disable());
      routeLayerRef.current = L.layerGroup().addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeLayerRef.current = null;
      markers.clear();
      setReady(false);
    };
  }, []);

  // (Re)draw the pins whenever the data changes, then fit the map around them.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    setSelectedId(null);
    const points: [number, number][] = [];

    if (hotel) {
      L.marker([hotel.latitude, hotel.longitude], {
        title: hotelName,
        zIndexOffset: 1000,
        icon: L.divIcon({ className: "", html: HOTEL_PIN, iconSize: [36, 46], iconAnchor: [18, 46] }),
      })
        .bindTooltip(hotelName)
        .addTo(layer);
      points.push([hotel.latitude, hotel.longitude]);
    }
    places.forEach((p, i) => {
      const marker = L.marker([p.latitude, p.longitude], {
        title: p.name,
        icon: L.divIcon({ className: "", html: numberedIcon(i + 1, attractionStyle(p.category).color), iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] }),
      })
        .bindPopup(() => popupNode(p, i, modeRef.current, hotel))
        .on("click", () => setSelectedId(p.id))
        .addTo(layer);
      markersRef.current.set(p.id, marker);
      points.push([p.latitude, p.longitude]);
    });

    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
  }, [ready, hotel, hotelName, places]);

  // Draw the chosen place's road route (dashed line) for the current travel mode and fit it in view.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    if (!selectedId) return;
    const index = places.findIndex((p) => p.id === selectedId);
    const place = places[index];
    if (!place) return;
    const popup = markersRef.current.get(place.id)?.getPopup();
    if (popup && popup.isOpen()) popup.setContent(popupNode(place, index, mode, hotel));
    const route = place.routes?.[mode];
    if (!route || route.path.length < 2) return;
    L.polyline(route.path, { color: ROUTE_COLOR, weight: 5, opacity: 0.85, dashArray: "8 8", lineCap: "round" }).addTo(layer);
    // Fit without animation, then re-open the popup so it pans fully into view after the new framing.
    map.fitBounds(route.path, { padding: [56, 56], maxZoom: 17, animate: false });
    const marker = markersRef.current.get(place.id);
    if (marker?.isPopupOpen()) marker.openPopup();
  }, [ready, selectedId, mode, places, hotel]);

  function focusPlace(id: string) {
    const marker = markersRef.current.get(id);
    const map = mapRef.current;
    if (!marker || !map) return;
    setSelectedId(id);
    const place = places.find((p) => p.id === id);
    // With a saved route the route effect fits the whole route; otherwise zoom to the place.
    if (!place?.routes?.[mode]) map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
    marker.openPopup();
  }

  const mapBox = (
    <div className="relative isolate overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/10">
      <div
        ref={mapEl}
        data-testid={testId}
        role="application"
        aria-label={`Map of ${hotelName} and nearby attractions`}
        className="h-96 w-full @3xl:h-[28rem]"
      />
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading map…</div>}
    </div>
  );

  if (!showList) return <div className="@container">{mapBox}</div>;

  // Container queries: side-by-side only when the column itself is wide enough (the page has a sidebar).
  return (
    <div className="@container">
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      {mapBox}
      <div>
        <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          {hotel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-brand" aria-hidden="true" /> Hotel
            </span>
          )}
          <span data-testid="nearby-note">
            {hasRoutes
              ? "Road distances follow OpenStreetMap roads and footpaths, found with the A* algorithm."
              : "Distances are straight-line from the hotel."}
          </span>
        </p>
        {hasRoutes && (
          <div role="group" aria-label="Travel mode" className="mb-3 inline-flex rounded-full bg-gray-100 p-1">
            {(["walk", "drive"] as const).map((m) => {
              const ModeIcon = m === "walk" ? Footprints : Car;
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-testid={`mode-${m}`}
                  aria-pressed={on}
                  onClick={() => setMode(m)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-white text-brand shadow-sm ring-1 ring-black/5" : "text-gray-600 hover:text-ink"}`}
                >
                  <ModeIcon size={15} aria-hidden="true" /> {MODE_LABEL[m]}
                </button>
              );
            })}
          </div>
        )}
        <ol className="max-h-[26rem] space-y-3 overflow-y-auto pr-1" aria-label="Nearby attractions">
          {places.map((p, i) => {
            const { icon: Icon, color } = attractionStyle(p.category);
            const dist = distanceText(p, mode);
            return (
              <li
                key={p.id}
                data-testid="nearby-item"
                className={`rounded-xl bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ${selectedId === p.id ? "ring-2 ring-brand" : "ring-black/5"}`}
              >
                <button type="button" onClick={() => focusPlace(p.id)} className="flex w-full items-start gap-3 text-left" aria-label={`Show ${p.name} on the map`}>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: color }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5">
                        <Icon size={14} aria-hidden="true" style={{ color }} />
                        {p.category}
                      </span>
                      {dist && (
                        <span data-testid="nearby-distance" data-road={dist.road ? "1" : "0"} className="font-medium text-brand">
                          {dist.main}
                        </span>
                      )}
                    </span>
                    {dist?.road && dist.straight && <span className="mt-1 block text-xs text-gray-500">{dist.straight}</span>}
                    {hasRoutes && !dist?.road && p.routes && p.routes.state !== "none" && (
                      <span className="mt-1 block text-xs text-gray-500">No {mode === "walk" ? "walking" : "driving"} route found.</span>
                    )}
                    {p.description && <span className="mt-1.5 block text-sm text-gray-600">{p.description}</span>}
                  </span>
                </button>
                <a
                  href={osmPlaceLink(p, hotel, mode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 ml-11 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                >
                  {osmPlaceLinkLabel(hotel)} <ExternalLink size={13} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      </div>
    </div>
  );
}
