import { useState } from "react";
import { TasksPanel } from "@/components/TasksPanel";
import { TVShowsPanel } from "@/components/TVShowsPanel";
import { WeatherPanel } from "@/components/WeatherPanel";
import { KeyLinksPanel } from "@/components/KeyLinksPanel";
import { InteractiveCharts } from "@/components/InteractiveCharts";
import { MarketTicker } from "@/components/MarketTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartHomePanel } from "@/components/SmartHomePanel";
import { QuickGmailPanel, QuickCalendarPanel } from "@/components/QuickPanels";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut } from "lucide-react";

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "home",    label: "Home" },
  { id: "nba",     label: "NBA" },
  { id: "markets", label: "Markets" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Home tab ─────────────────────────────────────────────────────────────────
function HomeTab() {
  return (
    <main className="px-4 md:px-5 pb-4">
      <div className="max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
          <div className="lg:col-span-9 space-y-4">

            {/* Charts at top */}
            <InteractiveCharts />

            {/* Smart Home */}
            <SmartHomePanel />

            {/* Weather */}
            <WeatherPanel />

            {/* Quick panels + Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickGmailPanel />
              <QuickCalendarPanel />
              <TasksPanel />
            </div>

          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-4 flex flex-col gap-4">

              {/* Key Links — capped height */}
              <KeyLinksPanel />

              {/* TV Shows — fills remaining space, scrollable */}
              <div
                className="flex flex-col min-h-0"
                style={{ maxHeight: "calc(100vh - 420px)", minHeight: "300px" }}
              >
                <TVShowsPanel />
              </div>

            </div>
          </div>

        </div>
      </div>
      <div className="h-4" />
    </main>
  );
}

// ── Iframe tab ────────────────────────────────────────────────────────────────
function IframeTab({ src, title }: { src: string; title: string }) {
  return (
    <div className="flex-1 px-4 md:px-5 pb-4">
      <iframe
        src={src}
        title={title}
        className="w-full rounded-lg border border-border"
        style={{ height: "calc(100vh - 120px)", minHeight: 600 }}
      />
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Moving ticker */}
      <MarketTicker />

      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">Command Centre</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <ThemeToggle />
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              queryClient.clear();
              window.location.reload();
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Sign out"
            data-testid="button-logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="px-4 md:px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`
                px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors relative
                ${activeTab === tab.id
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      {activeTab === "home"    && <HomeTab />}
      {activeTab === "nba"     && <IframeTab src="https://nba-bet-tracker-production.up.railway.app/#/" title="NBA Tracker" />}
      {activeTab === "markets" && <IframeTab src="https://market-tracker-production-d01a.up.railway.app" title="Market Tracker" />}
    </div>
  );
}
