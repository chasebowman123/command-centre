import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tv, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface TvShowData {
  showName: string;
  network: string;
  status: string;
  imageUrl: string | null;
  nextEpisodeName: string | null;
  nextEpisodeSeason: number | null;
  nextEpisodeNumber: number | null;
  nextEpisodeDate: string | null;
}

type FilterTab = "all" | "upcoming" | "airing";

function getCountdown(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now = new Date();
  const airDate = new Date(dateStr + "T00:00:00");
  const diffMs = airDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays}d`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)}w`;
  return `In ${Math.ceil(diffDays / 30)}mo`;
}

function getStatusInfo(show: TvShowData): { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string } {
  if (show.nextEpisodeDate) {
    const now = new Date();
    const airDate = new Date(show.nextEpisodeDate + "T00:00:00");
    const diffDays = Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: "Airing", variant: "default", color: "bg-green-500/15 text-green-500 border-green-500/20" };
    return { label: "Upcoming", variant: "secondary", color: "bg-blue-500/15 text-blue-500 border-blue-500/20" };
  }
  if (show.status === "Running") return { label: "TBA", variant: "outline", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" };
  return { label: "Ended", variant: "outline", color: "bg-muted text-muted-foreground border-border" };
}

function formatAirDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatEpisodeCode(season: number | null, episode: number | null): string {
  if (season == null || episode == null) return "";
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

export function TVShowsPanel() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: shows = [], isLoading, refetch, isFetching } = useQuery<TvShowData[]>({
    queryKey: ["/api/tv-shows"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tv-shows");
      return res.json();
    },
    staleTime: 300000,
    refetchInterval: 600000,
  });

  // Filter out ended shows and sort by next episode date
  const activeShows = shows
    .filter((s) => s.status !== "Ended")
    .sort((a, b) => {
      if (!a.nextEpisodeDate && !b.nextEpisodeDate) return a.showName.localeCompare(b.showName);
      if (!a.nextEpisodeDate) return 1;
      if (!b.nextEpisodeDate) return 1;
      return a.nextEpisodeDate.localeCompare(b.nextEpisodeDate);
    });

  const filteredShows = activeShows.filter((s) => {
    if (filter === "all") return true;
    const info = getStatusInfo(s);
    if (filter === "upcoming") return info.label === "Upcoming";
    if (filter === "airing") return info.label === "Airing";
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: activeShows.length },
    { key: "upcoming", label: "Upcoming", count: activeShows.filter((s) => getStatusInfo(s).label === "Upcoming").length },
    { key: "airing", label: "Airing Now", count: activeShows.filter((s) => getStatusInfo(s).label === "Airing").length },
  ];

  return (
    <div className="panel-card p-4 md:p-5" data-testid="tv-shows-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            TV Shows
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 opacity-60">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="refresh-tv-shows"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-12 bg-muted rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-2.5 w-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredShows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {shows.length === 0 ? "No TV shows data yet — waiting for daily update" : "No shows match this filter"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left py-2 pr-4">Show</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Next Episode</th>
                <th className="text-left py-2 px-2">Air Date</th>
                <th className="text-right py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredShows.map((show, i) => {
                const statusInfo = getStatusInfo(show);
                const countdown = getCountdown(show.nextEpisodeDate);
                return (
                  <tr
                    key={`${show.showName}-${i}`}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    data-testid={`row-show-${i}`}
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        {show.imageUrl ? (
                          <img
                            src={show.imageUrl}
                            alt=""
                            className="w-7 h-10 rounded object-cover bg-muted shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-10 rounded bg-muted/60 flex items-center justify-center shrink-0">
                            <Tv className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{show.showName}</p>
                          {show.network && (
                            <p className="text-[11px] text-muted-foreground">{show.network}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2">
                      {show.nextEpisodeName ? (
                        <div className="min-w-0">
                          <p className="text-sm truncate max-w-[200px]">{show.nextEpisodeName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatEpisodeCode(show.nextEpisodeSeason, show.nextEpisodeNumber)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">TBA</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 tabular-nums text-muted-foreground whitespace-nowrap">
                      {formatAirDate(show.nextEpisodeDate)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      {countdown && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 border whitespace-nowrap ${
                            countdown === "Today" || countdown === "Tomorrow"
                              ? "bg-green-500/15 text-green-500 border-green-500/20"
                              : "bg-muted/50 text-muted-foreground border-border"
                          }`}
                        >
                          {countdown}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
