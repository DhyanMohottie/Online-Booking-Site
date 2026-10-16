"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Info, MapPin, Pencil, Plus, Route, Save, Trash2 } from "lucide-react";
import { api, ActionButton, FormError } from "@/components/forms";
import LocationPicker from "@/components/LocationPicker";
import NearbyMap, { type NearbyPlace } from "@/components/NearbyMap";
import { attractionStyle } from "@/components/attractionIcons";
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
  onDone,
}: {
  hotelId: string;
  hotelName: string;
  hotel: HotelPin;
  city: string;
  country: string;
  place?: NearbyPlace;
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
      if (place) await api(`/api/attractions/${place.id}`, "PUT", body);
      else await api(`/api/hotels/${hotelId}/attractions`, "POST", body);
      router.refresh();
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

function PlaceCard({ place, onEdit }: { place: NearbyPlace; onEdit: () => void }) {
  const { icon: Icon, color } = attractionStyle(place.category);
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
        {place.distance && (
          <li className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand">
            <Route size={15} aria-hidden="true" />
            {place.distance} from hotel
          </li>
        )}
      </ul>
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
  const [editing, setEditing] = useState<string | null>(null); // place id, "new" or null
  const full = places.length >= MAX_ATTRACTIONS;

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

      {places.length > 0 && <NearbyMap hotelName={hotelName} hotel={hotel} places={places} showList={false} testId="attractions-overview-map" />}

      {places.length === 0 && editing !== "new" && (
        <p className="text-gray-500">No nearby places yet. This is optional: add landmarks, museums, parks or restaurants that guests may want to visit.</p>
      )}

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        {places.map((p) =>
          editing === p.id ? (
            <div key={p.id} className="lg:col-span-2">
              <AttractionForm hotelId={hotelId} hotelName={hotelName} hotel={hotel} city={city} country={country} place={p} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <PlaceCard key={p.id} place={p} onEdit={() => setEditing(p.id)} />
          ),
        )}
        {editing === "new" ? (
          <div className="lg:col-span-2">
            <AttractionForm hotelId={hotelId} hotelName={hotelName} hotel={hotel} city={city} country={country} onDone={() => setEditing(null)} />
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
