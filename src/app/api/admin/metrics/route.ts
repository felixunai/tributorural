import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    activeSubscriptions,
    subscriptionsByPlan,
    newUsersLast30Days,
    calcsByDay,
    totalCalculations,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),

    prisma.subscription.count({ where: { status: "ACTIVE" } }),

    prisma.subscription.groupBy({
      by: ["planId"],
      _count: true,
      where: { status: "ACTIVE" },
    }),

    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        role: "USER",
      },
    }),

    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at)::text as date, COUNT(*)::bigint as count
      FROM calculations
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,

    prisma.calculation.count(),
  ]);

  // Fetch plan names for the groupBy result
  const plans = await prisma.plan.findMany({
    select: { id: true, name: true, tier: true },
  });
  const planMap = Object.fromEntries(plans.map((p: { id: string; name: string; tier: string }) => [p.id, p]));

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
    calcsByDay: calcsByDay.map((r: { date: string; count: bigint }) => ({
      date: r.date,
      count: Number(r.count),
    })),
  });
}
