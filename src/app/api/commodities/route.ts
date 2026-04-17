import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000;

// ─── Yahoo Finance — todas as fontes ─────────────────────────────────
// Preços CBOT/ICE em USX (centavos de dólar) por unidade.
// isBrl=true → preço já em BRL (ex: futuros brasileiros no Yahoo)
const YAHOO_COMMODITIES = [
  // FX
  { symbol: "BRL=X",  label: "Dólar",      unit: "R$/USD",     isFx: true,  isBrl: false, lbPerUnit: null,    bushelPerUnit: null,   kgPerUnit: null   },
  // CBOT (USX/bushel)
  { symbol: "ZS=F",   label: "Soja",       unit: "/sc 60kg",   isFx: false, isBrl: false, lbPerUnit: null,    bushelPerUnit: 2.2046, kgPerUnit: null   },
  { symbol: "ZW=F",   label: "Trigo",      unit: "/sc 60kg",   isFx: false, isBrl: false, lbPerUnit: null,    bushelPerUnit: 2.2046, kgPerUnit: null   },
  { symbol: "ZC=F",   label: "Milho",      unit: "/sc 60kg",   isFx: false, isBrl: false, lbPerUnit: null,    bushelPerUnit: 2.3628, kgPerUnit: null   },
  // ICE
  { symbol: "KC=F",   label: "Café",       unit: "/sc 60kg",   isFx: false, isBrl: false, lbPerUnit: 132.277, bushelPerUnit: null,   kgPerUnit: null   },
  { symbol: "SB=F",   label: "Açúcar",     unit: "/sc 50kg",   isFx: false, isBrl: false, lbPerUnit: 110.231, bushelPerUnit: null,   kgPerUnit: null   },
  { symbol: "CT=F",   label: "Algodão",    unit: "/arroba",    isFx: false, isBrl: false, lbPerUnit: 33.069,  bushelPerUnit: null,   kgPerUnit: null   },
  // CME Live Cattle (proxy para Boi Gordo) — USX/lb, 1 arroba=15kg=33.069lb
  { symbol: "LE=F",   label: "Boi Gordo",  unit: "/arroba",    isFx: false, isBrl: false, lbPerUnit: 33.069,  bushelPerUnit: null,   kgPerUnit: null   },
] as const;

async function fetchYahoo(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TributoRural/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol}: ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`Yahoo ${symbol}: no data`);
  return {
    price: meta.regularMarketPrice as number,
    prev: (meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.regularMarketPrice) as number,
  };
}

// ─── Result shape ────────────────────────────────────────────────────
export type CommodityRow = {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  source: "CBOT" | "ICE" | "CME" | "FX";
};

async function buildData(): Promise<CommodityRow[]> {
  const yahooResults = await Promise.allSettled(
    YAHOO_COMMODITIES.map((c) => fetchYahoo(c.symbol))
  );

  // USD/BRL rate (BRL=X is first item)
  const fxRes = yahooResults[0];
  const usdBrl = fxRes.status === "fulfilled" ? fxRes.value.price : 5.8;

  const rows: CommodityRow[] = [];

  for (let i = 0; i < YAHOO_COMMODITIES.length; i++) {
    const cfg = YAHOO_COMMODITIES[i];
    const res = yahooResults[i];
    if (res.status === "rejected") continue;

    const { price: raw, prev: rawPrev } = res.value;
    const variation = rawPrev !== 0 ? ((raw - rawPrev) / rawPrev) * 100 : 0;

    if (cfg.isFx) {
      rows.push({
        symbol: cfg.symbol,
        label: cfg.label,
        unit: cfg.unit,
        price: parseFloat(raw.toFixed(4)),
        variation: parseFloat(variation.toFixed(2)),
        source: "FX",
      });
      continue;
    }

    // USX (centavos de dólar) → BRL por unidade de medida brasileira
    const priceUSD = raw / 100;
    const prevUSD  = rawPrev / 100;
    let priceBRL: number, prevBRL: number;

    if (cfg.bushelPerUnit) {
      // ex: 1 saca 60kg soja = 2.2046 bushels
      priceBRL = priceUSD * usdBrl * cfg.bushelPerUnit;
      prevBRL  = prevUSD  * usdBrl * cfg.bushelPerUnit;
    } else if (cfg.lbPerUnit) {
      // ex: 1 arroba 15kg = 33.069 lbs; 1 sc café 60kg = 132.277 lbs
      priceBRL = priceUSD * usdBrl * cfg.lbPerUnit;
      prevBRL  = prevUSD  * usdBrl * cfg.lbPerUnit;
    } else continue;

    const brlVariation = prevBRL !== 0 ? ((priceBRL - prevBRL) / prevBRL) * 100 : 0;
    const source: CommodityRow["source"] = ["SB=F", "CT=F", "KC=F"].includes(cfg.symbol)
      ? "ICE"
      : cfg.symbol === "LE=F"
        ? "CME"
        : "CBOT";

    rows.push({
      symbol: cfg.symbol,
      label: cfg.label,
      unit: cfg.unit,
      price: parseFloat(priceBRL.toFixed(2)),
      variation: parseFloat(brlVariation.toFixed(2)),
      source,
    });
  }

  return rows;
}

// ─── API Handlers ────────────────────────────────────────────────────
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
