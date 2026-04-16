"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
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
    description: "Para conhecer o sistema",
    features: [
      "Calculadora de Impostos Rurais",
      "5 cálculos por mês",
      "30 produtos com NCM",
      "702 alíquotas ICMS",
    ],
    excluded: [
      "Calculadora de Custo CLT",
      "Histórico de cálculos",
      "Exportar CSV/PDF",
      "Cotações de commodities",
    ],
    cta: "Começar grátis",
    highlighted: false,
    stripePriceMonthly: "",
    stripePriceYearly: "",
  },
  {
    name: "Profissional",
    tier: "PRO",
    monthlyPrice: 29.9,
    yearlyPrice: 290,
    description: "Para produtores e consultores rurais",
    features: [
      "Calculadora Rural ilimitada",
      "Calculadora de Custo CLT",
      "Histórico completo ilimitado",
      "Exportar CSV e PDF",
      "Cotações de commodities B3/CBOT",
      "Suporte por email",
    ],
    excluded: [],
    cta: "Assinar Profissional",
    highlighted: true,
    stripePriceMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? "",
    stripePriceYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ?? "",
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
      toast.error("Plano não disponível. Configure os IDs do Stripe.");
      return;
    }
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, planTier: plan.tier }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast.error("Erro ao iniciar checkout");
  }

  return (
    <section id="precos" className="py-24 bg-muted/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Planos e Preços
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Escolha o plano ideal{" "}
            <span className="gradient-text">para seu negócio</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cancele a qualquer momento. Sem fidelidade.
          </p>

          {/* Toggle */}
          <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border bg-background px-4 py-2">
            <span className={cn("text-sm font-medium transition-colors", !yearly ? "text-foreground" : "text-muted-foreground")}>
              Mensal
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-300",
                yearly ? "bg-primary" : "bg-border"
              )}
              aria-label="Alternar período"
            >
              <span
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-300",
                  yearly ? "left-6" : "left-1"
                )}
              />
            </button>
            <span className={cn("text-sm font-medium transition-colors flex items-center gap-1.5", yearly ? "text-foreground" : "text-muted-foreground")}>
              Anual
              <Badge className="text-[10px] px-1.5 py-0 bg-[oklch(0.84_0.21_128)] text-[oklch(0.18_0.07_130)] border-0">
                -20%
              </Badge>
            </span>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={cn(
                "relative rounded-2xl flex flex-col",
                plan.highlighted
                  ? "pricing-popular text-white -mt-4 pt-4"
                  : "border bg-card"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                  <span className="bg-[oklch(0.84_0.21_128)] text-[oklch(0.18_0.07_130)] text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wide shadow-lg">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="p-7">
                <p className={cn("text-sm font-semibold", plan.highlighted ? "text-white/70" : "text-muted-foreground")}>
                  {plan.name}
                </p>
                <p className={cn("text-xs mt-0.5", plan.highlighted ? "text-white/50" : "text-muted-foreground/70")}>
                  {plan.description}
                </p>

                <div className="mt-5 flex items-end gap-1">
                  <span className={cn("font-heading text-5xl font-extrabold tracking-tight", plan.highlighted ? "text-white" : "text-foreground")}>
                    {plan.monthlyPrice === 0
                      ? "Grátis"
                      : `R$\u00a0${(yearly ? plan.yearlyPrice / 12 : plan.monthlyPrice)
                          .toFixed(2)
                          .replace(".", ",")}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className={cn("text-sm mb-2", plan.highlighted ? "text-white/60" : "text-muted-foreground")}>
                      /mês
                    </span>
                  )}
                </div>
                {yearly && plan.yearlyPrice > 0 && (
                  <p className={cn("text-xs mt-1", plan.highlighted ? "text-white/50" : "text-muted-foreground")}>
                    R$ {plan.yearlyPrice.toFixed(2).replace(".", ",")} cobrado anualmente
                  </p>
                )}

                <Button
                  className={cn(
                    "w-full mt-6 rounded-xl font-semibold py-2.5",
                    plan.highlighted
                      ? "btn-lime border-0"
                      : plan.tier === "FREE"
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0"
                      : "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => handleSubscribe(plan)}
                >
                  {plan.cta}
                </Button>
              </div>

              <div className={cn("px-7 pb-7 flex-1", plan.highlighted && "border-t border-white/10 pt-5")}>
                <p className={cn("text-xs font-semibold uppercase tracking-widest mb-3", plan.highlighted ? "text-white/50" : "text-muted-foreground")}>
                  Incluído
                </p>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn("h-4 w-4 shrink-0 mt-0.5", plan.highlighted ? "text-[oklch(0.84_0.21_128)]" : "text-primary")}
                      />
                      <span className={plan.highlighted ? "text-white/80" : "text-foreground"}>{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <X
                        className={cn("h-4 w-4 shrink-0 mt-0.5", plan.highlighted ? "text-white/20" : "text-muted-foreground/40")}
                      />
                      <span className={plan.highlighted ? "text-white/30 line-through" : "text-muted-foreground/50 line-through"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          Todos os planos incluem acesso ao sistema via web. Pagamentos processados com segurança pelo{" "}
          <span className="font-semibold text-foreground">Stripe</span>.
        </p>
      </div>
    </section>
  );
}
