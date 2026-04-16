import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateRuralTax } from "@/lib/tax/ruralTax";
import { z } from "zod";
import type { BrazilianState } from "@/types/prisma";

const schema = z.object({
  productId: z.string(),
  originState: z.string(),
  destState: z.string(),
  saleValue: z.number().positive(),
  funruralType: z.enum(["funrural-pf", "funrural-pj"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  // Enforce FREE plan monthly calculation limit (skip for admins)
  if (session.user.planTier === "FREE" && session.user.role !== "ADMIN") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthCount = await prisma.calculation.count({
      where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
    });
    if (monthCount >= 5) {
      return NextResponse.json(
        { error: "Limite de 5 cálculos por mês atingido. Faça upgrade para o plano PRO." },
        { status: 403 }
      );
    }
  }

  const { productId, originState, destState, saleValue, funruralType } = parsed.data;

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
    prisma.funruralRate.findUnique({ where: { id: funruralType } }),
  ]);

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  if (!icmsRate) return NextResponse.json({ error: "Alíquota ICMS não encontrada" }, { status: 404 });
  if (!funrural) return NextResponse.json({ error: "Taxa FUNRURAL não encontrada" }, { status: 404 });

  const result = calculateRuralTax({
    saleValue,
    icmsRate: Number(icmsRate.rate),
    pisRate: Number(product.pisRate),
    cofinsRate: Number(product.cofinsRate),
    funruralRate: Number(funrural.rate),
  });

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
      funruralType,
    },
  });
}
