-- Migration 0001: Init Schema and Seed Data for Cloudflare D1 SQL Database

CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    balance REAL NOT NULL DEFAULT 100000.0,
    selected_symbol_id TEXT DEFAULT 'btc',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    tv_symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    total REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'FILLED',
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS positions (
    symbol TEXT PRIMARY KEY,
    tv_symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_entry REAL NOT NULL,
    current_price REAL NOT NULL,
    side TEXT NOT NULL,
    unpnl REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS journal_trades (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    date TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'crypto',
    direction TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    quantity REAL NOT NULL,
    stop_loss REAL,
    take_profit REAL,
    fees REAL DEFAULT 0.0,
    emotion TEXT,
    mindset_score INTEGER,
    setup TEXT,
    outcome TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_notes (
    date TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_charts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    badge_class TEXT,
    win_rate TEXT,
    rr TEXT,
    description TEXT,
    rules_json TEXT,
    image_url TEXT,
    r2_key TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_trades_date ON journal_trades(date);

-- Seed Account Default Balance
INSERT OR IGNORE INTO account (id, balance, selected_symbol_id, updated_at)
VALUES (1, 100000.0, 'btc', datetime('now'));

-- Seed Default Watchlist
INSERT OR IGNORE INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order, created_at) VALUES
('btc', 'BTCUSDT.P', 'BYBIT:BTCUSDT.P', 'Bitcoin', 'crypto', 0, datetime('now')),
('eth', 'ETHUSDT.P', 'BYBIT:ETHUSDT.P', 'Ethereum', 'crypto', 1, datetime('now')),
('sol', 'SOLUSDT.P', 'BYBIT:SOLUSDT.P', 'Solana', 'crypto', 2, datetime('now')),
('aapl', 'AAPL', 'NASDAQ:AAPL', 'Apple Inc.', 'stock', 3, datetime('now')),
('tsla', 'TSLA', 'NASDAQ:TSLA', 'Tesla Inc.', 'stock', 4, datetime('now')),
('nvda', 'NVDA', 'NASDAQ:NVDA', 'NVIDIA Corp.', 'stock', 5, datetime('now')),
('eurusd', 'EURUSD', 'FX:EURUSD', 'Euro / US Dollar', 'forex', 6, datetime('now')),
('gbpusd', 'GBPUSD', 'FX:GBPUSD', 'Pound / US Dollar', 'forex', 7, datetime('now')),
('spx', 'SPX', 'SP:SPX', 'S&P 500', 'index', 8, datetime('now')),
('ndx', 'NDX', 'NASDAQ:NDX', 'Nasdaq 100', 'index', 9, datetime('now'));
