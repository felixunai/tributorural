"use client";

import { useState } from "react";
import { usePlanTier } from "@/components/providers/PlanProvider";
import { RescisaoForm } from "@/components/calculadora/rescisao/RescisaoForm";
import { RescisaoResult } from "@/components/calculadora/rescisao/RescisaoResult";
import { SaveCalculationModal } from "@/components/shared/SaveCalculationModal";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { formatBRL } from "@/lib/utils";
import type { RescisaoResult as Result } from "@/lib/tax/rescisao";

export default function CalculadoraRescisaoPage() {
  const planTier = usePlanTier();
  const [result, setResult] = useState<Result | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [saveOpen, setSaveOpen] = useState(false);

  async function handleSave(title: string) {
    if (!result) return;
    const payload = {
      type: "RESCISAO",
      title: title || `Rescisão — ${formatBRL(result.totalLiquido)}`,
      grossSalary: result.grossSalary,
      totalCost: result.totalLiquido,
      admissionDate: snapshot.admissionDate,
      terminationDate: snapshot.terminationDate,
      tipoRescisao: snapshot.tipoRescisao,
      ratesSnapshot: snapshot,
    };

    const res = await fetch("/api/calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao salvar");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calculadora de Rescisão</h1>
        <p className="text-muted-foreground mt-1">
          Calcule os valores devidos ao funcionário no momento do desligamento.
        </p>
      </div>

      <SubscriptionGate requiredPlan="PRO" featureName="Calculadora de Rescisão">
        <RescisaoForm onResult={(r, s) => { setResult(r); setSnapshot(s); }} />

        {result && (
          <>
            <RescisaoResult
              result={result}
              onSave={() => setSaveOpen(true)}
              canSave={["PRO", "ENTERPRISE"].includes(planTier)}
            />
            <SaveCalculationModal
              open={saveOpen}
              onOpenChange={setSaveOpen}
              defaultTitle={`Rescisão — ${formatBRL(result.totalLiquido)}`}
              onSave={handleSave}
            />
          </>
        )}
      </SubscriptionGate>
    </div>
  );
}
