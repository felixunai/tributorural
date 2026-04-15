import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.isBlocked) redirect("/login?error=blocked");

  return (
    <div className="flex min-h-screen">
      <AppSidebar planTier={session.user.planTier} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
