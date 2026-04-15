import {
  Calculator,
  Users,
  BarChart3,
  Shield,
  Download,
  MapPin,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "702 alíquotas ICMS interestaduais",
    description:
      "Tabela completa de ICMS para todos os 27 estados do Brasil, seguindo a Resolução do Senado nº 22/1989.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: MapPin,
    title: "30 produtos rurais com NCM",
    description:
      "Soja, milho, trigo, carnes, frutas, hortaliças e muito mais — cada um com PIS/COFINS correto segundo a Lei 10.925/2004.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Custo CLT completo",
    description:
      "INSS patronal, FGTS, 13° salário, férias + 1/3, RAT/FAP e Sistema S. Saiba o custo real de cada contratação.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "Gráficos e dashboards",
    description:
      "Visualize a composição tributária com gráficos de pizza e barras. Acompanhe seu histórico de cálculos.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Download,
    title: "Exportar CSV e PDF",
    description:
      "Baixe seus cálculos em CSV para análise no Excel ou em PDF para apresentações e relatórios.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Shield,
    title: "Dados sempre atualizados",
    description:
      "Alíquotas ICMS e taxas editáveis pelo administrador. Seu sistema sempre reflete a legislação vigente.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Desenvolvido especificamente para o agronegócio brasileiro, com dados fiscais reais.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl bg-background border p-6">
              <div className={`h-12 w-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
