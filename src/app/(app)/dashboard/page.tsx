export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calculator, Users, TrendingUp, ArrowRight, FileX2 } from "lucide-react";
import { DashboardCharts } from "@/components/charts/DashboardCharts";
import { RecentCalculationsSection } from "@/components/dashboard/RecentCalculationsSection";
import { CommodityTicker, CommodityTickerLocked } from "@/components/dashboard/CommodityTicker";
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

  const isPro = ["PRO", "ENTERPRISE"].includes(session!.user.planTier);

  return (
    <div className="space-y-6">
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

        {(() => {
          const cltLocked = session!.user.planTier === "FREE";
          return (
            <Card className={cltLocked ? "opacity-70" : "border-green-500/30 bg-green-500/5"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  Custo CLT
                  {cltLocked && <Badge variant="secondary" className="text-xs">PRO</Badge>}
                </CardTitle>
                <CardDescription>
                  Descubra o custo real de contratar um funcionário com todos os encargos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cltLocked ? (
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
          );
        })()}

        {(() => {
          const rescisaoLocked = session!.user.planTier !== "ENTERPRISE";
          return (
            <Card className={rescisaoLocked ? "opacity-70" : "border-orange-500/30 bg-orange-500/5"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileX2 className="h-5 w-5 text-orange-600" />
                  Rescisão CLT
                  {rescisaoLocked && <Badge variant="secondary" className="text-xs">ENTERPRISE</Badge>}
                </CardTitle>
                <CardDescription>
                  Calcule todos os valores devidos ao funcionário no momento do desligamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rescisaoLocked ? (
                  <Button variant="outline" asChild>
                    <Link href="/pricing">Upgrade para Empresarial</Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="border-orange-500 text-orange-700 hover:bg-orange-50">
                    <Link href="/calculadora-rescisao">
                      Calcular agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Recent calculations */}
      <RecentCalculationsSection items={serializedCalcs} />
    </div>
  );
}
