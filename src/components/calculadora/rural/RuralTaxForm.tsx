"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput, parseBRL } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StateSelector } from "@/components/shared/StateSelector";
import { ProductCombobox } from "./ProductCombobox";
import { Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";
import type { RuralTaxResult } from "@/lib/tax/ruralTax";

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  originState: z.string().min(1, "Selecione o estado de origem"),
  destState: z.string().min(1, "Selecione o estado de destino"),
  saleValue: z.string().min(1, "Informe o valor de venda"),
  regimeVendedor: z.enum(["produtor-pf", "produtor-pj", "empresa-presumido", "empresa-real"]),
  icmsRegime: z.enum(["normal", "diferido", "isento"]),
}).refine(
  (d) => d.originState === "" || d.destState === "" || d.originState !== d.destState,
  { message: "Estado de destino deve ser diferente do estado de origem", path: ["destState"] }
);

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
    defaultValues: {
      productId: "",
      originState: "",
      destState: "",
      saleValue: "",
      regimeVendedor: "produtor-pf",
      icmsRegime: "normal",
    },
  });

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/calculadora/rural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          saleValue: parseBRL(data.saleValue),
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
            <Label>Produto</Label>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <ProductCombobox
                  products={products}
                  value={field.value}
                  onChange={field.onChange}
                />
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

          <div className="space-y-1.5">
            <Label>Valor de venda (R$)</Label>
            <Controller
              name="saleValue"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="100.000,00"
                />
              )}
            />
            {errors.saleValue && <p className="text-xs text-destructive">{errors.saleValue.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Regime do vendedor</Label>
              <Controller
                name="regimeVendedor"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v !== null) field.onChange(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produtor-pf">Produtor Rural — Pessoa Física</SelectItem>
                      <SelectItem value="produtor-pj">Produtor Rural — Pessoa Jurídica</SelectItem>
                      <SelectItem value="empresa-presumido">Empresa — Lucro Presumido</SelectItem>
                      <SelectItem value="empresa-real">Empresa — Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Define FUNRURAL e PIS/COFINS aplicáveis</p>
            </div>

            <div className="space-y-1.5">
              <Label>Regime ICMS</Label>
              <Controller
                name="icmsRegime"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v !== null) field.onChange(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (alíquota interestadual)</SelectItem>
                      <SelectItem value="diferido">Diferido (0% — etapa seguinte)</SelectItem>
                      <SelectItem value="isento">Isento (0% — convênio/legislação)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Commodities agrícolas frequentemente têm ICMS diferido</p>
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
