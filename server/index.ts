import express from "express";
import cors from "cors";
import {
  addWatchlistItem,
  cancelOrder,
  getAccount,
  getBootstrap,
  getDbPath,
  getOrders,
  getPositions,
  getWatchlist,
  importFromClient,
  initDb,
  placeOrder,
  removeWatchlistItem,
  setSelectedSymbol,
  updatePositionPrices,
  getJournalTrades,
  saveJournalTrade,
  deleteJournalTrade,
  batchSaveJournalTrades,
  getJournalNotes,
  saveJournalNote,
  deleteJournalNote,
  batchSaveJournalNotes,
  getJournalCharts,
  saveJournalChart,
  deleteJournalChart,
  batchSaveJournalCharts,
} from "./db.js";

const PORT = Number(process.env.API_PORT) || 8787;

initDb();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    engine: "node:sqlite",
    dbPath: getDbPath(),
    time: new Date().toISOString(),
  });
});

/** Full snapshot for app boot */
app.get("/api/bootstrap", (_req, res) => {
  res.json(getBootstrap());
});

app.get("/api/account", (_req, res) => {
  res.json(getAccount());
});

app.put("/api/account/selected", (req, res) => {
  const id = req.body?.id ?? null;
  setSelectedSymbol(typeof id === "string" ? id : null);
  res.json(getAccount());
});

app.get("/api/watchlist", (_req, res) => {
  res.json(getWatchlist());
});

app.post("/api/watchlist", (req, res) => {
  const { id, symbol, tvSymbol, name, assetClass } = req.body ?? {};
  if (!id || !symbol || !tvSymbol || !name || !assetClass) {
    res.status(400).json({ ok: false, message: "Missing watchlist fields." });
    return;
  }
  const result = addWatchlistItem({
    id,
    symbol,
    tvSymbol,
    name,
    assetClass,
  });
  res.status(result.ok ? 201 : 409).json({
    ...result,
    watchlist: getWatchlist(),
    account: getAccount(),
  });
});

app.delete("/api/watchlist/:id", (req, res) => {
  const result = removeWatchlistItem(req.params.id);
  res.status(result.ok ? 200 : 400).json({
    ...result,
    watchlist: getWatchlist(),
    account: getAccount(),
  });
});

app.get("/api/orders", (_req, res) => {
  res.json(getOrders());
});

app.post("/api/orders", (req, res) => {
  const { side, type, quantity, price, symbol, tvSymbol, name } = req.body ?? {};
  if (!side || !type || !symbol || !tvSymbol || !name) {
    res.status(400).json({ ok: false, message: "Missing order fields." });
    return;
  }
  const result = placeOrder({
    side,
    type,
    quantity: Number(quantity),
    price: Number(price),
    symbol,
    tvSymbol,
    name,
  });
  res.status(result.ok ? 201 : 400).json({
    ...result,
    orders: getOrders(),
  });
});

app.post("/api/orders/:id/cancel", (req, res) => {
  const result = cancelOrder(req.params.id);
  res.status(result.ok ? 200 : 400).json({
    ...result,
    orders: getOrders(),
  });
});

app.get("/api/positions", (_req, res) => {
  res.json(getPositions());
});

app.post("/api/positions/prices", (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
  updatePositionPrices(
    updates
      .filter(
        (u: { symbol?: string; currentPrice?: number }) =>
          u && typeof u.symbol === "string" && typeof u.currentPrice === "number",
      )
      .map((u: { symbol: string; currentPrice: number }) => ({
        symbol: u.symbol,
        currentPrice: u.currentPrice,
      })),
  );
  res.json(getPositions());
});

/** One-time migration helper from browser localStorage */
app.post("/api/import", (req, res) => {
  const result = importFromClient(req.body ?? {});
  res.json({
    ...result,
    ...getBootstrap(),
  });
});

// ─── Journal Trades Endpoints ───
app.get("/api/journal/trades", (_req, res) => {
  res.json(getJournalTrades());
});

app.post("/api/journal/trades", (req, res) => {
  const trade = req.body;
  if (!trade || !trade.id) {
    res.status(400).json({ ok: false, message: "Missing trade data." });
    return;
  }
  saveJournalTrade(trade);
  res.json({ ok: true });
});

app.delete("/api/journal/trades/:id", (req, res) => {
  deleteJournalTrade(req.params.id);
  res.json({ ok: true });
});

app.post("/api/journal/trades/batch", (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  batchSaveJournalTrades(list);
  res.json({ ok: true });
});

// ─── Journal Notes Endpoints ───
app.get("/api/journal/notes", (_req, res) => {
  const list = getJournalNotes();
  const notesObj: Record<string, string> = {};
  list.forEach((n) => {
    notesObj[n.date] = n.content;
  });
  res.json(notesObj);
});

app.post("/api/journal/notes", (req, res) => {
  const { date, content } = req.body ?? {};
  if (!date) {
    res.status(400).json({ ok: false, message: "Missing note date." });
    return;
  }
  if (!content) {
    deleteJournalNote(date);
  } else {
    saveJournalNote({ date, content });
  }
  res.json({ ok: true });
});

app.delete("/api/journal/notes/:date", (req, res) => {
  deleteJournalNote(req.params.date);
  res.json({ ok: true });
});

app.post("/api/journal/notes/batch", (req, res) => {
  const notes = req.body ?? {};
  batchSaveJournalNotes(notes);
  res.json({ ok: true });
});

// ─── Journal Custom Charts Endpoints ───
app.get("/api/journal/custom-charts", (_req, res) => {
  res.json(getJournalCharts());
});

app.post("/api/journal/custom-charts", (req, res) => {
  const chart = req.body;
  if (!chart || !chart.id) {
    res.status(400).json({ ok: false, message: "Missing chart data." });
    return;
  }
  saveJournalChart(chart);
  res.json({ ok: true });
});

app.delete("/api/journal/custom-charts/:id", (req, res) => {
  deleteJournalChart(req.params.id);
  res.json({ ok: true });
});

app.post("/api/journal/custom-charts/batch", (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  batchSaveJournalCharts(list);
  res.json({ ok: true });
});

// ─── Pinterest Link Resolver ───
app.post("/api/pinterest-resolve", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ ok: false, message: "Missing URL." });
    return;
  }

  const cleanUrl = url.trim();

  // If already direct image link
  if (cleanUrl.includes("i.pinimg.com") || /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(cleanUrl)) {
    res.json({ ok: true, imageUrl: cleanUrl, title: "Pinterest Chart" });
    return;
  }

  try {
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const html = await response.text();

    // Multi-strategy og:image matching
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    // Fallback: search for direct i.pinimg.com image URL in HTML
    const pinimgMatches = html.match(/https:\/\/i\.pinimg\.com\/(?:originals|736x|474x|564x)\/[a-f0-9\/]+\.(?:jpg|png|webp|gif)/gi);

    // Title matching
    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      html.match(/<title>([^<]+)<\/title>/i);

    let imageUrl = ogMatch ? ogMatch[1] : (pinimgMatches ? pinimgMatches[0] : null);
    let title = titleMatch ? titleMatch[1].replace(/\|.*$/, "").replace(/ - Pinterest.*$/i, "").trim() : "Pinterest Chart";

    if (imageUrl) {
      imageUrl = imageUrl.replace(/&amp;/g, "&");
      res.json({ ok: true, imageUrl, title });
    } else {
      res.status(404).json({ ok: false, message: "Could not extract image from Pinterest page." });
    }
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err?.message || "Failed to fetch Pinterest page." });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Apex Trade API  →  http://localhost:${PORT}`);
  console.log(`SQLite database →  ${getDbPath()}`);
});

server.on("error", (err: any) => {
  console.error(`Server failed to start: ${err.message}`);
  process.exit(1);
});

