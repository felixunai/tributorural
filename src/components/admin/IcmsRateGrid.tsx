"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

interface IcmsRateGridProps {
  rateMap: Record<string, Record<string, number>>;
}

export function IcmsRateGrid({ rateMap: initialMap }: IcmsRateGridProps) {
  const [rateMap, setRateMap] = useState(initialMap);
  const [editing, setEditing] = useState<{ origin: string; dest: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  function getRate(origin: string, dest: string): number {
    return rateMap[origin]?.[dest] ?? 0;
  }

  function startEdit(origin: string, dest: string) {
    const current = getRate(origin, dest);
    setEditing({ origin, dest });
    setEditValue((current * 100).toFixed(0));
  }

  async function saveRate() {
    if (!editing) return;
    const newRate = parseFloat(editValue) / 100;
    if (isNaN(newRate) || newRate < 0 || newRate > 1) {
      toast.error("Alíquota inválida (0-100)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/icms-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { originState: editing.origin, destinationState: editing.dest, rate: newRate },
        ]),
      });

      if (res.ok) {
        setRateMap((prev) => ({
          ...prev,
          [editing.origin]: { ...(prev[editing.origin] ?? {}), [editing.dest]: newRate },
        }));
        toast.success(`ICMS ${editing.origin}→${editing.dest} atualizado para ${(newRate * 100).toFixed(0)}%`);
      } else {
        toast.error("Erro ao salvar");
      }
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">7%</Badge>
        <span>→ SP/RJ de estados desenvolvidos</span>
        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">12%</Badge>
        <span>→ demais destinos / Norte-Nordeste</span>
      </div>

      <ScrollArea className="rounded-lg border" style={{ height: "70vh" }}>
        <div className="overflow-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                <th className="sticky left-0 bg-background z-20 px-3 py-2 border text-left font-semibold min-w-16">
                  Origem ↓ / Destino →
                </th>
                {STATES.map((dest) => (
                  <th key={dest} className="px-2 py-2 border font-semibold min-w-12 text-center">
                    {dest}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATES.map((origin) => (
                <tr key={origin} className="hover:bg-muted/30">
                  <td className="sticky left-0 bg-background z-10 px-3 py-1.5 border font-semibold">
                    {origin}
                  </td>
                  {STATES.map((dest) => {
                    if (origin === dest) {
                      return (
                        <td key={dest} className="px-2 py-1.5 border text-center bg-muted/50 text-muted-foreground">
                          —
                        </td>
                      );
                    }

                    const rate = getRate(origin, dest);
                    const isEditing = editing?.origin === origin && editing?.dest === dest;

                    return (
                      <td
                        key={dest}
                        className={cn(
                          "px-2 py-1.5 border text-center cursor-pointer transition-colors",
                          rate === 0.07
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700",
                          "hover:bg-primary/10"
                        )}
                        onClick={() => !isEditing && startEdit(origin, dest)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="w-10 border rounded px-1 text-foreground bg-background text-xs"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRate();
                                if (e.key === "Escape") setEditing(null);
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-5 px-1 text-xs"
                              onClick={saveRate}
                              disabled={saving}
                            >
                              ✓
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium">
                            {(rate * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Clique em qualquer célula para editar a alíquota. Pressione Enter para salvar ou Esc para cancelar.
      </p>
    </div>
  );
}
