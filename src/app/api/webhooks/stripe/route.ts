import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import type { SubscriptionStatus, PlanTier } from "@/types/prisma";

// Raw body is already available via req.text() in App Router — no config needed

function stripeStatusToPrisma(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    paused: "PAST_DUE",
  };
  return map[status] ?? "ACTIVE";
}

async function getPlanByStripePrice(priceId: string): Promise<{ id: string; tier: PlanTier } | null> {
  return prisma.plan.findFirst({
    where: {
      OR: [
        { stripePriceIdMonthly: priceId },
        { stripePriceIdYearly: priceId },
      ],
    },
    select: { id: true, tier: true },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? await getPlanByStripePrice(priceId) : null;

  const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
  const planId = plan?.id ?? freePlan!.id;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      status: stripeStatusToPrisma(sub.status),
      currentPeriodStart: (sub as any).current_period_start ? new Date((sub as any).current_period_start * 1000) : undefined,
      currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    create: {
      userId,
      planId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      status: stripeStatusToPrisma(sub.status),
      currentPeriodStart: (sub as any).current_period_start ? new Date((sub as any).current_period_start * 1000) : undefined,
      currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || !session.customer) return;

  // Link the Stripe customer to the user's subscription row
  await prisma.subscription.updateMany({
    where: { userId, stripeCustomerId: null },
    data: { stripeCustomerId: session.customer as string },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | undefined;
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
