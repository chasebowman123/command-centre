import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Landmark, Plus, Trash2, Pencil, X, Check, ExternalLink } from "lucide-react";
import type { PensionFund } from "@shared/schema";

// Morningstar links for SJP fund factsheets (via FT Markets)
const FT_LINKS: Record<string, string> = {
  GB0030964596: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0030964596:GBP",
  GB0007511156: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0007511156:GBP",
  GB0032680323: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0032680323:GBP",
  GB0004435862: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0004435862:GBP",
  GB00BKX5CC71: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB00BKX5CC71:GBP",
  GB0007511594: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0007511594:GBP",
  GB0007510745: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0007510745:GBP",
  GB0008401431: "https://markets.ft.com/data/funds/tearsheet/summary?s=GB0008401431:GBP",
};

function formatGBP(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatAUD(value: number): string {
  return `A$${value.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PensionsPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newProvider, setNewProvider] = useState("SJP");
  const [newFundName, setNewFundName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newAlloc, setNewAlloc] = useState("");
  const [newCurrency, setNewCurrency] = useState("GBP");

  const { data: funds = [], isLoading } = useQuery<PensionFund[]>({
    queryKey: ["/api/pensions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pensions");
      return res.json();
    },
  });

  // Fetch AUD→GBP rate for converting Australian Super
  const { data: fxData } = useQuery<{ pair: string; rate: number }>({
    queryKey: ["/api/fx", "AUDGBP=X"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fx?pair=AUDGBP=X");
      return res.json();
    },
    staleTime: 300000,
    refetchInterval: 300000,
  });

  const audToGbp = fxData?.rate || 0.51; // fallback rate

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/pensions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pensions"] });
      setShowAdd(false);
      setNewProvider("SJP");
      setNewFundName("");
      setNewValue("");
      setNewAlloc("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/pensions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pensions"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pensions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pensions"] });
    },
  });

  // Split SJP vs Australian Super
  const sjpFunds = funds.filter((f) => f.provider === "SJP");
  const otherFunds = funds.filter((f) => f.provider !== "SJP");

  const sjpTotal = sjpFunds.reduce((sum, f) => sum + f.currentValue, 0);
  const otherTotalGBP = otherFunds.reduce((sum, f) => {
    return sum + (f.currency === "AUD" ? f.currentValue * audToGbp : f.currentValue);
  }, 0);
  const totalGBP = sjpTotal + otherTotalGBP;

  return (
    <div className="panel-card p-4 md:p-5" data-testid="pensions-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pensions
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-muted-foreground hover:text-primary transition-colors"
          data-testid="add-pension"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            >
              <option value="SJP">SJP</option>
              <option value="AustralianSuper">AustralianSuper</option>
              <option value="Other">Other</option>
            </select>
            <input
              value={newFundName}
              onChange={(e) => setNewFundName(e.target.value)}
              placeholder="Fund name"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <input
              value={newAlloc}
              onChange={(e) => setNewAlloc(e.target.value)}
              placeholder="Alloc %"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <select
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            >
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newFundName && newValue) {
                  addMutation.mutate({
                    provider: newProvider,
                    fundName: newFundName,
                    currentValue: parseFloat(newValue),
                    allocation: newAlloc ? parseFloat(newAlloc) : null,
                    currency: newCurrency,
                  });
                }
              }}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
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

      {/* Total summary tile */}
      <div className="rounded-xl bg-[#1a1d23] p-4 mb-4">
        <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
          Total Pension Value
        </p>
        <p className="text-white text-2xl font-bold tabular-nums" data-testid="text-pension-total">
          {formatGBP(totalGBP)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-white/40 text-xs">
            SJP: {formatGBP(sjpTotal)}
          </span>
          {otherFunds.length > 0 && (
            <span className="text-white/40 text-xs">
              Other: {formatGBP(otherTotalGBP)}
            </span>
          )}
        </div>
      </div>

      {/* SJP funds as a compact dark card grid */}
      {sjpFunds.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="https://logo.clearbit.com/sjp.co.uk"
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              St. James's Place
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sjpFunds.map((fund) => (
              <div
                key={fund.id}
                className="rounded-lg bg-[#1a1d23] p-3 group relative"
                data-testid={`pension-fund-${fund.id}`}
              >
                {editingId === fund.id ? (
                  <div className="space-y-1.5">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      type="number"
                      className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          updateMutation.mutate({
                            id: fund.id,
                            data: { currentValue: parseFloat(editValue) },
                          });
                        }}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-white/40 hover:text-white/70"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-white/50 text-[10px] font-medium leading-tight mb-1 pr-6">
                      {fund.fundName}
                    </p>
                    <p className="text-white text-sm font-bold tabular-nums">
                      {formatGBP(fund.currentValue)}
                    </p>
                    {fund.allocation && (
                      <p className="text-white/30 text-[10px] mt-0.5">{fund.allocation}%</p>
                    )}
                    {/* Action buttons on hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {fund.isin && FT_LINKS[fund.isin] && (
                        <a
                          href={FT_LINKS[fund.isin]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/30 hover:text-primary"
                          title="View on FT"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(fund.id);
                          setEditValue(String(fund.currentValue));
                        }}
                        className="text-white/30 hover:text-white/70"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(fund.id)}
                        className="text-white/30 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other funds (Australian Super etc.) */}
      {otherFunds.map((fund) => (
        <div
          key={fund.id}
          className="rounded-lg bg-[#1a1d23] p-3 group relative"
          data-testid={`pension-fund-${fund.id}`}
        >
          {editingId === fund.id ? (
            <div className="space-y-1.5">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                type="number"
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    updateMutation.mutate({
                      id: fund.id,
                      data: { currentValue: parseFloat(editValue) },
                    });
                  }}
                  className="text-green-400 hover:text-green-300"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-white/40 hover:text-white/70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider">
                    {fund.provider}
                  </p>
                </div>
                <p className="text-white text-sm font-bold tabular-nums">
                  {fund.currency === "AUD" ? formatAUD(fund.currentValue) : formatGBP(fund.currentValue)}
                </p>
                {fund.currency === "AUD" && (
                  <p className="text-white/30 text-[10px]">
                    ≈ {formatGBP(fund.currentValue * audToGbp)} GBP
                  </p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingId(fund.id);
                    setEditValue(String(fund.currentValue));
                  }}
                  className="text-white/30 hover:text-white/70"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(fund.id)}
                  className="text-white/30 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
