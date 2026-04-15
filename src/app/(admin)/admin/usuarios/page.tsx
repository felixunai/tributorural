import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/admin/UsersTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Usuários" };

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      isBlocked: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true, tier: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">{users.length} usuários cadastrados</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
