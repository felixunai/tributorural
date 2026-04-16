import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.isBlocked) redirect("/login?error=blocked");

  return (
    <AppShell planTier={session.user.planTier} isAdmin={session.user.role === "ADMIN"}>
      {children}
    </AppShell>
  );
}
