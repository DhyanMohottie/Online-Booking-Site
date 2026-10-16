"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Car, ExternalLink, Footprints, Info, Loader2, MapPin, Pencil, Plus, RefreshCw, Route, Save, Trash2 } from "lucide-react";
import { api, ActionButton, FormError } from "@/components/forms";
import LocationPicker from "@/components/LocationPicker";
import NearbyMap, { type NearbyPlace } from "@/components/NearbyMap";
import { attractionStyle } from "@/components/attractionIcons";
import type { RouteFailure } from "@/lib/routing/types";
import type { RouteView } from "@/lib/routing/view";
import { ATTRACTION_CATEGORIES, MAX_ATTRACTIONS } from "@/lib/validators";

type HotelPin = { latitude: number; longitude: number } | null;

const CHIP =
  "flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 peer-checked:border-brand peer-checked:bg-brand-50 peer-checked:text-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20";

function AttractionForm({
  hotelId,
  hotelName,
  hotel,
  city,
  country,
  place,
  onSaved,
  onDone,
}: {
  hotelId: string;
  hotelName: string;
  hotel: HotelPin;
  city: string;
  country: string;
  place?: NearbyPlace;
  onSaved: (placeId: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = place?.id ?? "new";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("latitude") ?? "") === "" || String(fd.get("longitude") ?? "") === "") {
      setError("Click the map to place this attraction (or use Find place by name).");
      return;
    }
    setBusy(true);
    const body = {
      name: fd.get("name"),
      category: fd.get("category"),
      description: fd.get("description"),
      latitude: fd.get("latitude"),
      longitude: fd.get("longitude"),
    };
    try {
      let savedId = place?.id ?? "";
      if (place) await api(`/api/attractions/${place.id}`, "PUT", body);
      else savedId = (await api<{ id: string }>(`/api/hotels/${hotelId}/attractions`, "POST", body)).id;
      router.refresh();
      onSaved(savedId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this place");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6 ring-2 ring-brand/40 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand">
          {place ? <Pencil size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
        </span>
        <h3 className="text-xl text-ink">{place ? `Edit ${place.name}` : "Add a nearby place"}</h3>
      </div>
      <FormError message={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`attr-name-${key}`}>Name</label>
          <input id={`attr-name-${key}`} name="name" defaultValue={place?.name} required maxLength={100} className="field" placeholder="Eiffel Tower" />
        </div>
        <div>
          <label className="field-label" htmlFor={`attr-note-${key}`}>Short note (optional)</label>
          <input id={`attr-note-${key}`} name="description" defaultValue={place?.description} maxLength={300} className="field" placeholder="10 minutes by metro" />
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Category</legend>
        <div className="flex flex-wrap gap-2">
          {ATTRACTION_CATEGORIES.map((c) => {
            const { icon: Icon } = attractionStyle(c);
            return (
              <label key={c} className="relative">
                <input type="radio" name="category" value={c} defaultChecked={(place?.category ?? "Landmark") === c} className="peer sr-only" />
                <span className={CHIP}>
                  <Icon size={15} aria-hidden="true" />
                  {c}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="field-label">Location on the map</p>
        <LocationPicker
          initialLat={place?.latitude ?? null}
          initialLng={place?.longitude ?? null}
          idPrefix={`attr-${key}-`}
          testId="attraction-map"
          description="Click the map or drag the red pin onto the attraction. The dark pin is your hotel."
          findLabel="Find place by name"
          getQueries={(form) => {
            const name = String(new FormData(form).get("name") ?? "").trim();
            return { exact: name ? [name, city, country].filter(Boolean).join(", ") : "" };
          }}
          emptyQueryMessage="Type the place name above first."
          allowClear={false}
          referencePin={hotel ? { ...hotel, label: hotelName || "your hotel" } : null}
          onCoordsChange={(la, lo) => {
            // The "place the pin" reminder is no longer true once there is a pin.
            if (la && lo) setError((cur) => (cur.startsWith("Click the map") ? "" : cur));
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
        <button className="btn px-6 py-3 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg" disabled={busy}>
          {busy ? (
            "Saving..."
          ) : (
            <>
              {place ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {place ? "Save place" : "Add place"}
            </>
          )}
        </button>
        <button type="button" className="btn-outline px-6 py-3 text-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const REASON: Record<RouteFailure, string> = {
  no_road_near: "no mapped road within 300 m of a pin",
  unreachable: "the two pins are not connected by mapped roads",
  too_far: "too far apart to route (over 8 km)",
};

function Chip({ icon: Icon, children, testId }: { icon: typeof Route; children: React.ReactNode; testId: string }) {
  return (
    <li data-testid={testId} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand">
      <Icon size={15} aria-hidden="true" />
      {children}
    </li>
  );
}

function AlgoLine({ label, route }: { label: string; route: RouteView }) {
  const same = route.astar.distanceM === route.dijkstra.distanceM;
  return (
    <p>
      <strong className="text-ink">{label}:</strong> A* explored {route.astar.visited} road nodes, Dijkstra explored {route.dijkstra.visited}
      {same ? ` and both found ${route.distance}.` : "; results differed slightly, Dijkstra's was used."}
    </p>
  );
}

function PlaceCard({ place, onEdit }: { place: NearbyPlace; onEdit: () => void }) {
  const { icon: Icon, color } = attractionStyle(place.category);
  const r = place.routes;
  return (
    <article className="card flex flex-col gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)]">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}>
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-xl font-medium uppercase leading-tight text-ink">{place.name}</h3>
          {place.description && <p className="mt-1 text-sm text-gray-500">{place.description}</p>}
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Place details">
        <li className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">{place.category}</li>
        {r?.walk && (
          <Chip icon={Footprints} testId="chip-walk">
            {r.walk.distance}
            {r.walk.duration ? ` · ~${r.walk.duration}` : ""} walk
          </Chip>
        )}
        {r?.drive && (
          <Chip icon={Car} testId="chip-drive">
            {r.drive.distance} by car
          </Chip>
        )}
        {place.distance && (
          <li data-testid="chip-straight" className={r?.state === "ok" ? "rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600" : "flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand"}>
            {r?.state === "ok" ? (
              `${place.distance} straight line`
            ) : (
              <>
                <Route size={15} aria-hidden="true" />
                {place.distance} from hotel
              </>
            )}
          </li>
        )}
      </ul>
      {r?.state === "failed" && (
        <p data-testid="route-failed" className="text-sm text-amber-700">
          No road route found: {REASON[(r.walkReason ?? r.driveReason ?? "unreachable") as RouteFailure]}. Guests see the straight-line distance.
        </p>
      )}
      {r?.state === "ok" && (!r.walk || !r.drive) && (
        <p className="text-sm text-amber-700">
          No {r.walk ? "driving" : "walking"} route found ({REASON[(r.walk ? r.driveReason : r.walkReason) ?? "unreachable"]}).
        </p>
      )}
      {r?.state === "ok" && (
        <details data-testid="route-details" className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold text-ink">How it was calculated</summary>
          <div className="mt-2 space-y-1.5">
            <p>
              Distances follow OpenStreetMap roads from the hotel pin to this place pin, found with two shortest-path algorithms. A* heads towards the goal, Dijkstra searches in every direction, so A* usually looks at far fewer roads for the same answer.
            </p>
            {r.walk && <AlgoLine label="Walking" route={r.walk} />}
            {r.drive && <AlgoLine label="Driving" route={r.drive} />}
          </div>
        </details>
      )}
      <a
        href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline"
      >
        Open in OpenStreetMap <ExternalLink size={14} aria-hidden="true" />
      </a>
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <button type="button" className="btn-outline h-11 w-full gap-2 px-4 text-sm" onClick={onEdit}>
          <Pencil size={16} aria-hidden="true" /> Edit
        </button>
        <ActionButton
          url={`/api/attractions/${place.id}`}
          method="DELETE"
          label="Delete"
          icon={<Trash2 size={16} aria-hidden="true" />}
          className="btn-danger h-11"
          size="md"
          fullWidth
          confirm={`Remove "${place.name}" from your nearby places?`}
        />
      </div>
    </article>
  );
}

type Calc = { state: "idle" | "running"; message: string; error: boolean };

export default function AttractionManager({
  hotelId,
  hotelName,
  hotel,
  city,
  country,
  places,
}: {
  hotelId: string;
  hotelName: string;
  hotel: HotelPin;
  city: string;
  country: string;
  places: NearbyPlace[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // place id, "new" or null
  const [calc, setCalc] = useState<Calc>({ state: "idle", message: "", error: false });
  const full = places.length >= MAX_ATTRACTIONS;
  const stale = places.filter((p) => !p.routes || p.routes.state === "none").length;

  /** Ask the server to (re)calculate road routes for one place, or all of them. Retries once if throttled. */
  async function calculate(placeId?: string) {
    if (!hotel) return;
    setCalc({ state: "running", message: "Calculating road routes on OpenStreetMap...", error: false });
    try {
      let res: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        res = await fetch(`/api/hotels/${hotelId}/routes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(placeId ? { placeId } : {}),
        });
        if (res.status !== 429) break;
        const wait = Number((await res.json().catch(() => ({}))).retryAfter) || 4;
        await new Promise((r) => setTimeout(r, wait * 1000 + 300));
      }
      const data = (await res?.json().catch(() => ({}))) as { updated?: number; failed?: number; error?: string };
      if (!res?.ok) throw new Error(data.error ?? "Could not calculate road distances");
      const msg =
        data.failed && !data.updated
          ? "No road route could be found. Guests will see straight-line distances."
          : `Road distances updated${data.failed ? ` (${data.failed} place${data.failed === 1 ? "" : "s"} had no route)` : ""}.`;
      setCalc({ state: "idle", message: msg, error: !!data.failed && !data.updated });
      router.refresh();
    } catch (err) {
      setCalc({
        state: "idle",
        message: `${err instanceof Error ? err.message : "Could not calculate road distances"} Guests will see straight-line distances until it works.`,
        error: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      {!hotel && (
        <p className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-amber-200">
          <Info size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Tip: set your hotel&apos;s map location first (Hotel details &rarr; Map location). Then these maps show your hotel and the distance to each place.
          </span>
        </p>
      )}

      {places.length > 0 && hotel && (
        <div
          data-testid="routes-panel"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5"
        >
          <p
            role="status"
            data-testid="routes-status"
            className={`flex min-w-0 flex-1 items-start gap-2 text-sm ${calc.error ? "text-amber-700" : "text-gray-600"}`}
          >
            {calc.state === "running" ? (
              <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <Route size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {calc.message ||
                (stale > 0
                  ? `Road distances have not been calculated for ${stale} place${stale === 1 ? "" : "s"} yet. Guests see straight-line distances until then.`
                  : "Guests see real road distances (walking and driving) from OpenStreetMap.")}
            </span>
          </p>
          <button
            type="button"
            data-testid="recalc-routes"
            className="btn-outline h-11 gap-2 px-4 text-sm"
            disabled={calc.state === "running"}
            onClick={() => calculate()}
          >
            <RefreshCw size={16} aria-hidden="true" /> {stale > 0 ? "Calculate road distances" : "Recalculate road distances"}
          </button>
        </div>
      )}

      {places.length > 0 && <NearbyMap hotelName={hotelName} hotel={hotel} places={places} showList={false} testId="attractions-overview-map" />}

      {places.length === 0 && editing !== "new" && (
        <p className="text-gray-500">No nearby places yet. This is optional: add landmarks, museums, parks or restaurants that guests may want to visit.</p>
      )}

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        {places.map((p) =>
          editing === p.id ? (
            <div key={p.id} className="lg:col-span-2">
              <AttractionForm hotelId={hotelId} hotelName={hotelName} hotel={hotel} city={city} country={country} place={p} onSaved={(id) => calculate(id)} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <PlaceCard key={p.id} place={p} onEdit={() => setEditing(p.id)} />
          ),
        )}
        {editing === "new" ? (
          <div className="lg:col-span-2">
            <AttractionForm hotelId={hotelId} hotelName={hotelName} hotel={hotel} city={city} country={country} onSaved={(id) => calculate(id)} onDone={() => setEditing(null)} />
          </div>
        ) : full ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
            <MapPin size={22} aria-hidden="true" />
            <p className="font-semibold">You have reached the limit of {MAX_ATTRACTIONS} nearby places.</p>
            <p className="text-sm">Remove one to add another.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white/60 p-6 text-gray-500 transition hover:border-brand hover:bg-brand-50 hover:text-brand"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Plus size={22} aria-hidden="true" />
            </span>
            <span className="font-semibold">Add a nearby place</span>
          </button>
        )}
      </div>
    </div>
  );
}
