"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface CommodityItem {
  symbol: string;
  label: string;
  unit: string;
  price: number;
  variation: number;
  source: "B3" | "FX";
  isFx?: boolean;
}

interface ApiResponse {
  data: CommodityItem[];
  fetchedAt: string;
  stale?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  B3: "bg-blue-600/80 text-blue-100",
  FX: "bg-emerald-700/80 text-emerald-100",
};

function formatPrice(price: number, source: string) {
  if (source === "FX") {
    return price.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TickerItem({ item }: { item: CommodityItem }) {
  const positive = item.variation > 0;
  const neutral  = item.variation === 0;
  return (
    <div className="flex items-center gap-2 px-4 shrink-0 select-none">
      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${SOURCE_COLORS[item.source]}`}>
        {item.source}
      </span>
      <span className="text-xs font-semibold text-white/80 whitespace-nowrap">
        {item.label}
      </span>
      <span className="text-sm font-bold text-white whitespace-nowrap">
        R$ {formatPrice(item.price, item.source)}
      </span>
      {item.source !== "FX" && (
        <span className="text-[10px] text-white/35 whitespace-nowrap">{item.unit}</span>
      )}
      <span
        className={`flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap ${
          neutral ? "text-white/35" : positive ? "text-emerald-300" : "text-red-300"
        }`}
      >
        {neutral ? <Minus className="h-3 w-3" /> : positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}
        {item.variation.toFixed(2)}%
      </span>
      <span className="ml-2 text-white/10 text-lg leading-none shrink-0">·</span>
    </div>
  );
}

// ── Teaser shown for FREE plan ──────────────────────────────────────
export function CommodityTickerLocked() {
  return (
    <div className="overflow-hidden rounded-xl bg-neutral-900 border border-neutral-700 shadow-sm">
      <div className="flex items-center h-10">
        <div className="shrink-0 flex items-center px-3 h-full bg-neutral-700 text-neutral-300 text-[11px] font-bold tracking-widest uppercase rounded-l-xl whitespace-nowrap">
          Cotações
        </div>
        <div className="flex-1 flex items-center gap-3 px-4 overflow-hidden">
          <Lock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          <p className="text-xs text-neutral-300 truncate">
            Cotações de commodities em tempo real disponíveis a partir do{" "}
            <Link href="/pricing" className="text-primary hover:text-primary/80 font-semibold underline underline-offset-2 transition-colors">
              Plano PRO
            </Link>
            {" "}— Boi Gordo · Milho · Café · Soja · Açúcar · e mais
          </p>
        </div>
        <div className="shrink-0 px-3">
          <Link
            href="/pricing"
            className="text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Live ticker for PRO ──────────────────────────────────────────────
const SCROLL_SPEED = 0.6; // px per frame (~36px/s at 60fps)

export function CommodityTicker() {
  const [state, setState] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number | null>(null);
  const pausedRef = useRef(false);   // ref so RAF closure always sees current value
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const dragging  = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/commodities", { method: forceRefresh ? "POST" : "GET" });
      if (!res.ok) return;
      setState(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll loop (JS-driven so it can be paused/resumed cleanly)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !state?.data?.length) return;

    function step() {
      if (!el) return;
      if (!pausedRef.current) {
        el.scrollLeft += SCROLL_SPEED;
        // Seamless loop: content is duplicated, so at halfway point reset to 0
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state]);

  function pauseScroll() {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }

  function scheduleResume() {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 2500);
  }

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartScroll.current = scrollRef.current?.scrollLeft ?? 0;
    pauseScroll();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !scrollRef.current) return;
    e.preventDefault();
    const dx = dragStartX.current - e.clientX;
    scrollRef.current.scrollLeft = dragStartScroll.current + dx;
  }

  function onMouseUp() {
    dragging.current = false;
    scheduleResume();
  }

  function onMouseLeave() {
    if (dragging.current) { dragging.current = false; scheduleResume(); }
  }

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    dragStartX.current = e.touches[0].clientX;
    dragStartScroll.current = scrollRef.current?.scrollLeft ?? 0;
    pauseScroll();
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!scrollRef.current) return;
    const dx = dragStartX.current - e.touches[0].clientX;
    scrollRef.current.scrollLeft = dragStartScroll.current + dx;
  }

  function onTouchEnd() { scheduleResume(); }

  // Arrow buttons
  function scrollByAmount(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    pauseScroll();
    el.scrollLeft += dir === "right" ? 220 : -220;
    scheduleResume();
  }

  if (loading) return <div className="h-10 bg-neutral-900 rounded-xl animate-pulse" />;
  if (!state?.data?.length) return null;

  const updatedAt = state.fetchedAt
    ? format(new Date(state.fetchedAt), "HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-white/5 shadow-sm group">
      <div className="flex items-center h-10">
        {/* Label */}
        <div className="shrink-0 flex items-center px-3 h-full bg-primary/90 text-primary-foreground text-[11px] font-bold tracking-widest uppercase rounded-l-xl whitespace-nowrap z-10">
          Cotações
        </div>

        {/* Arrow left — visible on hover */}
        <button
          onClick={() => scrollByAmount("left")}
          className="shrink-0 h-full px-1.5 text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors z-10 opacity-0 group-hover:opacity-100"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Ticker strip */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex w-max">
            {state.data.map((item) => <TickerItem key={item.symbol} item={item} />)}
            {state.data.map((item) => <TickerItem key={`${item.symbol}-b`} item={item} />)}
          </div>
        </div>

        {/* Arrow right */}
        <button
          onClick={() => scrollByAmount("right")}
          className="shrink-0 h-full px-1.5 text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors z-10 opacity-0 group-hover:opacity-100"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Time + refresh */}
        <div className="shrink-0 flex items-center gap-2 px-3 border-l border-white/10 h-full">
          {updatedAt && (
            <span className="text-[10px] text-white/30 hidden lg:block whitespace-nowrap">
              {state.stale ? "⚠ " : ""}{updatedAt}
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
