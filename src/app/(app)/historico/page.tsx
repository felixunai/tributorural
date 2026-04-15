import { SubscriptionGate } from "@/components/shared/SubscriptionGate";
import { HistoricoClient } from "@/components/historico/HistoricoClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de Cálculos" };

export default function HistoricoPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Cálculos</h1>
        <p className="text-muted-foreground mt-1">
          Consulte e exporte seus cálculos salvos.
        </p>
      </div>

      <SubscriptionGate requiredPlan="PRO" featureName="Histórico de cálculos">
        <HistoricoClient />
      </SubscriptionGate>
    </div>
  );
}
