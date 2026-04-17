import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateRuralTax } from "@/lib/tax/ruralTax";
import { z } from "zod";
import { format } from "date-fns";
import type { BrazilianState } from "@/types/prisma";

const schema = z.object({
  productId: z.string(),
  originState: z.string(),
  destState: z.string(),
  saleValue: z.number().positive(),
  regimeVendedor: z.enum(["produtor-pf", "produtor-pj", "empresa-presumido", "empresa-real"]),
  icmsRegime: z.enum(["normal", "diferido", "isento"]),
});

const FREE_LIMIT = 5;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFree = session.user.planTier === "FREE" && session.user.role !== "ADMIN";
  const yearMonth = format(new Date(), "yyyy-MM");

  // Check FREE plan monthly compute limit
  if (isFree) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = await (prisma.ruralCalcUsage as any).findUnique({
      where: { userId_yearMonth: { userId: session.user.id, yearMonth } },
    });
    if ((usage?.count ?? 0) >= FREE_LIMIT) {
      return NextResponse.json(
        { error: `Limite de ${FREE_LIMIT} cálculos por mês atingido. Faça upgrade para o plano PRO.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const { productId, originState, destState, saleValue, regimeVendedor, icmsRegime } = parsed.data;

  // FUNRURAL: PF para produtor-pf, PJ para produtor-pj; empresas não recolhem
  const funruralId = regimeVendedor === "produtor-pj" ? "funrural-pj" : "funrural-pf";

  const [product, icmsRate, funrural] = await Promise.all([
    prisma.ruralProduct.findUnique({ where: { id: productId } }),
    prisma.icmsRate.findUnique({
      where: {
        originState_destinationState: {
          originState: originState as BrazilianState,
          destinationState: destState as BrazilianState,
        },
      },
    }),
    prisma.funruralRate.findUnique({ where: { id: funruralId } }),
  ]);

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  if (!icmsRate) {
    if (originState === destState) {
      return NextResponse.json(
        { error: "Para vendas intraestaduais (mesmo estado), utilize a alíquota interna do seu estado (geralmente 17% ou 18%). Esta calculadora é voltada para operações interestaduais." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Alíquota ICMS não encontrada para os estados selecionados" }, { status: 404 });
  }
  if (!funrural) return NextResponse.json({ error: "Taxa FUNRURAL não encontrada" }, { status: 404 });

  const result = calculateRuralTax({
    saleValue,
    icmsRate: Number(icmsRate.rate),
    icmsRegime,
    pisRate: Number(product.pisRate),
    cofinsRate: Number(product.cofinsRate),
    funruralRate: funrural ? Number(funrural.rate) : 0,
    regimeVendedor,
  });

  // Increment usage counter for FREE users after successful calculation
  if (isFree) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.ruralCalcUsage as any).upsert({
      where: { userId_yearMonth: { userId: session.user.id, yearMonth } },
      create: { userId: session.user.id, yearMonth, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  return NextResponse.json({
    result,
    snapshot: {
      productName: product.name,
      ncmCode: product.ncmCode,
      originState,
      destState,
      icmsRate: Number(icmsRate.rate),
      pisRate: Number(product.pisRate),
      cofinsRate: Number(product.cofinsRate),
      funruralRate: Number(funrural.rate),
      regimeVendedor,
      icmsRegime,
    },
  });
}
