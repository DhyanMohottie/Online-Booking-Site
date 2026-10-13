import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ROLE_HOME: Record<string, string> = {
  CUSTOMER: "/dashboard/customer",
  OWNER: "/dashboard/owner",
  ADMIN: "/dashboard/admin",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (!req.auth) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ""] ?? "/", req.nextUrl));
  }

  const section = pathname.split("/")[2]?.toUpperCase();
  if (pathname.startsWith("/dashboard/") && section && section !== role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? ""] ?? "/", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/dashboard/:path*", "/book/:path*"] };
