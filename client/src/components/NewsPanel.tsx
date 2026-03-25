import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Newspaper, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const NEWS_TOPICS = [
  { key: "portfolio", label: "Portfolio", query: "Fannie Mae Freddie Mac Lumentum stock" },
  { key: "markets", label: "Markets", query: "stock market Wall Street today" },
  { key: "crypto", label: "Crypto", query: "Bitcoin Ethereum crypto" },
  { key: "macro", label: "Macro", query: "Federal Reserve interest rates economy" },
];

export function NewsPanel() {
  const [activeTopic, setActiveTopic] = useState("portfolio");
  const topic = NEWS_TOPICS.find((t) => t.key === activeTopic) || NEWS_TOPICS[0];

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/news", topic.query],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/news?q=${encodeURIComponent(topic.query)}`);
      return res.json();
    },
    refetchInterval: 600000,
    staleTime: 300000,
  });

  const items: NewsItem[] = data?.items || [];

  function timeAgo(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return `${Math.floor(diff / 1440)}d ago`;
    } catch {
      return "";
    }
  }

  return (
    <div className="panel-card p-4 md:p-5" data-testid="news-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            News Feed
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="refresh-news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Topic tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {NEWS_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTopic(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTopic === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid={`button-news-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* News list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg bg-muted/20 animate-pulse">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            ))
          : items.length > 0
            ? items.slice(0, 8).map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-3 rounded-lg bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all"
                  data-testid={`news-item-${i}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.source && (
                      <span className="text-[11px] text-primary/80 font-medium">{item.source}</span>
                    )}
                    {item.pubDate && (
                      <span className="text-[11px] text-muted-foreground">{timeAgo(item.pubDate)}</span>
                    )}
                  </div>
                </a>
              ))
            : (
                <p className="text-sm text-muted-foreground col-span-2">No news available</p>
              )}
      </div>
    </div>
  );
}
