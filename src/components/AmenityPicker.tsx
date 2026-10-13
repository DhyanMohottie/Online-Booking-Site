import { AMENITIES } from "@/lib/validators";
import { AMENITY_ICONS } from "./amenityIcons";

const CHIP =
  "flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 peer-checked:border-brand peer-checked:bg-brand-50 peer-checked:text-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20";

/** Amenity checkbox chips; submits repeated `amenities` values like the old plain checkboxes. */
export default function AmenityPicker({ selected = [] }: { selected?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {AMENITIES.map((a) => {
        const Icon = AMENITY_ICONS[a];
        return (
          <label key={a} className="relative">
            <input type="checkbox" name="amenities" value={a} defaultChecked={selected.includes(a)} className="peer sr-only" />
            <span className={CHIP}>
              {Icon && <Icon size={15} aria-hidden="true" />}
              {a}
            </span>
          </label>
        );
      })}
    </div>
  );
}
