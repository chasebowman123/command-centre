import { CalendarPanel } from "@/components/CalendarPanel";
import { TasksPanel } from "@/components/TasksPanel";
import { TVShowsPanel } from "@/components/TVShowsPanel";
import { WeatherPanel } from "@/components/WeatherPanel";
import { KeyLinksPanel } from "@/components/KeyLinksPanel";
import { MiniCharts } from "@/components/MiniCharts";
import { MarketTicker } from "@/components/MarketTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartHomePanel } from "@/components/SmartHomePanel";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* === MOVING TICKER — very top === */}
      <MarketTicker />

      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">
          Command Centre
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Dashboard content — 2-column: main content left, Key Links right */}
      <main className="px-4 md:px-5 pb-4">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* === LEFT COLUMN (9 cols) — all main content === */}
            <div className="lg:col-span-9 space-y-4">
              {/* Weather */}
              <WeatherPanel />

              {/* Calendar + Tasks side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CalendarPanel />
                <TasksPanel />
              </div>

              {/* Mini Charts */}
              <MiniCharts />

              {/* TV Shows */}
              <TVShowsPanel />

              {/* Smart Home */}
              <SmartHomePanel />

            </div>

            {/* === RIGHT COLUMN (3 cols) — Key Links spanning full height === */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-4">
                <KeyLinksPanel />
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </main>
    </div>
  );
}
