"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPercent } from "@/lib/utils";
import { TrendingDown, Save } from "lucide-react";
import type { RuralTaxResult as Result } from "@/lib/tax/ruralTax";
import { RuralTaxPieChart } from "./RuralTaxPieChart";

interface RuralTaxResultProps {
  result: Result;
  snapshot: Record<string, unknown>;
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
}

export function RuralTaxResult({ result, snapshot, onSave, isSaving, canSave = true }: RuralTaxResultProps) {
  const rows = [
    { label: "ICMS Interestadual", amount: result.icmsAmount, rate: snapshot.icmsRate as number, color: "#3b82f6" },
    { label: "PIS", amount: result.pisAmount, rate: snapshot.pisRate as number, color: "#10b981" },
    { label: "COFINS", amount: result.cofinsAmount, rate: snapshot.cofinsRate as number, color: "#f59e0b" },
    { label: "FUNRURAL", amount: result.funruralAmount, rate: snapshot.funruralRate as number, color: "#ef4444" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Valor de venda</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5">{formatBRL(result.saleValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Total de impostos
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-destructive">
              {formatBRL(result.totalTax)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Carga tributária</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-orange-600">
              {formatPercent(result.effectiveRate)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Detalhamento dos impostos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-sm truncate">{row.label}</span>
                    <Badge variant="outline" className="text-xs shrink-0 px-1.5 py-0">
                      {formatPercent(row.rate)}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatBRL(row.amount)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm text-destructive">{formatBRL(result.totalTax)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Valor líquido</span>
                <span className="font-medium">{formatBRL(result.saleValue - result.totalTax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <RuralTaxPieChart breakdown={result.breakdown} totalTax={result.totalTax} />
      </div>

      {canSave && onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving} variant="outline" className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar este cálculo"}
          </Button>
        </div>
      )}
    </div>
  );
}
