import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Search, X } from "lucide-react";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  name: string;
}

const CHART_TICKERS = [
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "LITE", label: "LITE" },
  { symbol: "FNMA", label: "FNMA" },
  { symbol: "FMCC", label: "FMCC" },
  { symbol: "SPX6900-USD", label: "SPX6900" },
];

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
const RANGE_MAP: Record<string, string> = {
  "1D": "1d",
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
};

function formatChartPrice(price: number, symbol: string): string {
  if (symbol === "SPX6900-USD") return `£${price.toFixed(4)}`;
  if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

// ── Active chart (the large one on the right) ────────────────────────────────
function ActiveChart({ symbol, label, usdToGbp }: { symbol: string; label: string; usdToGbp: number }) {
  const [range, setRange] = useState<string>("1D");
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
    ? rawHistory.map((p) => ({ ...p, close: p.close * usdToGbp }))
    : rawHistory;

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "chart", symbol],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/quotes?tickers=${encodeURIComponent(symbol)}`
      );
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const q = quotes[0];
  const displayPrice = q ? (isSpx ? q.price * usdToGbp : q.price) : 0;

  const firstPrice = history.length > 0 ? history[0].close : 0;
  const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;
  const rangeChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const rangePositive = rangeChange >= 0;
  const rangeLine = rangePositive ? "#22c55e" : "#ef4444";

  return (
    <div className="rounded-xl bg-[#1a1d23] p-3.5 flex flex-col h-full min-h-[240px]" data-testid={`chart-${symbol}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-white text-sm font-semibold">{label}</span>
        <div className="flex gap-px">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[9px] min-w-[28px] min-h-[28px] px-1.5 py-1 rounded font-medium transition-colors flex items-center justify-center ${
                range === r
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white text-lg font-bold tabular-nums">
          {q ? formatChartPrice(displayPrice, symbol) : lastPrice ? formatChartPrice(lastPrice, symbol) : "—"}
        </span>
        {q && (
          <span
            className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${
              q.changesPercentage >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {q.changesPercentage >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {q.changesPercentage >= 0 ? "+" : ""}
            {q.changesPercentage.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 -mx-1">
        {history.length > 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-active-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={rangeLine} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={rangeLine} stopOpacity={0.02} />
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
                labelFormatter={(v) => {
                  if (!v) return "";
                  if (range === "1D") {
                    const d = new Date(v);
                    if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  }
                  return String(v).slice(0, 10);
                }}
                formatter={(v: number) => [formatChartPrice(v, symbol), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={rangeLine}
                strokeWidth={1.5}
                fill={`url(#grad-active-${symbol})`}
                dot={false}
                animationDuration={600}
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

// ── Ticker row (price + change, clickable) ───────────────────────────────────
function TickerRow({
  symbol,
  label,
  usdToGbp,
  active,
  onClick,
}: {
  symbol: string;
  label: string;
  usdToGbp: number;
  active: boolean;
  onClick: () => void;
}) {
  const isSpx = symbol === "SPX6900-USD";
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "chart", symbol],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/quotes?tickers=${encodeURIComponent(symbol)}`
      );
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const q = quotes[0];
  const displayPrice = q ? (isSpx ? q.price * usdToGbp : q.price) : null;
  const isPositive = q ? q.changesPercentage >= 0 : true;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
        active
          ? "bg-white/10 border border-white/20"
          : "hover:bg-white/5 border border-transparent"
      }`}
      data-testid={`ticker-row-${symbol}`}
    >
      <span className={`font-medium truncate ${active ? "text-white" : "text-white/70"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-semibold tabular-nums ${active ? "text-white" : "text-white/80"}`}>
          {displayPrice !== null ? formatChartPrice(displayPrice, symbol) : "—"}
        </span>
        {q && (
          <span
            className={`text-[10px] font-medium tabular-nums min-w-[52px] text-right ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {q.changesPercentage.toFixed(2)}%
          </span>
        )}
      </div>
    </button>
  );
}

// ── Custom Ticker Input ──────────────────────────────────────────────────────
function CustomTickerChart({ usdToGbp }: { usdToGbp: number }) {
  const [input, setInput] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [range, setRange] = useState<string>("1D");

  const symbol = activeTicker || "";

  const { data: rawHistory = [] } = useQuery<{ date: string; close: number }[]>({
    queryKey: ["/api/history", symbol, range],
    queryFn: async () => {
      if (!symbol) return [];
      const res = await apiRequest(
        "GET",
        `/api/history?symbol=${encodeURIComponent(symbol)}&range=${RANGE_MAP[range]}`
      );
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 300000,
  });

  const history = rawHistory;

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "custom", symbol],
    queryFn: async () => {
      if (!symbol) return [];
      const res = await apiRequest(
        "GET",
        `/api/quotes?tickers=${encodeURIComponent(symbol)}`
      );
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 30000,
  });

  const q = quotes[0];
  const displayPrice = q ? q.price : 0;
  const firstPrice = history.length > 0 ? history[0].close : 0;
  const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;
  const rangeChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const rangePositive = rangeChange >= 0;
  const rangeLine = rangePositive ? "#22c55e" : "#ef4444";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (trimmed) {
      setActiveTicker(trimmed);
    }
  };

  return (
    <div className="rounded-xl bg-[#1a1d23] p-3.5 flex flex-col h-full min-h-[240px]" data-testid="custom-ticker-chart">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter ticker (e.g. AAPL, BTC-USD)"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-8 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
            data-testid="custom-ticker-input"
          />
          {activeTicker && (
            <button
              type="button"
              onClick={() => { setActiveTicker(null); setInput(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </form>

      {!activeTicker ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/20 text-xs">Enter a Yahoo Finance ticker to view chart</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-white text-sm font-semibold">{activeTicker}</span>
              {q && (
                <span className="text-white/60 text-xs tabular-nums">
                  {formatChartPrice(displayPrice, activeTicker)}
                </span>
              )}
              {q && (
                <span
                  className={`text-[10px] font-medium tabular-nums ${
                    q.changesPercentage >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {q.changesPercentage >= 0 ? "+" : ""}
                  {q.changesPercentage.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex gap-px">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[9px] min-w-[28px] min-h-[28px] px-1.5 py-1 rounded font-medium transition-colors flex items-center justify-center ${
                    range === r
                      ? "bg-white/15 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 -mx-1">
            {history.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-custom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={rangeLine} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={rangeLine} stopOpacity={0.02} />
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
                    labelFormatter={(v) => {
                      if (!v) return "";
                      if (range === "1D") {
                        const d = new Date(v);
                        if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      }
                      return String(v).slice(0, 10);
                    }}
                    formatter={(v: number) => [formatChartPrice(v, activeTicker), "Price"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={rangeLine}
                    strokeWidth={1.5}
                    fill="url(#grad-custom)"
                    dot={false}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Charts Panel ────────────────────────────────────────────────────────
export function ChartsPanel() {
  const [activeSymbol, setActiveSymbol] = useState(CHART_TICKERS[0].symbol);

  const { data: fxQuotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "chart-fx", "USDGBP=X"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes?tickers=USDGBP%3DX`);
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const usdToGbp = fxQuotes[0]?.price || 0.757;

  const activeLabel = CHART_TICKERS.find(t => t.symbol === activeSymbol)?.label || activeSymbol;

  return (
    <div data-testid="charts-panel">
      {/* Main chart area: ticker list + active chart */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        {/* Ticker list */}
        <div className="col-span-12 md:col-span-4 rounded-xl bg-[#1a1d23] p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold mb-1.5 px-1">Watchlist</p>
          <div className="space-y-0.5">
            {CHART_TICKERS.map((t) => (
              <TickerRow
                key={t.symbol}
                symbol={t.symbol}
                label={t.label}
                usdToGbp={usdToGbp}
                active={activeSymbol === t.symbol}
                onClick={() => setActiveSymbol(t.symbol)}
              />
            ))}
          </div>
        </div>

        {/* Active chart */}
        <div className="col-span-12 md:col-span-8">
          <ActiveChart
            key={activeSymbol}
            symbol={activeSymbol}
            label={activeLabel}
            usdToGbp={usdToGbp}
          />
        </div>
      </div>

      {/* Custom ticker chart */}
      <CustomTickerChart usdToGbp={usdToGbp} />
    </div>
  );
}
