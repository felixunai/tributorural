import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateTaxCache } from "@/lib/tax/taxConfig";

const bracketSchema = z.object({
  type: z.enum(["INSS_EMPLOYEE", "IRRF_MONTHLY"]),
  effectiveDate: z.string(),
  data: z.any(),
  notes: z.string().optional(),
});

const activateSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await (prisma as any).taxBracket.findMany({
    orderBy: [{ type: "asc" }, { effectiveDate: "desc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = bracketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Deactivate existing records of same type
  await (prisma as any).taxBracket.updateMany({
    where: { type: parsed.data.type },
    data: { isActive: false },
  });

  const row = await (prisma as any).taxBracket.create({
    data: {
      type: parsed.data.type,
      effectiveDate: new Date(parsed.data.effectiveDate),
      data: parsed.data.data,
      notes: parsed.data.notes ?? null,
      isActive: true,
    },
  });

  invalidateTaxCache();
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const target = await (prisma as any).taxBracket.findUnique({ where: { id: parsed.data.id } });
  if (!target) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (parsed.data.isActive) {
    await (prisma as any).taxBracket.updateMany({
      where: { type: target.type },
      data: { isActive: false },
    });
  }

  const row = await (prisma as any).taxBracket.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
  });

  invalidateTaxCache();
  return NextResponse.json(row);
}
