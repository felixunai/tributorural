import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30 * 60 * 1000;

// ─── B3 (BRL direct) ───────────────────────────────────────────────
// Month codes used by B3 futures contracts
const B3_MONTH_CODES = ["F","G","H","J","K","M","N","Q","U","V","X","Z"];

const B3_ROOTS = [
  { root: "BGI", label: "Boi Gordo", unit: "R$/arroba",  usdPerUnit: null  },
  { root: "CCM", label: "Milho",     unit: "R$/sc 60kg", usdPerUnit: null  },
  { root: "ICF", label: "Café",      unit: "R$/sc 60kg", usdPerUnit: null  },
  { root: "ETH", label: "Etanol",    unit: "R$/m³",      usdPerUnit: null  },
  // SJC is quoted in USD/saca on B3 — needs USD→BRL conversion
  { root: "SJC", label: "Soja",      unit: "R$/sc 60kg", usdPerUnit: true  },
] as const;

async function fetchB3Symbol(symbol: string) {
  const url = `https://cotacao.b3.com.br/mds/api/v1/InstrumentQuotation/${symbol}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TributoRural/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json?.BizSts?.cd !== "OK") return null;
  const scty = json?.Trad?.[0]?.scty;
  if (!scty?.SctyQtn?.curPrc) return null;
  return {
    symbol: scty.symb as string,
    price: scty.SctyQtn.curPrc as number,
    variation: scty.SctyQtn.prcFlcn as number, // already in % (e.g. -0.11 = -0.11%)
  };
}

async function findFrontMonthB3(root: string) {
  const now = new Date();
  const monthIndex = now.getMonth(); // 0–11
  const year = now.getFullYear();

  // Build 6 candidate symbols starting from current month
  const candidates = Array.from({ length: 6 }, (_, i) => {
    const mi = (monthIndex + i) % 12;
    const yr = year + Math.floor((monthIndex + i) / 12);
    return `${root}${B3_MONTH_CODES[mi]}${String(yr).slice(-2)}`;
  });

  // Try all 6 in parallel, return nearest month that is OK
  const results = await Promise.allSettled(candidates.map(fetchB3Symbol));
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }
  return null;
}

// ─── Yahoo Finance / CBOT / ICE (USD → BRL) ─────────────────────────
const YAHOO_COMMODITIES = [
  { symbol: "BRL=X",  label: "Dólar",   unit: "R$/USD",    isFx: true,  lbPerUnit: null, bushelPerUnit: null },
  { symbol: "ZS=F",   label: "Soja",    unit: "sc 60kg",   isFx: false, lbPerUnit: null, bushelPerUnit: 2.2046 },
  { symbol: "ZW=F",   label: "Trigo",   unit: "sc 60kg",   isFx: false, lbPerUnit: null, bushelPerUnit: 2.2046 },
  { symbol: "SB=F",   label: "Açúcar",  unit: "sc 50kg",   isFx: false, lbPerUnit: 110.231, bushelPerUnit: null },
  { symbol: "CT=F",   label: "Algodão", unit: "arroba",    isFx: false, lbPerUnit: 33.069,  bushelPerUnit: null },
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
  source: "B3" | "CBOT" | "ICE" | "FX";
};

async function buildData(): Promise<CommodityRow[]> {
  // Fetch B3 contracts and Yahoo Finance in parallel
  const [b3Results, yahooResults] = await Promise.all([
    Promise.allSettled(B3_ROOTS.map((c) => findFrontMonthB3(c.root).then((r) => ({ cfg: c, r })))),
    Promise.allSettled(YAHOO_COMMODITIES.map((c) => fetchYahoo(c.symbol))),
  ]);

  // USD/BRL rate (BRL=X is first Yahoo item)
  const fxRes = yahooResults[0];
  const usdBrl = fxRes.status === "fulfilled" ? fxRes.value.price : 5.0;

  const rows: CommodityRow[] = [];

  // ── B3 contracts ──
  for (const res of b3Results) {
    if (res.status === "rejected" || !res.value.r) continue;
    const { cfg, r } = res.value;

    let price = r.price;
    let variation = r.variation; // already in %

    // SJC is quoted in USD/saca — convert to BRL
    if (cfg.usdPerUnit) {
      price = parseFloat((r.price * usdBrl).toFixed(2));
      // variation % stays the same (USD price % ≈ BRL price %)
    } else {
      price = parseFloat(r.price.toFixed(2));
    }

    rows.push({
      symbol: r.symbol,
      label: cfg.label,
      unit: cfg.unit,
      price,
      variation: parseFloat(variation.toFixed(2)),
      source: "B3",
    });
  }

  // ── Yahoo Finance (CBOT / ICE / FX) ──
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

    // USX → BRL
    const priceUSD = raw / 100;
    const prevUSD  = rawPrev / 100;
    let priceBRL: number, prevBRL: number;

    if (cfg.bushelPerUnit) {
      priceBRL = priceUSD * usdBrl * cfg.bushelPerUnit;
      prevBRL  = prevUSD  * usdBrl * cfg.bushelPerUnit;
    } else if (cfg.lbPerUnit) {
      priceBRL = priceUSD * usdBrl * cfg.lbPerUnit;
      prevBRL  = prevUSD  * usdBrl * cfg.lbPerUnit;
    } else continue;

    const brlVariation = prevBRL !== 0 ? ((priceBRL - prevBRL) / prevBRL) * 100 : 0;
    const source = ["SB=F", "CT=F"].includes(cfg.symbol) ? "ICE" : "CBOT";

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
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
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
  if (!["PRO", "ENTERPRISE"].includes(session.user.planTier)) {
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
