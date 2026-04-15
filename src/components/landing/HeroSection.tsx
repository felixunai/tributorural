import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calculator, TrendingDown, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-green-50 to-background dark:from-green-950/20">
      <div className="container mx-auto px-4 pt-20 pb-24 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
          🌾 A ferramenta fiscal do agronegócio brasileiro
        </Badge>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          Calcule impostos rurais com{" "}
          <span className="text-primary">precisão e rapidez</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          ICMS interestadual, PIS, COFINS, FUNRURAL e custo real de contratação CLT.
          Tudo em um sistema feito para produtores rurais e consultores do agronegócio.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="text-base px-8">
            <Link href="/register">
              Começar grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base">
            <Link href="/pricing">Ver planos</Link>
          </Button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Sem cartão de crédito • 5 cálculos grátis por mês
        </p>

        {/* Preview cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Calculator className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-semibold">Impostos Rurais</h3>
            <p className="text-sm text-muted-foreground mt-1">
              ICMS, PIS, COFINS e FUNRURAL para 30 produtos rurais em todos os 27 estados.
            </p>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-semibold">Custo CLT Real</h3>
            <p className="text-sm text-muted-foreground mt-1">
              INSS, FGTS, 13°, Férias, RAT/FAP e Sistema S. Saiba quanto custa contratar.
            </p>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="font-semibold">Dashboards e Gráficos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize sua carga tributária, histórico e evolução com gráficos interativos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
