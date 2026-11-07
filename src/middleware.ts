import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = req.auth.role;

  if (
    role === "customer" &&
    req.auth.mustChangePassword &&
    !pathname.startsWith("/customer/change-password")
  ) {
    return NextResponse.redirect(new URL("/customer/change-password", req.url));
  }

  if (pathname.startsWith("/agent") && role !== "agent") {
    return NextResponse.redirect(new URL("/login?error=agent", req.url));
  }
  if (pathname.startsWith("/cargo") && role !== "cargo") {
    return NextResponse.redirect(new URL("/login?error=cargo", req.url));
  }
  if (pathname.startsWith("/customer") && role !== "customer") {
    return NextResponse.redirect(new URL("/login?error=customer", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/agent/:path*", "/cargo/:path*", "/customer/:path*"],
};
