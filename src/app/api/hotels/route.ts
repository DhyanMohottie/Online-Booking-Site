import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/authz";
import { amenitiesToString, hotelSchema } from "@/lib/validators";

export const POST = handle(async (req: Request) => {
  const user = await requireRole("OWNER");
  const parsed = hotelSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { imageUrls, amenities, ...data } = parsed.data;

  const hotel = await prisma.hotel.create({
    data: {
      ...data,
      amenities: amenitiesToString(amenities),
      ownerId: user.id,
      status: "PENDING", // must be approved by an admin before it is public
      images: { create: imageUrls.map((url, i) => ({ url, sortOrder: i })) },
    },
  });
  return NextResponse.json({ id: hotel.id }, { status: 201 });
});
