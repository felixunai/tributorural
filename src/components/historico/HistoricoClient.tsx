"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate } from "@/lib/utils";
import { Download, Trash2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

interface Calculation {
  id: string;
  type: "RURAL_TAX" | "RH_CLT";
  title: string | null;
  saleValue: number | null;
  totalTaxAmount: number | null;
  grossSalary: number | null;
  totalCost: number | null;
  originState: string | null;
  destState: string | null;
  createdAt: string;
  product?: { name: string; ncmCode: string } | null;
}

export function HistoricoClient() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [exporting, setExporting] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
      });
      const res = await fetch(`/api/calculations?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/calculations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Cálculo removido");
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
      });
      const res = await fetch(`/api/export/csv?${params}`);
      if (!res.ok) {
        toast.error("Erro ao exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tributo-rural-historico-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const canExportCsv = ["PRO", "ENTERPRISE"].includes(session?.user.planTier ?? "");
  const canExportPdf = session?.user.planTier === "ENTERPRISE";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "ALL"); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="RURAL_TAX">Impostos Rurais</SelectItem>
            <SelectItem value="RH_CLT">Custo CLT</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {canExportCsv && (
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar CSV"}
            </Button>
          )}
          {canExportPdf && (
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-lg font-medium">Nenhum cálculo salvo ainda</p>
            <p className="text-sm mt-1">Use as calculadoras e salve seus resultados para vê-los aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {item.title ??
                          (item.type === "RURAL_TAX"
                            ? item.product?.name ?? "Cálculo rural"
                            : "Cálculo CLT")}
                      </p>
                      <Badge
                        variant={item.type === "RURAL_TAX" ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {item.type === "RURAL_TAX" ? "Impostos Rurais" : "Custo CLT"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(item.createdAt)}
                      {item.type === "RURAL_TAX" && item.originState && item.destState && (
                        <> • {item.originState} → {item.destState}</>
                      )}
                      {item.type === "RH_CLT" && item.grossSalary && (
                        <> • Salário: {formatBRL(Number(item.grossSalary))}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">
                        {item.type === "RURAL_TAX" && item.totalTaxAmount
                          ? formatBRL(Number(item.totalTaxAmount))
                          : item.type === "RH_CLT" && item.totalCost
                            ? formatBRL(Number(item.totalCost))
                            : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === "RURAL_TAX" ? "total impostos" : "custo/mês"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
