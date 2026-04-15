import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { BrazilianState } from "@/types/prisma";

// POST — save a calculation
const saveSchema = z.object({
  type: z.enum(["RURAL_TAX", "RH_CLT"]),
  title: z.string().optional(),
  // Rural fields
  productId: z.string().optional(),
  originState: z.string().optional(),
  destState: z.string().optional(),
  saleValue: z.number().optional(),
  icmsAmount: z.number().optional(),
  pisAmount: z.number().optional(),
  cofinsAmount: z.number().optional(),
  funruralAmount: z.number().optional(),
  totalTaxAmount: z.number().optional(),
  effectiveRate: z.number().optional(),
  // RH fields
  grossSalary: z.number().optional(),
  inssPatronal: z.number().optional(),
  fgts: z.number().optional(),
  decimoTerceiro: z.number().optional(),
  ferias: z.number().optional(),
  ratFap: z.number().optional(),
  sistemaS: z.number().optional(),
  totalCost: z.number().optional(),
  ratFapPercent: z.number().optional(),
  // Snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ratesSnapshot: z.any(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan allows history
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { plan: true },
  });

  if (!subscription?.plan.canAccessHistory && session.user.planTier === "FREE") {
    // Free users can save but won't be able to view history — still allow saving
  }

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data = parsed.data;

  const calculation = await prisma.calculation.create({
    data: {
      userId: session.user.id,
      type: data.type,
      title: data.title,
      productId: data.productId,
      originState: data.originState as BrazilianState | undefined,
      destState: data.destState as BrazilianState | undefined,
      saleValue: data.saleValue,
      icmsAmount: data.icmsAmount,
      pisAmount: data.pisAmount,
      cofinsAmount: data.cofinsAmount,
      funruralAmount: data.funruralAmount,
      totalTaxAmount: data.totalTaxAmount,
      effectiveRate: data.effectiveRate,
      grossSalary: data.grossSalary,
      inssPatronal: data.inssPatronal,
      fgts: data.fgts,
      decimoTerceiro: data.decimoTerceiro,
      ferias: data.ferias,
      ratFap: data.ratFap,
      sistemaS: data.sistemaS,
      totalCost: data.totalCost,
      ratFapPercent: data.ratFapPercent,
      ratesSnapshot: data.ratesSnapshot,
    },
  });

  return NextResponse.json(calculation, { status: 201 });
}

// GET — list calculations with pagination
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only PRO+ can access history
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário para acessar o histórico" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const type = searchParams.get("type") as "RURAL_TAX" | "RH_CLT" | null;
  const skip = (page - 1) * limit;

  // Apply history retention filter
  const retentionDays =
    session.user.planTier === "ENTERPRISE" ? -1 : 90;

  const dateFilter =
    retentionDays > 0
      ? { createdAt: { gte: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000) } }
      : {};

  const where = {
    userId: session.user.id,
    ...(type ? { type } : {}),
    ...dateFilter,
  };

  const [items, total] = await Promise.all([
    prisma.calculation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { product: { select: { name: true, ncmCode: true } } },
    }),
    prisma.calculation.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
