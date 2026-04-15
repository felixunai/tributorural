"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { RhCltForm } from "@/components/calculadora/rh/RhCltForm";
import { RhCltResult } from "@/components/calculadora/rh/RhCltResult";
import { SaveCalculationModal } from "@/components/shared/SaveCalculationModal";
import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import type { RhCltResult as Result } from "@/lib/tax/rhClt";

export default function CalculadoraRhPage() {
  const { data: session } = useSession();
  const [result, setResult] = useState<Result | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [saveOpen, setSaveOpen] = useState(false);

  async function handleSave(title: string) {
    if (!result) return;

    const payload = {
      type: "RH_CLT",
      title: title || `CLT — R$ ${result.grossSalary.toFixed(2)}`,
      grossSalary: result.grossSalary,
      inssPatronal: result.inssPatronal,
      fgts: result.fgts,
      decimoTerceiro: result.decimoTerceiro,
      ferias: result.feriasComUmTerco,
      ratFap: result.ratFap,
      sistemaS: result.sistemaS,
      totalCost: result.totalMonthlyCost,
      ratFapPercent: snapshot.ratFapRate,
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
        <h1 className="text-2xl font-bold">Calculadora de Custo CLT</h1>
        <p className="text-muted-foreground mt-1">
          Descubra o custo real de contratar um funcionário com todos os encargos trabalhistas.
        </p>
      </div>

      <SubscriptionGate requiredPlan="PRO" featureName="Calculadora CLT">
        <RhCltForm onResult={(r, s) => { setResult(r); setSnapshot(s); }} />

        {result && (
          <>
            <RhCltResult
              result={result}
              onSave={() => setSaveOpen(true)}
              canSave={["PRO", "ENTERPRISE"].includes(session?.user.planTier ?? "")}
            />

            <SaveCalculationModal
              open={saveOpen}
              onOpenChange={setSaveOpen}
              defaultTitle={`CLT — R$ ${result.grossSalary.toFixed(2)}`}
              onSave={handleSave}
            />
          </>
        )}
      </SubscriptionGate>
    </div>
  );
}
