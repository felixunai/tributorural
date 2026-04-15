import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Comece a calcular agora — é grátis
        </h2>
        <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
          Crie sua conta em segundos e faça seus primeiros 5 cálculos sem precisar de cartão de crédito.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="text-base px-8 font-semibold"
          >
            <Link href="/register">
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base border-primary-foreground/30 hover:bg-primary-foreground/10">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
