import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanTier } from "@/types/prisma";

// POST /api/subscription/sync
// Queries Stripe directly for the user's active subscription and syncs the DB.
// Called by the client after a successful Stripe checkout to ensure the plan
// is updated even if the webhook fires late.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ planTier: "FREE" });
  }

  // Fetch active subscriptions for this customer from Stripe
  const stripeSubs = await stripe.subscriptions.list({
    customer: subscription.stripeCustomerId,
    status: "active",
    limit: 5,
    expand: ["data.items.data.price"],
  });

  if (stripeSubs.data.length === 0) {
    return NextResponse.json({ planTier: "FREE" });
  }

  const activeSub = stripeSubs.data[0];
  const priceId = activeSub.items.data[0]?.price.id;
  const interval = activeSub.items.data[0]?.price.recurring?.interval;

  // Find the plan by price ID or by planTier metadata
  let plan = priceId
    ? await prisma.plan.findFirst({
        where: {
          OR: [
            { stripePriceIdMonthly: priceId },
            { stripePriceIdYearly: priceId },
          ],
        },
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

  // If plan found but priceId not yet stored, save it for future webhook lookups
  if (plan && priceId) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: interval === "year"
        ? { stripePriceIdYearly: priceId }
        : { stripePriceIdMonthly: priceId },
    });
  }

  if (!plan) {
    return NextResponse.json({ planTier: "FREE" });
  }

  // Update the subscription in DB
  await prisma.subscription.update({
    where: { userId },
    data: {
      planId: plan.id,
      stripeSubscriptionId: activeSub.id,
      status: "ACTIVE",
      currentPeriodEnd: (activeSub as any).current_period_end
        ? new Date((activeSub as any).current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
    },
  });

  return NextResponse.json({ planTier: plan.tier });
}
