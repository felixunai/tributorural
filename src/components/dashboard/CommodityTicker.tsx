"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommodityItem {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  isFx?: boolean;
}

interface ApiResponse {
  data: CommodityItem[];
  fetchedAt: string;
  stale?: boolean;
  error?: string;
}

function formatPrice(price: number, isFx?: boolean) {
  const decimals = isFx ? 4 : 2;
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function TickerItem({ item }: { item: CommodityItem }) {
  const positive = item.variation > 0;
  const neutral = item.variation === 0;

  return (
    <div className="flex items-center gap-2 px-5 shrink-0 select-none">
      <span className="text-xs font-semibold text-white/80 tracking-wide whitespace-nowrap">
        {item.label}
      </span>

      <span className="text-sm font-bold text-white whitespace-nowrap">
        {item.isFx ? (
          <>R$ {formatPrice(item.price, true)}</>
        ) : (
          <>R$ {formatPrice(item.price)}</>
        )}
      </span>

      {!item.isFx && (
        <span className="text-[10px] text-white/40 whitespace-nowrap">{item.unit}</span>
      )}

      <span
        className={`flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap ${
          neutral ? "text-white/40" : positive ? "text-emerald-300" : "text-red-300"
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
      <span className="ml-3 text-white/15 text-lg leading-none shrink-0">·</span>
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
    return <div className="h-10 bg-neutral-900 rounded-xl animate-pulse" />;
  }

  if (!state?.data?.length) return null;

  const items = state.data;
  const updatedAt = state.fetchedAt
    ? format(new Date(state.fetchedAt), "HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-white/5 shadow-sm">
      <div className="flex items-center h-10">
        {/* Label badge */}
        <div className="shrink-0 flex items-center px-3 h-full bg-primary/90 text-primary-foreground text-[11px] font-bold tracking-widest uppercase rounded-l-xl z-10 whitespace-nowrap">
          Cotações
        </div>

        {/* Scrolling area */}
        <div className="flex-1 overflow-hidden">
          <div className="animate-commodity-marquee flex w-max">
            {items.map((item) => (
              <TickerItem key={item.symbol} item={item} />
            ))}
            {/* Duplicate for seamless infinite loop */}
            {items.map((item) => (
              <TickerItem key={`${item.symbol}-b`} item={item} />
            ))}
          </div>
        </div>

        {/* Right: updated time + refresh */}
        <div className="shrink-0 flex items-center gap-2 px-3 border-l border-white/10 h-full">
          {updatedAt && (
            <span className="text-[10px] text-white/30 hidden lg:block whitespace-nowrap">
              {state.stale ? "⚠ " : ""}CBOT/ICE · {updatedAt}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Atualizar cotações"
            className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-30 p-1 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
