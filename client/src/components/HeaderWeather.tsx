import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "Clear",         emoji: "☀️" },
  1:  { label: "Mainly Clear",  emoji: "🌤" },
  2:  { label: "Partly Cloudy", emoji: "⛅" },
  3:  { label: "Overcast",      emoji: "☁️" },
  45: { label: "Foggy",         emoji: "🌫" },
  48: { label: "Rime Fog",      emoji: "🌫" },
  51: { label: "Drizzle",       emoji: "🌦" },
  53: { label: "Drizzle",       emoji: "🌧" },
  61: { label: "Rain",          emoji: "🌧" },
  63: { label: "Rain",          emoji: "🌧" },
  65: { label: "Heavy Rain",    emoji: "🌧" },
  71: { label: "Snow",          emoji: "🌨" },
  73: { label: "Snow",          emoji: "❄️" },
  80: { label: "Showers",       emoji: "🌧" },
  95: { label: "Thunderstorm",  emoji: "⛈" },
};

function getWmo(code: number) {
  return WMO[code] ?? { label: "Unknown", emoji: "🌡" };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HeaderWeather() {
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
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground/70 rounded-full animate-spin" />
      </div>
    );
  }

  const c = data.current;
  const d = data.daily;
  const code = c.weather_code ?? 0;
  const wmo = getWmo(code);

  const temp  = Math.round(c.temperature_2m);
  const high  = d?.temperature_2m_max?.[0] != null ? Math.round(d.temperature_2m_max[0]) : null;
  const low   = d?.temperature_2m_min?.[0] != null ? Math.round(d.temperature_2m_min[0]) : null;

  // Next 2 days (index 1 and 2 from daily)
  const upcoming = d?.time ? d.time.slice(1, 3).map((t: string, i: number) => {
    const dt = new Date(t);
    return {
      day:   DAY_LABELS[dt.getDay()],
      high:  Math.round(d.temperature_2m_max[i + 1]),
      low:   Math.round(d.temperature_2m_min[i + 1]),
      emoji: getWmo(d.weather_code?.[i + 1] ?? 0).emoji,
    };
  }) : [];

  return (
    <div
      className="flex items-center gap-4 text-sm"
      data-testid="header-weather"
    >
      {/* Current */}
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-label={wmo.label}>
          {wmo.emoji}
        </span>
        <span className="text-lg font-bold tabular-nums">{temp}°</span>
        {high != null && low != null && (
          <span className="text-muted-foreground text-xs tabular-nums">
            H:{high}° L:{low}°
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Next 2 days */}
      {upcoming.map((day: { day: string; emoji: string; high: number; low: number }) => (
        <div key={day.day} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">{day.day}</span>
          <span className="text-sm">{day.emoji}</span>
          <span className="text-xs tabular-nums">
            {day.high}°
            <span className="text-muted-foreground">/{day.low}°</span>
          </span>
        </div>
      ))}
    </div>
  );
}
