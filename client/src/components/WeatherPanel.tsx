import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sunrise, Sunset, MapPin } from "lucide-react";

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear Sky", emoji: "☀️" },
  1: { label: "Mainly Clear", emoji: "🌤" },
  2: { label: "Partly Cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Foggy", emoji: "🌫" },
  48: { label: "Rime Fog", emoji: "🌫" },
  51: { label: "Light Drizzle", emoji: "🌦" },
  53: { label: "Drizzle", emoji: "🌧" },
  55: { label: "Heavy Drizzle", emoji: "🌧" },
  61: { label: "Light Rain", emoji: "🌧" },
  63: { label: "Rain", emoji: "🌧" },
  65: { label: "Heavy Rain", emoji: "🌧" },
  71: { label: "Light Snow", emoji: "🌨" },
  73: { label: "Snow", emoji: "❄️" },
  75: { label: "Heavy Snow", emoji: "❄️" },
  80: { label: "Showers", emoji: "🌧" },
  81: { label: "Heavy Showers", emoji: "⛈" },
  95: { label: "Thunderstorm", emoji: "⛈" },
};

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

  const current = data?.current;
  const daily = data?.daily;

  if (isLoading || !current) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a3a5c] to-[#0f1b2d] p-4 flex items-center justify-center h-16">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  const code = current.weather_code ?? 0;
  const weatherInfo = WMO_CODES[code] || { label: "Unknown", emoji: "🌡" };
  const temp = Math.round(current.temperature_2m);
  const high = daily?.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : null;
  const low = daily?.temperature_2m_min?.[0] ? Math.round(daily.temperature_2m_min[0]) : null;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sunrise = daily?.sunrise?.[0]
    ? new Date(daily.sunrise[0]).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "--";
  const sunset = daily?.sunset?.[0]
    ? new Date(daily.sunset[0]).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "--";

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a3a5c] via-[#1a2f50] to-[#0f1b2d]"
      data-testid="weather-panel"
    >
      {/* Decorative blob */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5 blur-xl" />

      <div className="relative z-10 px-5 py-4 flex items-center justify-between gap-6">
        {/* Left: emoji + temp + condition */}
        <div className="flex items-center gap-4">
          <span className="text-4xl" role="img" aria-label={weatherInfo.label}>
            {weatherInfo.emoji}
          </span>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-white text-3xl font-bold leading-none tracking-tight">
                {temp}°<span className="text-xl font-normal text-white/60">C</span>
              </p>
              <p className="text-white/60 text-xs font-medium">{weatherInfo.label}</p>
            </div>
            {high !== null && low !== null && (
              <p className="text-white/50 text-xs mt-1">
                H: {high}° &nbsp; L: {low}°
              </p>
            )}
          </div>
        </div>

        {/* Center: Date + Location */}
        <div className="hidden sm:block text-center">
          <p className="text-white/90 text-sm font-medium">{dateStr}</p>
          <div className="flex items-center gap-1 mt-0.5 justify-center">
            <MapPin className="w-3 h-3 text-white/50" />
            <p className="text-white/50 text-xs">London, UK</p>
          </div>
        </div>

        {/* Right: Sunrise / Sunset */}
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <Sunrise className="w-4 h-4 text-amber-400/80" />
            <span className="text-white/70 text-xs tabular-nums">{sunrise}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sunset className="w-4 h-4 text-orange-400/80" />
            <span className="text-white/70 text-xs tabular-nums">{sunset}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
