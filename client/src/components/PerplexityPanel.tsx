import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";

export function PerplexityPanel() {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(query.trim())}`, "_blank");
    }
  };

  return (
    <div className="panel-card p-4" data-testid="perplexity-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src="https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32"
            alt=""
            className="w-4 h-4 rounded-sm"
          />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Perplexity
          </p>
        </div>
        <a
          href="https://www.perplexity.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask Perplexity anything..."
            className="w-full bg-muted/30 border border-border/60 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-colors"
            data-testid="perplexity-search-input"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-colors shrink-0"
          data-testid="perplexity-search-button"
        >
          Search
        </button>
      </form>
      <p className="text-[10px] text-muted-foreground/40 mt-2">
        Opens in a new tab — Perplexity doesn't support iframe embedding
      </p>
    </div>
  );
}
