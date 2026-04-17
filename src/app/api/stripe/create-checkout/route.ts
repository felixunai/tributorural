import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  priceId: z.string(),
  planTier: z.enum(["PRO"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { priceId } = parsed.data;
  const userId = session.user.id;

  try {
    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeCustomerId) {
      stripeCustomerId = subscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name ?? undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId, planTier: parsed.data.planTier },
      },
      locale: "pt-BR",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = (err as { message?: string })?.message ?? "Erro ao criar sessão de pagamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
