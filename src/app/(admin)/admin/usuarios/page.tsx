import { UsersTable } from "@/components/admin/UsersTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Usuários" };

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Busque, altere planos, bloqueie ou remova usuários.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
