import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";

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

export function MarketIndicators() {
  const tickerString = MARKET_TICKERS.map((t) => t.symbol).join(",");

  const { data, isLoading, refetch, isFetching } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", tickerString],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes?tickers=${encodeURIComponent(tickerString)}`);
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const quoteMap = new Map((data || []).map((q) => [q.symbol, q]));

  return (
    <div className="panel-card px-4 py-3" data-testid="market-indicators">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Markets
        </p>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="refresh-markets"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {MARKET_TICKERS.map((ticker) => {
          const q = quoteMap.get(ticker.symbol);
          if (isLoading) {
            return (
              <div key={ticker.symbol} className="flex items-center gap-1.5 animate-pulse">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
            );
          }
          const isPositive = q ? q.changesPercentage >= 0 : true;
          return (
            <div
              key={ticker.symbol}
              className="flex items-center gap-1.5 py-0.5"
              data-testid={`indicator-${ticker.symbol}`}
            >
              <span className="text-[11px] text-muted-foreground font-medium">{ticker.label}</span>
              <span className="text-[11px] font-semibold tabular-nums">
                {q ? formatPrice(q.price, ticker.symbol) : "—"}
              </span>
              {q && (
                <span
                  className={`text-[10px] tabular-nums font-medium ${
                    isPositive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {q.changesPercentage.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
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
