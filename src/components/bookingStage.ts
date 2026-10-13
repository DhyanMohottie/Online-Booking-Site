export type Stage = "upcoming" | "inProgress" | "completed" | "cancelled";

/** Pill label + colour for each stage of a booking (shared by My bookings and the owner views). */
export const STAGE: Record<Stage, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-green-100 text-green-800" },
  inProgress: { label: "Staying now", className: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

/** Derive the stage from the stored status and dates (`today` = UTC midnight). */
export function getStage(b: { status: string; checkIn: Date; checkOut: Date }, today: Date): Stage {
  if (b.status === "CANCELLED") return "cancelled";
  if (b.checkOut <= today) return "completed";
  if (b.checkIn > today) return "upcoming";
  return "inProgress";
}
