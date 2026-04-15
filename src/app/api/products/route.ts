import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const products = await prisma.ruralProduct.findMany({
    where: { isActive: true },
    select: { id: true, name: true, ncmCode: true, category: true, pisRate: true, cofinsRate: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

const createSchema = z.object({
  name: z.string().min(2),
  ncmCode: z.string().length(8),
  description: z.string().optional(),
  pisRate: z.number().min(0).max(1),
  cofinsRate: z.number().min(0).max(1),
  category: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const product = await prisma.ruralProduct.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
