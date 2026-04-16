import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTHLY_LIMIT: Record<string, number | null> = {
  FREE: 0,
  PRO: 5,
  ENTERPRISE: null, // unlimited
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.planTier;
  const limit = MONTHLY_LIMIT[plan] ?? null;

  if (limit === null) {
    return NextResponse.json({ plan, canSave: true, used: 0, limit: null, remaining: null });
  }

  if (limit === 0) {
    return NextResponse.json({ plan, canSave: false, used: 0, limit: 0, remaining: 0 });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await prisma.calculation.count({
    where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
  });

  return NextResponse.json({
    plan,
    canSave: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  });
}
