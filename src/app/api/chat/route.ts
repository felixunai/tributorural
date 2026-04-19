import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAIProvider, SYSTEM_PROMPT, type ChatMessage } from "@/lib/ai"

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 30)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  // Plan gate: PRO or ENTERPRISE (or ADMIN)
  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: { select: { tier: true } } },
  })
  const tier = session.user.role === "ADMIN" ? "ENTERPRISE" : (sub?.plan.tier ?? "FREE")

  if (tier === "FREE") {
    return NextResponse.json(
      { error: "Recurso disponível no plano Profissional ou superior." },
      { status: 403 }
    )
  }

  // Daily rate limit
  const today = new Date().toISOString().slice(0, 10)
  const usage = await prisma.chatUsage.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    update: {},
    create: { userId: session.user.id, date: today, count: 0 },
  })

  if (usage.count >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Limite de ${DAILY_LIMIT} mensagens por dia atingido. Tente novamente amanhã.` },
      { status: 429 }
    )
  }

  const body = await req.json()
  const messages: ChatMessage[] = body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Mensagens inválidas" }, { status: 400 })
  }

  // Increment counter before calling AI (prevents abuse on concurrent requests)
  await prisma.chatUsage.update({
    where: { userId_date: { userId: session.user.id, date: today } },
    data: { count: { increment: 1 } },
  })

  const provider = getAIProvider()
  const reply = await provider.chat(messages, SYSTEM_PROMPT)

  return NextResponse.json({ reply, remaining: DAILY_LIMIT - usage.count - 1 })
}
