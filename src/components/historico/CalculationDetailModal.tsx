"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { calculateRuralTax } from "@/lib/tax/ruralTax";
import { calculateRhClt } from "@/lib/tax/rhClt";
import { calcRescisao } from "@/lib/tax/rescisao";
import { RuralTaxResult } from "@/components/calculadora/rural/RuralTaxResult";
import { RhCltResult } from "@/components/calculadora/rh/RhCltResult";
import { RescisaoResult } from "@/components/calculadora/rescisao/RescisaoResult";

interface CalculationDetailModalProps {
  id: string | null;
  onClose: () => void;
}

interface RawCalc {
  id: string;
  type: "RURAL_TAX" | "RH_CLT" | "RESCISAO";
  title: string | null;
  createdAt: string;
  // Rural
  saleValue?: string | null;
  // CLT
  grossSalary?: string | null;
  ratFapPercent?: string | null;
  // Rescisão
  tipoRescisao?: string | null;
  admissionDate?: string | null;
  terminationDate?: string | null;
  // Snapshot
  ratesSnapshot: Record<string, unknown>;
}

const TYPE_LABELS: Record<string, string> = {
  RURAL_TAX: "Impostos Rurais",
  RH_CLT: "Custo CLT",
  RESCISAO: "Rescisão CLT",
};

const TYPE_COLORS: Record<string, string> = {
  RURAL_TAX: "default",
  RH_CLT: "secondary",
  RESCISAO: "outline",
};

export function CalculationDetailModal({ id, onClose }: CalculationDetailModalProps) {
  const [calc, setCalc] = useState<RawCalc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setCalc(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/calculations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar cálculo");
        return r.json();
      })
      .then(setCalc)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function renderResult() {
    if (!calc) return null;
    const snap = calc.ratesSnapshot as Record<string, unknown>;

    if (calc.type === "RURAL_TAX") {
      const stored = snap.result as Parameters<typeof RuralTaxResult>[0]["result"] | undefined;
      const result = stored ?? calculateRuralTax({
        saleValue: Number(calc.saleValue),
        icmsRate: Number(snap.icmsRate ?? 0),
        icmsRegime: (snap.icmsRegime as "normal" | "diferido" | "isento") ?? "normal",
        pisRate: Number(snap.pisRate ?? 0),
        cofinsRate: Number(snap.cofinsRate ?? 0),
        funruralRate: Number(snap.funruralRate ?? 0),
        regimeVendedor: (snap.regimeVendedor as "produtor-pf" | "lucro-presumido" | "lucro-real" | "simples-nacional") ?? "produtor-pf",
      });
      return (
        <RuralTaxResult
          result={result}
          snapshot={snap}
          canSave={false}
        />
      );
    }

    if (calc.type === "RH_CLT") {
      // Use stored result if available (ensures displayed value matches what was saved)
      const stored = snap.result as Parameters<typeof RhCltResult>[0]["result"] | undefined;
      const result = stored ?? calculateRhClt({
        grossSalary: Number(calc.grossSalary ?? snap.grossSalary),
        ratFapRate: Number(calc.ratFapPercent ?? snap.ratFapRate ?? 0.01),
      });
      return <RhCltResult result={result} canSave={false} />;
    }

    if (calc.type === "RESCISAO") {
      // Use stored result if available (ensures displayed value matches what was saved)
      const stored = snap.result as Parameters<typeof RescisaoResult>[0]["result"] | undefined;
      const result = stored ?? calcRescisao({
        grossSalary: Number(calc.grossSalary ?? snap.grossSalary),
        admissionDate: String(calc.admissionDate ?? snap.admissionDate ?? ""),
        terminationDate: String(calc.terminationDate ?? snap.terminationDate ?? ""),
        tipoRescisao: (calc.tipoRescisao ?? snap.tipoRescisao ?? "SEM_JUSTA_CAUSA") as Parameters<typeof calcRescisao>[0]["tipoRescisao"],
        avisoPrevioTrabalhado: Boolean(snap.avisoPrevioTrabalhado),
        feriasVencidasPeriodos: Number(snap.feriasVencidasPeriodos ?? 0),
        fgtsBalance: snap.fgtsBalance != null ? Number(snap.fgtsBalance) : undefined,
      });
      return <RescisaoResult result={result} canSave={false} />;
    }

    return null;
  }

  return (
    <Dialog open={!!id} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {calc ? (
              <>
                <span>{calc.title ?? TYPE_LABELS[calc.type]}</span>
                <Badge variant={TYPE_COLORS[calc.type] as "default" | "secondary" | "outline"} className="text-xs">
                  {TYPE_LABELS[calc.type]}
                </Badge>
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {formatDate(calc.createdAt)}
                </span>
              </>
            ) : (
              <Skeleton className="h-5 w-48" />
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}

        {!loading && !error && calc && (
          <div className="mt-2">
            {renderResult()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
