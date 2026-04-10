import { ExternalLink } from "lucide-react";

interface LinkItem {
  label: string;
  url: string;
}

interface LinkGroup {
  category: string;
  links: LinkItem[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    category: "Finance",
    links: [
      { label: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" },
      { label: "Google Tasks", url: "https://tasks.google.com" },
      { label: "Google Calendar", url: "https://calendar.google.com/calendar/u/0/r" },
      { label: "CNBC Markets", url: "https://www.cnbc.com/us-markets/" },
      { label: "Schwab", url: "https://www.schwab.com/public/schwab/client_home" },
      { label: "Coinbase", url: "https://www.coinbase.com/home" },
      { label: "HSBC", url: "https://www.hsbc.com" },
    ],
  },
  {
    category: "News",
    links: [
      { label: "Daily Mail", url: "https://www.dailymail.co.uk/home/index.html" },
      { label: "Telegraph", url: "https://www.telegraph.co.uk/" },
      { label: "NY Times", url: "https://www.nytimes.com/" },
      { label: "NY Post", url: "https://nypost.com" },
      { label: "The Guardian", url: "https://www.theguardian.com/uk" },
      { label: "FT", url: "https://www.ft.com/" },
      { label: "Polymarket", url: "https://polymarket.com/" },
    ],
  },
  {
    category: "Home",
    links: [
      { label: "Home Assistant", url: "http://homeassistant.local:8123/" },
      { label: "NAS", url: "http://192.168.4.127:5000/" },
      { label: "Amazon UK", url: "https://www.amazon.co.uk/ref=nav_logo" },
    ],
  },
  {
    category: "AI",
    links: [
      { label: "ChatGPT", url: "https://chatgpt.com/" },
      { label: "Grok", url: "https://grok.com/" },
      { label: "Gemini", url: "https://gemini.google.com/app" },
      { label: "Perplexity", url: "https://www.perplexity.ai/" },
      { label: "Claude", url: "https://claude.ai" },
    ],
  },
  {
    category: "Sports",
    links: [
      { label: "StatMuse NBA", url: "https://www.statmuse.com/nba" },
    ],
  },
];

function getFavicon(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return "";
  }
}

export function KeyLinksPanel() {
  return (
    <div className="panel-card p-4 flex flex-col" style={{ maxHeight: "calc(100vh - 160px)" }} data-testid="key-links-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Key Links
      </p>
      <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-3" style={{ minHeight: 0 }}>
        {LINK_GROUPS.map((group) => (
          <div key={group.category}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1 px-2">
              {group.category}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm hover:bg-muted/60 transition-colors group"
                  data-testid={`link-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <img
                    src={getFavicon(link.url)}
                    alt=""
                    className="w-4 h-4 rounded-sm shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="truncate group-hover:text-primary transition-colors">{link.label}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
