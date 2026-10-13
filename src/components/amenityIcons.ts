import {
  Car,
  Coffee,
  Dumbbell,
  PawPrint,
  Snowflake,
  Sparkles,
  Umbrella,
  UtensilsCrossed,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** One icon per amenity, shared by the filter chips and the hotel cards. */
export const AMENITY_ICONS: Record<string, LucideIcon> = {
  WiFi: Wifi,
  Pool: WavesLadder,
  Parking: Car,
  Breakfast: Coffee,
  Gym: Dumbbell,
  Spa: Sparkles,
  "Air conditioning": Snowflake,
  "Pet friendly": PawPrint,
  Restaurant: UtensilsCrossed,
  "Beach access": Umbrella,
};
