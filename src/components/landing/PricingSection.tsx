"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Gratuito",
    tier: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Para começar a explorar o sistema",
    features: [
      "Calculadora de Impostos Rurais (5 cálculos/mês)",
      "30 produtos rurais com NCM",
      "702 alíquotas ICMS interestaduais",
    ],
    excluded: [
      "Calculadora de Custo CLT",
      "Histórico de cálculos",
      "Exportar CSV/PDF",
    ],
    cta: "Começar grátis",
    highlighted: false,
    stripePriceMonthly: "",
    stripePriceYearly: "",
  },
  {
    name: "Profissional",
    tier: "PRO",
    monthlyPrice: 49.9,
    yearlyPrice: 479,
    description: "Para produtores e consultores rurais",
    features: [
      "Calculadora de Impostos Rurais ilimitada",
      "Calculadora de Custo CLT",
      "Histórico de 90 dias",
      "Exportar CSV",
      "Suporte por email",
    ],
    excluded: ["Exportar PDF"],
    cta: "Assinar Profissional",
    highlighted: true,
    stripePriceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? "",
    stripePriceYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ?? "",
  },
  {
    name: "Empresarial",
    tier: "ENTERPRISE",
    monthlyPrice: 149.9,
    yearlyPrice: 1439,
    description: "Para empresas e escritórios contábeis",
    features: [
      "Tudo do plano Profissional",
      "Histórico completo (sem limite)",
      "Exportar PDF e CSV",
      "Suporte prioritário",
    ],
    excluded: [],
    cta: "Assinar Empresarial",
    highlighted: false,
    stripePriceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "",
    stripePriceYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY ?? "",
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSubscribe(plan: (typeof plans)[0]) {
    if (plan.tier === "FREE") {
      router.push("/register");
      return;
    }

    if (!session) {
      router.push("/register");
      return;
    }

    const priceId = yearly ? plan.stripePriceYearly : plan.stripePriceMonthly;
    if (!priceId) {
      toast.error("Plano não disponível no momento. Configure os IDs do Stripe.");
      return;
    }

    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, planTier: plan.tier }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error("Erro ao iniciar checkout");
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planos e Preços
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para o seu negócio rural. Cancele a qualquer momento.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className={cn("text-sm", !yearly && "font-semibold")}>Mensal</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors",
              yearly ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                yearly ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
          <span className={cn("text-sm", yearly && "font-semibold")}>
            Anual{" "}
            <Badge variant="secondary" className="ml-1 text-xs">
              ~20% off
            </Badge>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={cn(
              "relative flex flex-col",
              plan.highlighted && "border-primary shadow-lg shadow-primary/10 scale-105"
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                <Badge className="px-3">Mais popular</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {plan.monthlyPrice === 0
                    ? "Grátis"
                    : `R$ ${(yearly ? plan.yearlyPrice / 12 : plan.monthlyPrice).toFixed(2).replace(".", ",")}`}
                </span>
                {plan.monthlyPrice > 0 && (
                  <span className="text-muted-foreground text-sm ml-1">/mês</span>
                )}
                {yearly && plan.yearlyPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {plan.yearlyPrice.toFixed(2).replace(".", ",")} cobrado anualmente
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between gap-6">
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 opacity-30" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                onClick={() => handleSubscribe(plan)}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
