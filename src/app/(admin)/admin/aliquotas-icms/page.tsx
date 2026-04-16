export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { IcmsRateGrid } from "@/components/admin/IcmsRateGrid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Alíquotas ICMS" };

export default async function AdminIcmsPage() {
  const rates = await prisma.icmsRate.findMany({
    orderBy: [{ originState: "asc" }, { destinationState: "asc" }],
  });

  // Build a map: origin -> destination -> rate
  const rateMap: Record<string, Record<string, number>> = {};
  for (const r of rates) {
    if (!rateMap[r.originState]) rateMap[r.originState] = {};
    rateMap[r.originState][r.destinationState] = Number(r.rate);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alíquotas ICMS Interestaduais</h1>
        <p className="text-muted-foreground mt-1">
          Tabela de alíquotas ICMS para operações entre estados (702 pares). Baseado na Resolução do Senado nº 22/1989.
        </p>
      </div>
      <IcmsRateGrid rateMap={rateMap} />
    </div>
  );
}
