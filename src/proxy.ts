import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Admin routes — require ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.isBlocked) {
      return NextResponse.redirect(new URL("/login?error=blocked", req.url));
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // App routes — require authenticated session
  const appRoutes = [
    "/dashboard",
    "/calculadora-rural",
    "/calculadora-rh",
    "/historico",
    "/configuracoes",
  ];

  if (appRoutes.some((r) => pathname.startsWith(r))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.isBlocked) {
      return NextResponse.redirect(new URL("/login?error=blocked", req.url));
    }
    return NextResponse.next();
  }

  // Auth pages — redirect logged-in users to dashboard
  if (["/login", "/register"].includes(pathname)) {
    if (session) {
      const dest = session.user.role === "ADMIN" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
