import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Planos" };

export default async function AdminPlanosPage() {
  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos de Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Configure os IDs do Stripe no arquivo .env para ativar os pagamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <Badge variant={plan.tier === "FREE" ? "secondary" : "default"}>
                  {plan.tier}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensal</span>
                  <span className="font-medium">
                    {plan.priceMonthly.toString() === "0" ? "Grátis" : formatBRL(Number(plan.priceMonthly))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anual</span>
                  <span className="font-medium">
                    {plan.priceYearly.toString() === "0" ? "Grátis" : formatBRL(Number(plan.priceYearly))}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cálculos/mês</span>
                  <span>{plan.maxCalculationsMonth === -1 ? "Ilimitado" : plan.maxCalculationsMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calculadora RH</span>
                  <span>{plan.canAccessRhCalc ? "✓" : "✗"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Histórico</span>
                  <span>
                    {plan.historyRetentionDays === 0
                      ? "✗"
                      : plan.historyRetentionDays === -1
                        ? "Completo"
                        : `${plan.historyRetentionDays} dias`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Export CSV</span>
                  <span>{plan.canExportCsv ? "✓" : "✗"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Export PDF</span>
                  <span>{plan.canExportPdf ? "✓" : "✗"}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                <p className="text-xs text-muted-foreground">Stripe Price IDs:</p>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
                  Mensal: {plan.stripePriceIdMonthly || "—"}
                </p>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
                  Anual: {plan.stripePriceIdYearly || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
