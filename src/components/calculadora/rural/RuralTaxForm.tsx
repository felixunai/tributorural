"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StateSelector } from "@/components/shared/StateSelector";
import { Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";
import type { RuralTaxResult } from "@/lib/tax/ruralTax";

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  originState: z.string().min(1, "Selecione o estado de origem"),
  destState: z.string().min(1, "Selecione o estado de destino"),
  saleValue: z.string().min(1, "Informe o valor de venda"),
  funruralType: z.enum(["funrural-pf", "funrural-pj"]),
});

type FormData = z.infer<typeof schema>;

interface Product {
  id: string;
  name: string;
  ncmCode: string;
  category: string | null;
}

interface RuralTaxFormProps {
  onResult: (result: RuralTaxResult, snapshot: Record<string, unknown>, formData: FormData) => void;
}

export function RuralTaxForm({ onResult }: RuralTaxFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { funruralType: "funrural-pf" },
  });

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  // Group products by category
  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/calculadora/rural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          saleValue: parseFloat(data.saleValue.replace(",", ".")),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao calcular impostos");
        return;
      }

      const { result, snapshot } = await res.json();
      onResult(result, snapshot, data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculadora de Impostos Rurais
        </CardTitle>
        <CardDescription>
          Calcule ICMS, PIS, COFINS e FUNRURAL para venda interestadual de produtos rurais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Produto rural</Label>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { if (v !== null) field.onChange(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(grouped).map(([cat, prods]) => (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {cat}
                        </div>
                        {prods.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{" "}
                            <span className="text-muted-foreground text-xs">NCM {p.ncmCode}</span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productId && <p className="text-xs text-destructive">{errors.productId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado de origem</Label>
              <Controller
                name="originState"
                control={control}
                render={({ field }) => (
                  <StateSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Estado de origem"
                  />
                )}
              />
              {errors.originState && <p className="text-xs text-destructive">{errors.originState.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Estado de destino</Label>
              <Controller
                name="destState"
                control={control}
                render={({ field }) => (
                  <StateSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Estado de destino"
                  />
                )}
              />
              {errors.destState && <p className="text-xs text-destructive">{errors.destState.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor de venda (R$)</Label>
              <Input
                placeholder="Ex: 100.000,00"
                {...register("saleValue")}
              />
              {errors.saleValue && <p className="text-xs text-destructive">{errors.saleValue.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo FUNRURAL</Label>
              <Controller
                name="funruralType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v !== null) field.onChange(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funrural-pf">Pessoa Física (1,2%)</SelectItem>
                      <SelectItem value="funrural-pj">Pessoa Jurídica (1,5%)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calcular impostos
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
