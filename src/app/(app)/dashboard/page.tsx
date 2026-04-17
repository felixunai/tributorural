export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calculator, Users, TrendingUp, ArrowRight, FileX2, BarChart3 } from "lucide-react";
import { DashboardCharts } from "@/components/charts/DashboardCharts";
import { RecentCalculationsSection } from "@/components/dashboard/RecentCalculationsSection";
import { CommodityTicker, CommodityTickerLocked } from "@/components/dashboard/CommodityTicker";
import { UpgradeSuccessRefresher } from "@/components/dashboard/UpgradeSuccessRefresher";
import { format } from "date-fns";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalcs, recentCalcs, calcsByType, last30Calcs, subscription] = await Promise.all([
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
    prisma.subscription.findUnique({
      where: { userId },
      select: { plan: { select: { tier: true } } },
    }),
  ]);

  // Group last 30 days by date in JS (avoids $queryRaw BigInt serialization issue)
  const dayMap: Record<string, number> = {};
  for (const calc of last30Calcs) {
    const key = format(calc.createdAt, "yyyy-MM-dd");
    dayMap[key] = (dayMap[key] ?? 0) + 1;
  }
  const calcsByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const ruralCount     = calcsByType.find((c) => c.type === "RURAL_TAX")?._count ?? 0;
  const rhCount        = calcsByType.find((c) => c.type === "RH_CLT")?._count ?? 0;
  const rescisaoCount  = calcsByType.find((c) => (c.type as string) === "RESCISAO")?._count ?? 0;

  // Always use DB planTier — JWT may be stale after upgrade
  const planTier =
    session!.user.role === "ADMIN" ? "ENTERPRISE" : (subscription?.plan.tier ?? "FREE");

  const planLabels: Record<string, string> = {
    FREE: "Gratuito",
    PRO: "Profissional",
    ENTERPRISE: "Profissional",
  };
  const planLabel = planLabels[planTier];

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

  const isPro = ["PRO", "ENTERPRISE"].includes(planTier);

  return (
    <div className="space-y-6">
      <Suspense><UpgradeSuccessRefresher /></Suspense>
      {/* Commodity ticker */}
      {isPro ? <CommodityTicker /> : <CommodityTickerLocked />}

      <div>
        <h1 className="text-2xl font-bold">
          Olá, {session!.user.name?.split(" ")[0] ?? "usuário"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo da sua atividade no Tributo Rural.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
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
                <p className="text-sm text-muted-foreground">Custo CLT</p>
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
                <p className="text-sm text-muted-foreground">Rescisões</p>
                <p className="text-3xl font-bold mt-1">{rescisaoCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <FileX2 className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="text-xl font-bold mt-1">{planLabel}</p>
                {planTier === "FREE" && (
                  <Link href="/pricing" className="text-xs text-primary hover:underline mt-0.5 block">
                    Fazer upgrade →
                  </Link>
                )}
              </div>
              <Badge
                variant={planTier === "FREE" ? "secondary" : "default"}
                className="text-xs"
              >
                {planTier === "FREE" ? "FREE" : "PRO"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts — only for PRO (FREE can't save, so charts are always empty) */}
      {isPro && (
        <DashboardCharts
          calcsByDay={calcsByDay}
          calcsByType={{ ruralCount, rhCount, rescisaoCount }}
        />
      )}

      {/* Quick access */}
      {isPro ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Impostos Rurais
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

          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-green-600" />
                Custo CLT
              </CardTitle>
              <CardDescription>
                Descubra o custo real de contratar um funcionário com todos os encargos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="border-green-500 text-green-700 hover:bg-green-50">
                <Link href="/calculadora-rh">
                  Calcular agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileX2 className="h-5 w-5 text-orange-600" />
                Rescisão CLT
              </CardTitle>
              <CardDescription>
                Calcule todos os valores devidos ao funcionário no momento do desligamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="border-orange-500 text-orange-700 hover:bg-orange-50">
                <Link href="/calculadora-rescisao">
                  Calcular agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* FREE plan — only show the available calculator */
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
                  Calcular agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground">Desbloqueie mais funcionalidades</CardTitle>
              <CardDescription>
                Calculadora CLT, Rescisão, histórico completo, exportação e cotações de commodities B3/CBOT.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/pricing">Ver plano PRO →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent calculations */}
      <RecentCalculationsSection items={serializedCalcs} />
    </div>
  );
}
