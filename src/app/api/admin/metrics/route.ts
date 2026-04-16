import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeSubscriptions,
    subscriptionsByPlan,
    newUsersLast30Days,
    recentCalcs,
    totalCalculations,
    plans,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.groupBy({
      by: ["planId"],
      _count: true,
      where: { status: "ACTIVE" },
    }),
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.calculation.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.calculation.count(),
    prisma.plan.findMany({ select: { id: true, name: true, tier: true } }),
  ]);

  // Group by date in JS (avoids $queryRaw BigInt issues)
  const dayMap: Record<string, number> = {};
  for (const calc of recentCalcs) {
    const key = format(calc.createdAt, "yyyy-MM-dd");
    dayMap[key] = (dayMap[key] ?? 0) + 1;
  }
  const calcsByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));
  const subscriptionDistribution = subscriptionsByPlan.map((s: { planId: string; _count: number }) => ({
    plan: planMap[s.planId]?.name ?? s.planId,
    tier: planMap[s.planId]?.tier ?? "FREE",
    count: s._count,
  }));

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    newUsersLast30Days,
    totalCalculations,
    subscriptionDistribution,
    calcsByDay,
  });
}
