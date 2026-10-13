import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/authz";
import { hotelStatusSchema } from "@/lib/validators";

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireRole("ADMIN");
  const parsed = hotelStatusSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const exists = await prisma.hotel.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  await prisma.hotel.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
});
