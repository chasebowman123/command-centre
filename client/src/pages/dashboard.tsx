import { CalendarPanel } from "@/components/CalendarPanel";
import { TasksPanel } from "@/components/TasksPanel";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { WeatherPanel } from "@/components/WeatherPanel";
import { KeyLinksPanel } from "@/components/KeyLinksPanel";
import { MiniCharts } from "@/components/MiniCharts";
import { MarketTicker } from "@/components/MarketTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* === MOVING TICKER — very top === */}
      <MarketTicker />

      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">
          Edward Eidam Personal Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Dashboard content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-5 pb-6">
        <div className="max-w-[1800px] mx-auto space-y-4">

          {/* === ROW 1: Weather (full width, top) === */}
          <WeatherPanel />

          {/* === ROW 2: Mini Charts (full width, 3x2 grid handled internally) === */}
          <MiniCharts />

          {/* === ROW 3: Portfolio (full width) === */}
          <PortfolioPanel />

          {/* === ROW 4: Calendar + Tasks + Key Links — three columns side by side === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CalendarPanel />
            <TasksPanel />
            <KeyLinksPanel />
          </div>
        </div>

        <div className="mt-6">
          <PerplexityAttribution />
        </div>
      </main>
    </div>
  );
}
