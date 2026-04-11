import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, X, Maximize2, DoorOpen } from "lucide-react";

const HA_URL = "https://nujraxh1k9mt9kk0ul8x56dxac9afine.ui.nabu.casa";

// ── Entity configurations ────────────────────────────────────────────────────

const LIGHTS = [
  { id: "bed_hills",    label: "Bedroom Rolling Hills", domain: "scene",  service: "turn_on",  entity: "scene.bedroom_rolling_hills" },
  { id: "bed_soho",     label: "Bedroom Soho",          domain: "scene",  service: "turn_on",  entity: "scene.bedroom_soho" },
  { id: "bed_off",      label: "Bedroom Lights Off",    domain: "light",  service: "turn_off", entity: "light.bedroom", danger: true },
  { id: "lounge_chill", label: "Lounge Evening Chill",  domain: "scene",  service: "turn_on",  entity: "scene.lounge_rolling_hills" },
  { id: "lounge_soho",  label: "Lounge Soho",           domain: "scene",  service: "turn_on",  entity: "scene.lounge_soho" },
  { id: "lounge_off",   label: "Lounge Lights Off",     domain: "light",  service: "turn_off", entity: "light.lounge", danger: true },
];

const MOTION_AUTOMATIONS = [
  { entityId: "automation.office_light_automation",  label: "Office",   domain: "automation" },
  { entityId: "automation.bathroom_door_lights",     label: "Bathroom", domain: "automation" },
  { entityId: "automation.kitchen_motion_lights",    label: "Kitchen",  domain: "automation" },
];

const MODES = [
  { entityId: "input_boolean.lucas_sleeping",   label: "Lucas Sleeping" },
  { entityId: "input_boolean.loretta_working",  label: "Loretta Working" },
  { entityId: "input_boolean.vacation_mode",    label: "Vacation Mode" },
  { entityId: "input_boolean.edward_bedroom",   label: "Edward Bedroom" },
  { entityId: "input_boolean.edward_alone",     label: "Edward Alone" },
  { entityId: "input_boolean.mom_over",         label: "Mom Over" },
  { entityId: "input_boolean.guests_arriving",  label: "Guests Arriving" },
  // Note: input_boolean.loretta_sleeping does not exist in HA yet
];

const LUCAS_ITEMS: Array<
  | { type: "toggle"; entityId: string; label: string; domain: string }
  | { type: "action"; id: string; label: string; domain: string; service: string; entity: string }
> = [
  { type: "toggle", entityId: "input_boolean.lucas_sleeping", label: "Lucas Sleeping",  domain: "input_boolean" },
  { type: "action", id: "lucas_gn",   label: "Goodnight Lucas",  domain: "script", service: "turn_on", entity: "script.lucas_goodnight" },
  { type: "action", id: "lucas_bath", label: "Lucas Bathtime",    domain: "script", service: "turn_on", entity: "script.lucas_bathtime" },
  { type: "action", id: "lucas_wind", label: "Lucas Wind Down",   domain: "script", service: "turn_on", entity: "script.lucas_wind_down" },
];

const CAMERAS = [
  { entityId: "camera.lucass_room_snapshot_2",  label: "Lucas" },
  { entityId: "camera.basement_door_live_view",  label: "Basement" },
  { entityId: "camera.upstairs_live_view",       label: "Upstairs" },
];

// All toggle entity IDs we need to poll
const ALL_TOGGLE_IDS = [
  ...MOTION_AUTOMATIONS.map(m => m.entityId),
  ...MODES.map(m => m.entityId),
  "input_boolean.lucas_sleeping",
];

function isOn(s: string | undefined) { return s === "on" || s === "true"; }

async function callHA(domain: string, service: string, entity_id: string) {
  return apiRequest("POST", "/api/ha/service", { domain, service, entity_id });
}

// ── Camera modal ─────────────────────────────────────────────────────────────
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

// ── Camera thumbnail with hover-zoom ─────────────────────────────────────────
function CameraThumb({ cam, onLive }: { cam: typeof CAMERAS[0]; onLive: () => void }) {
  const [ts, setTs] = useState(() => Date.now());
  const [err, setErr] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHover = () => {
    hoverTimer.current = setTimeout(() => setZoomed(true), 1000);
  };
  const endHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setZoomed(false);
  };

  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); };
  }, []);

  return (
    <>
      {/* Zoomed overlay (magnified view) */}
      {zoomed && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseLeave={endHover}
          onClick={onLive}
        >
          <div className="relative w-full max-w-lg rounded-xl overflow-hidden shadow-2xl bg-black cursor-pointer">
            <img
              src={`/api/ha/camera/${cam.entityId}?t=${ts}`}
              alt={cam.label}
              className="w-full"
              style={{ aspectRatio: "16/9", objectFit: "cover" }}
            />
            <span className="absolute bottom-2 left-3 text-xs text-white/80 font-medium bg-black/50 rounded px-1.5 py-0.5">
              {cam.label} — Click for live
            </span>
          </div>
        </div>
      )}

      <div
        className="relative rounded-md overflow-hidden bg-muted/30 cursor-pointer border border-border/50 hover:border-primary/40 transition-colors"
        style={{ aspectRatio: "16/9" }}
        onMouseEnter={startHover}
        onMouseLeave={endHover}
        onClick={onLive}
        title={`${cam.label} — hover to zoom, click for live`}
      >
        {err ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-[9px]">
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
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <Maximize2 className="w-2.5 h-2.5 text-white" />
          <span className="text-white text-[8px] font-medium">Live</span>
        </div>
        <span className="absolute bottom-0.5 left-1 text-[8px] text-white/80 font-medium bg-black/50 rounded px-0.5">
          {cam.label}
        </span>
        <button
          className="absolute top-0.5 right-0.5 text-white/60 hover:text-white p-0.5"
          onClick={e => { e.stopPropagation(); setTs(Date.now()); setErr(false); }}
          title="Refresh"
        >
          <span className="text-[8px]">↺</span>
        </button>
      </div>
    </>
  );
}

// ── Compact toggle switch ────────────────────────────────────────────────────
function MiniToggle({ on, loading }: { on: boolean; loading: boolean }) {
  if (loading) return <Loader2 className="w-3 h-3 animate-spin shrink-0 text-muted-foreground" />;
  return (
    <span className={`relative inline-flex w-6 h-3 rounded-full transition-colors shrink-0 ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 w-2 h-2 bg-white rounded-full shadow transition-transform ${on ? "translate-x-3" : "translate-x-0.5"}`} />
    </span>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">
      {children}
    </p>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function SmartHomePanel() {
  const [pending, setPending] = useState<string | null>(null);
  const [liveCamera, setLiveCamera] = useState<typeof CAMERAS[0] | null>(null);

  const { data: states = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ha/states"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ha/states?ids=${encodeURIComponent(ALL_TOGGLE_IDS.join(","))}`);
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

  return (
    <>
      {liveCamera && <CameraModal cam={liveCamera} onClose={() => setLiveCamera(null)} />}

      <div className="panel-card p-3" data-testid="smart-home-panel">
        <div className="flex items-center justify-between mb-2">
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

        <div className="grid grid-cols-12 gap-3">

          {/* ── Left: Lights + Motion + Lobby ─────────────────────────── */}
          <div className="col-span-12 md:col-span-3 space-y-2.5">
            {/* Lights */}
            <div>
              <SectionLabel>Lights</SectionLabel>
              <div className="space-y-0.5">
                {LIGHTS.map(s => (
                  <button
                    key={s.id}
                    disabled={pending === s.id}
                    onClick={() => act(s.id, s.domain, s.service, s.entity)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all disabled:opacity-40
                      ${"danger" in s && s.danger
                        ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        : "bg-muted/40 border-border/60 text-foreground hover:bg-muted/70"
                      }`}
                  >
                    {pending === s.id && <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Motion Activation */}
            <div>
              <SectionLabel>Motion Activation</SectionLabel>
              <div className="space-y-0.5">
                {MOTION_AUTOMATIONS.map(m => {
                  const on = isOn(states[m.entityId]);
                  return (
                    <button
                      key={m.entityId}
                      disabled={pending === m.entityId}
                      onClick={() => toggle(m.entityId, m.domain, on)}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all disabled:opacity-40
                        ${on
                          ? "bg-primary/10 border-primary/25 text-primary"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                        }`}
                    >
                      <span>{m.label}</span>
                      <MiniToggle on={on} loading={pending === m.entityId} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lobby Door */}
            <button
              disabled={pending === "lobby"}
              onClick={() => act("lobby", "button", "press", "button.lobby_open_door")}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium border bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-40"
            >
              {pending === "lobby"
                ? <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                : <DoorOpen className="w-3 h-3 shrink-0" />
              }
              Lobby Door Buzzer
            </button>
          </div>

          {/* ── Middle: Modes + Lucas ─────────────────────────────────── */}
          <div className="col-span-12 md:col-span-5 space-y-2.5">
            {/* Modes */}
            <div>
              <SectionLabel>Modes</SectionLabel>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {MODES.map(m => {
                  const on = isOn(states[m.entityId]);
                  return (
                    <button
                      key={m.entityId}
                      disabled={pending === m.entityId}
                      onClick={() => toggle(m.entityId, "input_boolean", on)}
                      className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all disabled:opacity-40
                        ${on
                          ? "bg-primary/10 border-primary/25 text-primary"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                        }`}
                    >
                      <span className="truncate">{m.label}</span>
                      <MiniToggle on={on} loading={pending === m.entityId} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lucas */}
            <div>
              <SectionLabel>Lucas</SectionLabel>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {LUCAS_ITEMS.map(item => {
                  if (item.type === "toggle") {
                    const on = isOn(states[item.entityId]);
                    return (
                      <button
                        key={item.entityId}
                        disabled={pending === item.entityId}
                        onClick={() => toggle(item.entityId, item.domain, on)}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all disabled:opacity-40
                          ${on
                            ? "bg-primary/10 border-primary/25 text-primary"
                            : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                          }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <MiniToggle on={on} loading={pending === item.entityId} />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={item.id}
                      disabled={pending === item.id}
                      onClick={() => act(item.id, item.domain, item.service, item.entity)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border bg-muted/40 border-border/60 text-foreground hover:bg-muted/70 transition-all disabled:opacity-40"
                    >
                      {pending === item.id && <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Cameras (smaller, compact) ─────────────────────── */}
          <div className="col-span-12 md:col-span-4">
            <SectionLabel>Cameras</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {CAMERAS.map(c => (
                <CameraThumb key={c.entityId} cam={c} onLive={() => setLiveCamera(c)} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
