"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/utils";
import { Save, TrendingDown, TrendingUp, Wallet, Clock } from "lucide-react";
import type { RescisaoResult as Result, TipoRescisao } from "@/lib/tax/rescisao";

const TIPO_LABELS: Record<TipoRescisao, string> = {
  SEM_JUSTA_CAUSA: "Dispensa sem justa causa",
  COM_JUSTA_CAUSA: "Dispensa com justa causa",
  PEDIDO_DEMISSAO: "Pedido de demissão",
  ACORDO_MUTUO: "Acordo mútuo",
};

const TIPO_COLORS: Record<TipoRescisao, string> = {
  SEM_JUSTA_CAUSA: "bg-red-100 text-red-700 border-red-200",
  COM_JUSTA_CAUSA: "bg-orange-100 text-orange-700 border-orange-200",
  PEDIDO_DEMISSAO: "bg-blue-100 text-blue-700 border-blue-200",
  ACORDO_MUTUO: "bg-purple-100 text-purple-700 border-purple-200",
};

interface RescisaoResultProps {
  result: Result;
  onSave?: () => void;
  canSave?: boolean;
}

export function RescisaoResult({ result, onSave, canSave = true }: RescisaoResultProps) {
  const earnings = result.items.filter((i) => i.kind === "earning");
  const deductions = result.items.filter((i) => i.kind === "deduction");

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${TIPO_COLORS[result.tipoRescisao]} border text-xs`}>
          {TIPO_LABELS[result.tipoRescisao]}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {result.anosCompletos} ano{result.anosCompletos !== 1 ? "s" : ""} de serviço •
          aviso prévio: {result.diasAvisoPrevio} dias
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total bruto (empregador paga)</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-orange-700">
              {formatBRL(result.totalBruto)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Descontos (INSS + IRRF)</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-destructive">
              {formatBRL(result.totalDescontos)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Líquido (funcionário recebe)</p>
            <p className="text-xl sm:text-2xl font-bold mt-0.5 text-green-700">
              {formatBRL(result.totalLiquido)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Verbas rescisórias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnings.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0 text-green-700">
                    {formatBRL(item.amount)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-bold">
                <span className="text-sm">Total bruto</span>
                <span className="text-orange-700">{formatBRL(result.totalBruto)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deductions + summary */}
        <div className="space-y-4">
          {deductions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Descontos do funcionário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deductions.map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <span className="text-sm font-semibold shrink-0 text-destructive">
                        {formatBRL(Math.abs(item.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between font-bold">
                    <span className="text-sm">Total descontos</span>
                    <span className="text-destructive">{formatBRL(result.totalDescontos)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-green-700" />
                <p className="text-sm font-semibold">Resumo final</p>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salário base</span>
                  <span>{formatBRL(result.grossSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total bruto</span>
                  <span className="font-medium">{formatBRL(result.totalBruto)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Descontos</span>
                  <span>− {formatBRL(result.totalDescontos)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-700 border-t pt-2 mt-2">
                  <span>Líquido a pagar</span>
                  <span>{formatBRL(result.totalLiquido)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
