"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { RuralTaxForm } from "@/components/calculadora/rural/RuralTaxForm";
import { RuralTaxResult } from "@/components/calculadora/rural/RuralTaxResult";
import { RuralCalcQuotaBanner } from "@/components/calculadora/rural/RuralCalcQuotaBanner";
import { SaveCalculationModal } from "@/components/shared/SaveCalculationModal";
import { toast } from "sonner";
import type { RuralTaxResult as Result } from "@/lib/tax/ruralTax";

export default function CalculadoraRuralPage() {
  const { data: session } = useSession();
  const [result, setResult] = useState<Result | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saveOpen, setSaveOpen] = useState(false);
  const refreshQuotaRef = useRef<() => void>(() => {});

  const handleResult = useCallback(
    (res: Result, snap: Record<string, unknown>, form: Record<string, unknown>) => {
      setResult(res);
      setSnapshot(snap);
      setFormData(form);
      // Refresh the quota banner after each successful calculation
      refreshQuotaRef.current();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  async function handleSave(title: string) {
    if (!result) return;

    const payload = {
      type: "RURAL_TAX",
      title: title || `${snapshot.productName} — ${formData.originState}→${formData.destState}`,
      productId: formData.productId,
      originState: formData.originState,
      destState: formData.destState,
      saleValue: result.saleValue,
      icmsAmount: result.icmsAmount,
      pisAmount: result.pisAmount,
      cofinsAmount: result.cofinsAmount,
      funruralAmount: result.funruralAmount,
      totalTaxAmount: result.totalTax,
      effectiveRate: result.effectiveRate,
      ratesSnapshot: { ...snapshot, result },
    };

    const res = await fetch("/api/calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erro ao salvar");
    }
  }

  const canSaveHistory = ["PRO", "ENTERPRISE"].includes(session?.user.planTier ?? "");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calculadora de Impostos Rurais</h1>
        <p className="text-muted-foreground mt-1">
          Calcule ICMS, PIS, COFINS e FUNRURAL para vendas interestaduais de produtos rurais.
        </p>
      </div>

      {/* Quota banner — only visible for FREE plan */}
      <RuralCalcQuotaBanner
        onRefreshRef={(fn) => { refreshQuotaRef.current = fn; }}
      />

      <RuralTaxForm onResult={handleResult} />

      {result && (
        <>
          <RuralTaxResult
            result={result}
            snapshot={snapshot}
            onSave={() => {
              if (!canSaveHistory) {
                toast.info("Faça upgrade para o plano PRO para salvar cálculos");
                return;
              }
              setSaveOpen(true);
            }}
            canSave={canSaveHistory}
          />

          <SaveCalculationModal
            open={saveOpen}
            onOpenChange={setSaveOpen}
            defaultTitle={`${snapshot.productName} — ${formData.originState}→${formData.destState}`}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
}
