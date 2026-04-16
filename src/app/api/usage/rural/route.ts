import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

const FREE_LIMIT = 5;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Non-FREE plans have no compute limit
  if (session.user.planTier !== "FREE" || session.user.role === "ADMIN") {
    return NextResponse.json({ limit: null, used: null, remaining: null, canCompute: true });
  }

  const yearMonth = format(new Date(), "yyyy-MM");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = await (prisma.ruralCalcUsage as any).findUnique({
    where: { userId_yearMonth: { userId: session.user.id, yearMonth } },
  });

  const used = usage?.count ?? 0;
  const remaining = Math.max(0, FREE_LIMIT - used);

  return NextResponse.json({
    limit: FREE_LIMIT,
    used,
    remaining,
    canCompute: remaining > 0,
  });
}
