"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Quota {
  plan: string;
  canSave: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

interface SaveCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  onSave: (title: string) => Promise<void>;
}

export function SaveCalculationModal({
  open,
  onOpenChange,
  defaultTitle = "",
  onSave,
}: SaveCalculationModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setLoadingQuota(true);
    fetch("/api/calculations/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {})
      .finally(() => setLoadingQuota(false));
  }, [open, defaultTitle]);

  async function handleSave() {
    setLoading(true);
    try {
      await onSave(title.trim() || defaultTitle);
      toast.success("Cálculo salvo com sucesso!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar cálculo");
    } finally {
      setLoading(false);
    }
  }

  const canSave = quota?.canSave !== false;
  const isFree = quota?.plan === "FREE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar cálculo</DialogTitle>
          <DialogDescription>
            Dê um nome para identificar este cálculo no histórico.
          </DialogDescription>
        </DialogHeader>

        {/* Quota info */}
        {!loadingQuota && quota && (
          <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
            isFree
              ? "bg-destructive/5 border-destructive/20 text-destructive"
              : !canSave
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-muted/50 border-border text-muted-foreground"
          }`}>
            {(isFree || !canSave) ? (
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {isFree ? (
                <>
                  <p className="font-medium">Plano Gratuito não permite salvar cálculos.</p>
                  <Link href="/pricing" className="underline font-medium mt-0.5 inline-block">
                    Fazer upgrade para PRO →
                  </Link>
                </>
              ) : !canSave ? (
                <>
                  <p className="font-medium">Limite mensal atingido ({quota.used}/{quota.limit} salvamentos).</p>
                  <Link href="/pricing" className="underline font-medium mt-0.5 inline-block">
                    Upgrade para Empresarial para ilimitado →
                  </Link>
                </>
              ) : quota.limit !== null ? (
                <p>
                  {quota.remaining} de {quota.limit} salvamentos disponíveis este mês
                  <Badge variant="secondary" className="ml-2 text-xs">{quota.plan}</Badge>
                </p>
              ) : (
                <p>Salvamentos ilimitados <Badge variant="secondary" className="ml-2 text-xs">PRO</Badge></p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="calc-title">Nome do cálculo</Label>
          <Input
            id="calc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            onKeyDown={(e) => e.key === "Enter" && canSave && handleSave()}
            disabled={!canSave}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !canSave || loadingQuota}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
