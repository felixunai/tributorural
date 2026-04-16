import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  isBlocked: z.boolean().optional(),
  planTier: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { isBlocked, planTier } = parsed.data;

  // Update isBlocked on the user
  if (isBlocked !== undefined) {
    await prisma.user.update({
      where: { id },
      data: { isBlocked },
    });
  }

  // Change plan: find the plan row and upsert subscription
  if (planTier !== undefined) {
    const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    await prisma.subscription.upsert({
      where: { userId: id },
      update: {
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodEnd: null,
        stripeSubscriptionId: null,
      },
      create: {
        userId: id,
        planId: plan.id,
        status: "ACTIVE",
      },
    });
  }

  // Return updated user
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      isBlocked: true,
      subscription: {
        select: {
          status: true,
          plan: { select: { name: true, tier: true } },
        },
      },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (id === session.user.id) {
    return NextResponse.json({ error: "Não é possível deletar sua própria conta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
