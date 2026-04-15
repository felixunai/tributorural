import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { BrazilianState } from "@/types/prisma";

export async function GET() {
  const rates = await prisma.icmsRate.findMany({
    orderBy: [{ originState: "asc" }, { destinationState: "asc" }],
  });
  return NextResponse.json(rates);
}

const updateSchema = z.array(
  z.object({
    originState: z.string(),
    destinationState: z.string(),
    rate: z.number().min(0).max(1),
  })
);

export async function PUT(req: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const updates = await Promise.all(
    parsed.data.map((item) =>
      prisma.icmsRate.upsert({
        where: {
          originState_destinationState: {
            originState: item.originState as BrazilianState,
            destinationState: item.destinationState as BrazilianState,
          },
        },
        update: { rate: item.rate },
        create: {
          originState: item.originState as BrazilianState,
          destinationState: item.destinationState as BrazilianState,
          rate: item.rate,
        },
      })
    )
  );

  return NextResponse.json({ updated: updates.length });
}
