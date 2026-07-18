import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "apex-trade.db");

export const INITIAL_BALANCE = 100_000;

export type AssetClass = "crypto" | "stock" | "forex" | "index";

export interface DbWatchlistItem {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  assetClass: AssetClass;
  sortOrder: number;
  createdAt: string;
}

export interface DbOrder {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  price: number;
  total: number;
  status: "filled" | "open" | "cancelled";
  timestamp: number;
}

export interface DbPosition {
  symbol: string;
  tvSymbol: string;
  name: string;
  quantity: number;
  avgEntry: number;
  currentPrice: number;
  side: "long" | "short";
}

export interface DbAccount {
  id: number;
  balance: number;
  selectedSymbolId: string | null;
  updatedAt: string;
}

/** Default seed watchlist (TradingView symbols) */
const DEFAULT_WATCHLIST: Omit<DbWatchlistItem, "sortOrder" | "createdAt">[] = [
  {
    id: "btc",
    symbol: "BTCUSDT",
    tvSymbol: "BINANCE:BTCUSDT",
    name: "Bitcoin",
    assetClass: "crypto",
  },
  {
    id: "eth",
    symbol: "ETHUSDT",
    tvSymbol: "BINANCE:ETHUSDT",
    name: "Ethereum",
    assetClass: "crypto",
  },
  {
    id: "sol",
    symbol: "SOLUSDT",
    tvSymbol: "BINANCE:SOLUSDT",
    name: "Solana",
    assetClass: "crypto",
  },
  {
    id: "aapl",
    symbol: "AAPL",
    tvSymbol: "NASDAQ:AAPL",
    name: "Apple Inc.",
    assetClass: "stock",
  },
  {
    id: "tsla",
    symbol: "TSLA",
    tvSymbol: "NASDAQ:TSLA",
    name: "Tesla Inc.",
    assetClass: "stock",
  },
  {
    id: "nvda",
    symbol: "NVDA",
    tvSymbol: "NASDAQ:NVDA",
    name: "NVIDIA Corp.",
    assetClass: "stock",
  },
  {
    id: "eurusd",
    symbol: "EURUSD",
    tvSymbol: "FX:EURUSD",
    name: "Euro / US Dollar",
    assetClass: "forex",
  },
  {
    id: "gbpusd",
    symbol: "GBPUSD",
    tvSymbol: "FX:GBPUSD",
    name: "Pound / US Dollar",
    assetClass: "forex",
  },
  {
    id: "spx",
    symbol: "SPX",
    tvSymbol: "SP:SPX",
    name: "S&P 500",
    assetClass: "index",
  },
  {
    id: "ndx",
    symbol: "NDX",
    tvSymbol: "NASDAQ:NDX",
    name: "Nasdaq 100",
    assetClass: "index",
  },
];

let db: DatabaseSync;

export function getDbPath() {
  return DB_PATH;
}

export function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance REAL NOT NULL,
      selected_symbol_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      tv_symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      asset_class TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      tv_symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS positions (
      symbol TEXT PRIMARY KEY,
      tv_symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_entry REAL NOT NULL,
      current_price REAL NOT NULL,
      side TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_trades (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      quantity REAL NOT NULL,
      fees REAL DEFAULT 0,
      emotion TEXT,
      mindset_score INTEGER,
      setup TEXT,
      outcome TEXT
    );

    CREATE TABLE IF NOT EXISTS journal_notes (
      date TEXT PRIMARY KEY,
      content TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_watchlist_sort ON watchlist(sort_order ASC);
    CREATE INDEX IF NOT EXISTS idx_journal_trades_date ON journal_trades(date DESC);
  `);

  seedIfEmpty();
  return db;
}

function seedIfEmpty() {
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM account")
    .get() as { c: number };

  if (row.c > 0) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO account (id, balance, selected_symbol_id, updated_at)
     VALUES (1, ?, ?, ?)`,
  ).run(INITIAL_BALANCE, "btc", now);

  const insert = db.prepare(
    `INSERT INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  runInTransaction(() => {
    DEFAULT_WATCHLIST.forEach((item, i) => {
      insert.run(
        item.id,
        item.symbol,
        item.tvSymbol,
        item.name,
        item.assetClass,
        i,
        now,
      );
    });
  });
}

function runInTransaction(fn: () => void) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getAccount(): DbAccount {
  const row = db
    .prepare(
      `SELECT id, balance, selected_symbol_id AS selectedSymbolId, updated_at AS updatedAt
       FROM account WHERE id = 1`,
    )
    .get() as DbAccount;
  return row;
}

export function setSelectedSymbol(id: string | null) {
  db.prepare(
    `UPDATE account SET selected_symbol_id = ?, updated_at = ? WHERE id = 1`,
  ).run(id, new Date().toISOString());
}

export function getWatchlist(): DbWatchlistItem[] {
  return db
    .prepare(
      `SELECT id, symbol, tv_symbol AS tvSymbol, name,
              asset_class AS assetClass, sort_order AS sortOrder,
              created_at AS createdAt
       FROM watchlist
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all() as DbWatchlistItem[];
}

export function addWatchlistItem(
  item: Omit<DbWatchlistItem, "sortOrder" | "createdAt">,
): { ok: boolean; message: string; item?: DbWatchlistItem } {
  const existing = db
    .prepare(
      `SELECT id FROM watchlist WHERE id = ? OR tv_symbol = ? LIMIT 1`,
    )
    .get(item.id, item.tvSymbol) as { id: string } | undefined;

  if (existing) {
    return { ok: false, message: `${item.symbol} is already on your watchlist.` };
  }

  const maxRow = db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM watchlist`)
    .get() as { m: number };
  const sortOrder = maxRow.m + 1;
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    item.id,
    item.symbol,
    item.tvSymbol,
    item.name,
    item.assetClass,
    sortOrder,
    createdAt,
  );

  db.prepare(
    `UPDATE account SET selected_symbol_id = ?, updated_at = ? WHERE id = 1`,
  ).run(item.id, createdAt);

  return {
    ok: true,
    message: `${item.symbol} added to watchlist.`,
    item: { ...item, sortOrder, createdAt },
  };
}

export function removeWatchlistItem(id: string): {
  ok: boolean;
  message: string;
  selectedSymbolId?: string | null;
} {
  const count = (
    db.prepare(`SELECT COUNT(*) AS c FROM watchlist`).get() as { c: number }
  ).c;
  if (count <= 1) {
    return { ok: false, message: "Keep at least one symbol on your watchlist." };
  }

  const target = db
    .prepare(`SELECT symbol FROM watchlist WHERE id = ?`)
    .get(id) as { symbol: string } | undefined;
  if (!target) {
    return { ok: false, message: "Symbol not found." };
  }

  const account = getAccount();
  db.prepare(`DELETE FROM watchlist WHERE id = ?`).run(id);

  let selectedSymbolId = account.selectedSymbolId;
  if (selectedSymbolId === id) {
    const next = db
      .prepare(
        `SELECT id FROM watchlist ORDER BY sort_order ASC LIMIT 1`,
      )
      .get() as { id: string } | undefined;
    selectedSymbolId = next?.id ?? null;
    db.prepare(
      `UPDATE account SET selected_symbol_id = ?, updated_at = ? WHERE id = 1`,
    ).run(selectedSymbolId, new Date().toISOString());
  }

  return {
    ok: true,
    message: `${target.symbol} removed from watchlist.`,
    selectedSymbolId,
  };
}

export function getOrders(): DbOrder[] {
  return db
    .prepare(
      `SELECT id, symbol, tv_symbol AS tvSymbol, name, side, type,
              quantity, price, total, status, timestamp
       FROM orders
       ORDER BY timestamp DESC
       LIMIT 200`,
    )
    .all() as DbOrder[];
}

export function getPositions(): DbPosition[] {
  return db
    .prepare(
      `SELECT symbol, tv_symbol AS tvSymbol, name, quantity,
              avg_entry AS avgEntry, current_price AS currentPrice, side
       FROM positions
       ORDER BY symbol ASC`,
    )
    .all() as DbPosition[];
}

export function updatePositionPrices(
  updates: { symbol: string; currentPrice: number }[],
) {
  const stmt = db.prepare(
    `UPDATE positions SET current_price = ? WHERE symbol = ?`,
  );
  runInTransaction(() => {
    for (const u of updates) {
      stmt.run(u.currentPrice, u.symbol);
    }
  });
}

export interface PlaceOrderInput {
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  price: number;
  symbol: string;
  tvSymbol: string;
  name: string;
}

export function placeOrder(input: PlaceOrderInput): {
  ok: boolean;
  message: string;
  order?: DbOrder;
  balance?: number;
  positions?: DbPosition[];
} {
  const { side, type, quantity, price, symbol, tvSymbol, name } = input;

  if (!quantity || quantity <= 0) {
    return { ok: false, message: "Enter a valid quantity." };
  }
  if (!price || price <= 0) {
    return { ok: false, message: "Invalid price." };
  }

  const total = price * quantity;
  const account = getAccount();

  if (side === "buy" && total > account.balance) {
    return { ok: false, message: "Insufficient balance." };
  }

  if (side === "sell") {
    const pos = db
      .prepare(`SELECT quantity FROM positions WHERE symbol = ?`)
      .get(symbol) as { quantity: number } | undefined;
    if (!pos || pos.quantity < quantity) {
      return {
        ok: false,
        message: "Not enough position to sell. Buy first.",
      };
    }
  }

  const order: DbOrder = {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    symbol,
    tvSymbol,
    name,
    side,
    type,
    quantity,
    price,
    total,
    status: type === "market" ? "filled" : "open",
    timestamp: Date.now(),
  };

  runInTransaction(() => {
    db.prepare(
      `INSERT INTO orders (id, symbol, tv_symbol, name, side, type, quantity, price, total, status, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      order.id,
      order.symbol,
      order.tvSymbol,
      order.name,
      order.side,
      order.type,
      order.quantity,
      order.price,
      order.total,
      order.status,
      order.timestamp,
    );

    if (order.status !== "filled") return;

    if (side === "buy") {
      db.prepare(
        `UPDATE account SET balance = balance - ?, updated_at = ? WHERE id = 1`,
      ).run(total, new Date().toISOString());

      const existing = db
        .prepare(
          `SELECT quantity, avg_entry AS avgEntry FROM positions WHERE symbol = ?`,
        )
        .get(symbol) as { quantity: number; avgEntry: number } | undefined;

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg =
          (existing.avgEntry * existing.quantity + price * quantity) / newQty;
        db.prepare(
          `UPDATE positions
           SET quantity = ?, avg_entry = ?, current_price = ?, side = 'long'
           WHERE symbol = ?`,
        ).run(newQty, newAvg, price, symbol);
      } else {
        db.prepare(
          `INSERT INTO positions (symbol, tv_symbol, name, quantity, avg_entry, current_price, side)
           VALUES (?, ?, ?, ?, ?, ?, 'long')`,
        ).run(symbol, tvSymbol, name, quantity, price, price);
      }
    } else {
      const existing = db
        .prepare(`SELECT quantity FROM positions WHERE symbol = ?`)
        .get(symbol) as { quantity: number };
      const remaining = existing.quantity - quantity;

      db.prepare(
        `UPDATE account SET balance = balance + ?, updated_at = ? WHERE id = 1`,
      ).run(total, new Date().toISOString());

      if (remaining <= 0) {
        db.prepare(`DELETE FROM positions WHERE symbol = ?`).run(symbol);
      } else {
        db.prepare(
          `UPDATE positions SET quantity = ?, current_price = ? WHERE symbol = ?`,
        ).run(remaining, price, symbol);
      }
    }
  });

  return {
    ok: true,
    message:
      type === "market"
        ? `${side.toUpperCase()} ${quantity} ${symbol} filled @ ${price}`
        : `${side.toUpperCase()} limit order placed for ${quantity} ${symbol}`,
    order,
    balance: getAccount().balance,
    positions: getPositions(),
  };
}

export function cancelOrder(id: string): {
  ok: boolean;
  message: string;
  order?: DbOrder;
} {
  const row = db
    .prepare(
      `SELECT id, symbol, tv_symbol AS tvSymbol, name, side, type,
              quantity, price, total, status, timestamp
       FROM orders WHERE id = ?`,
    )
    .get(id) as DbOrder | undefined;

  if (!row) return { ok: false, message: "Order not found." };
  if (row.status !== "open") {
    return { ok: false, message: "Only open orders can be cancelled." };
  }

  db.prepare(`UPDATE orders SET status = 'cancelled' WHERE id = ?`).run(id);
  return {
    ok: true,
    message: "Order cancelled.",
    order: { ...row, status: "cancelled" },
  };
}

export function getBootstrap() {
  return {
    dbPath: DB_PATH,
    account: getAccount(),
    watchlist: getWatchlist(),
    orders: getOrders(),
    positions: getPositions(),
  };
}

export function importFromClient(payload: {
  watchlist?: Omit<DbWatchlistItem, "sortOrder" | "createdAt">[];
  selectedSymbolId?: string | null;
}): { ok: boolean; message: string } {
  // Only import when DB still has just the seed defaults and client has extras
  // Used once for localStorage migration
  if (!payload.watchlist?.length) {
    return { ok: false, message: "Nothing to import." };
  }

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const maxRow = db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM watchlist`)
    .get() as { m: number };
  let order = maxRow.m + 1;

  runInTransaction(() => {
    for (const item of payload.watchlist!) {
      const result = insert.run(
        item.id,
        item.symbol,
        item.tvSymbol,
        item.name,
        item.assetClass,
        order,
        now,
      );
      if (result.changes > 0) order += 1;
    }
    if (payload.selectedSymbolId) {
      db.prepare(
        `UPDATE account SET selected_symbol_id = ?, updated_at = ? WHERE id = 1`,
      ).run(payload.selectedSymbolId, now);
    }
  });

  return { ok: true, message: "Imported watchlist into SQLite." };
}

export interface DbJournalTrade {
  id: string;
  ticker: string;
  date: string;
  assetType: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  fees: number;
  emotion: string | null;
  mindsetScore: number | null;
  setup: string | null;
  outcome: string | null;
}

export interface DbJournalNote {
  date: string;
  content: string;
}

export function getJournalTrades(): DbJournalTrade[] {
  return db.prepare(`
    SELECT id, ticker, date, asset_type AS assetType, direction,
           entry_price AS entryPrice, exit_price AS exitPrice, quantity,
           fees, emotion, mindset_score AS mindsetScore, setup, outcome
    FROM journal_trades
    ORDER BY date DESC
  `).all() as DbJournalTrade[];
}

export function saveJournalTrade(trade: DbJournalTrade) {
  db.prepare(`
    INSERT INTO journal_trades (id, ticker, date, asset_type, direction,
                               entry_price, exit_price, quantity, fees,
                               emotion, mindset_score, setup, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      ticker=excluded.ticker,
      date=excluded.date,
      asset_type=excluded.asset_type,
      direction=excluded.direction,
      entry_price=excluded.entry_price,
      exit_price=excluded.exit_price,
      quantity=excluded.quantity,
      fees=excluded.fees,
      emotion=excluded.emotion,
      mindset_score=excluded.mindset_score,
      setup=excluded.setup,
      outcome=excluded.outcome
  `).run(
    trade.id,
    trade.ticker,
    trade.date,
    trade.assetType,
    trade.direction,
    trade.entryPrice,
    trade.exitPrice,
    trade.quantity,
    trade.fees,
    trade.emotion,
    trade.mindsetScore,
    trade.setup,
    trade.outcome
  );
}

export function deleteJournalTrade(id: string) {
  db.prepare("DELETE FROM journal_trades WHERE id = ?").run(id);
}

export function batchSaveJournalTrades(list: any[]) {
  db.prepare("DELETE FROM journal_trades").run();
  const insert = db.prepare(`
    INSERT INTO journal_trades (id, ticker, date, asset_type, direction,
                               entry_price, exit_price, quantity, fees,
                               emotion, mindset_score, setup, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  runInTransaction(() => {
    list.forEach(t => {
      insert.run(
        t.id,
        t.ticker,
        t.date,
        t.assetType,
        t.direction,
        Number(t.entryPrice || 0),
        t.exitPrice ? Number(t.exitPrice) : null,
        Number(t.quantity || 0),
        Number(t.fees || 0),
        t.emotion || null,
        t.mindsetScore ? Number(t.mindsetScore) : null,
        t.setup || null,
        t.outcome || null
      );
    });
  });
}

export function getJournalNotes(): DbJournalNote[] {
  return db.prepare(`SELECT date, content FROM journal_notes`).all() as DbJournalNote[];
}

export function saveJournalNote(note: DbJournalNote) {
  db.prepare(`
    INSERT INTO journal_notes (date, content)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET content=excluded.content
  `).run(note.date, note.content);
}

export function deleteJournalNote(date: string) {
  db.prepare("DELETE FROM journal_notes WHERE date = ?").run(date);
}

export function batchSaveJournalNotes(notes: Record<string, string>) {
  db.prepare("DELETE FROM journal_notes").run();
  const insert = db.prepare(`
    INSERT INTO journal_notes (date, content)
    VALUES (?, ?)
  `);
  runInTransaction(() => {
    Object.entries(notes).forEach(([date, text]) => {
      if (text) {
        insert.run(date, text);
      }
    });
  });
}
