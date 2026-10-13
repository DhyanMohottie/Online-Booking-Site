"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, FormError } from "@/components/forms";
import { AMENITIES } from "@/lib/validators";

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
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <FormError message={error} />
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>}
      <div>
        <label className="label" htmlFor="name">Hotel name</label>
        <input id="name" name="name" defaultValue={initial.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={initial.description} required rows={4} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={initial.city} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="country">Country</label>
          <input id="country" name="country" defaultValue={initial.country} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="address">Street address</label>
          <input id="address" name="address" defaultValue={initial.address} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="starRating">Star rating</label>
          <select id="starRating" name="starRating" defaultValue={initial.starRating} className="input">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Amenities</legend>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="amenities" value={a} defaultChecked={initial.amenities.includes(a)} />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="imageUrls">Image URLs (one per line, max 10)</label>
        <textarea
          id="imageUrls"
          name="imageUrls"
          rows={4}
          defaultValue={initial.imageUrls.join("\n")}
          placeholder="https://picsum.photos/seed/my-hotel/1000/700"
          className="input font-mono text-xs"
        />
      </div>
      <button className="btn" disabled={busy}>{busy ? "Saving..." : hotelId ? "Save changes" : "Submit for approval"}</button>
    </form>
  );
}
