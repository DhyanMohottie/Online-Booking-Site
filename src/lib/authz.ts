import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "./validators";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type SessionUser = { id: string; role: Role; name?: string | null; email?: string | null };

/** Require a signed-in user with one of the given roles, or throw 401/403. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Please sign in");
  // Re-check the DB so deactivated users lose access immediately despite a valid JWT.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { active: true, role: true } });
  if (!user?.active) throw new HttpError(401, "Account is disabled");
  if (!roles.includes(user.role as Role)) throw new HttpError(403, "You do not have access to this resource");
  return { ...session.user, role: user.role as Role };
}

/** Owner of the hotel (or an admin) may manage it. Returns the hotel. */
export async function requireHotelAccess(hotelId: string) {
  const user = await requireRole("OWNER", "ADMIN");
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new HttpError(404, "Hotel not found");
  if (user.role !== "ADMIN" && hotel.ownerId !== user.id) throw new HttpError(403, "Not your hotel");
  return { user, hotel };
}

/** Wrap a route handler so HttpError / unexpected errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
