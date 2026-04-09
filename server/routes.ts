import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoldingSchema, insertTaskSchema, insertPensionFundSchema, insertPropertySchema } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// node-ical — lazy dynamic import
let nodeIcal: any = null;
async function getIcal() {
  if (!nodeIcal) nodeIcal = await import("node-ical");
  return nodeIcal;
}

// yahoo-finance2 v3 — lazy dynamic import (avoids CJS/ESM issues with tsx)
let yf: any = null;
async function getYf() {
  if (!yf) {
    const mod = await import("yahoo-finance2");
    const YahooFinance = (mod as any).default || mod;
    yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;
    console.log('[yahoo-finance2] Initialized, quote method:', typeof yf.quote);
  }
  return yf;
}

// Simple quote cache (30s TTL) to avoid hammering Yahoo Finance
const yfCache: Record<string, { data: any; ts: number }> = {};
const YF_CACHE_TTL = 30000;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === HEALTH CHECK (used by Railway) ===
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // === HOLDINGS CRUD ===
  app.get("/api/holdings", (_req, res) => {
    const h = storage.getHoldings();
    res.json(h);
  });

  app.post("/api/holdings", (req, res) => {
    const parsed = insertHoldingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const h = storage.createHolding(parsed.data);
    res.json(h);
  });

  app.patch("/api/holdings/:id", (req, res) => {
    const id = Number(req.params.id);
    const h = storage.updateHolding(id, req.body);
    if (!h) return res.status(404).json({ error: "Not found" });
    res.json(h);
  });

  app.delete("/api/holdings/:id", (req, res) => {
    storage.deleteHolding(Number(req.params.id));
    res.json({ ok: true });
  });

  // === TASKS CRUD ===
  app.get("/api/tasks", (_req, res) => {
    const t = storage.getTasks();
    res.json(t);
  });

  app.post("/api/tasks", (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const t = storage.createTask(parsed.data);
    res.json(t);
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const t = storage.updateTask(id, req.body);
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    storage.deleteTask(Number(req.params.id));
    res.json({ ok: true });
  });

  // === CoinGecko fallback for tokens not on Yahoo Finance (with 60s cache) ===
  const COINGECKO_MAP: Record<string, string> = {
    "SPX6900-USD": "spx6900",
  };
  const geckoCache: Record<string, { data: any; ts: number }> = {};

  async function fetchCoinGeckoQuote(ticker: string, geckoId: string) {
    const cached = geckoCache[geckoId];
    if (cached && Date.now() - cached.ts < 60000) return cached.data;

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`;
    const resp = await fetch(url);
    const data = await resp.json();
    const info = data[geckoId];
    if (!info) {
      if (cached) return cached.data; // return stale cache on rate limit
      throw new Error(`CoinGecko: no data for ${geckoId}`);
    }
    const quote = {
      symbol: ticker,
      price: info.usd ?? 0,
      change: 0,
      changesPercentage: info.usd_24h_change ?? 0,
      previousClose: 0,
      dayHigh: 0,
      dayLow: 0,
      name: ticker.replace("-USD", ""),
    };
    geckoCache[geckoId] = { data: quote, ts: Date.now() };
    return quote;
  }

  // === FINANCE QUOTES (yahoo-finance2 + CoinGecko fallback) ===
  app.get("/api/quotes", async (req, res) => {
    try {
      const tickers = (req.query.tickers as string || "").split(",").filter(Boolean);
      if (!tickers.length) return res.json([]);

      const yfClient = await getYf();
      const results = await Promise.allSettled(
        tickers.map(async (t) => {
          // Use CoinGecko for tokens not on Yahoo Finance
          if (COINGECKO_MAP[t]) {
            return fetchCoinGeckoQuote(t, COINGECKO_MAP[t]);
          }
          // Check cache first
          const cached = yfCache[t];
          if (cached && Date.now() - cached.ts < YF_CACHE_TTL) return cached.data;

          const q = await yfClient.quote(t);
          if (!q || q.regularMarketPrice == null) throw new Error(`No data for ${t}`);
          const result = {
            symbol: q.symbol,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changesPercentage: q.regularMarketChangePercent ?? 0,
            previousClose: q.regularMarketPreviousClose ?? 0,
            dayHigh: q.regularMarketDayHigh ?? 0,
            dayLow: q.regularMarketDayLow ?? 0,
            name: q.shortName || q.longName || q.symbol,
          };
          yfCache[t] = { data: result, ts: Date.now() };
          return result;
        })
      );

      const quotes = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      res.json(quotes);
    } catch (err: any) {
      console.error("Quotes error:", err.message);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // === WEATHER (Open-Meteo — free, no API key) ===
  app.get("/api/weather", async (_req, res) => {
    try {
      // London coordinates
      const lat = 51.5074;
      const lon = -0.1278;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=Europe%2FLondon&forecast_days=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      console.error("Weather error:", err.message);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  // === NEWS (Google News RSS — no API key needed) ===
  app.get("/api/news", async (req, res) => {
    try {
      const query = req.query.q as string || "stock market today";
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;
      const response = await fetch(rssUrl);
      const xml = await response.text();

      const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
        const itemXml = match[1];
        let title = "";
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
        if (titleMatch) {
          title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
        }
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const link = linkMatch ? linkMatch[1].trim() : "";
        const pubMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const pubDate = pubMatch ? pubMatch[1].trim() : "";
        let source = "";
        const srcMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        if (srcMatch) {
          source = srcMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
        }
        if (title) {
          const decodeEntities = (s: string) => {
            let prev = "";
            let current = s;
            while (current !== prev) {
              prev = current;
              current = current
                .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/")
                .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
            }
            return current;
          };
          title = decodeEntities(title);
          source = decodeEntities(source);
          items.push({ title, link, pubDate, source });
        }
      }

      res.json({ items });
    } catch (err: any) {
      console.error("News error:", err.message);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // === HISTORICAL PRICES (for charts) ===
  const historyCache: Record<string, { data: any; ts: number }> = {};
  const HISTORY_CACHE_TTL = 300000; // 5 min

  app.get("/api/history", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      const range = (req.query.range as string) || "1mo";
      if (!symbol) return res.json([]);

      const cacheKey = `${symbol}_${range}`;
      const cached = historyCache[cacheKey];
      if (cached && Date.now() - cached.ts < HISTORY_CACHE_TTL) {
        return res.json(cached.data);
      }

      // CoinGecko for SPX6900
      if (COINGECKO_MAP[symbol]) {
        const days = range === "1h" ? 1 : range === "1d" ? 1 : range === "1w" || range === "5d" ? 7 : range === "1mo" ? 30 : range === "3mo" ? 90 : range === "6mo" ? 180 : 365;
        const url = `https://api.coingecko.com/api/v3/coins/${COINGECKO_MAP[symbol]}/market_chart?vs_currency=usd&days=${days}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.prices) {
          const cutoff = range === "1h" ? Date.now() - 3600000 : 0;
          const filtered = cutoff > 0 ? data.prices.filter((p: [number, number]) => p[0] >= cutoff) : data.prices;
          const points = filtered.map((p: [number, number]) => ({
            date: new Date(p[0]).toISOString(),
            close: p[1],
          }));
          // Downsample to ~60 points max
          const step = Math.max(1, Math.floor(points.length / 60));
          const sampled = points.filter((_: any, i: number) => i % step === 0);
          historyCache[cacheKey] = { data: sampled, ts: Date.now() };
          return res.json(sampled);
        }
        return res.json([]);
      }

      // Yahoo Finance historical
      const yfClient = await getYf();
      const now = new Date();

      // 1H: last 60 minutes with 1m interval
      if (range === "1h") {
        const period1 = new Date(now.getTime() - 75 * 60 * 1000); // 75 min back for buffer
        const result = await yfClient.chart(symbol, { period1, interval: "1m" });
        const quotes = result?.quotes || [];
        const cutoff = now.getTime() - 3600000;
        const points = quotes
          .filter((q: any) => q.close != null && new Date(q.date).getTime() >= cutoff)
          .map((q: any) => ({
            date: new Date(q.date).toISOString(),
            close: q.close,
          }));
        historyCache[cacheKey] = { data: points, ts: Date.now() };
        return res.json(points);
      }

      // Other ranges
      const daysBack: Record<string, number> = {
        "1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365,
      };
      const intervalMap: Record<string, string> = {
        "1d": "5m", "5d": "15m", "1mo": "1d", "3mo": "1d", "6mo": "1wk", "1y": "1wk",
      };
      const startDate = new Date(now.getTime() - (daysBack[range] || 30) * 86400000);
      const period1 = startDate.toISOString().slice(0, 10);
      const interval = intervalMap[range] || "1d";

      const result = await yfClient.chart(symbol, { period1, interval });
      const quotes = result?.quotes || [];
      const points = quotes
        .filter((q: any) => q.close != null)
        .map((q: any) => ({
          date: new Date(q.date).toISOString().slice(0, 10),
          close: q.close,
        }));

      historyCache[cacheKey] = { data: points, ts: Date.now() };
      res.json(points);
    } catch (err: any) {
      console.error("History error:", err.message);
      res.json([]);
    }
  });

  // === PENSION FUNDS CRUD ===
  app.get("/api/pensions", (_req, res) => {
    res.json(storage.getPensionFunds());
  });

  app.post("/api/pensions", (req, res) => {
    const parsed = insertPensionFundSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    res.json(storage.createPensionFund(parsed.data));
  });

  app.patch("/api/pensions/:id", (req, res) => {
    const id = Number(req.params.id);
    const p = storage.updatePensionFund(id, req.body);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  app.delete("/api/pensions/:id", (req, res) => {
    storage.deletePensionFund(Number(req.params.id));
    res.json({ ok: true });
  });

  // === PROPERTIES CRUD ===
  app.get("/api/properties", (_req, res) => {
    res.json(storage.getProperties());
  });

  app.post("/api/properties", (req, res) => {
    const parsed = insertPropertySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    res.json(storage.createProperty(parsed.data));
  });

  app.patch("/api/properties/:id", (req, res) => {
    const id = Number(req.params.id);
    const p = storage.updateProperty(id, req.body);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  app.delete("/api/properties/:id", (req, res) => {
    storage.deleteProperty(Number(req.params.id));
    res.json({ ok: true });
  });

  // === GBP/AUD exchange rate (for Australian Super) ===
  app.get("/api/fx", async (req, res) => {
    try {
      const pair = (req.query.pair as string) || "AUDGBP=X";
      const yfClient = await getYf();
      const cached = yfCache[pair];
      if (cached && Date.now() - cached.ts < 60000) return res.json(cached.data);
      const q = await yfClient.quote(pair);
      const rate = q?.regularMarketPrice ?? 0;
      const result = { pair, rate };
      yfCache[pair] = { data: result, ts: Date.now() };
      res.json(result);
    } catch (err: any) {
      console.error("FX error:", err.message);
      res.json({ pair: req.query.pair, rate: 0 });
    }
  });

  // === SEED DEFAULT HOLDINGS (if empty) ===
  const existing = storage.getHoldings();
  if (existing.length === 0) {
    storage.createHolding({ ticker: "FMCC", name: "Freddie Mac", quantity: 6800, avgPrice: 4.80, assetType: "stock" });
    storage.createHolding({ ticker: "FNMA", name: "Fannie Mae", quantity: 6000, avgPrice: 7.26, assetType: "stock" });
    storage.createHolding({ ticker: "LITE", name: "Lumentum Holdings", quantity: -334, avgPrice: 727, assetType: "stock" });
    storage.createHolding({ ticker: "SPX6900-USD", name: "SPX6900", quantity: 109422, avgPrice: 0.2258, assetType: "crypto" });
  }

  // === SEED DEFAULT PENSION FUNDS (if empty) ===
  const existingPensions = storage.getPensionFunds();
  if (existingPensions.length === 0) {
    const sjpFunds = [
      { provider: "SJP", fundName: "Intl Equity Pn Acc", isin: "GB0030964596", currentValue: 21120, allocation: 16, currency: "GBP" },
      { provider: "SJP", fundName: "Continental Euro Pn Acc", isin: "GB0007511156", currentValue: 18566, allocation: 14, currency: "GBP" },
      { provider: "SJP", fundName: "UK Pn Acc", isin: "GB0032680323", currentValue: 18013, allocation: 14, currency: "GBP" },
      { provider: "SJP", fundName: "Sust & Resp Equity Pn Acc", isin: "GB0004435862", currentValue: 17592, allocation: 13, currency: "GBP" },
      { provider: "SJP", fundName: "Emerg Mkts Equity Pn Acc", isin: "GB00BKX5CC71", currentValue: 17111, allocation: 13, currency: "GBP" },
      { provider: "SJP", fundName: "North American Pn Acc", isin: "GB0007511594", currentValue: 16679, allocation: 13, currency: "GBP" },
      { provider: "SJP", fundName: "Asia Pacific Pn Acc", isin: "GB0007510745", currentValue: 16244, allocation: 12, currency: "GBP" },
      { provider: "SJP", fundName: "Polaris 4 Pn Acc", isin: "GB0008401431", currentValue: 5907, allocation: 5, currency: "GBP" },
    ];
    for (const f of sjpFunds) {
      storage.createPensionFund(f);
    }
    storage.createPensionFund({ provider: "AustralianSuper", fundName: "AustralianSuper", isin: null, currentValue: 171000, allocation: null, currency: "AUD" });
  }

  // === TV SHOWS (file-based, updated by external cron agent) ===
  // Use /app/data on Railway/Docker where that mount exists, otherwise use local data/
  const tvShowsDir = (process.env.NODE_ENV === "production" && fs.existsSync("/app")) ? "/app/data" : path.join(process.cwd(), "data");
  const tvShowsFile = path.join(tvShowsDir, "tv-shows.json");

  // Ensure data directory exists
  if (!fs.existsSync(tvShowsDir)) {
    fs.mkdirSync(tvShowsDir, { recursive: true });
  }

  app.get("/api/tv-shows", (_req, res) => {
    try {
      if (fs.existsSync(tvShowsFile)) {
        const raw = fs.readFileSync(tvShowsFile, "utf-8");
        const data = JSON.parse(raw);
        const lastUpdated = fs.statSync(tvShowsFile).mtime.toISOString();
        res.json({ shows: Array.isArray(data) ? data : [], lastUpdated });
      } else {
        res.json({ shows: [], lastUpdated: null });
      }
    } catch (err: any) {
      console.error("TV shows read error:", err.message);
      res.json({ shows: [], lastUpdated: null });
    }
  });

  app.post("/api/tv-shows", (req, res) => {
    try {
      const tvApiKey = process.env.TV_API_KEY;
      if (tvApiKey) {
        const auth = req.headers.authorization;
        if (!auth || auth !== `Bearer ${tvApiKey}`) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      const payload = req.body;
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Payload must be an array" });
      }
      fs.writeFileSync(tvShowsFile, JSON.stringify(payload, null, 2), "utf-8");
      res.json({ ok: true, count: payload.length });
    } catch (err: any) {
      console.error("TV shows write error:", err.message);
      res.status(500).json({ error: "Failed to save TV shows data" });
    }
  });

  // === GOOGLE CALENDAR (iCal secret address) ===
  const calCache: { data: any; ts: number } | null = null;
  let calCacheData: { events: any[]; error?: string } | null = null;
  let calCacheTs = 0;
  const CAL_TTL = 120000; // 2 min cache

  app.get("/api/calendar", async (_req, res) => {
    try {
      if (calCacheData && Date.now() - calCacheTs < CAL_TTL) {
        return res.json(calCacheData);
      }
      const urls = (process.env.GCAL_ICAL_URLS || process.env.GCAL_ICAL_URL || "").split(",").map(u => u.trim()).filter(Boolean);
      if (!urls.length) return res.json({ events: [], error: "GCAL_ICAL_URL not set" });

      const ical = await getIcal();
      const now = new Date();
      const cutoff = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 3 weeks ahead

      const allEvents: any[] = [];
      await Promise.all(urls.map(async (url) => {
        try {
          const data = await ical.async.fromURL(url);
          for (const [, ev] of Object.entries(data) as any[]) {
            if (ev.type !== "VEVENT") continue;
            const start = ev.start ? new Date(ev.start) : null;
            if (!start) continue;

            if (ev.rrule) {
              // Expand recurring events
              const dates: Date[] = ev.rrule.between(now, cutoff);
              for (const d of dates) {
                const duration = ev.end && ev.start ? (new Date(ev.end).getTime() - new Date(ev.start).getTime()) : 0;
                allEvents.push({
                  id: `${ev.uid}-${d.getTime()}`,
                  title: ev.summary || "(No title)",
                  start: d.toISOString(),
                  end: new Date(d.getTime() + duration).toISOString(),
                  allDay: ev.datetype === "date",
                  location: ev.location || null,
                });
              }
            } else if (start >= now && start <= cutoff) {
              allEvents.push({
                id: ev.uid,
                title: ev.summary || "(No title)",
                start: start.toISOString(),
                end: ev.end ? new Date(ev.end).toISOString() : null,
                allDay: ev.datetype === "date",
                location: ev.location || null,
              });
            }
          }
        } catch (e: any) {
          console.error("iCal fetch error:", e.message);
        }
      }));

      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const result = { events: allEvents.slice(0, 20) };
      calCacheData = result;
      calCacheTs = Date.now();
      res.json(result);
    } catch (err: any) {
      console.error("Calendar error:", err.message);
      res.json({ events: [], error: err.message });
    }
  });

  // === HOME ASSISTANT PROXY ===
  const HA_BASE = process.env.HA_URL || "https://nujraxh1k9mt9kk0ul8x56dxac9afine.ui.nabu.casa";

  async function haFetch(urlPath: string, options: RequestInit = {}) {
    const token = process.env.HA_TOKEN;
    if (!token) throw new Error("HA_TOKEN_MISSING");
    return fetch(`${HA_BASE}${urlPath}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  }

  // GET /api/ha/states?ids=entity1,entity2  →  { entity1: "on", entity2: "off" }
  app.get("/api/ha/states", async (req, res) => {
    try {
      const ids = (req.query.ids as string || "").split(",").filter(Boolean);
      if (!ids.length) return res.json({});
      const results: Record<string, string> = {};
      await Promise.all(ids.map(async (id) => {
        try {
          const r = await haFetch(`/api/states/${id}`);
          if (r.ok) { const d = await r.json(); results[id] = d.state ?? "unknown"; }
        } catch {}
      }));
      res.json(results);
    } catch (err: any) {
      if (err.message === "HA_TOKEN_MISSING") return res.status(503).json({ error: "HA_TOKEN not set" });
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ha/service  →  { domain, service, entity_id }
  app.post("/api/ha/service", async (req, res) => {
    try {
      const { domain, service, entity_id } = req.body;
      if (!domain || !service) return res.status(400).json({ error: "domain and service required" });
      const body: Record<string, any> = {};
      if (entity_id) body.entity_id = entity_id;
      const r = await haFetch(`/api/services/${domain}/${service}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      res.json({ ok: r.ok, status: r.status });
    } catch (err: any) {
      if (err.message === "HA_TOKEN_MISSING") return res.status(503).json({ error: "HA_TOKEN not set" });
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ha/camera/:entityId  →  proxied JPEG snapshot
  app.get("/api/ha/camera/:entityId", async (req, res) => {
    try {
      const r = await haFetch(`/api/camera_proxy/${req.params.entityId}`);
      if (!r.ok) return res.status(r.status).send("Camera unavailable");
      const buf = await r.arrayBuffer();
      res.set("Content-Type", r.headers.get("content-type") || "image/jpeg");
      res.set("Cache-Control", "no-cache, no-store");
      res.send(Buffer.from(buf));
    } catch (err: any) {
      res.status(503).send("HA not configured");
    }
  });

  // === SEED DEFAULT PROPERTY (if empty) ===
  const existingProps = storage.getProperties();
  if (existingProps.length === 0) {
    storage.createProperty({
      name: "Lancaster Gate",
      address: "Flat 1, 46 Lancaster Gate",
      postcode: "W2 3NA",
      purchasePrice: 1660000,
      currentValue: 1900000,
      mortgageBalance: 1254000,
      currency: "GBP",
    });
  }

  return httpServer;
}
