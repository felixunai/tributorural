"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommodityItem {
  symbol: string;
  name: string;
  description: string;
  location?: string;
  price: number;
  variation: number;
}

interface ApiResponse {
  data: CommodityItem[];
  fetchedAt: string;
  stale?: boolean;
  error?: string;
}

// Display names and units that are more readable
const DISPLAY: Record<string, { label: string; unit: string }> = {
  soja:     { label: "Soja",       unit: "sc 60kg" },
  milho:    { label: "Milho",      unit: "sc 60kg" },
  boi:      { label: "Boi Gordo",  unit: "@ 15kg" },
  cafe:     { label: "Café",       unit: "sc 60kg" },
  acucar:   { label: "Açúcar",     unit: "sc 50kg" },
  algodao:  { label: "Algodão",    unit: "@ 15kg" },
  frango:   { label: "Frango",     unit: "kg" },
  trigo:    { label: "Trigo",      unit: "sc 60kg" },
  etanol:   { label: "Etanol",     unit: "m³" },
};

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TickerItem({ item }: { item: CommodityItem }) {
  const display = DISPLAY[item.symbol] ?? { label: item.name, unit: "" };
  const positive = item.variation > 0;
  const neutral = item.variation === 0;

  return (
    <div className="flex items-center gap-2 px-5 shrink-0 select-none">
      <span className="text-xs font-semibold text-white/90 tracking-wide">
        {display.label}
      </span>
      <span className="text-sm font-bold text-white">
        R$ {formatPrice(item.price)}
      </span>
      {display.unit && (
        <span className="text-[10px] text-white/50">{display.unit}</span>
      )}
      <span
        className={`flex items-center gap-0.5 text-xs font-semibold ${
          neutral ? "text-white/50" : positive ? "text-emerald-300" : "text-red-300"
        }`}
      >
        {neutral ? (
          <Minus className="h-3 w-3" />
        ) : positive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {positive ? "+" : ""}
        {item.variation.toFixed(2)}%
      </span>

      {/* Separator */}
      <span className="ml-3 text-white/20 text-lg leading-none">·</span>
    </div>
  );
}

export function CommodityTicker() {
  const [state, setState] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/commodities", {
        method: forceRefresh ? "POST" : "GET",
      });
      if (!res.ok) return;
      const json: ApiResponse = await res.json();
      setState(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="h-10 bg-neutral-900 rounded-xl animate-pulse" />
    );
  }

  if (!state?.data?.length) return null;

  const items = state.data;
  const updatedAt = state.fetchedAt
    ? format(new Date(state.fetchedAt), "HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-white/5 shadow-sm">
      <div className="flex items-center">
        {/* Label badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary/90 text-primary-foreground text-[11px] font-bold tracking-widest uppercase rounded-l-xl z-10 h-full">
          <span className="hidden sm:inline">Cotações</span>
          <span className="sm:hidden">B3</span>
        </div>

        {/* Scrolling area */}
        <div className="flex-1 overflow-hidden py-2">
          <div className="animate-commodity-marquee flex w-max">
            {/* First copy */}
            {items.map((item) => (
              <TickerItem key={item.symbol} item={item} />
            ))}
            {/* Duplicate for seamless loop */}
            {items.map((item) => (
              <TickerItem key={`${item.symbol}-dup`} item={item} />
            ))}
          </div>
        </div>

        {/* Right side: updated time + refresh */}
        <div className="shrink-0 flex items-center gap-2 px-3 border-l border-white/10">
          {updatedAt && (
            <span className="text-[10px] text-white/40 hidden md:block whitespace-nowrap">
              {state.stale ? "⚠ " : ""}Atualizado às {updatedAt}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Atualizar cotações"
            className="text-white/40 hover:text-white/80 transition-colors disabled:opacity-30 p-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
