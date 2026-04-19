"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate } from "@/lib/utils";
import { FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Calculator, Users, FileX2, Eye } from "lucide-react";
import { toast } from "sonner";
import { CalculationDetailModal } from "./CalculationDetailModal";

interface Calculation {
  id: string;
  type: "RURAL_TAX" | "RH_CLT" | "RESCISAO";
  title: string | null;
  saleValue: string | null;
  totalTaxAmount: string | null;
  grossSalary: string | null;
  totalCost: string | null;
  originState: string | null;
  destState: string | null;
  createdAt: string;
  product?: { name: string; ncmCode: string } | null;
}

const TYPE_ICON = {
  RURAL_TAX: <Calculator className="h-4 w-4 text-primary" />,
  RH_CLT: <Users className="h-4 w-4 text-green-600" />,
  RESCISAO: <FileX2 className="h-4 w-4 text-orange-600" />,
};

const TYPE_LABEL = {
  RURAL_TAX: "Impostos",
  RH_CLT: "CLT",
  RESCISAO: "Rescisão",
};

const TYPE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  RURAL_TAX: "default",
  RH_CLT: "secondary",
  RESCISAO: "outline",
};

export function HistoricoClient() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const res = await fetch(`/api/calculations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
      toast.success("Cálculo removido");
    }
  }

  async function handleExportExcel(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setExportingId(id);
    try {
      const res = await fetch(`/api/export/excel/${id}`);
      if (!res.ok) { toast.error("Erro ao exportar"); return; }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? `tributo-rural-${id}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel gerado com sucesso");
    } finally {
      setExportingId(null);
    }
  }

  function getMainValue(item: Calculation) {
    if (item.type === "RURAL_TAX" && item.totalTaxAmount) return formatBRL(Number(item.totalTaxAmount));
    if (item.type === "RH_CLT" && item.totalCost) return formatBRL(Number(item.totalCost));
    if (item.type === "RESCISAO" && item.totalCost) return formatBRL(Number(item.totalCost));
    return "—";
  }

  function getValueLabel(item: Calculation) {
    if (item.type === "RURAL_TAX") return "impostos";
    if (item.type === "RH_CLT") return "custo/mês";
    if (item.type === "RESCISAO") return "total bruto";
    return "";
  }

  function getSubtitle(item: Calculation) {
    if (item.type === "RURAL_TAX" && item.originState && item.destState)
      return `${item.originState}→${item.destState}`;
    if ((item.type === "RH_CLT" || item.type === "RESCISAO") && item.grossSalary)
      return `Sal. ${formatBRL(Number(item.grossSalary))}`;
    return null;
  }

  const canExport = ["PRO", "ENTERPRISE"].includes(session?.user.planTier ?? "");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "ALL"); setPage(1); }}>
          <SelectTrigger className="sm:w-52">
            <span className="flex-1 text-left text-sm">
              {typeFilter === "ALL" ? "Todos os tipos" : typeFilter === "RURAL_TAX" ? "Impostos Rurais" : typeFilter === "RH_CLT" ? "Custo CLT" : "Rescisão CLT"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="RURAL_TAX">Impostos Rurais</SelectItem>
            <SelectItem value="RH_CLT">Custo CLT</SelectItem>
            <SelectItem value="RESCISAO">Rescisão CLT</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground self-center">{total} cálculo{total !== 1 ? "s" : ""}</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
            <Card
              key={item.id}
              className="cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
              onClick={() => setDetailId(item.id)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Icon */}
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {TYPE_ICON[item.type]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {item.title ?? (item.type === "RURAL_TAX" ? item.product?.name ?? "Cálculo rural" : item.type === "RH_CLT" ? "Cálculo CLT" : "Rescisão CLT")}
                      </p>
                      <Badge variant={TYPE_BADGE[item.type]} className="text-xs shrink-0">
                        {TYPE_LABEL[item.type]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(item.createdAt)}
                      {getSubtitle(item) && <> · {getSubtitle(item)}</>}
                    </p>
                    {/* Value on mobile */}
                    <p className="sm:hidden text-sm font-bold text-destructive mt-1">
                      {getMainValue(item)}
                    </p>
                  </div>

                  {/* Value — desktop */}
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-sm font-bold text-destructive">{getMainValue(item)}</p>
                    <p className="text-xs text-muted-foreground">{getValueLabel(item)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setDetailId(item.id); }}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canExport && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-green-600 h-8 w-8"
                        onClick={(e) => handleExportExcel(e, item.id)}
                        disabled={exportingId === item.id}
                        title="Exportar todos os cálculos deste item em Excel"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Excluir"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail modal */}
      <CalculationDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
