import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { PlanProvider } from "@/components/providers/PlanProvider";
import type { PlanTier } from "@/types/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.isBlocked) redirect("/login?error=blocked");

  // Always read planTier from DB — JWT may be stale after a plan upgrade
  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: { select: { tier: true } } },
  });
  const planTier: PlanTier =
    session.user.role === "ADMIN" ? "ENTERPRISE" : (sub?.plan.tier ?? "FREE");

  return (
    <PlanProvider planTier={planTier}>
      <AppShell planTier={planTier} isAdmin={session.user.role === "ADMIN"}>
        {children}
      </AppShell>
    </PlanProvider>
  );
}
