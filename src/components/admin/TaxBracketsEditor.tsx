"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { InssConfig, IrrfConfig } from "@/lib/tax/taxConfig";

interface EditorProps {
  type: "INSS_EMPLOYEE" | "IRRF_MONTHLY";
  current: InssConfig | IrrfConfig;
  activeId: string | null;
  restoreId?: string;
}

export function TaxBracketsEditor({ type, current, activeId, restoreId }: EditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  // INSS state
  const initialInss = current as InssConfig;
  const [inssBrackets, setInssBrackets] = useState<any[]>(
    type === "INSS_EMPLOYEE" ? (initialInss.brackets ?? []) : []
  );
  const [ceiling, setCeiling] = useState(
    type === "INSS_EMPLOYEE" ? String(initialInss.ceiling ?? "") : ""
  );

  // IRRF state
  const initialIrrf = current as IrrfConfig;
  const [irrfBrackets, setIrrfBrackets] = useState<any[]>(
    type === "IRRF_MONTHLY" ? (initialIrrf.brackets ?? []) : []
  );
  const [abatimentoLimit, setAbatimentoLimit] = useState(
    type === "IRRF_MONTHLY" ? String(initialIrrf.abatimentoLimit ?? "") : ""
  );
  const [abatimentoPhaseout, setAbatimentoPhaseout] = useState(
    type === "IRRF_MONTHLY" ? String(initialIrrf.abatimentoPhaseout ?? "") : ""
  );

  async function handleRestore() {
    if (!restoreId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tax-brackets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: restoreId, isActive: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Versão restaurada com sucesso");
      router.refresh();
    } catch {
      toast.error("Erro ao restaurar versão");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let data: InssConfig | IrrfConfig;
      if (type === "INSS_EMPLOYEE") {
        data = {
          brackets: inssBrackets.map((b) => ({ upTo: Number(b.upTo), rate: Number(b.rate) })),
          ceiling: Number(ceiling),
        };
      } else {
        data = {
          brackets: irrfBrackets.map((b) => ({
            upTo: b.upTo === "" || b.upTo === null ? null : Number(b.upTo),
            rate: Number(b.rate),
            deduction: Number(b.deduction),
          })),
          abatimentoLimit: Number(abatimentoLimit),
          abatimentoPhaseout: Number(abatimentoPhaseout),
        };
      }
      const res = await fetch("/api/admin/tax-brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, effectiveDate, data, notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tabela atualizada com sucesso");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar tabela");
    } finally {
      setSaving(false);
    }
  }

  if (restoreId) {
    return (
      <Button size="sm" variant="ghost" onClick={handleRestore} disabled={saving} className="text-xs h-7 px-2">
        <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
      </Button>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        Criar nova versão
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <h3 className="font-medium text-sm">Nova versão — {type === "INSS_EMPLOYEE" ? "INSS Empregado" : "IRRF Mensal"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Vigência a partir de</label>
          <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Referência legal</label>
          <Input placeholder="Ex: Portaria MPS 1.284/2024" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      {type === "INSS_EMPLOYEE" && (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Até (R$)</span><span>Alíquota (%)</span><span />
            </div>
            {inssBrackets.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input className="h-8 text-sm" value={b.upTo} onChange={(e) => {
                  const n = [...inssBrackets]; n[i] = { ...n[i], upTo: e.target.value as any }; setInssBrackets(n);
                }} placeholder="Valor limite" />
                <Input className="h-8 text-sm" value={b.rate} onChange={(e) => {
                  const n = [...inssBrackets]; n[i] = { ...n[i], rate: e.target.value as any }; setInssBrackets(n);
                }} placeholder="Ex: 0.075" />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setInssBrackets(inssBrackets.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setInssBrackets([...inssBrackets, { upTo: "" as any, rate: "" as any }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar faixa
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Teto máximo (R$)</label>
            <Input className="h-8 text-sm" value={ceiling} onChange={(e) => setCeiling(e.target.value)} placeholder="Ex: 951.62" />
          </div>
        </>
      )}

      {type === "IRRF_MONTHLY" && (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Até (R$, vazio=∞)</span><span>Alíquota (%)</span><span>Parcela (R$)</span><span />
            </div>
            {irrfBrackets.map((b: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <Input className="h-8 text-sm" value={b.upTo ?? ""} onChange={(e) => {
                  const n = [...irrfBrackets]; n[i] = { ...n[i], upTo: e.target.value === "" ? null : e.target.value }; setIrrfBrackets(n);
                }} placeholder="Deixe vazio p/ última" />
                <Input className="h-8 text-sm" value={b.rate} onChange={(e) => {
                  const n = [...irrfBrackets]; n[i] = { ...n[i], rate: e.target.value as any }; setIrrfBrackets(n);
                }} placeholder="Ex: 0.075" />
                <Input className="h-8 text-sm" value={b.deduction} onChange={(e) => {
                  const n = [...irrfBrackets]; n[i] = { ...n[i], deduction: e.target.value as any }; setIrrfBrackets(n);
                }} placeholder="Ex: 211.80" />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setIrrfBrackets(irrfBrackets.filter((_: any, j: number) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIrrfBrackets([...irrfBrackets, { upTo: "" as any, rate: "" as any, deduction: "" as any }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar faixa
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Isenção efetiva até (R$)</label>
              <Input className="h-8 text-sm" value={abatimentoLimit} onChange={(e) => setAbatimentoLimit(e.target.value)} placeholder="Ex: 5000.00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Faseout até (R$)</label>
              <Input className="h-8 text-sm" value={abatimentoPhaseout} onChange={(e) => setAbatimentoPhaseout(e.target.value)} placeholder="Ex: 7000.00" />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar nova versão"}
        </Button>
      </div>
    </div>
  );
}
