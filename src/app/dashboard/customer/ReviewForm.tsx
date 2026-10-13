"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, FormError } from "@/components/forms";

export default function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/reviews", "POST", { bookingId, rating: fd.get("rating"), comment: fd.get("comment") });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
      setBusy(false);
    }
  }

  if (!open) {
    return <button className="btn-outline" onClick={() => setOpen(true)}>Write a review</button>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-gray-50 p-4">
      <FormError message={error} />
      <div>
        <label className="label" htmlFor={`rating-${bookingId}`}>Rating</label>
        <select id={`rating-${bookingId}`} name="rating" defaultValue="5" className="input w-40">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} - {["", "Poor", "Fair", "Good", "Very good", "Excellent"][n]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`comment-${bookingId}`}>Your experience</label>
        <textarea id={`comment-${bookingId}`} name="comment" required minLength={3} rows={3} className="input" />
      </div>
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>{busy ? "Submitting..." : "Submit review"}</button>
        <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
