import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateRhClt } from "@/lib/tax/rhClt";
import { z } from "zod";

const schema = z.object({
  grossSalary: z.number().positive(),
  ratFapRate: z.number().min(0.01).max(0.03),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.planTier === "FREE" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Calculadora CLT requer plano PRO ou superior" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const result = calculateRhClt(parsed.data);

  return NextResponse.json({
    result,
    snapshot: {
      grossSalary: parsed.data.grossSalary,
      ratFapRate: parsed.data.ratFapRate,
      inssRate: 0.20,
      fgtsRate: 0.08,
      sistemaSRate: 0.033,
    },
  });
}
