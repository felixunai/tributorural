import type { AIProvider } from "./types"

export { type ChatMessage } from "./types"

export const SYSTEM_PROMPT = `Você é um assistente especializado em tributação rural brasileira, integrado ao sistema Tributo Rural.

Seu papel é ajudar produtores rurais, contadores e consultores a entender:
- ICMS interestadual em operações rurais
- PIS/COFINS em produtos rurais (Lei 10.925/2004)
- FUNRURAL (Pessoa Física 1,2% e Pessoa Jurídica 1,5%)
- Custos trabalhistas CLT (INSS, FGTS, 13°, férias)
- Rescisão de contratos de trabalho
- Regimes tributários para o produtor rural

Seja objetivo e prático. Use exemplos com valores quando ajudar a entender.
Responda sempre em português brasileiro.
Quando não souber algo com certeza, diga claramente e oriente o usuário a consultar um contador.`

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "groq"

  if (provider === "groq") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { groqProvider } = require("./groq")
    return groqProvider as AIProvider
  }

  // Future providers: "gemini" | "claude" | "openai"
  throw new Error(`AI provider "${provider}" not configured. Set AI_PROVIDER env var.`)
}
