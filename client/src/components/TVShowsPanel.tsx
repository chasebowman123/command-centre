import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tv, RefreshCw } from "lucide-react";
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
  nextEpisodeTime?: string | null;
}

interface TvShowsResponse {
  shows: TvShowData[];
  lastUpdated: string | null;
}

type FilterTab = "all" | "upcoming" | "airing";

function to24h(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(A\.?M\.?|P\.?M\.?)/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].replace(/\./g, "").toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return "";
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "• just now";
  if (diffMin < 60) return `• ${diffMin}m ago`;
  return `• ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function getCountdown(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now      = new Date();
  const airDate  = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7)  return `${diffDays}d`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w`;
  return `${Math.ceil(diffDays / 30)}mo`;
}

function getStatusInfo(show: TvShowData) {
  if (show.nextEpisodeDate) {
    const now      = new Date();
    const airDate  = new Date(show.nextEpisodeDate + "T00:00:00");
    const diffDays = Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "airing";
    return "upcoming";
  }
  if (show.status === "Running" || show.status === "To Be Determined" || show.status === "TBA") {
    return "tba";
  }
  return "ended";
}

function formatAirDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatEpisodeCode(season: number | null, episode: number | null): string {
  if (season == null || episode == null) return "";
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

export function TVShowsPanel() {
  const [filter, setFilter] = useState<FilterTab>("airing");

  const { data: tvData, isLoading, refetch, isFetching } = useQuery<TvShowsResponse>({
    queryKey: ["/api/tv-shows"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tv-shows");
      const json = await res.json();
      if (Array.isArray(json)) return { shows: json, lastUpdated: null };
      return json as TvShowsResponse;
    },
    staleTime: 300000,
    refetchInterval: 600000,
  });

  const shows       = tvData?.shows ?? [];
  const lastUpdated = tvData?.lastUpdated ?? null;

  const activeShows = shows
    .filter(s => s.status !== "Ended")
    .sort((a, b) => {
      if (!a.nextEpisodeDate && !b.nextEpisodeDate) return a.showName.localeCompare(b.showName);
      if (!a.nextEpisodeDate) return 1;
      if (!b.nextEpisodeDate) return 1;
      return a.nextEpisodeDate.localeCompare(b.nextEpisodeDate);
    });

  const filteredShows = activeShows.filter(s => {
    const status = getStatusInfo(s);
    if (filter === "all")      return true;
    if (filter === "upcoming") return status === "upcoming";
    if (filter === "airing")   return status === "airing";
    return true;
  });

  const counts = {
    all:      activeShows.length,
    upcoming: activeShows.filter(s => getStatusInfo(s) === "upcoming").length,
    airing:   activeShows.filter(s => getStatusInfo(s) === "airing").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: `All ${counts.all}` },
    { key: "upcoming", label: `Soon ${counts.upcoming}` },
    { key: "airing",   label: `Airing ${counts.airing}` },
  ];

  return (
    <div className="panel-card p-4 flex flex-col min-h-0" data-testid="tv-shows-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            TV Shows
          </p>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/50">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tv-tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="refresh-tv-shows"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0 -mr-1 pr-1" style={{ scrollbarWidth: "thin" }}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-14 bg-muted rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-2.5 w-20 bg-muted rounded" />
                </div>
                <div className="h-2.5 w-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filteredShows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {shows.length === 0
              ? "No TV shows yet — waiting for daily update"
              : "No shows match this filter"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filteredShows.map((show, i) => {
              const epCode    = formatEpisodeCode(show.nextEpisodeSeason, show.nextEpisodeNumber);
              const airDate   = formatAirDate(show.nextEpisodeDate);
              const countdown = getCountdown(show.nextEpisodeDate);
              const isSoon    = countdown === "Today" || countdown === "Tomorrow";

              return (
                <div
                  key={`${show.showName}-${i}`}
                  className="flex items-center gap-3 px-1.5 py-2 rounded-lg hover:bg-muted/20 transition-colors group"
                  data-testid={`tv-show-${i}`}
                >
                  {/* Poster */}
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-muted/60 shrink-0">
                    {show.imageUrl ? (
                      <img
                        src={show.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tv className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-snug group-hover:text-foreground">
                      {show.showName}
                    </p>
                    {(epCode || show.nextEpisodeName) ? (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">
                        {epCode}{epCode && show.nextEpisodeName ? " · " : ""}
                        {show.nextEpisodeName ?? ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">TBA</p>
                    )}
                  </div>

                  {/* Date + countdown */}
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground tabular-nums">{airDate}</p>
                    {countdown && (
                      <p className={`text-[10px] font-medium tabular-nums ${
                        isSoon ? "text-green-400" : "text-muted-foreground/50"
                      }`}>
                        {countdown}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
