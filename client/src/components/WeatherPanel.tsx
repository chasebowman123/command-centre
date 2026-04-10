import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Droplets, Wind, Thermometer } from "lucide-react";

const WMO: Record<number, { label: string; emoji: string; bg: string }> = {
  0:  { label: "Clear",        emoji: "☀️",  bg: "from-[#0f4c8a] via-[#1a6bb5] to-[#1a3a5c]" },
  1:  { label: "Mainly Clear", emoji: "🌤",  bg: "from-[#0f4c8a] via-[#1a6bb5] to-[#1a3a5c]" },
  2:  { label: "Partly Cloudy",emoji: "⛅",  bg: "from-[#2c4a6e] via-[#1a3a5c] to-[#0f1f3d]" },
  3:  { label: "Overcast",     emoji: "☁️",  bg: "from-[#2d3748] via-[#1a2540] to-[#0f1520]" },
  45: { label: "Foggy",        emoji: "🌫",  bg: "from-[#3d4a5c] via-[#2a3545] to-[#151f2e]" },
  48: { label: "Rime Fog",     emoji: "🌫",  bg: "from-[#3d4a5c] via-[#2a3545] to-[#151f2e]" },
  51: { label: "Drizzle",      emoji: "🌦",  bg: "from-[#1e3a5c] via-[#162d4a] to-[#0d1f35]" },
  53: { label: "Drizzle",      emoji: "🌧",  bg: "from-[#1e3a5c] via-[#162d4a] to-[#0d1f35]" },
  61: { label: "Rain",         emoji: "🌧",  bg: "from-[#1a2d4a] via-[#122038] to-[#0a1525]" },
  63: { label: "Rain",         emoji: "🌧",  bg: "from-[#1a2d4a] via-[#122038] to-[#0a1525]" },
  65: { label: "Heavy Rain",   emoji: "🌧",  bg: "from-[#151e2d] via-[#0e1825] to-[#070f1a]" },
  71: { label: "Snow",         emoji: "🌨",  bg: "from-[#2d4060] via-[#1e3050] to-[#10203a]" },
  73: { label: "Snow",         emoji: "❄️",  bg: "from-[#2d4060] via-[#1e3050] to-[#10203a]" },
  80: { label: "Showers",      emoji: "🌧",  bg: "from-[#1a2d4a] via-[#122038] to-[#0a1525]" },
  95: { label: "Thunderstorm", emoji: "⛈",  bg: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]" },
};

function getWmo(code: number) {
  return WMO[code] ?? { label: "Unknown", emoji: "🌡", bg: "from-[#1a3a5c] to-[#0f1b2d]" };
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function WeatherPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/weather"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/weather");
      return res.json();
    },
    refetchInterval: 600000,
    staleTime: 300000,
  });

  if (isLoading || !data?.current) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a3a5c] to-[#0f1b2d] flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  const c = data.current;
  const d = data.daily;
  const code = c.weather_code ?? 0;
  const wmo = getWmo(code);

  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature);
  const humidity = Math.round(c.relative_humidity_2m);
  const wind = Math.round(c.wind_speed_10m);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // 5-day forecast (skip today = index 0)
  const forecast = d?.time ? d.time.slice(1, 6).map((t: string, i: number) => {
    const dt = new Date(t);
    return {
      day: DAY_LABELS[dt.getDay()],
      high: Math.round(d.temperature_2m_max[i + 1]),
      low: Math.round(d.temperature_2m_min[i + 1]),
      emoji: getWmo(d.weather_code?.[i + 1] ?? 0).emoji,
    };
  }) : [];

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${wmo.bg}`}
      data-testid="weather-panel"
    >
      {/* Atmospheric blobs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/4 blur-xl pointer-events-none" />

      {/* Main row */}
      <div className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-between gap-4">

        {/* Emoji + Temp */}
        <div className="flex items-center gap-4">
          <span className="text-6xl drop-shadow-lg" role="img" aria-label={wmo.label}>
            {wmo.emoji}
          </span>
          <div>
            <div className="flex items-start gap-1">
              <p className="text-white text-5xl font-extrabold leading-none tracking-tight">
                {temp}
              </p>
              <span className="text-white/60 text-2xl font-light mt-1">°C</span>
            </div>
            <p className="text-white/70 text-sm font-medium mt-0.5">{wmo.label}</p>
          </div>
        </div>

        {/* Date + time */}
        <div className="hidden sm:block text-right">
          <p className="text-white text-2xl font-bold tabular-nums">{timeStr}</p>
          <p className="text-white/60 text-sm mt-0.5">{dateStr}</p>
          <p className="text-white/40 text-xs mt-0.5">London, UK</p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex flex-col gap-2 text-white/70 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-orange-300/80" />
            <span>Feels {feels}°</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-blue-300/80" />
            <span>{humidity}% humidity</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-cyan-300/80" />
            <span>{wind} km/h</span>
          </div>
        </div>

      </div>

      {/* 5-day strip */}
      {forecast.length > 0 && (
        <div className="relative z-10 mx-4 mb-4 mt-1 grid grid-cols-5 gap-1">
          {forecast.map((f: { day: string; emoji: string; high: number; low: number }) => (
            <div
              key={f.day}
              className="bg-white/8 backdrop-blur-sm rounded-lg py-2 px-1 flex flex-col items-center gap-0.5 text-white/80"
            >
              <p className="text-[11px] font-medium">{f.day}</p>
              <span className="text-lg">{f.emoji}</span>
              <p className="text-[11px] font-semibold">{f.high}°</p>
              <p className="text-[10px] text-white/45">{f.low}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
