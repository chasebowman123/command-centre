import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Home, Pencil, X, Check, Plus, Trash2, MapPin, TrendingUp } from "lucide-react";
import type { Property } from "@shared/schema";

function formatGBP(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}m`;
  }
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatGBPFull(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PropertyPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [newPurchase, setNewPurchase] = useState("");
  const [newCurrent, setNewCurrent] = useState("");
  const [newMortgage, setNewMortgage] = useState("");

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/properties");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/properties", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setShowAdd(false);
      setNewName("");
      setNewAddress("");
      setNewPostcode("");
      setNewPurchase("");
      setNewCurrent("");
      setNewMortgage("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/properties/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setEditingId(null);
      setEditField("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
  });

  // Calculate totals across all properties
  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalEquity = properties.reduce((s, p) => s + (p.currentValue - p.mortgageBalance), 0);
  const totalMortgage = properties.reduce((s, p) => s + p.mortgageBalance, 0);

  return (
    <div className="panel-card p-4 md:p-5" data-testid="property-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Property
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-muted-foreground hover:text-primary transition-colors"
          data-testid="add-property"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Property name"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <input
              value={newPostcode}
              onChange={(e) => setNewPostcode(e.target.value)}
              placeholder="Postcode"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Full address"
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={newPurchase}
              onChange={(e) => setNewPurchase(e.target.value)}
              placeholder="Purchase price"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <input
              value={newCurrent}
              onChange={(e) => setNewCurrent(e.target.value)}
              placeholder="Current value"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
            <input
              value={newMortgage}
              onChange={(e) => setNewMortgage(e.target.value)}
              placeholder="Mortgage balance"
              type="number"
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newName && newAddress && newCurrent) {
                  addMutation.mutate({
                    name: newName,
                    address: newAddress,
                    postcode: newPostcode || "",
                    purchasePrice: parseFloat(newPurchase) || 0,
                    currentValue: parseFloat(newCurrent),
                    mortgageBalance: parseFloat(newMortgage) || 0,
                    currency: "GBP",
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

      {/* Summary tile */}
      <div className="rounded-xl bg-[#1a1d23] p-4 mb-4">
        <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
          Total Property Portfolio
        </p>
        <p className="text-white text-2xl font-bold tabular-nums" data-testid="text-property-total">
          {formatGBP(totalValue)}
        </p>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-green-400/70 text-xs tabular-nums">
            Equity: {formatGBP(totalEquity)}
          </span>
          <span className="text-white/40 text-xs tabular-nums">
            Mortgage: {formatGBP(totalMortgage)}
          </span>
        </div>
      </div>

      {/* Property cards */}
      <div className="space-y-3">
        {properties.map((prop) => {
          const equity = prop.currentValue - prop.mortgageBalance;
          const equityPct = prop.currentValue > 0 ? (equity / prop.currentValue) * 100 : 0;
          const capitalGain = prop.currentValue - prop.purchasePrice;
          const capitalGainPct = prop.purchasePrice > 0 ? (capitalGain / prop.purchasePrice) * 100 : 0;

          const isEditing = editingId === prop.id;

          return (
            <div
              key={prop.id}
              className="rounded-xl bg-[#1a1d23] p-4 group relative"
              data-testid={`property-${prop.id}`}
            >
              {/* Property header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <MapPin className="w-3 h-3 text-primary/60" />
                    <p className="text-white font-semibold text-sm">{prop.name}</p>
                  </div>
                  <p className="text-white/40 text-[11px]">
                    {prop.address}, {prop.postcode}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(isEditing ? null : prop.id);
                      setEditField("");
                    }}
                    className="text-white/30 hover:text-white/70"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(prop.id)}
                    className="text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Equity progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/40 text-[10px] uppercase tracking-wider">Equity</span>
                  <span className="text-white/60 text-[10px] tabular-nums">
                    {equityPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all"
                    style={{ width: `${Math.min(equityPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <EditableField
                  label="Current Value"
                  value={prop.currentValue}
                  displayValue={formatGBPFull(prop.currentValue)}
                  isEditing={isEditing && editField === "currentValue"}
                  editValue={editValue}
                  onStartEdit={() => {
                    setEditField("currentValue");
                    setEditValue(String(prop.currentValue));
                  }}
                  onSave={() => {
                    updateMutation.mutate({
                      id: prop.id,
                      data: { currentValue: parseFloat(editValue) },
                    });
                  }}
                  onCancel={() => setEditField("")}
                  setEditValue={setEditValue}
                  showEditMode={isEditing}
                />
                <EditableField
                  label="Purchase Price"
                  value={prop.purchasePrice}
                  displayValue={formatGBPFull(prop.purchasePrice)}
                  isEditing={isEditing && editField === "purchasePrice"}
                  editValue={editValue}
                  onStartEdit={() => {
                    setEditField("purchasePrice");
                    setEditValue(String(prop.purchasePrice));
                  }}
                  onSave={() => {
                    updateMutation.mutate({
                      id: prop.id,
                      data: { purchasePrice: parseFloat(editValue) },
                    });
                  }}
                  onCancel={() => setEditField("")}
                  setEditValue={setEditValue}
                  showEditMode={isEditing}
                />
                <EditableField
                  label="Mortgage"
                  value={prop.mortgageBalance}
                  displayValue={formatGBPFull(prop.mortgageBalance)}
                  isEditing={isEditing && editField === "mortgageBalance"}
                  editValue={editValue}
                  onStartEdit={() => {
                    setEditField("mortgageBalance");
                    setEditValue(String(prop.mortgageBalance));
                  }}
                  onSave={() => {
                    updateMutation.mutate({
                      id: prop.id,
                      data: { mortgageBalance: parseFloat(editValue) },
                    });
                  }}
                  onCancel={() => setEditField("")}
                  setEditValue={setEditValue}
                  showEditMode={isEditing}
                />
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Equity</p>
                  <p className="text-green-400 text-sm font-bold tabular-nums">
                    {formatGBPFull(equity)}
                  </p>
                </div>
              </div>

              {/* Capital gain */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                <TrendingUp className={`w-3.5 h-3.5 ${capitalGain >= 0 ? "text-green-400" : "text-red-400"}`} />
                <span className={`text-xs font-medium tabular-nums ${capitalGain >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {capitalGain >= 0 ? "+" : ""}{formatGBPFull(capitalGain)}
                  {" "}({capitalGainPct >= 0 ? "+" : ""}{capitalGainPct.toFixed(1)}%)
                </span>
                <span className="text-white/30 text-[10px]">since purchase</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  displayValue,
  isEditing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  setEditValue,
  showEditMode,
}: {
  label: string;
  value: number;
  displayValue: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  setEditValue: (v: string) => void;
  showEditMode: boolean;
}) {
  if (isEditing) {
    return (
      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
        <div className="flex items-center gap-1">
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            type="number"
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white tabular-nums"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
          />
          <button onClick={onSave} className="text-green-400 hover:text-green-300">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} className="text-white/40 hover:text-white/70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={showEditMode ? "cursor-pointer hover:bg-white/5 rounded p-1 -m-1 transition-colors" : ""}
      onClick={showEditMode ? onStartEdit : undefined}
    >
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white text-sm font-bold tabular-nums">{displayValue}</p>
    </div>
  );
}
