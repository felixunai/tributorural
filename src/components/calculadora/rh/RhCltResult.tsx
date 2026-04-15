"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPercent } from "@/lib/utils";
import { Save } from "lucide-react";
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
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Salário bruto</p>
            <p className="text-2xl font-bold mt-1">{formatBRL(result.grossSalary)}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de encargos</p>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {formatBRL(result.totalEncargos)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Custo total ao empregador</p>
            <p className="text-2xl font-bold mt-1 text-green-700">
              {formatBRL(result.totalMonthlyCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              +{formatPercent(result.encargosPercentage)} sobre o salário
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento dos encargos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {encargos.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="text-sm">{row.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatPercent(row.rate)}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">{formatBRL(row.amount)}</span>
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
          <Button onClick={onSave} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Salvar este cálculo
          </Button>
        </div>
      )}
    </div>
  );
}
