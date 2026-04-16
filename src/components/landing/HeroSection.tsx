import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, Users, TrendingDown, CheckCircle2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="hero-mesh relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.84 0.21 128) 1px, transparent 1px), linear-gradient(90deg, oklch(0.84 0.21 128) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative container mx-auto px-4 pt-20 pb-32">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.84_0.21_128)/0.4] bg-[oklch(0.84_0.21_128)/0.1] px-4 py-1.5 text-sm font-medium text-[oklch(0.84_0.21_128)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.84_0.21_128)] animate-pulse" />
            Ferramenta fiscal #1 do agronegócio brasileiro
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-center text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-white max-w-5xl mx-auto">
          Calcule impostos rurais{" "}
          <span className="gradient-text">sem erro e sem enrolação</span>
        </h1>

        <p className="mt-6 text-center text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
          ICMS interestadual, PIS, COFINS, FUNRURAL e custo real CLT. Precisão fiscal
          para produtores rurais e consultores do agronegócio.
        </p>

        {/* Trust bullets */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[oklch(0.84_0.21_128)]" />
            5 cálculos grátis
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[oklch(0.84_0.21_128)]" />
            Sem cartão de crédito
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[oklch(0.84_0.21_128)]" />
            702 alíquotas ICMS atualizadas
          </span>
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="btn-lime inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base"
          >
            Começar grátis agora
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Ver todos os planos
          </Link>
        </div>

        {/* Feature preview cards */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left hover:border-[oklch(0.84_0.21_128)/0.4] hover:bg-white/8 transition-all">
            <div className="h-11 w-11 rounded-xl bg-[oklch(0.509_0.191_143)/0.3] border border-[oklch(0.509_0.191_143)/0.4] flex items-center justify-center mb-4">
              <Calculator className="h-5 w-5 text-[oklch(0.75_0.22_143)]" />
            </div>
            <h3 className="font-heading font-semibold text-white">Impostos Rurais</h3>
            <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
              ICMS, PIS, COFINS e FUNRURAL para 30 produtos em todos os 27 estados.
            </p>
          </div>

          <div className="rounded-2xl border border-[oklch(0.84_0.21_128)/0.3] bg-[oklch(0.84_0.21_128)/0.06] backdrop-blur-sm p-6 text-left hover:border-[oklch(0.84_0.21_128)/0.6] transition-all relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs font-bold bg-[oklch(0.84_0.21_128)] text-[oklch(0.18_0.07_130)] px-3 py-0.5 rounded-full">
                MAIS USADO
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-[oklch(0.84_0.21_128)/0.2] border border-[oklch(0.84_0.21_128)/0.4] flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-[oklch(0.84_0.21_128)]" />
            </div>
            <h3 className="font-heading font-semibold text-white">Custo CLT Real</h3>
            <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
              INSS, FGTS, 13°, Férias, RAT/FAP e Sistema S. Saiba o custo total.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left hover:border-[oklch(0.84_0.21_128)/0.4] hover:bg-white/8 transition-all">
            <div className="h-11 w-11 rounded-xl bg-[oklch(0.62_0.17_200)/0.2] border border-[oklch(0.62_0.17_200)/0.3] flex items-center justify-center mb-4">
              <TrendingDown className="h-5 w-5 text-[oklch(0.72_0.17_200)]" />
            </div>
            <h3 className="font-heading font-semibold text-white">Gráficos e Histórico</h3>
            <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
              Visualize a carga tributária e acompanhe a evolução dos seus cálculos.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom fade to background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
