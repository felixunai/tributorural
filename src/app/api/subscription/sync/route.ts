import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanTier } from "@/types/prisma";

// POST /api/subscription/sync
// Queries Stripe directly for the user's active subscription and syncs the DB.
// Called by the client after a successful Stripe checkout.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email!;

  const dbSub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  // Resolve Stripe customer ID: use stored one, or search by email
  let stripeCustomerId = dbSub?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const customers = await stripe.customers.list({ email: userEmail, limit: 5 });
    // Pick the customer whose metadata matches this userId, or the most recent one
    const match = customers.data.find((c) => c.metadata?.userId === userId)
      ?? customers.data[0];
    if (!match) return NextResponse.json({ planTier: "FREE" });
    stripeCustomerId = match.id;
  }

  // Fetch active/trialing subscriptions for this customer
  const [activeSubs, trialingSubs] = await Promise.all([
    stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 5,
      expand: ["data.items.data.price"],
    }),
    stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "trialing",
      limit: 5,
      expand: ["data.items.data.price"],
    }),
  ]);

  const allSubs = [...activeSubs.data, ...trialingSubs.data];
  if (allSubs.length === 0) return NextResponse.json({ planTier: "FREE" });

  const activeSub = allSubs[0];
  const priceId   = activeSub.items.data[0]?.price.id;
  const interval  = activeSub.items.data[0]?.price.recurring?.interval;

  // Resolve plan: try price ID match, then metadata planTier, then default to PRO
  let plan = priceId
    ? await prisma.plan.findFirst({
        where: { OR: [{ stripePriceIdMonthly: priceId }, { stripePriceIdYearly: priceId }] },
        select: { id: true, tier: true },
      })
    : null;

  const planTierMeta = (activeSub.metadata as Record<string, string>)?.planTier as PlanTier | undefined;
  if (!plan && planTierMeta) {
    plan = await prisma.plan.findUnique({
      where: { tier: planTierMeta },
      select: { id: true, tier: true },
    });
  }

  // Last resort: any paid subscription → PRO
  if (!plan) {
    plan = await prisma.plan.findUnique({ where: { tier: "PRO" }, select: { id: true, tier: true } });
  }

  if (!plan) return NextResponse.json({ planTier: "FREE" });

  // Auto-save price ID for future webhook lookups
  if (priceId) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: interval === "year"
        ? { stripePriceIdYearly: priceId }
        : { stripePriceIdMonthly: priceId },
    });
  }

  // Upsert subscription in DB
  const periodEnd = (activeSub as any).current_period_end;
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: plan.id,
      stripeCustomerId,
      stripeSubscriptionId: activeSub.id,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
    },
    create: {
      userId,
      planId: plan.id,
      stripeCustomerId,
      stripeSubscriptionId: activeSub.id,
      status: "ACTIVE",
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
    },
  });

  return NextResponse.json({ planTier: plan.tier });
}
