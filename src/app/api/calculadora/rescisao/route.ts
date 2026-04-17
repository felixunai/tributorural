import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calcRescisao } from "@/lib/tax/rescisao";
import { getActiveTaxConfig } from "@/lib/tax/taxConfig";

const schema = z.object({
  grossSalary: z.number().positive(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipoRescisao: z.enum(["SEM_JUSTA_CAUSA", "COM_JUSTA_CAUSA", "PEDIDO_DEMISSAO", "ACORDO_MUTUO"]),
  avisoPrevioTrabalhado: z.boolean(),
  feriasVencidasPeriodos: z.number().int().min(0).max(5),
  fgtsBalance: z.number().nonnegative().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: { select: { tier: true } } },
  });
  const planTier = session.user.role === "ADMIN" ? "ENTERPRISE" : (sub?.plan.tier ?? "FREE");

  if (!["PRO", "ENTERPRISE"].includes(planTier)) {
    return NextResponse.json({ error: "Requer plano Profissional" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const taxCfg = await getActiveTaxConfig();
  const result = calcRescisao(parsed.data, taxCfg);

  return NextResponse.json({
    result,
    snapshot: {
      tipoRescisao: parsed.data.tipoRescisao,
      admissionDate: parsed.data.admissionDate,
      terminationDate: parsed.data.terminationDate,
      avisoPrevioTrabalhado: parsed.data.avisoPrevioTrabalhado,
      feriasVencidasPeriodos: parsed.data.feriasVencidasPeriodos,
      fgtsBalance: parsed.data.fgtsBalance ?? null,
    },
  });
}
