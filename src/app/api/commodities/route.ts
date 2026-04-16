import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Commodity config: symbol → label, unit, and conversion to BRL
// Prices come in USX (US cents) per their respective unit from Yahoo Finance
const COMMODITIES = [
  // symbol     label          unit          factor (converts USX → BRL/unit)
  // factor = (1/100) * bushels_or_lbs_per_unit  — applied after * USD/BRL rate
  { symbol: "BRL=X", label: "Dólar",   unit: "USD",      isFx: true  },
  { symbol: "ZS=F",  label: "Soja",    unit: "sc 60kg",  lbPerUnit: null,  bushelPerUnit: 2.2046 },
  { symbol: "ZC=F",  label: "Milho",   unit: "sc 60kg",  lbPerUnit: null,  bushelPerUnit: 2.3622 },
  { symbol: "ZW=F",  label: "Trigo",   unit: "sc 60kg",  lbPerUnit: null,  bushelPerUnit: 2.2046 },
  { symbol: "KC=F",  label: "Café",    unit: "sc 60kg",  lbPerUnit: 132.277, bushelPerUnit: null },
  { symbol: "SB=F",  label: "Açúcar",  unit: "sc 50kg",  lbPerUnit: 110.231, bushelPerUnit: null },
  { symbol: "CT=F",  label: "Algodão", unit: "@ 15kg",   lbPerUnit: 33.069,  bushelPerUnit: null },
  { symbol: "LE=F",  label: "Boi",     unit: "@ 15kg",   lbPerUnit: 33.069,  bushelPerUnit: null },
] as const;

type CommodityRow = {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  isFx?: boolean;
};

async function fetchYahoo(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TributoRural/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol}: ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Yahoo ${symbol}: no meta`);
  return {
    price: meta.regularMarketPrice as number,
    prev: (meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.regularMarketPrice) as number,
  };
}

async function buildData(): Promise<CommodityRow[]> {
  // Fetch all in parallel
  const fetches = await Promise.allSettled(
    COMMODITIES.map((c) => fetchYahoo(c.symbol))
  );

  // Get USD/BRL rate first (first item is BRL=X)
  const fxResult = fetches[0];
  const usdBrl = fxResult.status === "fulfilled" ? fxResult.value.price : 5.0;

  const rows: CommodityRow[] = [];

  for (let i = 0; i < COMMODITIES.length; i++) {
    const cfg = COMMODITIES[i];
    const result = fetches[i];
    if (result.status === "rejected") continue;

    const { price: rawPrice, prev: rawPrev } = result.value;
    const variation = rawPrev !== 0 ? ((rawPrice - rawPrev) / rawPrev) * 100 : 0;

    if ("isFx" in cfg && cfg.isFx) {
      // BRL=X: price IS the BRL value, variation as %
      rows.push({
        symbol: cfg.symbol,
        label: cfg.label,
        unit: cfg.unit,
        price: rawPrice,
        variation: parseFloat(variation.toFixed(2)),
        isFx: true,
      });
      continue;
    }

    // Convert USX → BRL
    // rawPrice is in US cents per (bushel or lb)
    const priceUSD = rawPrice / 100;
    const prevUSD = rawPrev / 100;

    let priceBRL: number;
    let prevBRL: number;

    if ("bushelPerUnit" in cfg && cfg.bushelPerUnit) {
      priceBRL = priceUSD * usdBrl * cfg.bushelPerUnit;
      prevBRL = prevUSD * usdBrl * cfg.bushelPerUnit;
    } else if ("lbPerUnit" in cfg && cfg.lbPerUnit) {
      priceBRL = priceUSD * usdBrl * cfg.lbPerUnit;
      prevBRL = prevUSD * usdBrl * cfg.lbPerUnit;
    } else {
      continue;
    }

    const brlVariation = prevBRL !== 0 ? ((priceBRL - prevBRL) / prevBRL) * 100 : 0;

    rows.push({
      symbol: cfg.symbol,
      label: cfg.label,
      unit: cfg.unit,
      price: parseFloat(priceBRL.toFixed(2)),
      variation: parseFloat(brlVariation.toFixed(2)),
    });
  }

  return rows;
}

// GET — serve from cache if fresh, otherwise fetch
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 });
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
    if (cached) {
      return NextResponse.json({ data: cached.data, fetchedAt: cached.fetchedAt, stale: true });
    }
    return NextResponse.json({ error: "Erro ao buscar cotações" }, { status: 502 });
  }
}

// POST — force refresh
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
    return NextResponse.json({ error: "Plano PRO necessário" }, { status: 403 });
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
      { error: err instanceof Error ? err.message : "Erro ao atualizar cotações" },
      { status: 502 }
    );
  }
}
