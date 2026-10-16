import { z } from "zod";

export const ROLES = ["CUSTOMER", "OWNER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const AMENITIES = [
  "WiFi",
  "Pool",
  "Parking",
  "Breakfast",
  "Gym",
  "Spa",
  "Air conditioning",
  "Pet friendly",
  "Restaurant",
  "Beach access",
] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["CUSTOMER", "OWNER"]),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/** Optional coordinate: "", null and undefined all mean "not set". */
const optionalCoordinate = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(min, `${label} must be between ${min} and ${max}`).max(max, `${label} must be between ${min} and ${max}`).optional(),
  );

export const hotelSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(10, "Describe the hotel in at least 10 characters").max(4000),
    city: z.string().trim().min(2).max(80),
    country: z.string().trim().min(2).max(80),
    address: z.string().trim().min(3).max(200),
    starRating: z.coerce.number().int().min(1).max(5),
    latitude: optionalCoordinate(-90, 90, "Latitude"),
    longitude: optionalCoordinate(-180, 180, "Longitude"),
    amenities: z.array(z.string()).default([]),
    imageUrls: z.array(z.string().trim().url("Image must be a valid URL")).max(10).default([]),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
    message: "Set both latitude and longitude, or leave the location empty",
    path: ["latitude"],
  });

export const roomTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(""),
  capacity: z.coerce.number().int().min(1).max(12),
  pricePerNight: z.coerce.number().min(1, "Price must be positive").max(100000), // dollars in forms
  quantity: z.coerce.number().int().min(1).max(500),
  amenities: z.array(z.string()).default([]),
});

export const bookingSchema = z.object({
  roomTypeId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(20),
  // Mock payment: validated for shape only, never stored or processed.
  cardNumber: z.string().regex(/^[\d\s]{12,23}$/, "Enter a card number"),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3, "Please write a short comment").max(2000),
});

export const hotelStatusSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]) });

export function amenitiesToString(list: string[]): string {
  return list.join(",");
}

export function amenitiesFromString(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}
