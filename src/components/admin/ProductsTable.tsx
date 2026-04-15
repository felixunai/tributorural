"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { Search } from "lucide-react";
interface RuralProduct {
  id: string;
  name: string;
  ncmCode: string;
  description: string | null;
  pisRate: { toString(): string } | number;
  cofinsRate: { toString(): string } | number;
  category: string | null;
  isActive: boolean;
}

interface ProductsTableProps {
  products: RuralProduct[];
}

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ncmCode.includes(search) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p))
      );
      toast.success("Produto atualizado");
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, NCM ou categoria..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>PIS</TableHead>
              <TableHead>COFINS</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <p className="text-sm font-medium">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-64">
                      {product.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{product.ncmCode}</code>
                </TableCell>
                <TableCell>
                  {product.category && (
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{formatPercent(Number(product.pisRate))}</TableCell>
                <TableCell className="text-sm">{formatPercent(Number(product.cofinsRate))}</TableCell>
                <TableCell>
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={() => toggleActive(product.id, product.isActive)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
