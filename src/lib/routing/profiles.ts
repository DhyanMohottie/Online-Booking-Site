import type { Profile } from "./types";

type Tags = Record<string, string> | undefined;

/** Ways a pedestrian may use. Motorways and trunk roads are excluded on purpose. */
const WALK_HIGHWAYS = new Set([
  "footway", "path", "pedestrian", "steps", "living_street", "residential", "service", "unclassified",
  "tertiary", "tertiary_link", "secondary", "secondary_link", "primary", "primary_link", "track", "road", "corridor",
]);

/** Ways a car may use. */
const DRIVE_HIGHWAYS = new Set([
  "motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link",
  "tertiary", "tertiary_link", "unclassified", "residential", "living_street", "service", "road",
]);

/** Highway values we ask Overpass for (union of both profiles + cycleway, which may allow foot=yes). */
export const OVERPASS_HIGHWAYS = [...new Set([...WALK_HIGHWAYS, ...DRIVE_HIGHWAYS, "cycleway"])];

const NO = new Set(["no", "private"]);
const YES = new Set(["yes", "designated", "permissive", "destination", "customers", "delivery"]);

const tag = (tags: Tags, key: string) => tags?.[key]?.toLowerCase();

/** Can this way be used at all by the profile? */
export function wayAllowed(profile: Profile, tags: Tags): boolean {
  const hw = tag(tags, "highway");
  if (!hw || tag(tags, "area") === "yes") return false;

  if (profile === "walk") {
    const foot = tag(tags, "foot");
    if (foot && YES.has(foot)) return WALK_HIGHWAYS.has(hw) || hw === "cycleway";
    if (foot && NO.has(foot)) return false;
    if (hw === "cycleway") return false; // cycleways are not assumed to allow walking
    if (!WALK_HIGHWAYS.has(hw)) return false;
    const access = tag(tags, "access");
    return !(access && NO.has(access));
  }

  // drive
  if (!DRIVE_HIGHWAYS.has(hw)) return false;
  if (hw === "service" && tag(tags, "service") === "parking_aisle") return false;
  for (const key of ["motor_vehicle", "motorcar", "vehicle"]) {
    const v = tag(tags, key);
    if (v && YES.has(v)) return true;
    if (v && NO.has(v)) return false;
  }
  const access = tag(tags, "access");
  return !(access && NO.has(access));
}

export type Direction = "both" | "forward" | "backward";

/** Which way may the profile travel along the way (in node order)? Walking ignores one-way streets. */
export function wayDirection(profile: Profile, tags: Tags): Direction {
  if (profile === "walk") return "both";
  const oneway = tag(tags, "oneway");
  if (oneway === "no" || oneway === "false" || oneway === "0") return "both";
  if (oneway === "-1" || oneway === "reverse") return "backward";
  if (oneway === "yes" || oneway === "true" || oneway === "1") return "forward";
  const junction = tag(tags, "junction");
  if (junction === "roundabout" || junction === "circular") return "forward";
  const hw = tag(tags, "highway");
  if (hw === "motorway" || hw === "motorway_link") return "forward";
  return "both";
}
