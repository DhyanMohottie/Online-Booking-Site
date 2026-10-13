"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Save, Send } from "lucide-react";
import { api, FormError } from "@/components/forms";
import AmenityPicker from "@/components/AmenityPicker";

export type HotelFormValues = {
  name: string;
  description: string;
  city: string;
  country: string;
  address: string;
  starRating: number;
  amenities: string[];
  imageUrls: string[];
};

const EMPTY: HotelFormValues = {
  name: "",
  description: "",
  city: "",
  country: "",
  address: "",
  starRating: 3,
  amenities: [],
  imageUrls: [],
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg text-ink">{title}</h3>
        {hint && <p className="text-sm text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function HotelForm({ hotelId, initial = EMPTY }: { hotelId?: string; initial?: HotelFormValues }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      description: fd.get("description"),
      city: fd.get("city"),
      country: fd.get("country"),
      address: fd.get("address"),
      starRating: fd.get("starRating"),
      amenities: fd.getAll("amenities"),
      imageUrls: String(fd.get("imageUrls") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (hotelId) {
        await api(`/api/hotels/${hotelId}`, "PUT", body);
        setSaved(true);
        router.refresh();
      } else {
        const { id } = await api<{ id: string }>("/api/hotels", "POST", body);
        router.push(`/dashboard/owner/hotels/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save hotel");
    } finally {
      setBusy(false);
    }
  }

  return (
    // @container: the two-column layout depends on the form's own width (wide manage page vs narrow register page).
    <form onSubmit={onSubmit} className="card @container space-y-6 p-6 sm:p-8">
      <FormError message={error} />
      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-700">
          <Check size={18} aria-hidden="true" /> Saved.
        </p>
      )}

      <div className="grid gap-8 @4xl:grid-cols-2 @4xl:gap-12">
        <div className="space-y-8">
          <Section title="Basics" hint="How your hotel is presented to guests.">
            <div>
              <label className="field-label" htmlFor="name">Hotel name</label>
              <input id="name" name="name" defaultValue={initial.name} required className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="description">Description</label>
              <textarea id="description" name="description" defaultValue={initial.description} required rows={5} className="field" />
            </div>
          </Section>

          <Section title="Location">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="city">City</label>
                <input id="city" name="city" defaultValue={initial.city} required className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="country">Country</label>
                <input id="country" name="country" defaultValue={initial.country} required className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="address">Street address</label>
                <input id="address" name="address" defaultValue={initial.address} required className="field" />
              </div>
              <div>
                <label className="field-label" htmlFor="starRating">Star rating</label>
                <div className="relative">
                  <select id="starRating" name="starRating" defaultValue={initial.starRating} className="field cursor-pointer appearance-none pr-10">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-8">
          <Section title="Amenities" hint="Guests can filter hotels by these.">
            <AmenityPicker selected={initial.amenities} />
          </Section>

          <Section title="Photos" hint="Paste image links, one per line (max 10). The first one is the cover photo.">
            {initial.imageUrls.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Saved photos">
                {initial.imageUrls.map((url, i) => (
                  <li key={url + i} className="aspect-4/3 overflow-hidden rounded-md bg-gray-200">
                    <img src={url} alt={`Saved photo ${i + 1}`} className="h-full w-full object-cover" />
                  </li>
                ))}
              </ul>
            )}
            <div>
              <label className="field-label" htmlFor="imageUrls">Image URLs</label>
              <textarea
                id="imageUrls"
                name="imageUrls"
                rows={5}
                defaultValue={initial.imageUrls.join("\n")}
                placeholder="https://picsum.photos/seed/my-hotel/1000/700"
                className="field font-mono text-sm"
              />
            </div>
          </Section>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <button className="btn px-8 py-3.5 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg" disabled={busy}>
          {busy ? (
            "Saving..."
          ) : hotelId ? (
            <>
              <Save size={16} aria-hidden="true" /> Save changes
            </>
          ) : (
            <>
              <Send size={16} aria-hidden="true" /> Submit for approval
            </>
          )}
        </button>
      </div>
    </form>
  );
}
