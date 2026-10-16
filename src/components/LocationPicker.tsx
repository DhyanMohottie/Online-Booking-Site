"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import { ExternalLink, Search, Trash2 } from "lucide-react";

type Leaflet = typeof import("leaflet");

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const PIN_SVG =
  '<svg width="36" height="46" viewBox="0 0 36 46" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" aria-hidden="true"><path d="M18 0C8 0 0 8 0 18c0 13 18 28 18 28s18-15 18-28C36 8 28 0 18 0z" fill="#c8312b"/><circle cx="18" cy="18" r="7" fill="#fff"/></svg>';

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const validPair = (lat: number | null, lng: number | null): lat is number =>
  lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

type Status = { kind: "ok" | "error" | "info"; text: string };

/**
 * Optional hotel location: click the OpenStreetMap map or drag the pin, or type coordinates.
 * The latitude/longitude inputs live inside the surrounding <form> and are submitted with it.
 */
export default function LocationPicker({ initialLat, initialLng }: { initialLat: number | null; initialLng: number | null }) {
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
      title: "Drag to adjust the hotel location",
      icon: L.divIcon({ className: "", html: PIN_SVG, iconSize: [36, 46], iconAnchor: [18, 46] }),
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
      const map = L.map(mapEl.current, {
        center: start ? [num(lat) as number, num(lng) as number] : [20, 0],
        zoom: start ? 16 : 2,
        scrollWheelZoom: false, // enabled while the map has focus, so it never hijacks page scrolling
      });
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
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
  }, []);

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

  async function geocode(q: string): Promise<{ lat: number; lon: number; name: string } | null> {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("lookup failed");
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    return data.length ? { lat: Number(data[0].lat), lon: Number(data[0].lon), name: data[0].display_name } : null;
  }

  async function findFromAddress() {
    const form = mapEl.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const [address, city, country] = ["address", "city", "country"].map((k) => String(fd.get(k) ?? "").trim());
    if (!address && !city) {
      setStatus({ kind: "error", text: "Fill in the address, city and country above first." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const exact = await geocode([address, city, country].filter(Boolean).join(", "));
      if (exact) {
        setPoint(exact.lat, exact.lon, 17);
        setStatus({ kind: "ok", text: `Found: ${exact.name}. Check the pin and drag it to the exact entrance if needed.` });
      } else {
        const approx = city ? await geocode([city, country].filter(Boolean).join(", ")) : null;
        if (approx) {
          setPoint(approx.lat, approx.lon, 13);
          setStatus({ kind: "info", text: "We could not find the exact address, so the pin is at the city centre. Drag it to your hotel." });
        } else {
          setStatus({ kind: "error", text: "We could not find that address. Click the map to place the pin yourself." });
        }
      }
    } catch {
      setStatus({ kind: "error", text: "Address lookup is unavailable right now. Click the map to place the pin yourself." });
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
      <p className="text-sm text-gray-500">
        Click the map or drag the pin to the exact spot, then check it on OpenStreetMap. Leave it empty to keep the location off your hotel page.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={findFromAddress} disabled={busy} className="btn-outline h-11 gap-2 px-5 text-sm">
          <Search size={16} aria-hidden="true" /> {busy ? "Searching..." : "Find from address"}
        </button>
        <button type="button" onClick={clear} disabled={!lat && !lng} className="btn-danger h-11 gap-2 px-5 text-sm">
          <Trash2 size={16} aria-hidden="true" /> Clear location
        </button>
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
          <label className="field-label" htmlFor="latitude">Latitude</label>
          <input
            id="latitude"
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
          <label className="field-label" htmlFor="longitude">Longitude</label>
          <input
            id="longitude"
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
          data-testid="location-map"
          role="application"
          aria-label="Map: click or drag the pin to set the hotel location"
          className="h-80 w-full"
        />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading map…</div>}
      </div>

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
