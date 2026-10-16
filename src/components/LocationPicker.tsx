"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { ExternalLink, Search, Trash2 } from "lucide-react";
import { distanceKm, formatDistance } from "@/lib/geo";

type Leaflet = typeof import("leaflet");

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const pinSvg = (fill: string, dot: string) =>
  `<svg width="36" height="46" viewBox="0 0 36 46" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" aria-hidden="true"><path d="M18 0C8 0 0 8 0 18c0 13 18 28 18 28s18-15 18-28C36 8 28 0 18 0z" fill="${fill}"/><circle cx="18" cy="18" r="7" fill="${dot}"/></svg>`;
const PIN_SVG = pinSvg("#c8312b", "#fff");
const REFERENCE_SVG = pinSvg("#1b2029", "#f5b301");

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const validPair = (lat: number | null, lng: number | null): lat is number =>
  lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

type Status = { kind: "ok" | "error" | "info"; text: string };
export type ReferencePin = { latitude: number; longitude: number; label: string };

type Props = {
  initialLat: number | null;
  initialLng: number | null;
  /** Prefix for the input ids so several pickers can share a page (input names stay latitude/longitude). */
  idPrefix?: string;
  testId?: string;
  description?: string;
  findLabel?: string;
  /** Queries for the lookup button; `approx` is tried when `exact` finds nothing. Default: address, city, country. */
  getQueries?: (form: HTMLFormElement) => { exact: string; approx?: string };
  emptyQueryMessage?: string;
  approxMessage?: string;
  allowClear?: boolean;
  /** Context pin (e.g. the hotel) shown on the map; also used for the "x km from ..." readout. */
  referencePin?: ReferencePin | null;
  /** Called whenever the coordinate inputs change (map click, drag, typing, lookup). */
  onCoordsChange?: (lat: string, lng: string) => void;
};

const defaultQueries = (form: HTMLFormElement) => {
  const fd = new FormData(form);
  const [address, city, country] = ["address", "city", "country"].map((k) => String(fd.get(k) ?? "").trim());
  return {
    exact: !address && !city ? "" : [address, city, country].filter(Boolean).join(", "),
    approx: city ? [city, country].filter(Boolean).join(", ") : undefined,
  };
};

/**
 * Click the OpenStreetMap map or drag the pin, or type coordinates.
 * The latitude/longitude inputs live inside the surrounding <form> and are submitted with it.
 */
export default function LocationPicker({
  initialLat,
  initialLng,
  idPrefix = "",
  testId = "location-map",
  description = "Click the map or drag the pin to the exact spot, then check it on OpenStreetMap. Leave it empty to keep the location off your hotel page.",
  findLabel = "Find from address",
  getQueries = defaultQueries,
  emptyQueryMessage = "Fill in the address, city and country above first.",
  approxMessage = "We could not find the exact address, so the pin is at the city centre. Drag it to your hotel.",
  allowClear = true,
  referencePin = null,
  onCoordsChange,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);

  const [lat, setLat] = useState(initialLat === null ? "" : String(initialLat));
  const [lng, setLng] = useState(initialLng === null ? "" : String(initialLng));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const latNum = num(lat);
  const lngNum = num(lng);
  const hasPin = validPair(latNum, lngNum);
  const refKey = referencePin ? `${referencePin.latitude},${referencePin.longitude}` : "";
  const away = hasPin && lngNum !== null && referencePin ? distanceKm({ latitude: latNum, longitude: lngNum }, referencePin) : null;

  /** Create the pin if needed, or move it. Does not touch the input state. */
  function placeMarker(la: number, lo: number) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([la, lo]);
      return;
    }
    const marker = L.marker([la, lo], {
      draggable: true,
      title: "Drag to adjust the location",
      icon: L.divIcon({ className: "", html: PIN_SVG, iconSize: [36, 46], iconAnchor: [18, 46] }),
      zIndexOffset: 1000,
    }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      setLat(p.lat.toFixed(6));
      setLng(p.lng.toFixed(6));
      setStatus(null);
    });
    markerRef.current = marker;
  }

  function setPoint(la: number, lo: number, zoom?: number) {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
    placeMarker(la, lo);
    if (zoom) mapRef.current?.flyTo([la, lo], zoom, { duration: 0.8 });
  }

  // Create the map once (Leaflet touches `window`, so it is imported inside the effect).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
      if (cancelled || !mapEl.current) return;
      leafletRef.current = L;

      const start = validPair(num(lat), num(lng));
      const center: [number, number] | null = start ? [num(lat) as number, num(lng) as number] : referencePin ? [referencePin.latitude, referencePin.longitude] : null;
      const map = L.map(mapEl.current, {
        center: center ?? [20, 0],
        zoom: start ? 16 : center ? 14 : 2,
        scrollWheelZoom: false, // enabled while the map has focus, so it never hijacks page scrolling
      });
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      if (referencePin) {
        L.marker([referencePin.latitude, referencePin.longitude], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: "", html: REFERENCE_SVG, iconSize: [36, 46], iconAnchor: [18, 46] }),
        })
          .bindTooltip(referencePin.label, { permanent: false })
          .addTo(map);
      }
      map.on("focus", () => map.scrollWheelZoom.enable());
      map.on("blur", () => map.scrollWheelZoom.disable());
      map.on("click", (e: LeafletMouseEvent) => {
        setLat(e.latlng.lat.toFixed(6));
        setLng(e.latlng.lng.toFixed(6));
        placeMarker(e.latlng.lat, e.latlng.lng);
        setStatus(null);
      });
      mapRef.current = map;
      if (start) placeMarker(num(lat) as number, num(lng) as number);
      setTimeout(() => map.invalidateSize(), 0);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once; later input changes are handled below
  }, [refKey]);

  // Keep the pin in step with the coordinate inputs (typing, clearing).
  useEffect(() => {
    if (!ready) return;
    if (hasPin && lngNum !== null) {
      const cur = markerRef.current?.getLatLng();
      if (!cur || Math.abs(cur.lat - latNum) > 1e-7 || Math.abs(cur.lng - lngNum) > 1e-7) {
        placeMarker(latNum, lngNum);
        mapRef.current?.panTo([latNum, lngNum]);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lat, lng]);

  useEffect(() => {
    onCoordsChange?.(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify only when the values change
  }, [lat, lng]);

  async function geocode(q: string): Promise<{ lat: number; lon: number; name: string } | null> {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("lookup failed");
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    return data.length ? { lat: Number(data[0].lat), lon: Number(data[0].lon), name: data[0].display_name } : null;
  }

  async function findFromQuery() {
    const form = mapEl.current?.closest("form");
    if (!form) return;
    const { exact, approx } = getQueries(form);
    if (!exact) {
      setStatus({ kind: "error", text: emptyQueryMessage });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const hit = await geocode(exact);
      if (hit) {
        setPoint(hit.lat, hit.lon, 17);
        setStatus({ kind: "ok", text: `Found: ${hit.name}. Check the pin and drag it to the exact spot if needed.` });
      } else {
        const near = approx ? await geocode(approx) : null;
        if (near) {
          setPoint(near.lat, near.lon, 13);
          setStatus({ kind: "info", text: approxMessage });
        } else {
          setStatus({ kind: "error", text: "We could not find that. Click the map to place the pin yourself." });
        }
      }
    } catch {
      setStatus({ kind: "error", text: "Lookup is unavailable right now. Click the map to place the pin yourself." });
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setLat("");
    setLng("");
    setStatus(null);
  }

  const osmHref = hasPin ? `https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=17/${latNum}/${lngNum}` : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{description}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={findFromQuery} disabled={busy} className="btn-outline h-11 gap-2 px-5 text-sm">
          <Search size={16} aria-hidden="true" /> {busy ? "Searching..." : findLabel}
        </button>
        {allowClear && (
          <button type="button" onClick={clear} disabled={!lat && !lng} className="btn-danger h-11 gap-2 px-5 text-sm">
            <Trash2 size={16} aria-hidden="true" /> Clear location
          </button>
        )}
        {osmHref && (
          <a
            href={osmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            Open in OpenStreetMap <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}latitude`}>Latitude</label>
          <input
            id={`${idPrefix}latitude`}
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            inputMode="decimal"
            placeholder="e.g. 48.8606"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}longitude`}>Longitude</label>
          <input
            id={`${idPrefix}longitude`}
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            inputMode="decimal"
            placeholder="e.g. 2.3376"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="field"
          />
        </div>
      </div>

      {/* isolate keeps Leaflet's high z-index panes below the sticky header and its tooltip */}
      <div className="relative isolate overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/10">
        <div
          ref={mapEl}
          data-testid={testId}
          role="application"
          aria-label="Map: click or drag the pin to set the location"
          className="h-80 w-full"
        />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading map…</div>}
      </div>

      {referencePin && (
        <p data-testid="distance-note" className={`text-sm ${away !== null && away > 25 ? "font-medium text-amber-700" : "text-gray-500"}`}>
          {away === null
            ? `Dark pin: ${referencePin.label}. Place the red pin on the attraction.`
            : away > 25
              ? `${formatDistance(away)} from ${referencePin.label} (straight line). That is quite far for a nearby place - is the pin right?`
              : `${formatDistance(away)} from ${referencePin.label} (straight line). The road distance is calculated after you save.`}
        </p>
      )}

      {status && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            status.kind === "ok" ? "bg-green-50 text-green-700" : status.kind === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
