import { Bot, User, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const mockMessages = [
  {
    role: "user",
    content: "Qual a alíquota de FUNRURAL para pessoa física?",
  },
  {
    role: "assistant",
    content:
      "Para o produtor rural Pessoa Física, a alíquota do FUNRURAL é de 1,2% sobre a receita bruta da comercialização rural. Já para Pessoa Jurídica, a alíquota é de 1,5%. Essa contribuição substitui a cota patronal do INSS (20%).",
  },
  {
    role: "user",
    content: "E no caso de venda interestadual de soja de MT para SP?",
  },
  {
    role: "assistant",
    content:
      "Na venda de MT → SP, o ICMS interestadual é de 12%. A soja (NCM 1201.10.00) tem PIS/COFINS a 0% conforme Lei 10.925/2004. Portanto, a carga tributária principal fica no ICMS + FUNRURAL.",
  },
];

export function AiAssistantSection() {
  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Novo — Plano Profissional
              </span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Assistente tributário{" "}
              <span className="gradient-text">com IA</span>
            </h2>

            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Tire dúvidas sobre ICMS, FUNRURAL, PIS/COFINS, CLT e rescisão
              diretamente no sistema — sem sair do painel, sem esperar retorno.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Respostas baseadas na legislação tributária rural brasileira",
                "Contexto do agronegócio: soja, milho, boi gordo, café e mais",
                "Disponível 24h, todos os dias, direto no painel",
                "30 perguntas por dia incluídas no plano Profissional",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/register">Começar agora</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">Ver planos</Link>
              </Button>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Exclusivo do plano Profissional
            </p>
          </div>

          {/* Right: mock chat */}
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />

            <div className="relative flex flex-col w-full max-w-md mx-auto rounded-2xl border bg-background shadow-2xl overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Assistente Tributário</p>
                  <p className="text-xs opacity-70">Tributação Rural BR · IA</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="text-xs opacity-70">online</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-4 p-4 bg-muted/20">
                {mockMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {msg.role === "assistant" ? (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-background border text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input mock */}
              <div className="flex items-center gap-2 px-3 py-3 border-t bg-background">
                <div className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                  Tire sua dúvida tributária...
                </div>
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
