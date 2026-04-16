"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { RescisaoForm } from "@/components/calculadora/rescisao/RescisaoForm";
import { RescisaoResult } from "@/components/calculadora/rescisao/RescisaoResult";
import { SaveCalculationModal } from "@/components/shared/SaveCalculationModal";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import type { RescisaoResult as Result } from "@/lib/tax/rescisao";

export default function CalculadoraRescisaoPage() {
  const { data: session } = useSession();
  const [result, setResult] = useState<Result | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [saveOpen, setSaveOpen] = useState(false);

  async function handleSave(title: string) {
    if (!result) return;
    const payload = {
      type: "RESCISAO",
      title: title || `Rescisão — R$ ${result.totalLiquido.toFixed(2)}`,
      grossSalary: result.grossSalary,
      totalCost: result.totalBruto,
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

      <SubscriptionGate requiredPlan="ENTERPRISE" featureName="Calculadora de Rescisão">
        <RescisaoForm onResult={(r, s) => { setResult(r); setSnapshot(s); }} />

        {result && (
          <>
            <RescisaoResult
              result={result}
              onSave={() => setSaveOpen(true)}
              canSave={session?.user.planTier === "ENTERPRISE"}
            />
            <SaveCalculationModal
              open={saveOpen}
              onOpenChange={setSaveOpen}
              defaultTitle={`Rescisão — R$ ${result.totalLiquido.toFixed(2)}`}
              onSave={handleSave}
            />
          </>
        )}
      </SubscriptionGate>
    </div>
  );
}
