"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import Link from "next/link";
import { formatBRL, formatDate } from "@/lib/utils";
import { CalculationDetailModal } from "@/components/historico/CalculationDetailModal";

interface CalcItem {
  id: string;
  title: string | null;
  type: string;
  createdAt: string;
  productName: string | null;
  totalTaxAmount: number | null;
  totalCost: number | null;
}

interface RecentCalculationsSectionProps {
  items: CalcItem[];
}

const TYPE_LABEL: Record<string, string> = {
  RURAL_TAX: "Impostos Rurais",
  RH_CLT: "Custo CLT",
  RESCISAO: "Rescisão",
};

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  RURAL_TAX: "default",
  RH_CLT: "secondary",
  RESCISAO: "outline",
};

export function RecentCalculationsSection({ items }: RecentCalculationsSectionProps) {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (items.length === 0) return null;

  function getTitle(calc: CalcItem) {
    if (calc.title) return calc.title;
    if (calc.type === "RURAL_TAX") return calc.productName ?? "Cálculo rural";
    if (calc.type === "RH_CLT") return "Cálculo CLT";
    return "Rescisão CLT";
  }

  function getMainValue(calc: CalcItem) {
    if (calc.type === "RURAL_TAX" && calc.totalTaxAmount != null) return formatBRL(calc.totalTaxAmount);
    if ((calc.type === "RH_CLT" || calc.type === "RESCISAO") && calc.totalCost != null) return formatBRL(calc.totalCost);
    return "—";
  }

  function getValueLabel(calc: CalcItem) {
    if (calc.type === "RURAL_TAX") return "total impostos";
    if (calc.type === "RH_CLT") return "custo/mês";
    return "total bruto";
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cálculos recentes</CardTitle>
            <CardDescription>Seus últimos {items.length} cálculos salvos</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/historico">
              Ver todos
              <History className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {items.map((calc) => (
              <button
                key={calc.id}
                type="button"
                className="w-full flex items-center justify-between py-2.5 px-2 border-b last:border-0 rounded-lg hover:bg-muted/50 transition-colors text-left"
                onClick={() => setDetailId(calc.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{getTitle(calc)}</p>
                    <Badge
                      variant={TYPE_BADGE_VARIANT[calc.type] ?? "secondary"}
                      className="text-xs shrink-0 hidden sm:inline-flex"
                    >
                      {TYPE_LABEL[calc.type] ?? calc.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABEL[calc.type] ?? calc.type} · {formatDate(calc.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-destructive">{getMainValue(calc)}</p>
                  <p className="text-xs text-muted-foreground">{getValueLabel(calc)}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <CalculationDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
