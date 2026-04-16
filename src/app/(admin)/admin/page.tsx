export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Calculator, TrendingUp } from "lucide-react";
import { AdminCharts } from "@/components/admin/AdminCharts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Dashboard" };

export default async function AdminDashboardPage() {
  const [totalUsers, activeSubscriptions, totalCalcs, subscriptionsByPlan, calcsByDay] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.calculation.count(),
      prisma.subscription.groupBy({
        by: ["planId"],
        _count: true,
        where: { status: "ACTIVE" },
      }),
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(created_at)::text as date, COUNT(*)::bigint as count
        FROM calculations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

  const plans = await prisma.plan.findMany({ select: { id: true, name: true, tier: true } });
  const planMap = Object.fromEntries(plans.map((p: { id: string; name: string; tier: string }) => [p.id, p]));

  const pieData = subscriptionsByPlan.map((s: { planId: string; _count: number }) => ({
    name: planMap[s.planId]?.name ?? s.planId,
    value: s._count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1">Visão geral da plataforma Tributo Rural.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de usuários</p>
                <p className="text-3xl font-bold mt-1">{totalUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas ativas</p>
                <p className="text-3xl font-bold mt-1">{activeSubscriptions}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de cálculos</p>
                <p className="text-3xl font-bold mt-1">{totalCalcs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Calculator className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa conversão</p>
                <p className="text-3xl font-bold mt-1">
                  {totalUsers > 0
                    ? `${((activeSubscriptions / totalUsers) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminCharts
        calcsByDay={calcsByDay.map((r: { date: string; count: bigint }) => ({ date: r.date, count: Number(r.count) }))}
        pieData={pieData}
      />
    </div>
  );
}
