import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/ProductsTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Produtos Rurais" };

export default async function AdminProdutosPage() {
  const products = await prisma.ruralProduct.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos Rurais</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie produtos, códigos NCM e alíquotas de PIS/COFINS.
        </p>
      </div>
      <ProductsTable products={products} />
    </div>
  );
}
