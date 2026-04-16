import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { BrazilianState } from "@/types/prisma";

// POST — save a calculation
const saveSchema = z.object({
  type: z.enum(["RURAL_TAX", "RH_CLT", "RESCISAO"]),
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
  // Rescisão fields
  admissionDate: z.string().optional(),
  terminationDate: z.string().optional(),
  tipoRescisao: z.string().optional(),
  // Snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ratesSnapshot: z.any(),
});

const MONTHLY_SAVE_LIMIT: Record<string, number | null> = {
  FREE: 0,
  PRO: 5,
  ENTERPRISE: null, // unlimited
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = session.user.role === "ADMIN" ? "ENTERPRISE" : session.user.planTier;
  const saveLimit = MONTHLY_SAVE_LIMIT[plan] ?? null;

  // FREE: cannot save at all
  if (saveLimit === 0) {
    return NextResponse.json(
      { error: "Plano Gratuito não permite salvar cálculos. Faça upgrade para o plano PRO." },
      { status: 403 }
    );
  }

  // PRO: max 5/month
  if (saveLimit !== null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const used = await prisma.calculation.count({
      where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
    });
    if (used >= saveLimit) {
      return NextResponse.json(
        { error: `Limite de ${saveLimit} salvamentos por mês atingido. Faça upgrade para o plano Empresarial.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculation = await (prisma.calculation.create as any)({
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
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
      tipoRescisao: data.tipoRescisao,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = searchParams.get("type") as any;
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
