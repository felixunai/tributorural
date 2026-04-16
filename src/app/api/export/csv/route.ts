import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as "RURAL_TAX" | "RH_CLT" | null;

  const retentionDays = ["PRO", "ENTERPRISE"].includes(session.user.planTier) ? -1 : 90;
  const dateFilter =
    retentionDays > 0
      ? { createdAt: { gte: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000) } }
      : {};

  const calculations = await prisma.calculation.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type } : {}),
      ...dateFilter,
    },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, ncmCode: true } } },
  });

  const headers = [
    "ID",
    "Tipo",
    "Título",
    "Data",
    "Produto",
    "NCM",
    "Estado Origem",
    "Estado Destino",
    "Valor Venda",
    "ICMS",
    "PIS",
    "COFINS",
    "FUNRURAL",
    "Total Impostos",
    "Salário Bruto",
    "INSS Patronal",
    "FGTS",
    "13° Salário",
    "Férias+1/3",
    "RAT/FAP",
    "Sistema S",
    "Custo Total CLT",
  ];

  const rows = calculations.map((c: Record<string, unknown> & { product?: { name: string; ncmCode: string } | null; createdAt: Date; type: string }) => [
    c.id,
    c.type === "RURAL_TAX" ? "Impostos Rurais" : "Custo CLT",
    c.title ?? "",
    new Intl.DateTimeFormat("pt-BR").format(c.createdAt),
    c.product?.name ?? "",
    c.product?.ncmCode ?? "",
    c.originState ?? "",
    c.destState ?? "",
    c.saleValue?.toString() ?? "",
    c.icmsAmount?.toString() ?? "",
    c.pisAmount?.toString() ?? "",
    c.cofinsAmount?.toString() ?? "",
    c.funruralAmount?.toString() ?? "",
    c.totalTaxAmount?.toString() ?? "",
    c.grossSalary?.toString() ?? "",
    c.inssPatronal?.toString() ?? "",
    c.fgts?.toString() ?? "",
    c.decimoTerceiro?.toString() ?? "",
    c.ferias?.toString() ?? "",
    c.ratFap?.toString() ?? "",
    c.sistemaS?.toString() ?? "",
    c.totalCost?.toString() ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell: unknown) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")
    )
    .join("\n");

  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility

  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tributo-rural-historico.csv"`,
    },
  });
}
