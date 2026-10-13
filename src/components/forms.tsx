"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** POST/PUT/PATCH/DELETE JSON helper. Returns parsed body or throws Error with the API message. */
export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

/** Small button that calls an API endpoint, then refreshes the current server-rendered page. */
export function ActionButton({
  url,
  method = "POST",
  body,
  label,
  confirm,
  className = "btn-outline",
}: {
  url: string;
  method?: string;
  body?: unknown;
  label: string;
  confirm?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    try {
      await api(url, method, body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={run} disabled={busy} className={`${className} !px-3 !py-1.5`}>
        {busy ? "..." : label}
      </button>
      {error && <span className="max-w-48 text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
