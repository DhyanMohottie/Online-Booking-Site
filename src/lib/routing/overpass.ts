import { OVERPASS_HIGHWAYS } from "./profiles";
import { RoutingError } from "./types";
import type { BBox, OsmData } from "./types";

const DEFAULT_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const TIMEOUT_MS = 45_000;
const MAX_RESPONSE_CHARS = 60_000_000;

/** `OVERPASS_URL` (e.g. a local mock or your own instance) replaces the public servers. */
function endpoints(): string[] {
  const own = process.env.OVERPASS_URL?.trim();
  return own ? [own] : DEFAULT_ENDPOINTS;
}

export function buildQuery(b: BBox): string {
  const box = `${b.south.toFixed(5)},${b.west.toFixed(5)},${b.north.toFixed(5)},${b.east.toFixed(5)}`;
  return (
    `[out:json][timeout:40];` +
    `way["highway"~"^(${OVERPASS_HIGHWAYS.join("|")})$"]["area"!="yes"](${box})->.w;` +
    `.w out body qt;node(w.w);out skel qt;`
  );
}

/** Download the road network inside a bounding box from OpenStreetMap (via the Overpass API). */
export async function fetchRoadData(bbox: BBox): Promise<OsmData> {
  const body = new URLSearchParams({ data: buildQuery(bbox) });
  let lastError = "no Overpass server configured";

  for (const url of endpoints()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body,
        headers: { "User-Agent": "BookingSiteDemo/1.0 (educational project)", Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        lastError = `Overpass answered HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      if (text.length > MAX_RESPONSE_CHARS) throw new RoutingError("Road data for this area is too large.", "too_large");
      let json: OsmData & { remark?: string };
      try {
        json = JSON.parse(text);
      } catch {
        lastError = "Overpass returned something that is not JSON";
        continue;
      }
      if (!Array.isArray(json.elements)) {
        lastError = "Overpass response had no elements";
        continue;
      }
      // A busy server can answer 200 with a partial result plus a remark about a runtime error.
      if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) {
        lastError = `Overpass: ${json.remark}`;
        continue;
      }
      return json;
    } catch (err) {
      if (err instanceof RoutingError) throw err;
      lastError = err instanceof Error ? err.message : "request failed";
    }
  }
  throw new RoutingError(`OpenStreetMap road data is unavailable right now (${lastError}).`, "overpass_unavailable");
}
