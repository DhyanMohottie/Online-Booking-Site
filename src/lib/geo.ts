export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (straight-line) distance between two points, in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "450 m" below 1 km (rounded to 10 m), "1.2 km" up to 10 km, "27 km" beyond. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

const WALK_SPEED_KMH = 5;

/** Rough walking time in whole minutes at 5 km/h (at least 1). */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / ((WALK_SPEED_KMH * 1000) / 60)));
}

/** "12 min", "1 h", "1 h 5 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
