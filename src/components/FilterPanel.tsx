"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/**
 * Wraps the filter form. On phones it collapses behind a "Filters" bar; from `lg` up the
 * panel is always visible. The form itself is rendered on the server and passed in as children.
 */
export default function FilterPanel({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="search-filters"
        className="flex w-full items-center justify-between rounded-[14px] bg-white px-5 py-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5 lg:hidden"
      >
        <span className="flex items-center gap-2 font-semibold text-ink">
          <SlidersHorizontal size={18} className="text-brand" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{activeCount}</span>
          )}
        </span>
        <ChevronDown size={20} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id="search-filters" className={`${open ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
