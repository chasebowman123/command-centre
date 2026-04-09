import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Home, RefreshCw, Loader2 } from "lucide-react";

// ─── Entity map ───────────────────────────────────────────────────────────────
// All toggle entities whose state we need to poll
const TOGGLE_IDS = [
  "input_boolean.lucas_sleeping",
  "light.kitchen_spotlights",
  "light.cloakroom_spotlights",
];

const CAMERAS = [
  { entityId: "camera.lucass_room_snapshot_2", label: "Lucas Room" },
  { entityId: "camera.basement_door_live_view",  label: "Basement" },
  { entityId: "camera.upstairs_live_view",       label: "Upstairs" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOn(state: string | undefined) {
  return state === "on" || state === "true";
}

async function callHA(domain: string, service: string, entity_id: string) {
  return apiRequest("POST", "/api/ha/service", { domain, service, entity_id });
}

// ─── Button ───────────────────────────────────────────────────────────────────
function ActionBtn({
  label, pending, onClick, danger = false,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      data-testid={`ha-btn-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
        border transition-all disabled:opacity-40 w-full
        ${danger
          ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
          : "bg-muted/40 border-border text-foreground hover:bg-muted/70"
        }`}
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
      {label}
    </button>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  label, entityId, state, pending, onToggle,
}: {
  label: string;
  entityId: string;
  state: string | undefined;
  pending: boolean;
  onToggle: (entityId: string, on: boolean) => void;
}) {
  const on = isOn(state);
  return (
    <button
      onClick={() => onToggle(entityId, on)}
      disabled={pending}
      data-testid={`ha-toggle-${entityId}`}
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium
        border transition-all disabled:opacity-40 w-full
        ${on
          ? "bg-primary/10 border-primary/25 text-primary"
          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
        }`}
    >
      <span>{label}</span>
      {pending
        ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        : (
          <span className={`relative inline-flex w-8 h-4 rounded-full transition-colors shrink-0
            ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform
              ${on ? "translate-x-4" : "translate-x-0.5"}`} />
          </span>
        )
      }
    </button>
  );
}

// ─── Camera thumbnail ─────────────────────────────────────────────────────────
function CameraThumb({ entityId, label }: { entityId: string; label: string }) {
  const [ts, setTs] = useState(() => Date.now());
  const [errored, setErrored] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative rounded-lg overflow-hidden bg-muted/30 cursor-pointer group"
        style={{ aspectRatio: "16/9" }}
        onClick={() => { setTs(Date.now()); setErrored(false); }}
        data-testid={`ha-camera-${entityId}`}
      >
        {errored ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
            <RefreshCw className="w-4 h-4" />
            <span className="text-[9px]">tap to retry</span>
          </div>
        ) : (
          <img
            src={`/api/ha/camera/${entityId}?t=${ts}`}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setErrored(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
          flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <span className="absolute bottom-1 left-1.5 text-[9px] text-white/80 font-medium bg-black/40
          rounded px-1">{label}</span>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">
      {children}
    </p>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function SmartHomePanel() {
  const [pending, setPending] = useState<string | null>(null);

  // Poll toggle states every 15 s
  const { data: states = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ha/states"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/ha/states?ids=${encodeURIComponent(TOGGLE_IDS.join(","))}`
      );
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
    retry: false,
  });

  const act = useCallback(async (id: string, domain: string, service: string, entity_id: string) => {
    setPending(id);
    try {
      await callHA(domain, service, entity_id);
      queryClient.invalidateQueries({ queryKey: ["/api/ha/states"] });
    } finally {
      setPending(null);
    }
  }, []);

  const toggle = useCallback(async (entityId: string, currentlyOn: boolean) => {
    const domain = entityId.startsWith("light.") ? "light" : "input_boolean";
    const service = currentlyOn ? "turn_off" : "turn_on";
    await act(entityId, domain, service, entityId);
  }, [act]);

  return (
    <div className="panel-card p-4 flex flex-col gap-4" data-testid="smart-home-panel">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Smart Home
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Left: controls ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Lounge */}
          <div>
            <SectionLabel>Lounge</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <ActionBtn
                label="Evening Chill"
                pending={pending === "lounge_chill"}
                onClick={() => act("lounge_chill", "scene", "turn_on", "scene.lounge_rolling_hills")}
              />
              <ActionBtn
                label="Lights Off"
                pending={pending === "lounge_off"}
                onClick={() => act("lounge_off", "light", "turn_off", "light.lounge")}
                danger
              />
            </div>
          </div>

          {/* Bedroom */}
          <div>
            <SectionLabel>Bedroom</SectionLabel>
            <ActionBtn
              label="Rolling Hills"
              pending={pending === "bed_hills"}
              onClick={() => act("bed_hills", "scene", "turn_on", "scene.bedroom_rolling_hills")}
            />
          </div>

          {/* Lucas */}
          <div>
            <SectionLabel>Lucas</SectionLabel>
            <div className="space-y-1.5">
              <Toggle
                label="Lucas Sleeping"
                entityId="input_boolean.lucas_sleeping"
                state={states["input_boolean.lucas_sleeping"]}
                pending={pending === "input_boolean.lucas_sleeping"}
                onToggle={toggle}
              />
              <ActionBtn
                label="Goodnight Routine"
                pending={pending === "lucas_gn"}
                onClick={() => act("lucas_gn", "script", "turn_on", "script.lucas_bedtime")}
              />
            </div>
          </div>

          {/* Lights */}
          <div>
            <SectionLabel>Lights</SectionLabel>
            <div className="space-y-1.5">
              <Toggle
                label="Kitchen"
                entityId="light.kitchen_spotlights"
                state={states["light.kitchen_spotlights"]}
                pending={pending === "light.kitchen_spotlights"}
                onToggle={toggle}
              />
              <Toggle
                label="Cloakroom"
                entityId="light.cloakroom_spotlights"
                state={states["light.cloakroom_spotlights"]}
                pending={pending === "light.cloakroom_spotlights"}
                onToggle={toggle}
              />
            </div>
          </div>

          {/* Entry */}
          <div>
            <SectionLabel>Entry</SectionLabel>
            <ActionBtn
              label="🔓 Open Lobby Door"
              pending={pending === "lobby"}
              onClick={() => act("lobby", "button", "press", "button.lobby_open_door")}
            />
          </div>

        </div>

        {/* ── Right: cameras ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Cameras</SectionLabel>
          <div className="space-y-2">
            {CAMERAS.map((c) => (
              <CameraThumb key={c.entityId} entityId={c.entityId} label={c.label} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
