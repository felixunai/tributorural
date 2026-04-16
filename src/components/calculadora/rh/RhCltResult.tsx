"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPercent } from "@/lib/utils";
import { Save, TrendingDown, Wallet } from "lucide-react";
import type { RhCltResult as Result } from "@/lib/tax/rhClt";
import { RhCltBarChart } from "./RhCltBarChart";

interface RhCltResultProps {
  result: Result;
  onSave?: () => void;
  canSave?: boolean;
}

export function RhCltResult({ result, onSave, canSave = true }: RhCltResultProps) {
  const encargos = result.breakdown.slice(1); // exclude salário

  return (
    <div className="space-y-4">
      {/* Summary — employer view */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Salário bruto</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5">{formatBRL(result.grossSalary)}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total de encargos</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-destructive">
              {formatBRL(result.totalEncargos)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Custo total/mês</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-green-700">
              {formatBRL(result.totalMonthlyCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              +{formatPercent(result.encargosPercentage)} sobre o salário
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee net salary card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-blue-600" />
                Salário líquido do funcionário
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O que o colaborador recebe no bolso após descontos obrigatórios
              </p>
            </div>
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">INSS empregado</p>
                <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {formatBRL(result.inssEmpregado)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">IRRF</p>
                <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {formatBRL(result.irrfEmpregado)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Líquido</p>
                <p className="text-lg font-bold text-blue-700">{formatBRL(result.salarioLiquido)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento dos encargos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {encargos.map((row) => (
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

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de encargos</span>
                  <span className="font-semibold text-destructive">{formatBRL(result.totalEncargos)}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span>Custo total/mês</span>
                  <span className="text-green-700">{formatBRL(result.totalMonthlyCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Custo total/ano</span>
                  <span className="font-medium">{formatBRL(result.totalMonthlyCost * 12)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <RhCltBarChart breakdown={result.breakdown} />
      </div>

      {canSave && onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} variant="outline" className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Salvar este cálculo
          </Button>
        </div>
      )}
    </div>
  );
}
