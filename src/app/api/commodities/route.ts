import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000;

// ─── Dólar via Yahoo Finance ──────────────────────────────────────────
async function fetchUsdBrl(): Promise<number> {
  try {
    const url = "https://query2.finance.yahoo.com/v8/finance/chart/BRL=X?interval=1d&range=1d";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TributoRural/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return 5.8;
    const json = await res.json();
    return (json?.chart?.result?.[0]?.meta?.regularMarketPrice as number) ?? 5.8;
  } catch {
    return 5.8;
  }
}

// ─── B3 commodities ───────────────────────────────────────────────────
// Mês-código padrão CBOT/B3 (igual ao CME)
const MONTH_CODES = ["F","G","H","J","K","M","N","Q","U","V","X","Z"];

const B3_CONTRACTS = [
  { root: "BGI", label: "Boi Gordo", unit: "R$/arroba",  usdQuoted: false },
  { root: "CCM", label: "Milho",     unit: "R$/sc 60kg", usdQuoted: false },
  { root: "ICF", label: "Café",      unit: "R$/sc 60kg", usdQuoted: false },
  // Soja na B3 é cotada em USD/saca — converte com BRL=X
  { root: "SJC", label: "Soja",      unit: "R$/sc 60kg", usdQuoted: true  },
] as const;

async function fetchB3(symbol: string): Promise<{ price: number; variation: number } | null> {
  try {
    const url = `https://cotacao.b3.com.br/mds/api/v1/InstrumentQuotation/${symbol}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.b3.com.br/",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Aceita tanto com quanto sem verificação de BizSts
    if (json?.BizSts?.cd && json.BizSts.cd !== "OK") return null;
    const scty = json?.Trad?.[0]?.scty;
    if (!scty) return null;
    const qtn = scty.SctyQtn;
    // Tenta diferentes campos de preço
    const price = qtn?.curPrc ?? qtn?.lstPrc ?? qtn?.opnPrc;
    if (!price || price <= 0) return null;
    // prcFlcn já vem em % na B3 (ex: -0.25 = -0.25%)
    const variation = qtn?.prcFlcn ?? 0;
    return { price: Number(price), variation: Number(variation) };
  } catch {
    return null;
  }
}

async function findFrontMonth(root: string): Promise<{ symbol: string; price: number; variation: number } | null> {
  const now = new Date();
  // Testa os próximos 6 vencimentos a partir do mês atual
  const candidates = Array.from({ length: 6 }, (_, i) => {
    const mi = (now.getMonth() + i) % 12;
    const yr = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
    return `${root}${MONTH_CODES[mi]}${String(yr).slice(-2)}`;
  });

  const results = await Promise.allSettled(candidates.map((sym) => fetchB3(sym).then((r) => ({ sym, r }))));
  for (const res of results) {
    if (res.status === "fulfilled" && res.value.r) {
      return { symbol: res.value.sym, ...res.value.r };
    }
  }
  return null;
}

// ─── Result shape ─────────────────────────────────────────────────────
export type CommodityRow = {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  source: "B3" | "FX";
};

async function buildData(): Promise<CommodityRow[]> {
  const [usdBrl, ...b3Results] = await Promise.all([
    fetchUsdBrl(),
    ...B3_CONTRACTS.map((c) => findFrontMonth(c.root).then((r) => ({ cfg: c, r }))),
  ]);

  const rows: CommodityRow[] = [];

  // Dólar
  rows.push({
    symbol: "BRL=X",
    label: "Dólar",
    unit: "R$/USD",
    price: parseFloat(usdBrl.toFixed(4)),
    variation: 0, // variação do dólar calculada abaixo se necessário
    source: "FX",
  });

  // Commodities B3
  for (const { cfg, r } of b3Results) {
    if (!r) continue;
    let price = r.price;
    // SJC cotada em USD → converte para BRL
    if (cfg.usdQuoted) {
      price = parseFloat((r.price * usdBrl).toFixed(2));
    } else {
      price = parseFloat(r.price.toFixed(2));
    }
    rows.push({
      symbol: r.symbol,
      label: cfg.label,
      unit: cfg.unit,
      price,
      variation: parseFloat(r.variation.toFixed(2)),
      source: "B3",
    });
  }

  return rows;
}

// ─── API Handlers ─────────────────────────────────────────────────────
async function isPro(userId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: { select: { tier: true } } },
  });
  return ["PRO", "ENTERPRISE"].includes(sub?.plan.tier ?? "FREE");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPro(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "PRO required" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = await (prisma.commodityCache as any).findUnique({ where: { id: "main" } });
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: false });
  }

  try {
    const data = await buildData();
    const fetchedAt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.commodityCache as any).upsert({
      where: { id: "main" },
      create: { id: "main", data, fetchedAt },
      update: { data, fetchedAt },
    });
    return NextResponse.json({ data, fetchedAt, stale: false });
  } catch {
    if (cached) return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: true });
    return NextResponse.json({ error: "Erro ao buscar cotações" }, { status: 502 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPro(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "PRO required" }, { status: 403 });
  }

  try {
    const data = await buildData();
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
      { error: err instanceof Error ? err.message : "Erro ao atualizar" },
      { status: 502 }
    );
  }
}
