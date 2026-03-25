import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  name: string;
}

const MARKET_TICKERS = [
  { symbol: "USDGBP=X", label: "USD/GBP" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "^IRX", label: "US 2Y" },
  { symbol: "^FVX", label: "US 5Y" },
  { symbol: "^TNX", label: "US 10Y" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" },
  { symbol: "CL=F", label: "Oil" },
  { symbol: "BTC-USD", label: "BTC" },
  { symbol: "ETH-USD", label: "ETH" },
  { symbol: "SPX6900-USD", label: "SPX6900" },
];

export function MarketTicker() {
  const tickerString = MARKET_TICKERS.map((t) => t.symbol).join(",");

  const { data, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", tickerString],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes?tickers=${encodeURIComponent(tickerString)}`);
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const quoteMap = new Map((data || []).map((q) => [q.symbol, q]));

  if (isLoading) {
    return (
      <div className="w-full bg-[#0f1115] dark:bg-[#0f1115] border-b border-white/5 py-2 px-4">
        <div className="flex gap-6 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <div className="h-3 w-12 bg-white/10 rounded" />
              <div className="h-3 w-10 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = MARKET_TICKERS.map((ticker) => {
    const q = quoteMap.get(ticker.symbol);
    const isPositive = q ? q.changesPercentage >= 0 : true;
    return (
      <div
        key={ticker.symbol}
        className="flex items-center gap-1.5 shrink-0 px-3"
        data-testid={`ticker-${ticker.symbol}`}
      >
        <span className="text-[11px] text-gray-400 font-medium">{ticker.label}</span>
        <span className="text-[11px] text-white font-semibold tabular-nums">
          {q ? formatPrice(q.price, ticker.symbol) : "—"}
        </span>
        {q && (
          <span
            className={`text-[10px] tabular-nums font-medium ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {q.changesPercentage.toFixed(2)}%
          </span>
        )}
      </div>
    );
  });

  // Duplicate items for seamless loop
  return (
    <div
      className="w-full bg-[#0f1115] dark:bg-[#0f1115] border-b border-white/5 overflow-hidden"
      data-testid="market-ticker"
    >
      <div className="ticker-track flex items-center py-2">
        <div className="ticker-content flex items-center">{items}</div>
        <div className="ticker-content flex items-center" aria-hidden="true">{items}</div>
      </div>
    </div>
  );
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === "BTC-USD" || symbol === "ETH-USD") {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (symbol === "^DJI" || symbol === "^GSPC" || symbol === "^IXIC") {
    return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (symbol === "USDGBP=X") return price.toFixed(4);
  if (symbol.startsWith("^")) return price.toFixed(2);
  if (symbol === "SPX6900-USD") return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}
