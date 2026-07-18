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
} from "./db.js";

const PORT = Number(process.env.API_PORT) || 8787;

initDb();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

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

const server = app.listen(PORT, () => {
  console.log(`Apex Trade API  →  http://localhost:${PORT}`);
  console.log(`SQLite database →  ${getDbPath()}`);
});

server.on("error", (err: any) => {
  console.error(`Server failed to start: ${err.message}`);
  process.exit(1);
});

