import {
  Calculator,
  Users,
  BarChart3,
  Shield,
  Download,
  MapPin,
  Zap,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "702 alíquotas ICMS",
    description:
      "Tabela completa de ICMS interestadual para todos os 27 estados, seguindo a Resolução do Senado nº 22/1989. Sempre atualizada.",
    accent: "oklch(0.509 0.191 143)",
    accentLight: "oklch(0.509 0.191 143 / 0.12)",
    accentBorder: "oklch(0.509 0.191 143 / 0.25)",
  },
  {
    icon: MapPin,
    title: "30 produtos com NCM real",
    description:
      "Soja, milho, trigo, carnes, frutas e muito mais — cada produto com PIS/COFINS correto segundo a Lei 10.925/2004.",
    accent: "oklch(0.84 0.21 128)",
    accentLight: "oklch(0.84 0.21 128 / 0.12)",
    accentBorder: "oklch(0.84 0.21 128 / 0.3)",
  },
  {
    icon: Users,
    title: "Custo CLT completo",
    description:
      "INSS patronal, FGTS, 13° salário, férias + 1/3, RAT/FAP e Sistema S. Saiba exatamente quanto custa cada contratação.",
    accent: "oklch(0.62 0.17 200)",
    accentLight: "oklch(0.62 0.17 200 / 0.1)",
    accentBorder: "oklch(0.62 0.17 200 / 0.25)",
  },
  {
    icon: BarChart3,
    title: "Gráficos e dashboards",
    description:
      "Visualize a composição tributária com gráficos interativos. Acompanhe histórico, evolução e comparativos ao longo do tempo.",
    accent: "oklch(0.68 0.18 35)",
    accentLight: "oklch(0.68 0.18 35 / 0.1)",
    accentBorder: "oklch(0.68 0.18 35 / 0.25)",
  },
  {
    icon: Download,
    title: "Exportar CSV e PDF",
    description:
      "Baixe seus cálculos em CSV para análise no Excel ou em PDF para relatórios e apresentações profissionais a clientes.",
    accent: "oklch(0.62 0.17 280)",
    accentLight: "oklch(0.62 0.17 280 / 0.1)",
    accentBorder: "oklch(0.62 0.17 280 / 0.25)",
  },
  {
    icon: Shield,
    title: "Dados sempre atualizados",
    description:
      "Alíquotas ICMS e taxas editáveis pelo administrador. O sistema reflete a legislação vigente sem necessidade de atualização manual.",
    accent: "oklch(0.65 0.16 165)",
    accentLight: "oklch(0.65 0.16 165 / 0.1)",
    accentBorder: "oklch(0.65 0.16 165 / 0.25)",
  },
];

const highlights = [
  { icon: Zap, text: "Resultado em menos de 1 segundo" },
  { icon: Lock, text: "Dados protegidos e criptografados" },
  { icon: Shield, text: "Legislação fiscal brasileira atualizada" },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Funcionalidades
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Tudo que o agronegócio precisa,{" "}
            <span className="gradient-text">em um só sistema</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Desenvolvido especificamente para produtores rurais, consultores e escritórios
            contábeis do agronegócio brasileiro.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="feature-card rounded-2xl border bg-card p-7"
              style={{ borderColor: f.accentBorder }}
            >
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: f.accentLight }}
              >
                <f.icon className="h-6 w-6" style={{ color: f.accent }} />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm mt-2.5 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom trust strip */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8">
          {highlights.map((h) => (
            <div key={h.text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <h.icon className="h-4 w-4 text-primary" />
              </div>
              {h.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
