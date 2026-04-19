"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const proFeatures = [
  "Assistente tributário com IA (30/dia)",
  "Calculadora Rural ilimitada",
  "Calculadora de Custo CLT",
  "Calculadora de Rescisão CLT",
  "Histórico completo ilimitado",
  "Exportar CSV e PDF",
  "Cotações de commodities B3/CBOT",
  "Suporte por email",
];

const freeFeatures = [
  "Calculadora de Impostos Rurais",
  "5 cálculos por mês",
  "30 produtos com NCM",
  "702 alíquotas ICMS",
];

const freeExcluded = [
  "Calculadora de Custo CLT",
  "Calculadora de Rescisão CLT",
  "Histórico de cálculos",
  "Exportar CSV/PDF",
  "Cotações de commodities",
];

export function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(priceEnvKey: string) {
    if (!session) {
      router.push("/register");
      return;
    }

    const priceId = priceEnvKey === "monthly"
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY;

    if (!priceId) {
      toast.error("Plano não disponível no momento. Tente novamente em breve.");
      return;
    }

    setLoadingPlan(priceEnvKey);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planTier: "PRO" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Erro ao iniciar checkout. Tente novamente.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="precos" className="py-24 bg-muted/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Planos e Preços
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Escolha o plano ideal{" "}
            <span className="gradient-text">para seu negócio</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cancele a qualquer momento. Sem fidelidade. Sem surpresas.
          </p>
        </div>

        {/* 3 cards: FREE · PRO Mensal · PRO Anual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">

          {/* FREE */}
          <div className="rounded-2xl border bg-card flex flex-col">
            <div className="p-7">
              <p className="text-sm font-semibold text-muted-foreground">Gratuito</p>
              <p className="text-xs mt-0.5 text-muted-foreground/70">Para conhecer o sistema</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-heading text-5xl font-extrabold tracking-tight text-foreground">Grátis</span>
              </div>
              <p className="text-xs mt-1 text-muted-foreground opacity-0">—</p>
              <Button
                className="w-full mt-6 rounded-xl font-semibold py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0"
                onClick={() => router.push("/register")}
              >
                Começar grátis
              </Button>
            </div>
            <div className="px-7 pb-7 flex-1 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">Incluído</p>
              <ul className="space-y-2.5">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
                {freeExcluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <X className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/40" />
                    <span className="text-muted-foreground/50 line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* PRO Mensal */}
          <div className="pricing-popular text-white rounded-2xl flex flex-col relative -mt-4 pt-4">
            <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
              <span className="bg-[oklch(0.84_0.21_128)] text-[oklch(0.18_0.07_130)] text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wide shadow-lg">
                Mais popular
              </span>
            </div>
            <div className="p-7">
              <p className="text-sm font-semibold text-white/70">Profissional</p>
              <p className="text-xs mt-0.5 text-white/50">Cobrança mensal · cancele quando quiser</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-heading text-5xl font-extrabold tracking-tight text-white">
                  R$&nbsp;29,90
                </span>
                <span className="text-sm mb-2 text-white/60">/mês</span>
              </div>
              <p className="text-xs mt-1 text-white/50">Cobrado mensalmente</p>
              <Button
                className="w-full mt-6 rounded-xl font-semibold py-2.5 btn-lime border-0"
                onClick={() => handleSubscribe("monthly")}
                disabled={loadingPlan === "monthly"}
              >
                {loadingPlan === "monthly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assinar mensal
              </Button>
            </div>
            <div className="px-7 pb-7 flex-1 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-white/50">Incluído</p>
              <ul className="space-y-2.5">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-[oklch(0.84_0.21_128)]" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* PRO Anual */}
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col relative">
            <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
              <Badge className="text-[10px] px-2.5 py-0.5 bg-[oklch(0.84_0.21_128)] text-[oklch(0.18_0.07_130)] border-0 font-extrabold uppercase tracking-wide">
                Economize 20%
              </Badge>
            </div>
            <div className="p-7">
              <p className="text-sm font-semibold text-muted-foreground">Profissional Anual</p>
              <p className="text-xs mt-0.5 text-muted-foreground/70">Cobrança anual · melhor custo-benefício</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-heading text-5xl font-extrabold tracking-tight text-foreground">
                  R$&nbsp;24,17
                </span>
                <span className="text-sm mb-2 text-muted-foreground">/mês</span>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                R$ 290,00 cobrado anualmente
                <span className="ml-2 line-through text-muted-foreground/50">R$ 358,80</span>
              </p>
              <Button
                className="w-full mt-6 rounded-xl font-semibold py-2.5 border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground"
                onClick={() => handleSubscribe("yearly")}
                disabled={loadingPlan === "yearly"}
              >
                {loadingPlan === "yearly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assinar anual
              </Button>
            </div>
            <div className="px-7 pb-7 flex-1 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-muted-foreground">Incluído</p>
              <ul className="space-y-2.5">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Todos os planos incluem acesso via web. Pagamentos processados com segurança pelo{" "}
          <span className="font-semibold text-foreground">Stripe</span>.
        </p>
      </div>
    </section>
  );
}
