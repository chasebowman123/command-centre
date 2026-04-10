import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  name: string;
}

const TICKERS = [
  { symbol: "^DJI",        label: "Dow Jones", short: "DJI"     },
  { symbol: "^IXIC",       label: "Nasdaq",    short: "NDX"     },
  { symbol: "LITE",        label: "LITE",      short: "LITE"    },
  { symbol: "FNMA",        label: "FNMA",      short: "FNMA"    },
  { symbol: "FMCC",        label: "FMCC",      short: "FMCC"    },
  { symbol: "SPX6900-USD", label: "SPX6900",   short: "SPX6900" },
];

const DEFAULT_SLOTS: [string, string, string] = ["^DJI", "^IXIC", "SPX6900-USD"];

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
const RANGE_MAP: Record<string, string> = {
  "1D": "1d", "1W": "5d", "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y",
};

function formatPrice(price: number, symbol: string, usdToGbp: number): string {
  if (symbol === "SPX6900-USD") {
    const p = price * usdToGbp;
    return `£${p < 1 ? p.toFixed(6) : p.toFixed(4)}`;
  }
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100)   return `$${price.toFixed(2)}`;
  if (price < 1)      return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

// ── Slot chart ─────────────────────────────────────────────────────────────────
function SlotChart({
  symbol, slotIndex, isActive, onClick, usdToGbp,
}: {
  symbol: string;
  slotIndex: number;
  isActive: boolean;
  onClick: () => void;
  usdToGbp: number;
}) {
  const [range, setRange] = useState<string>("1D");
  const ticker = TICKERS.find(t => t.symbol === symbol);
  const isSpx = symbol === "SPX6900-USD";

  const { data: rawHistory = [] } = useQuery<{ date: string; close: number }[]>({
    queryKey: ["/api/history", symbol, range],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/history?symbol=${encodeURIComponent(symbol)}&range=${RANGE_MAP[range]}`
      );
      return res.json();
    },
    staleTime: 300000,
    refetchInterval: 300000,
  });

  const history = isSpx
    ? rawHistory.map(p => ({ ...p, close: p.close * usdToGbp }))
    : rawHistory;

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "slot", symbol],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes?tickers=${encodeURIComponent(symbol)}`);
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const q = quotes[0];
  const displayPrice = q ? formatPrice(q.price, symbol, usdToGbp) : null;
  const isPositive = q ? q.changesPercentage >= 0 : true;

  const firstClose  = history.length > 0 ? history[0].close : 0;
  const lastClose   = history.length > 0 ? history[history.length - 1].close : 0;
  const rangeChange = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const rangePos    = rangeChange >= 0;
  const lineColor   = rangePos ? "#22c55e" : "#ef4444";

  return (
    <div
      className={`rounded-xl bg-[#1a1d23] p-3 flex flex-col transition-all cursor-pointer ${
        isActive
          ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-background shadow-lg shadow-primary/10"
          : "hover:ring-1 hover:ring-white/10"
      }`}
      style={{ height: 220 }}
      onClick={onClick}
      data-testid={`slot-chart-${slotIndex}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isActive ? "bg-primary" : "bg-white/20"
            }`}
          />
          <span className="text-white text-sm font-semibold truncate">
            {ticker?.label ?? symbol}
          </span>
          <span className="text-[9px] text-white/25 font-medium ml-0.5 shrink-0">
            SLOT {slotIndex + 1}
          </span>
        </div>
        <div className="flex gap-px shrink-0">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={e => { e.stopPropagation(); setRange(r); }}
              className={`text-[9px] min-w-[26px] min-h-[22px] px-1 rounded font-medium transition-colors flex items-center justify-center ${
                range === r
                  ? "bg-white/15 text-white"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-white text-lg font-bold tabular-nums">
          {displayPrice ?? (lastClose ? formatPrice(lastClose, symbol, 1) : "—")}
        </span>
        {q && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {q.changesPercentage >= 0 ? "+" : ""}
            {q.changesPercentage.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1 -mx-1">
        {history.length > 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-slot-${slotIndex}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={lineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["auto", "auto"]} />
              <XAxis hide dataKey="date" />
              <Tooltip
                contentStyle={{
                  background: "#1f2128",
                  border: "1px solid #2d3039",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#ccc",
                }}
                labelFormatter={v => {
                  if (!v) return "";
                  if (range === "1D") {
                    const d = new Date(v);
                    if (!isNaN(d.getTime()))
                      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  }
                  return String(v).slice(0, 10);
                }}
                formatter={(v: number) => [formatPrice(v, symbol, usdToGbp), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={1.5}
                fill={`url(#grad-slot-${slotIndex})`}
                dot={false}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function InteractiveCharts() {
  const [slots, setSlots] = useState<[string, string, string]>(DEFAULT_SLOTS);
  const [activeSlot, setActiveSlot] = useState(0);

  // Fetch all quotes for ticker strip
  const allSymbols = TICKERS.map(t => t.symbol).join(",");
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "ticker-strip"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/quotes?tickers=${encodeURIComponent(allSymbols)}`
      );
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // USD/GBP rate for SPX6900
  const { data: fxQuotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "fx-strip", "USDGBP=X"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes?tickers=USDGBP%3DX`);
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const usdToGbp = fxQuotes[0]?.price || 0.757;

  const handleTickerClick = (symbol: string) => {
    setSlots(prev => {
      const next = [...prev] as [string, string, string];
      next[activeSlot] = symbol;
      return next;
    });
    setActiveSlot(prev => (prev + 1) % 3);
  };

  return (
    <div className="panel-card p-4" data-testid="interactive-charts">

      {/* ── Ticker strip ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        {TICKERS.map(ticker => {
          const q       = quotes.find(q => q.symbol === ticker.symbol);
          const isSpx   = ticker.symbol === "SPX6900-USD";
          const rawPx   = q?.price ?? null;
          const dispPx  = rawPx != null ? formatPrice(rawPx, ticker.symbol, usdToGbp) : null;
          const pct     = q?.changesPercentage ?? null;
          const pos     = pct != null ? pct >= 0 : true;
          const slotIdx = slots.indexOf(ticker.symbol);
          const inSlot  = slotIdx >= 0;

          return (
            <button
              key={ticker.symbol}
              onClick={() => handleTickerClick(ticker.symbol)}
              title={`Click to load ${ticker.label} into slot ${activeSlot + 1}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all shrink-0 ${
                inSlot
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/30 border-border/50 hover:bg-muted/60 hover:border-border"
              }`}
              data-testid={`ticker-btn-${ticker.symbol}`}
            >
              <span className="font-bold text-foreground">{ticker.short}</span>
              {dispPx != null && (
                <span className="tabular-nums text-muted-foreground">{dispPx}</span>
              )}
              {pct != null && (
                <span className={`font-medium ${pos ? "text-green-400" : "text-red-400"}`}>
                  {pos ? "+" : ""}{pct.toFixed(2)}%
                </span>
              )}
              {inSlot && (
                <span className="w-3.5 h-3.5 rounded-full bg-primary/25 text-primary text-[9px] flex items-center justify-center font-bold shrink-0">
                  {slotIdx + 1}
                </span>
              )}
            </button>
          );
        })}

        {/* Slot indicator */}
        <span className="text-[10px] text-muted-foreground/40 shrink-0 ml-auto pl-2 whitespace-nowrap">
          tap → slot {activeSlot + 1}
        </span>
      </div>

      {/* ── 3 chart slots ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {slots.map((sym, i) => (
          <SlotChart
            key={`slot-${i}-${sym}`}
            symbol={sym}
            slotIndex={i}
            isActive={activeSlot === i}
            onClick={() => setActiveSlot(i)}
            usdToGbp={usdToGbp}
          />
        ))}
      </div>

    </div>
  );
}
