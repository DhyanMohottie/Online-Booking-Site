"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BedDouble, DoorOpen, Pencil, Plus, Save, Tag, Trash2, Users } from "lucide-react";
import { api, ActionButton, FormError } from "@/components/forms";
import AmenityPicker from "@/components/AmenityPicker";
import { AMENITY_ICONS } from "@/components/amenityIcons";

type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number; // dollars
  quantity: number;
  amenities: string[];
};

function RoomForm({ hotelId, room, onDone }: { hotelId: string; room?: Room; onDone: () => void }) {
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
    <form onSubmit={onSubmit} className="card space-y-6 p-6 ring-2 ring-brand/40 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand">
          {room ? <Pencil size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
        </span>
        <h3 className="text-xl text-ink">{room ? `Edit ${room.name}` : "New room type"}</h3>
      </div>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor={`room-name-${room?.id ?? "new"}`}>Room type name</label>
          <input id={`room-name-${room?.id ?? "new"}`} name="name" defaultValue={room?.name} required className="field" placeholder="Deluxe Double" />
        </div>
        <div>
          <label className="field-label" htmlFor={`room-price-${room?.id ?? "new"}`}>Price / night</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">$</span>
            <input id={`room-price-${room?.id ?? "new"}`} name="pricePerNight" type="number" min={1} step="0.01" defaultValue={room?.pricePerNight} required className="field pl-8" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor={`room-sleeps-${room?.id ?? "new"}`}>Sleeps</label>
          <input id={`room-sleeps-${room?.id ?? "new"}`} name="capacity" type="number" min={1} max={12} defaultValue={room?.capacity ?? 2} required className="field" />
        </div>
        <div>
          <label className="field-label" htmlFor={`room-qty-${room?.id ?? "new"}`}>Rooms of this type</label>
          <input id={`room-qty-${room?.id ?? "new"}`} name="quantity" type="number" min={1} max={500} defaultValue={room?.quantity ?? 1} required className="field" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="field-label" htmlFor={`room-desc-${room?.id ?? "new"}`}>Description</label>
          <input id={`room-desc-${room?.id ?? "new"}`} name="description" defaultValue={room?.description} className="field" />
        </div>
      </div>
      <div>
        <p className="field-label">Room amenities</p>
        <AmenityPicker selected={room?.amenities} />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
        <button className="btn px-6 py-3 text-sm shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg" disabled={busy}>
          {busy ? (
            "Saving..."
          ) : (
            <>
              {room ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {room ? "Save room" : "Add room type"}
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

function RoomCard({ room, onEdit }: { room: Room; onEdit: () => void }) {
  const shown = room.amenities.slice(0, 4);
  const extra = room.amenities.length - shown.length;
  return (
    <article className="card flex flex-col gap-5 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)]">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
          <BedDouble size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-xl font-medium uppercase leading-tight text-ink">{room.name}</h3>
          {room.description && <p className="mt-1 text-sm text-gray-500">{room.description}</p>}
        </div>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Room details">
        <li className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand">
          <Tag size={15} aria-hidden="true" />${room.pricePerNight.toLocaleString()} / night
        </li>
        <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          <Users size={15} className="text-gray-500" aria-hidden="true" />
          Sleeps {room.capacity}
        </li>
        <li className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          <DoorOpen size={15} className="text-gray-500" aria-hidden="true" />
          {room.quantity} room{room.quantity === 1 ? "" : "s"} in inventory
        </li>
      </ul>

      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Amenities">
          {shown.map((a) => {
            const Icon = AMENITY_ICONS[a];
            return (
              <li key={a} className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                {Icon && <Icon size={13} aria-hidden="true" />}
                {a}
              </li>
            );
          })}
          {extra > 0 && <li className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500">+{extra} more</li>}
        </ul>
      )}

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <button type="button" className="btn-outline h-11 w-full gap-2 px-4 text-sm" onClick={onEdit}>
          <Pencil size={16} aria-hidden="true" /> Edit
        </button>
        <ActionButton
          url={`/api/rooms/${room.id}`}
          method="DELETE"
          label="Delete"
          icon={<Trash2 size={16} aria-hidden="true" />}
          className="btn-danger h-11"
          size="md"
          fullWidth
          confirm={`Delete room type "${room.name}"?`}
        />
      </div>
    </article>
  );
}

export default function RoomManager({ hotelId, rooms }: { hotelId: string; rooms: Room[] }) {
  const [editing, setEditing] = useState<string | null>(null); // room id, "new" or null

  return (
    <div className="space-y-4">
      {rooms.length === 0 && editing !== "new" && (
        <p className="text-gray-500">No room types yet. Guests can book only after you add at least one.</p>
      )}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        {rooms.map((r) =>
          editing === r.id ? (
            <div key={r.id} className="lg:col-span-2">
              <RoomForm hotelId={hotelId} room={r} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <RoomCard key={r.id} room={r} onEdit={() => setEditing(r.id)} />
          ),
        )}
        {editing === "new" ? (
          <div className="lg:col-span-2">
            <RoomForm hotelId={hotelId} onDone={() => setEditing(null)} />
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
            <span className="font-semibold">Add a room type</span>
          </button>
        )}
      </div>
    </div>
  );
}
