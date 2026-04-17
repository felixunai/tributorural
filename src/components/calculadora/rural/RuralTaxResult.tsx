"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPercent } from "@/lib/utils";
import { TrendingDown, Save, AlertTriangle, Info } from "lucide-react";
import type { RuralTaxResult as Result } from "@/lib/tax/ruralTax";
import { RuralTaxPieChart } from "./RuralTaxPieChart";

const REGIME_LABELS: Record<string, string> = {
  "produtor-pf":       "Produtor Rural PF",
  "produtor-pj":       "Produtor Rural PJ",
  "empresa-presumido": "Empresa — Lucro Presumido",
  "empresa-real":      "Empresa — Lucro Real",
};

const ICMS_REGIME_LABELS: Record<string, string> = {
  normal:   "Normal",
  diferido: "Diferido",
  isento:   "Isento",
};

interface RuralTaxResultProps {
  result: Result;
  snapshot: Record<string, unknown>;
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
}

export function RuralTaxResult({ result, snapshot, onSave, isSaving, canSave = true }: RuralTaxResultProps) {
  const rows = [
    {
      label: "ICMS Interestadual",
      amount: result.icmsAmount,
      rate: result.icmsRateApplied,
      color: "#3b82f6",
      note: result.icmsRegime !== "normal" ? ICMS_REGIME_LABELS[result.icmsRegime] : null,
    },
    { label: "PIS",      amount: result.pisAmount,      rate: result.pisRateApplied,      color: "#10b981", note: null },
    { label: "COFINS",   amount: result.cofinsAmount,   rate: result.cofinsRateApplied,   color: "#f59e0b", note: null },
    { label: "FUNRURAL", amount: result.funruralAmount, rate: result.funruralRateApplied, color: "#ef4444", note: null },
  ];

  const warnings = result.observations?.filter((o) => o.type === "warning") ?? [];
  const infos    = result.observations?.filter((o) => o.type === "info")    ?? [];

  return (
    <div className="space-y-4">
      {/* Regime badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {REGIME_LABELS[result.regimeVendedor] ?? result.regimeVendedor}
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs ${result.icmsRegime !== "normal" ? "border-amber-400 text-amber-700 bg-amber-50" : ""}`}
        >
          ICMS: {ICMS_REGIME_LABELS[result.icmsRegime]}
        </Badge>
      </div>

      {/* KPI Cards */}
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
                    {row.note && (
                      <Badge className="text-xs shrink-0 px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300">
                        {row.note}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatBRL(row.amount)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-bold">
                <span className="text-sm">Total impostos</span>
                <span className="text-sm text-destructive">{formatBRL(result.totalTax)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Valor líquido estimado</span>
                <span className="font-medium">{formatBRL(result.saleValue - result.totalTax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <RuralTaxPieChart breakdown={result.breakdown} totalTax={result.totalTax} />
      </div>

      {/* Observações */}
      {(warnings.length > 0 || infos.length > 0) && (
        <div className="space-y-2">
          {warnings.map((obs, i) => (
            <div key={i} className="flex gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200">{obs.text}</p>
            </div>
          ))}
          {infos.map((obs, i) => (
            <div key={i} className="flex gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-sm">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-blue-800 dark:text-blue-200">{obs.text}</p>
            </div>
          ))}
        </div>
      )}

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
