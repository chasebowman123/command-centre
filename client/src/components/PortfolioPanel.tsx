import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Briefcase, RefreshCw, Plus, Trash2, X } from "lucide-react";
import type { Holding } from "@shared/schema";
import { useState } from "react";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  name: string;
}

function getLogo(ticker: string): string {
  // Use logo.dev for stock logos, fallback to generic
  const clean = ticker.replace("-USD", "").replace("=X", "");
  return `https://logo.clearbit.com/${getCompanyDomain(clean)}`;
}

function getCompanyDomain(ticker: string): string {
  const domains: Record<string, string> = {
    FMCC: "freddiemac.com",
    FNMA: "fanniemae.com",
    LITE: "lumentum.com",
    AAPL: "apple.com",
    MSFT: "microsoft.com",
    GOOGL: "google.com",
    AMZN: "amazon.com",
    TSLA: "tesla.com",
    NVDA: "nvidia.com",
    META: "meta.com",
  };
  return domains[ticker] || `${ticker.toLowerCase()}.com`;
}

export function PortfolioPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newAvg, setNewAvg] = useState("");
  const [newType, setNewType] = useState("stock");

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/holdings");
      return res.json();
    },
  });

  const holdingTickers = holdings.map((h) => h.ticker).join(",");

  const { data: quotes = [], refetch, isFetching } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", "portfolio", holdingTickers],
    queryFn: async () => {
      if (!holdingTickers) return [];
      const res = await apiRequest("GET", `/api/quotes?tickers=${encodeURIComponent(holdingTickers)}`);
      return res.json();
    },
    enabled: holdingTickers.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/holdings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
      setShowAdd(false);
      setNewTicker("");
      setNewName("");
      setNewQty("");
      setNewAvg("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/holdings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
    },
  });

  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  let totalCost = 0;
  let totalValue = 0;
  const rows = holdings.map((h) => {
    const q = quoteMap.get(h.ticker);
    const currentPrice = q?.price || 0;
    const isShort = h.quantity < 0;
    const absQty = Math.abs(h.quantity);
    const costBasis = absQty * h.avgPrice;
    let marketValue: number;
    let pnl: number;

    if (isShort) {
      marketValue = absQty * currentPrice;
      pnl = costBasis - marketValue;
    } else {
      marketValue = absQty * currentPrice;
      pnl = marketValue - costBasis;
    }

    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    totalCost += costBasis;
    totalValue += isShort ? costBasis - pnl : marketValue;

    return { ...h, currentPrice, marketValue, pnl, pnlPct, isShort, costBasis };
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="panel-card p-4 md:p-5 h-full flex flex-col" data-testid="portfolio-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-muted-foreground hover:text-primary transition-colors"
            data-testid="add-holding"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="refresh-portfolio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="Ticker"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              data-testid="input-ticker"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              data-testid="input-name"
            />
            <input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Qty"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              data-testid="input-qty"
            />
            <input
              value={newAvg}
              onChange={(e) => setNewAvg(e.target.value)}
              placeholder="Avg Price"
              type="number"
              step="any"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              data-testid="input-avg"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              data-testid="select-type"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newTicker && newQty && newAvg) {
                  addMutation.mutate({
                    ticker: newTicker,
                    name: newName || newTicker,
                    quantity: parseFloat(newQty),
                    avgPrice: parseFloat(newAvg),
                    assetType: newType,
                  });
                }
              }}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-save-holding"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {!holdingsLoading && quotes.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-[11px] text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold tabular-nums" data-testid="text-total-value">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total Cost</p>
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total P&L</p>
            <p
              className={`text-lg font-semibold tabular-nums ${totalPnl >= 0 ? "text-positive" : "text-negative"}`}
              data-testid="text-total-pnl"
            >
              {totalPnl >= 0 ? "+" : ""}
              {formatCurrency(totalPnl)}
              <span className="text-sm ml-1">
                ({totalPnlPct >= 0 ? "+" : ""}
                {totalPnlPct.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-[11px] text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-2 pr-4">Asset</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Avg Price</th>
              <th className="text-right py-2 px-2">Current</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">P&L</th>
              <th className="text-right py-2 px-2">Day Chg</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const q = quoteMap.get(row.ticker);
              return (
                <tr
                  key={row.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  data-testid={`row-holding-${row.ticker}`}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getLogo(row.ticker)}
                        alt=""
                        className="w-6 h-6 rounded-full bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="%23334155"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif">${row.ticker[0]}</text></svg>`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{row.ticker.replace("-USD", "")}</p>
                          {row.isShort && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive"
                            >
                              SHORT
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{row.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 tabular-nums">
                    {row.quantity.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2 tabular-nums text-muted-foreground">
                    {formatPrice(row.avgPrice)}
                  </td>
                  <td className="text-right py-3 px-2 tabular-nums font-medium">
                    {row.currentPrice ? formatPrice(row.currentPrice) : "—"}
                  </td>
                  <td className="text-right py-3 px-2 tabular-nums">
                    {row.currentPrice ? formatCurrency(row.marketValue) : "—"}
                  </td>
                  <td
                    className={`text-right py-3 px-2 tabular-nums font-medium ${row.pnl >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {row.currentPrice ? (
                      <div>
                        <span>
                          {row.pnl >= 0 ? "+" : ""}
                          {formatCurrency(row.pnl)}
                        </span>
                        <span className="block text-[11px]">
                          ({row.pnlPct >= 0 ? "+" : ""}
                          {row.pnlPct.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={`text-right py-3 px-2 tabular-nums ${q && q.changesPercentage >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {q ? (
                      <div className="flex items-center justify-end gap-1">
                        {q.changesPercentage >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {q.changesPercentage >= 0 ? "+" : ""}
                          {q.changesPercentage?.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pl-1">
                    <button
                      onClick={() => deleteMutation.mutate(row.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                      data-testid={`delete-${row.ticker}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}
