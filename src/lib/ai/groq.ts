import Groq from "groq-sdk"
import type { AIProvider, ChatMessage } from "./types"

let _groq: Groq | null = null

function getClient() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

export const groqProvider: AIProvider = {
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    })
    return completion.choices[0]?.message?.content ?? ""
  },
}
