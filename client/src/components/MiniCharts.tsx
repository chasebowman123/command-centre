import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

const RANGES = ["1H", "1D", "1W", "1M", "3M", "6M", "1Y"] as const;
const RANGE_MAP: Record<string, string> = {
  "1H": "1h",
  "1D": "1d",
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
};

function MiniChart({ symbol, label, usdToGbp }: { symbol: string; label: string; usdToGbp: number }) {
  const [range, setRange] = useState<string>("1H");
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

  // Convert SPX6900 history to GBP
  const history = isSpx
    ? rawHistory.map((p) => ({ ...p, close: p.close * usdToGbp }))
    : rawHistory;

  // Quote for current price + change
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
  const isPositive = q ? q.changesPercentage >= 0 : true;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";
  const fillColor = isPositive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.10)";

  // Apply GBP conversion to current price for SPX6900
  const displayPrice = q ? (isSpx ? q.price * usdToGbp : q.price) : 0;

  const firstPrice = history.length > 0 ? history[0].close : 0;
  const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;
  const rangeChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const rangePositive = rangeChange >= 0;
  const rangeLine = rangePositive ? "#22c55e" : "#ef4444";
  const rangeFill = rangePositive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.10)";

  return (
    <div
      className="rounded-xl bg-[#1a1d23] p-3.5 flex flex-col h-[210px]"
      data-testid={`chart-${symbol}`}
    >
      {/* Header: label + range selectors */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-white text-sm font-semibold">{label}</span>
        <div className="flex gap-px sm:gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[9px] sm:text-[10px] min-w-[32px] min-h-[32px] px-2 py-1.5 rounded font-medium transition-colors flex items-center justify-center ${
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

      {/* Price + change */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white text-lg font-bold tabular-nums">
          {q ? formatChartPrice(displayPrice, symbol) : lastPrice ? formatChartPrice(lastPrice, symbol) : "—"}
        </span>
        {q && (
          <span
            className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? (
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
                <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
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
                  // For intraday ranges, show time (HH:mm)
                  if (range === "1H" || range === "1D") {
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
                fill={`url(#grad-${symbol})`}
                dot={false}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniCharts() {
  // Fetch USD/GBP rate for SPX6900 conversion
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-testid="mini-charts">
      {CHART_TICKERS.map((t) => (
        <MiniChart key={t.symbol} symbol={t.symbol} label={t.label} usdToGbp={usdToGbp} />
      ))}
    </div>
  );
}

function formatChartPrice(price: number, symbol: string): string {
  if (symbol === "SPX6900-USD") return `£${price.toFixed(4)}`;
  if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}
