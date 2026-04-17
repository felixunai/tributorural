export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { DEFAULT_INSS, DEFAULT_IRRF } from "@/lib/tax/taxConfig";
import { TaxBracketsEditor } from "@/components/admin/TaxBracketsEditor";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Tabelas Tributárias" };

export default async function TabelasTributariasPage() {
  const rows: any[] = await (prisma as any).taxBracket.findMany({
    orderBy: [{ type: "asc" }, { effectiveDate: "desc" }],
  });

  const activeInss = rows.find((r) => r.type === "INSS_EMPLOYEE" && r.isActive);
  const activeIrrf = rows.find((r) => r.type === "IRRF_MONTHLY" && r.isActive);

  const inssConfig = activeInss?.data ?? DEFAULT_INSS;
  const irrfConfig = activeIrrf?.data ?? DEFAULT_IRRF;

  const historyInss = rows.filter((r) => r.type === "INSS_EMPLOYEE" && !r.isActive);
  const historyIrrf = rows.filter((r) => r.type === "IRRF_MONTHLY" && !r.isActive);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Tabelas Tributárias</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as alíquotas de INSS e IRRF utilizadas nos cálculos. Quando publicada nova tabela
          oficial (Portaria MPS ou lei), crie uma nova versão aqui.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INSS */}
        <div className="border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base">INSS Empregado</h2>
              {activeInss ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vigente desde {format(new Date(activeInss.effectiveDate), "dd/MM/yyyy", { locale: ptBR })}
                  {activeInss.notes ? ` — ${activeInss.notes}` : ""}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">Usando valores padrão (sem registro no banco)</p>
              )}
            </div>
            <Badge variant="secondary">Tabela progressiva</Badge>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-1.5">Até (R$)</th>
                <th className="text-right pb-1.5">Alíquota</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inssConfig.brackets.map((b: any, i: number) => (
                <tr key={i}>
                  <td className="py-1.5">{b.upTo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 text-right font-mono">{(b.rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Teto máximo: <strong>R$ {inssConfig.ceiling.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          </p>

          <TaxBracketsEditor type="INSS_EMPLOYEE" current={inssConfig} activeId={activeInss?.id ?? null} />
        </div>

        {/* IRRF */}
        <div className="border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base">IRRF Mensal</h2>
              {activeIrrf ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vigente desde {format(new Date(activeIrrf.effectiveDate), "dd/MM/yyyy", { locale: ptBR })}
                  {activeIrrf.notes ? ` — ${activeIrrf.notes}` : ""}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">Usando valores padrão (sem registro no banco)</p>
              )}
            </div>
            <Badge variant="secondary">Progressiva + abatimento</Badge>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-1.5">Até (R$)</th>
                <th className="text-right pb-1.5">Alíq.</th>
                <th className="text-right pb-1.5">Parcela (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {irrfConfig.brackets.map((b: any, i: number) => (
                <tr key={i}>
                  <td className="py-1.5">{b.upTo === null ? "Acima" : b.upTo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 text-right font-mono">{(b.rate * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-mono">{b.deduction.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Isenção efetiva até{" "}
            <strong>R$ {irrfConfig.abatimentoLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            {" "}· Faseout até{" "}
            <strong>R$ {irrfConfig.abatimentoPhaseout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          </p>

          <TaxBracketsEditor type="IRRF_MONTHLY" current={irrfConfig} activeId={activeIrrf?.id ?? null} />
        </div>
      </div>

      {/* History */}
      {(historyInss.length > 0 || historyIrrf.length > 0) && (
        <div className="border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-base">Versões anteriores</h2>
          <div className="space-y-1.5">
            {[...historyInss, ...historyIrrf]
              .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {r.type === "INSS_EMPLOYEE" ? "INSS" : "IRRF"}
                    </Badge>
                    <span>{format(new Date(r.effectiveDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {r.notes && <span className="text-muted-foreground">{r.notes}</span>}
                  </div>
                  <TaxBracketsEditor type={r.type} current={r.data} activeId={null} restoreId={r.id} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
