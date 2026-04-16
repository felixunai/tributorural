import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calculator, Users, TrendingUp, History, ArrowRight } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { DashboardCharts } from "@/components/charts/DashboardCharts";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalcs, recentCalcs, calcsByType, last30Calcs] = await Promise.all([
    prisma.calculation.count({ where: { userId } }),
    prisma.calculation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { product: { select: { name: true } } },
    }),
    prisma.calculation.groupBy({
      by: ["type"],
      where: { userId },
      _count: true,
    }),
    prisma.calculation.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Group last 30 days by date in JS (avoids $queryRaw BigInt serialization issue)
  const dayMap: Record<string, number> = {};
  for (const calc of last30Calcs) {
    const key = format(calc.createdAt, "yyyy-MM-dd");
    dayMap[key] = (dayMap[key] ?? 0) + 1;
  }
  const calcsByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const ruralCount = calcsByType.find((c) => c.type === "RURAL_TAX")?._count ?? 0;
  const rhCount = calcsByType.find((c) => c.type === "RH_CLT")?._count ?? 0;

  const planLabels: Record<string, string> = {
    FREE: "Gratuito",
    PRO: "Profissional",
    ENTERPRISE: "Empresarial",
  };
  const planLabel = planLabels[session!.user.planTier];

  // Serialize Prisma Decimal/Date types to plain values before rendering
  const serializedCalcs = recentCalcs.map((calc) => ({
    id: calc.id,
    title: calc.title ?? null,
    type: calc.type,
    createdAt: calc.createdAt.toISOString(),
    productName: calc.product?.name ?? null,
    totalTaxAmount: calc.totalTaxAmount ? Number(calc.totalTaxAmount) : null,
    totalCost: calc.totalCost ? Number(calc.totalCost) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {session!.user.name?.split(" ")[0] ?? "usuário"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo da sua atividade no Tributo Rural.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de cálculos</p>
                <p className="text-3xl font-bold mt-1">{totalCalcs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impostos Rurais</p>
                <p className="text-3xl font-bold mt-1">{ruralCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calculator className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cálculos CLT</p>
                <p className="text-3xl font-bold mt-1">{rhCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="text-xl font-bold mt-1">{planLabel}</p>
                {session!.user.planTier === "FREE" && (
                  <Link href="/pricing" className="text-xs text-primary hover:underline mt-0.5 block">
                    Fazer upgrade →
                  </Link>
                )}
              </div>
              <Badge
                variant={session!.user.planTier === "FREE" ? "secondary" : "default"}
                className="text-xs"
              >
                {session!.user.planTier}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts
        calcsByDay={calcsByDay}
        calcsByType={{ ruralCount, rhCount }}
      />

      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Calculadora de Impostos Rurais
            </CardTitle>
            <CardDescription>
              Calcule ICMS, PIS, COFINS e FUNRURAL para venda interestadual de produtos rurais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/calculadora-rural">
                Calcular agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={session!.user.planTier === "FREE" ? "opacity-70" : "border-green-500/30 bg-green-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              Calculadora CLT
              {session!.user.planTier === "FREE" && (
                <Badge variant="secondary" className="text-xs">PRO</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Descubra o custo real de contratar um funcionário com todos os encargos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {session!.user.planTier === "FREE" ? (
              <Button variant="outline" asChild>
                <Link href="/pricing">Upgrade para PRO</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="border-green-500 text-green-700 hover:bg-green-50">
                <Link href="/calculadora-rh">
                  Calcular agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent calculations */}
      {serializedCalcs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cálculos recentes</CardTitle>
              <CardDescription>Seus últimos 5 cálculos salvos</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/historico">
                Ver todos
                <History className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serializedCalcs.map((calc) => (
                <div
                  key={calc.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {calc.title ?? (calc.type === "RURAL_TAX" ? calc.productName : "Cálculo CLT")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calc.type === "RURAL_TAX" ? "Impostos Rurais" : "Custo CLT"} •{" "}
                      {formatDate(calc.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">
                      {calc.type === "RURAL_TAX" && calc.totalTaxAmount != null
                        ? formatBRL(calc.totalTaxAmount)
                        : calc.type === "RH_CLT" && calc.totalCost != null
                          ? formatBRL(calc.totalCost)
                          : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calc.type === "RURAL_TAX" ? "total impostos" : "custo total"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
