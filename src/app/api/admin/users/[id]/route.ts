import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/authz";

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const admin = await requireRole("ADMIN");
  const parsed = z.object({ active: z.boolean() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (id === admin.id) return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await prisma.user.update({ where: { id }, data: { active: parsed.data.active } });
  return NextResponse.json({ ok: true });
});
