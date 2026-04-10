import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, X, Maximize2 } from "lucide-react";

const HA_URL = "https://nujraxh1k9mt9kk0ul8x56dxac9afine.ui.nabu.casa";

const TOGGLE_IDS = [
  "input_boolean.lucas_sleeping",
  "light.kitchen_spotlights",
  "light.cloakroom_spotlights",
  "light.lounge",
];

const CAMERAS = [
  { entityId: "camera.lucass_room_snapshot_2",  label: "Lucas" },
  { entityId: "camera.basement_door_live_view",  label: "Basement" },
  { entityId: "camera.upstairs_live_view",       label: "Upstairs" },
];

const SCENES = [
  { id: "lounge_chill", label: "🌅 Lounge Chill", domain: "scene",  service: "turn_on",  entity: "scene.lounge_rolling_hills" },
  { id: "bed_hills",    label: "🌄 Bed Hills",     domain: "scene",  service: "turn_on",  entity: "scene.bedroom_rolling_hills" },
  { id: "lucas_gn",     label: "🌙 Goodnight",     domain: "script", service: "turn_on",  entity: "script.lucas_bedtime" },
  { id: "lobby",        label: "🔓 Lobby",         domain: "button", service: "press",    entity: "button.lobby_open_door" },
];

const TOGGLES = [
  { entityId: "input_boolean.lucas_sleeping", label: "😴 Lucas Sleeping", domain: "input_boolean" },
  { entityId: "light.lounge",                 label: "💡 Lounge",         domain: "light" },
  { entityId: "light.kitchen_spotlights",     label: "🍳 Kitchen",        domain: "light" },
  { entityId: "light.cloakroom_spotlights",   label: "🚿 Cloakroom",      domain: "light" },
];

const ALL_LIGHTS = [
  { domain: "light", entity: "light.lounge" },
  { domain: "light", entity: "light.kitchen_spotlights" },
  { domain: "light", entity: "light.cloakroom_spotlights" },
];

function isOn(s: string | undefined) { return s === "on" || s === "true"; }

async function callHA(domain: string, service: string, entity_id: string) {
  return apiRequest("POST", "/api/ha/service", { domain, service, entity_id });
}

// ── Live camera modal ────────────────────────────────────────────────────────
function CameraModal({ cam, onClose }: { cam: typeof CAMERAS[0]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl overflow-hidden bg-black shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-black/60">
          <span className="text-white/80 text-sm font-medium">{cam.label} — Live</span>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <img
          src={`/api/ha/camera/stream/${cam.entityId}`}
          alt={`${cam.label} live`}
          className="w-full"
          style={{ aspectRatio: "16/9", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}

// ── Camera thumb ─────────────────────────────────────────────────────────────
function CameraThumb({ cam, onClick }: { cam: typeof CAMERAS[0]; onClick: () => void }) {
  const [ts, setTs] = useState(() => Date.now());
  const [err, setErr] = useState(false);

  return (
    <button
      className="relative rounded-lg overflow-hidden bg-muted/30 group cursor-pointer border border-border/50 hover:border-primary/40 transition-colors"
      style={{ aspectRatio: "16/9" }}
      onClick={onClick}
      title={`${cam.label} — click for live feed`}
    >
      {err ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs">
          Unavailable
        </div>
      ) : (
        <img
          src={`/api/ha/camera/${cam.entityId}?t=${ts}`}
          alt={cam.label}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
        <Maximize2 className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-[10px] font-medium">Live</span>
      </div>
      <span className="absolute bottom-1 left-1.5 text-[9px] text-white/80 font-medium bg-black/50 rounded px-1">
        {cam.label}
      </span>
      <button
        className="absolute top-1 right-1 text-white/60 hover:text-white"
        onClick={e => { e.stopPropagation(); setTs(Date.now()); setErr(false); }}
        title="Refresh"
      >
        <span className="text-[9px]">↺</span>
      </button>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function SmartHomePanel() {
  const [pending, setPending] = useState<string | null>(null);
  const [liveCamera, setLiveCamera] = useState<typeof CAMERAS[0] | null>(null);

  const { data: states = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ha/states"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ha/states?ids=${encodeURIComponent(TOGGLE_IDS.join(","))}`);
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

  const toggle = useCallback(async (entityId: string, domain: string, currentlyOn: boolean) => {
    const service = currentlyOn ? "turn_off" : "turn_on";
    await act(entityId, domain, service, entityId);
  }, [act]);

  const allOff = useCallback(async () => {
    setPending("all_off");
    try {
      await Promise.all(ALL_LIGHTS.map(({ domain, entity }) => callHA(domain, "turn_off", entity)));
      queryClient.invalidateQueries({ queryKey: ["/api/ha/states"] });
    } finally {
      setPending(null);
    }
  }, []);

  return (
    <>
      {liveCamera && <CameraModal cam={liveCamera} onClose={() => setLiveCamera(null)} />}

      <div className="panel-card p-3" data-testid="smart-home-panel">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Smart Home</p>
          <a
            href={HA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
          >
            Open HA ↗
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* ── Scenes / Actions ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">Scenes</p>
            {SCENES.map(s => (
              <button
                key={s.id}
                disabled={pending === s.id}
                onClick={() => act(s.id, s.domain, s.service, s.entity)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-40 bg-muted/40 border-border/60 text-foreground hover:bg-muted/70"
              >
                {pending === s.id ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
                {s.label}
              </button>
            ))}
            {/* All Lights Off */}
            <button
              disabled={pending === "all_off"}
              onClick={allOff}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-40 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              data-testid="button-all-off"
            >
              {pending === "all_off" ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
              🌑 All Lights Off
            </button>
          </div>

          {/* ── Toggles ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">Lights & Status</p>
            {TOGGLES.map(t => {
              const on = isOn(states[t.entityId]);
              return (
                <button
                  key={t.entityId}
                  disabled={pending === t.entityId}
                  onClick={() => toggle(t.entityId, t.domain, on)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-40
                    ${on
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                    }`}
                >
                  <span>{t.label}</span>
                  {pending === t.entityId
                    ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    : (
                      <span className={`relative inline-flex w-7 h-3.5 rounded-full transition-colors shrink-0 ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
                      </span>
                    )
                  }
                </button>
              );
            })}
          </div>

          {/* ── Cameras ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1.5">Cameras</p>
            <div className="space-y-1.5">
              {CAMERAS.map(c => (
                <CameraThumb key={c.entityId} cam={c} onClick={() => setLiveCamera(c)} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
