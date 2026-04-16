import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-[oklch(0.10_0.04_160)] px-6 py-16 sm:px-12 text-center">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, oklch(0.84 0.21 128) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Glow blobs */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-[oklch(0.84_0.21_128)/0.15] blur-3xl" />

          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-[oklch(0.84_0.21_128)] flex items-center justify-center shadow-xl shadow-[oklch(0.84_0.21_128)/0.4]">
                <Sprout className="h-8 w-8 text-[oklch(0.18_0.07_130)]" />
              </div>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight max-w-3xl mx-auto">
              Pare de calcular impostos na mão.{" "}
              <span className="gradient-text">Comece agora — é grátis.</span>
            </h2>

            <p className="mt-5 text-lg text-white/60 max-w-xl mx-auto">
              Crie sua conta em segundos e faça os primeiros 5 cálculos sem precisar de
              cartão de crédito.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn-lime inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base"
              >
                Criar conta grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>

            <p className="mt-6 text-sm text-white/30">
              Sem cartão • Sem fidelidade • Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
