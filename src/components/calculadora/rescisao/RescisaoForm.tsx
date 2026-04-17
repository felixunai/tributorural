"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput, parseBRL } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileX2 } from "lucide-react";
import type { RescisaoResult } from "@/lib/tax/rescisao";

const schema = z.object({
  grossSalary: z.string().min(1, "Informe o salário bruto"),
  admissionDate: z.string().min(1, "Informe a data de admissão"),
  terminationDate: z.string().min(1, "Informe a data de demissão"),
  tipoRescisao: z.enum(["SEM_JUSTA_CAUSA", "COM_JUSTA_CAUSA", "PEDIDO_DEMISSAO", "ACORDO_MUTUO"]),
  avisoPrevioTrabalhado: z.enum(["true", "false"]),
  feriasVencidasPeriodos: z.enum(["0", "1", "2"]),
  fgtsBalance: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface RescisaoFormProps {
  onResult: (result: RescisaoResult, snapshot: Record<string, unknown>) => void;
}

const TIPO_LABELS: Record<string, string> = {
  SEM_JUSTA_CAUSA: "Dispensa sem justa causa",
  COM_JUSTA_CAUSA: "Dispensa com justa causa",
  PEDIDO_DEMISSAO: "Pedido de demissão",
  ACORDO_MUTUO: "Acordo mútuo (distrato)",
};

export function RescisaoForm({ onResult }: RescisaoFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("SEM_JUSTA_CAUSA");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      grossSalary: "",
      admissionDate: "",
      terminationDate: "",
      tipoRescisao: "SEM_JUSTA_CAUSA",
      avisoPrevioTrabalhado: "false",
      feriasVencidasPeriodos: "0",
      fgtsBalance: "",
    },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/calculadora/rescisao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossSalary: parseBRL(data.grossSalary),
          admissionDate: data.admissionDate,
          terminationDate: data.terminationDate,
          tipoRescisao: data.tipoRescisao,
          avisoPrevioTrabalhado: data.avisoPrevioTrabalhado === "true",
          feriasVencidasPeriodos: parseInt(data.feriasVencidasPeriodos),
          fgtsBalance: data.fgtsBalance ? parseBRL(data.fgtsBalance) : undefined,
        }),
      });
      if (!res.ok) return;
      const { result, snapshot } = await res.json();
      onResult(result, snapshot);
    } finally {
      setLoading(false);
    }
  }

  const showAvisoPrevioField =
    selectedTipo === "SEM_JUSTA_CAUSA" || selectedTipo === "ACORDO_MUTUO";
  const showFgtsField =
    selectedTipo === "SEM_JUSTA_CAUSA" || selectedTipo === "ACORDO_MUTUO";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileX2 className="h-5 w-5 text-orange-600" />
          Calculadora de Rescisão
        </CardTitle>
        <CardDescription>
          Calcule os valores que o empregador deve pagar ao desligar um funcionário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Salário bruto mensal (R$)</Label>
              <Controller
                name="grossSalary"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="3.500,00"
                  />
                )}
              />
              {errors.grossSalary && <p className="text-xs text-destructive">{errors.grossSalary.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de rescisão</Label>
              <Controller
                name="tipoRescisao"
                control={control}
                render={({ field }) => {
                  const selected = TIPO_LABELS[field.value];
                  return (
                    <Select
                      value={field.value}
                      onValueChange={(v) => { if (v) { field.onChange(v); setSelectedTipo(v); } }}
                    >
                      <SelectTrigger>
                        <span className="flex-1 text-left text-sm">{selected}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data de admissão</Label>
              <Input type="date" {...register("admissionDate")} />
              {errors.admissionDate && <p className="text-xs text-destructive">{errors.admissionDate.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Data de demissão</Label>
              <Input type="date" {...register("terminationDate")} />
              {errors.terminationDate && <p className="text-xs text-destructive">{errors.terminationDate.message}</p>}
            </div>

            {showAvisoPrevioField && (
              <div className="space-y-1.5">
                <Label>Aviso prévio</Label>
                <Controller
                  name="avisoPrevioTrabalhado"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                      <SelectTrigger>
                        <span className="flex-1 text-left text-sm">
                          {field.value === "true" ? "Trabalhado" : "Indenizado (não trabalhado)"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Indenizado (não trabalhado)</SelectItem>
                        <SelectItem value="true">Trabalhado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Férias vencidas não gozadas</Label>
              <Controller
                name="feriasVencidasPeriodos"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                    <SelectTrigger>
                      <span className="flex-1 text-left text-sm">
                        {field.value === "0" ? "Nenhuma" : `${field.value} período(s)`}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nenhuma</SelectItem>
                      <SelectItem value="1">1 período (30 dias)</SelectItem>
                      <SelectItem value="2">2 períodos (60 dias)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {showFgtsField && (
              <div className="space-y-1.5">
                <Label>Saldo do FGTS (R$) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Controller
                  name="fgtsBalance"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Deixe em branco para estimar"
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Se informado, a multa será calculada sobre o saldo real.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calcular rescisão
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
