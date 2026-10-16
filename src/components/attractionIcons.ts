import {
  Building2,
  Church,
  Landmark,
  MapPin,
  Mountain,
  Music,
  ShoppingBag,
  Trees,
  Umbrella,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { AttractionCategory } from "@/lib/validators";

/** Icon + marker colour for every attraction category (colours chosen to be distinct on the map). */
export const ATTRACTION_STYLE: Record<AttractionCategory, { icon: LucideIcon; color: string }> = {
  Landmark: { icon: Landmark, color: "#7c3aed" },
  Museum: { icon: Building2, color: "#2563eb" },
  "Park & nature": { icon: Trees, color: "#16a34a" },
  Beach: { icon: Umbrella, color: "#0891b2" },
  "Food & drink": { icon: UtensilsCrossed, color: "#ea580c" },
  Shopping: { icon: ShoppingBag, color: "#db2777" },
  "Culture & temples": { icon: Church, color: "#b45309" },
  Viewpoint: { icon: Mountain, color: "#0f766e" },
  Nightlife: { icon: Music, color: "#4f46e5" },
  Other: { icon: MapPin, color: "#475569" },
};

export function attractionStyle(category: string) {
  return ATTRACTION_STYLE[category as AttractionCategory] ?? ATTRACTION_STYLE.Other;
}
