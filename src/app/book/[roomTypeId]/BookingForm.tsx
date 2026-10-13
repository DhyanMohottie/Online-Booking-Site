"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, FormError } from "@/components/forms";

type Props = {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  maxGuests: number;
  defaultGuests: number;
  total: string;
};

export default function BookingForm({ roomTypeId, checkIn, checkOut, maxGuests, defaultGuests, total }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const { id } = await api<{ id: string }>("/api/bookings", "POST", {
        roomTypeId,
        checkIn,
        checkOut,
        guests: fd.get("guests"),
        cardNumber: fd.get("cardNumber"),
      });
      router.push(`/book/confirmation/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor="guests">Guests</label>
        <input id="guests" name="guests" type="number" min={1} max={maxGuests} defaultValue={defaultGuests} className="input w-28" required />
      </div>
      <fieldset className="space-y-3 rounded-md border border-dashed border-gray-300 p-4">
        <legend className="px-1 text-sm font-semibold">Payment (demo only)</legend>
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          This is a simulation. No card is charged and card details are never stored.
        </p>
        <div>
          <label className="label" htmlFor="cardNumber">Card number</label>
          <input id="cardNumber" name="cardNumber" defaultValue="4242 4242 4242 4242" inputMode="numeric" className="input" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exp">Expiry</label>
            <input id="exp" defaultValue="12/30" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cvc">CVC</label>
            <input id="cvc" defaultValue="123" className="input" />
          </div>
        </div>
      </fieldset>
      <button className="btn w-full py-3" disabled={busy}>{busy ? "Confirming..." : `Confirm & pay ${total} (mock)`}</button>
    </form>
  );
}
