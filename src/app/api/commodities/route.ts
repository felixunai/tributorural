import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hgUrl() {
  const key = process.env.HGBRASIL_API_KEY;
  return `https://api.hgbrasil.com/commodities?key=${key}&format=json-cors`;
}

async function fetchFromHG() {
  const res = await fetch(hgUrl(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HG Brasil responded ${res.status}`);
  const json = await res.json();
  if (!json.valid_key) throw new Error("Chave HG Brasil inválida");
  return json.results as unknown[];
}

// GET — returns cached or fresh commodity data (PRO+ only)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 });
  }

  // Try cache first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = await (prisma.commodityCache as any).findUnique({ where: { id: "main" } });
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: false });
  }

  try {
    const data = await fetchFromHG();
    const fetchedAt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.commodityCache as any).upsert({
      where: { id: "main" },
      create: { id: "main", data, fetchedAt },
      update: { data, fetchedAt },
    });
    return NextResponse.json({ data, fetchedAt, stale: false });
  } catch {
    // Return stale cache if fetch fails
    if (cached) {
      return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: true });
    }
    return NextResponse.json({ error: "Erro ao buscar cotações" }, { status: 502 });
  }
}

// POST — force refresh, bypasses cache
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 });
  }

  try {
    const data = await fetchFromHG();
    const fetchedAt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.commodityCache as any).upsert({
      where: { id: "main" },
      create: { id: "main", data, fetchedAt },
      update: { data, fetchedAt },
    });
    return NextResponse.json({ data, fetchedAt, stale: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar cotações" },
      { status: 502 }
    );
  }
}
