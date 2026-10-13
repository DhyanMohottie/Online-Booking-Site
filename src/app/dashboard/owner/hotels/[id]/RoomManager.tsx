"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ActionButton, FormError } from "@/components/forms";
import { AMENITIES } from "@/lib/validators";

type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number; // dollars
  quantity: number;
  amenities: string[];
};

function RoomForm({
  hotelId,
  room,
  onDone,
}: {
  hotelId: string;
  room?: Room;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      description: fd.get("description"),
      capacity: fd.get("capacity"),
      pricePerNight: fd.get("pricePerNight"),
      quantity: fd.get("quantity"),
      amenities: fd.getAll("amenities"),
    };
    try {
      if (room) await api(`/api/rooms/${room.id}`, "PUT", body);
      else await api(`/api/hotels/${hotelId}/rooms`, "POST", body);
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save room");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-brand p-4">
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Room type name</label>
          <input name="name" defaultValue={room?.name} required className="input" placeholder="Deluxe Double" />
        </div>
        <div>
          <label className="label">Price / night ($)</label>
          <input name="pricePerNight" type="number" min={1} step="0.01" defaultValue={room?.pricePerNight} required className="input" />
        </div>
        <div>
          <label className="label">Sleeps</label>
          <input name="capacity" type="number" min={1} max={12} defaultValue={room?.capacity ?? 2} required className="input" />
        </div>
        <div>
          <label className="label">Rooms of this type</label>
          <input name="quantity" type="number" min={1} max={500} defaultValue={room?.quantity ?? 1} required className="input" />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Description</label>
          <input name="description" defaultValue={room?.description} className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Room amenities</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="amenities" value={a} defaultChecked={room?.amenities.includes(a)} />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>{busy ? "Saving..." : room ? "Save room" : "Add room type"}</button>
        <button type="button" className="btn-outline" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export default function RoomManager({ hotelId, rooms }: { hotelId: string; rooms: Room[] }) {
  const [editing, setEditing] = useState<string | null>(null); // room id, "new" or null

  return (
    <div className="space-y-3">
      {rooms.length === 0 && editing !== "new" && (
        <p className="text-gray-500">No room types yet. Guests can book only after you add at least one.</p>
      )}
      {rooms.map((r) =>
        editing === r.id ? (
          <RoomForm key={r.id} hotelId={hotelId} room={r} onDone={() => setEditing(null)} />
        ) : (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">{r.name}</p>
              <p className="text-sm text-gray-600">
                ${r.pricePerNight.toLocaleString()} / night · sleeps {r.capacity} ·{" "}
                <strong>{r.quantity}</strong> room{r.quantity === 1 ? "" : "s"} in inventory
              </p>
              {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
            </div>
            <div className="flex gap-2">
              <button className="btn-outline !px-3 !py-1.5" onClick={() => setEditing(r.id)}>Edit</button>
              <ActionButton
                url={`/api/rooms/${r.id}`}
                method="DELETE"
                label="Delete"
                className="btn-danger"
                confirm={`Delete room type "${r.name}"?`}
              />
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <RoomForm hotelId={hotelId} onDone={() => setEditing(null)} />
      ) : (
        <button className="btn" onClick={() => setEditing("new")}>+ Add room type</button>
      )}
    </div>
  );
}
