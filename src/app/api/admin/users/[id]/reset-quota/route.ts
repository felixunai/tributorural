import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const yearMonth = format(new Date(), "yyyy-MM");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.ruralCalcUsage as any).deleteMany({
    where: { userId, yearMonth },
  });

  return NextResponse.json({ ok: true, yearMonth });
}
