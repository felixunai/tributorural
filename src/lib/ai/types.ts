export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface AIProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>
}
