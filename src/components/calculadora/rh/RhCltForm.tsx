"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import type { RhCltResult } from "@/lib/tax/rhClt";

const schema = z.object({
  grossSalary: z.string().min(1, "Informe o salário bruto"),
  ratFapRate: z.enum(["0.01", "0.02", "0.03"]),
});

type FormData = z.infer<typeof schema>;

interface RhCltFormProps {
  onResult: (result: RhCltResult, snapshot: Record<string, unknown>) => void;
}

export function RhCltForm({ onResult }: RhCltFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ratFapRate: "0.01" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/calculadora/rh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossSalary: parseFloat(data.grossSalary.replace(",", ".")),
          ratFapRate: parseFloat(data.ratFapRate),
        }),
      });

      if (!res.ok) return;
      const { result, snapshot } = await res.json();
      onResult(result, snapshot);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Calculadora de Custo CLT
        </CardTitle>
        <CardDescription>
          Descubra o custo real de contratar um funcionário com todos os encargos trabalhistas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Salário bruto (R$)</Label>
              <Input placeholder="Ex: 3.500,00" {...register("grossSalary")} />
              {errors.grossSalary && (
                <p className="text-xs text-destructive">{errors.grossSalary.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Alíquota RAT/FAP</Label>
              <Controller
                name="ratFapRate"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v !== null) field.onChange(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">1% — Risco leve</SelectItem>
                      <SelectItem value="0.02">2% — Risco médio</SelectItem>
                      <SelectItem value="0.03">3% — Risco grave</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
            <p className="font-medium">Encargos incluídos no cálculo:</p>
            <p className="text-muted-foreground">
              INSS Patronal 20% + FGTS 8% + 13° Salário 8,33% + Férias+1/3 11,11% + RAT/FAP + Sistema S 3,3%
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calcular custo total
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
