import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decode, encode } from "next-auth/jwt";
import { cookies } from "next/headers";

// The cookie name used by NextAuth v5 (auth.js)
const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

// POST /api/subscription/activate
// Called after /api/subscription/sync confirms the DB is updated to PRO.
// Re-encodes the JWT session cookie with the new planTier — no re-login needed.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const secret = process.env.NEXTAUTH_SECRET!;

  // Read planTier from DB (never trust client)
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  const planTier = sub?.plan.tier ?? "FREE";

  if (planTier === "FREE") {
    return NextResponse.json({ error: "Plan is still FREE in DB" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get(COOKIE_NAME)?.value;

    if (!tokenValue) {
      return NextResponse.json({ error: "Session cookie not found" }, { status: 400 });
    }

    // Decode existing JWT, update planTier, re-encode
    const decoded = await decode({ token: tokenValue, secret, salt: COOKIE_NAME });
    if (!decoded) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
    }

    const updated = { ...decoded, planTier };
    const encoded = await encode({ token: updated, secret, salt: COOKIE_NAME });

    // Preserve original expiry
    const maxAge = decoded.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 30 * 24 * 60 * 60;

    const res = NextResponse.json({ ok: true, planTier });
    res.cookies.set(COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(maxAge, 3600),
    });

    return res;
  } catch (err) {
    console.error("JWT re-encode error:", err);
    return NextResponse.json({ error: "Failed to update session cookie" }, { status: 500 });
  }
}
