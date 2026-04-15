"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar cálculo</DialogTitle>
          <DialogDescription>
            Dê um nome para identificar este cálculo no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="calc-title">Nome do cálculo</Label>
          <Input
            id="calc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
