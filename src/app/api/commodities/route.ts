import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000;
const MONTH_CODES = ["F","G","H","J","K","M","N","Q","U","V","X","Z"];

const B3_CONTRACTS = [
  { root: "BGI", label: "Boi Gordo", unit: "R$/arroba",  usdQuoted: false },
  { root: "CCM", label: "Milho",     unit: "R$/sc 60kg", usdQuoted: false },
  { root: "SJC", label: "Soja",      unit: "R$/sc 60kg", usdQuoted: true  },
] as const;

// ─── B3 cotacao API ───────────────────────────────────────────────────
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
    if (json?.BizSts?.cd === "NOK") return null;
    const qtn = json?.Trad?.[0]?.scty?.SctyQtn;
    if (!qtn) return null;
    const price = qtn.curPrc ?? qtn.opngPric;
    if (!price || price <= 0) return null;
    return { price: Number(price), variation: Number(qtn.prcFlcn ?? 0) };
  } catch {
    return null;
  }
}

// Tenta vencimentos do mês atual até +7 meses em paralelo
async function findFrontMonth(root: string): Promise<{ symbol: string; price: number; variation: number } | null> {
  const now = new Date();
  const candidates = Array.from({ length: 8 }, (_, i) => {
    const mi = (now.getMonth() + i) % 12;
    const yr = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
    return `${root}${MONTH_CODES[mi]}${String(yr).slice(-2)}`;
  });
  const results = await Promise.allSettled(
    candidates.map((symbol) => fetchB3(symbol).then((r) => (r ? { symbol, ...r } : null)))
  );
  for (const res of results) {
    if (res.status === "fulfilled" && res.value) return res.value;
  }
  return null;
}

// ─── Yahoo Finance: Café (ICE KC=F) + Dólar (BRL=X) ─────────────────
// KC=F cotado em USX/libra → 1 saca 60kg = 132.277 lbs
async function fetchYahoo(symbol: string): Promise<{ price: number; prev: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TributoRural/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return {
      price: meta.regularMarketPrice as number,
      prev: (meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.regularMarketPrice) as number,
    };
  } catch {
    return null;
  }
}

// ─── Result shape ─────────────────────────────────────────────────────
export type CommodityRow = {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  source: "B3" | "ICE" | "FX";
};

async function buildData(): Promise<CommodityRow[]> {
  const [yahooFx, yahooCafe, ...b3Fetches] = await Promise.all([
    fetchYahoo("BRL=X"),
    fetchYahoo("KC=F"),
    ...B3_CONTRACTS.map((c) => findFrontMonth(c.root).then((r) => ({ cfg: c, r }))),
  ]);

  const usdBrl = yahooFx?.price ?? 5.8;
  const rows: CommodityRow[] = [];

  // Dólar
  if (yahooFx) {
    const variation = yahooFx.prev ? ((yahooFx.price - yahooFx.prev) / yahooFx.prev) * 100 : 0;
    rows.push({
      symbol: "BRL=X",
      label: "Dólar",
      unit: "R$/USD",
      price: parseFloat(yahooFx.price.toFixed(4)),
      variation: parseFloat(variation.toFixed(2)),
      source: "FX",
    });
  }

  // B3: Boi Gordo, Milho, Soja
  for (const item of b3Fetches) {
    if (!item.r) continue;
    const { cfg, r } = item;
    const price = cfg.usdQuoted
      ? parseFloat((r.price * usdBrl).toFixed(2))
      : parseFloat(r.price.toFixed(2));
    rows.push({
      symbol: r.symbol,
      label: cfg.label,
      unit: cfg.unit,
      price,
      variation: parseFloat(r.variation.toFixed(2)),
      source: "B3",
    });
  }

  // Café — ICE KC=F (B3/ICF sem liquidez)
  if (yahooCafe) {
    const pricePerSaca = (yahooCafe.price / 100) * usdBrl * 132.277;
    const prevPerSaca  = (yahooCafe.prev  / 100) * usdBrl * 132.277;
    const variation = prevPerSaca ? ((pricePerSaca - prevPerSaca) / prevPerSaca) * 100 : 0;
    rows.push({
      symbol: "KC=F",
      label: "Café",
      unit: "R$/sc 60kg",
      price: parseFloat(pricePerSaca.toFixed(2)),
      variation: parseFloat(variation.toFixed(2)),
      source: "ICE",
    });
  }

  return rows;
}

// ─── Cache helpers ────────────────────────────────────────────────────
async function readCache() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (prisma.commodityCache as any).findUnique({ where: { id: "main" } });
  } catch {
    return null;
  }
}

async function writeCache(data: CommodityRow[]) {
  const fetchedAt = new Date();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.commodityCache as any).upsert({
      where: { id: "main" },
      create: { id: "main", data, fetchedAt },
      update: { data, fetchedAt },
    });
  } catch {
    // silently ignore if CommodityCache table not yet migrated
  }
  return fetchedAt;
}

// ─── Auth helper ──────────────────────────────────────────────────────
async function isPro(userId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: { select: { tier: true } } },
  });
  return ["PRO", "ENTERPRISE"].includes(sub?.plan.tier ?? "FREE");
}

// ─── API Handlers ─────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPro(session.user.id, session.user.role))) {
    return NextResponse.json({ error: "PRO required" }, { status: 403 });
  }

  const cached = await readCache();
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: false });
  }

  try {
    const data = await buildData();
    const fetchedAt = await writeCache(data);
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
    const fetchedAt = await writeCache(data);
    return NextResponse.json({ data, fetchedAt, stale: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao atualizar" },
      { status: 502 }
    );
  }
}
