# Apex Trade

A modern React trading workspace with **free TradingView widgets**, **live market prices**, and a **local SQLite database** for paper trading.

## Features

- **Dashboard** — equity stats, live chart, watchlist, market overview
- **Charts** — TradingView Advanced Chart (intervals, drawings, indicators)
- **Trade** — paper buy/sell (market & limit), order book, positions
- **Portfolio** — cash / holdings allocation and order history
- **Markets** — multi-asset overview widgets (crypto, stocks, forex, indices)
- **Calendar** — economic events widget
- **Local SQLite** — watchlist, orders, positions, and balance on disk

## Stack

- React 19 + TypeScript + Vite
- Express API + Node built-in `node:sqlite`
- Live prices: Binance (crypto) · Yahoo Finance (stocks/FX/indices)
- TradingView free embed widgets

## Run

```bash
cd trading-platform
npm install
npm run dev
```

This starts:

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| SQLite API | http://localhost:8787 |
| Database file | `data/apex-trade.db` |

## Database tables

| Table | Purpose |
|-------|---------|
| `account` | Paper balance + selected symbol |
| `watchlist` | Saved symbols |
| `orders` | Order history (market/limit) |
| `positions` | Open holdings |

Inspect with any SQLite tool, e.g.:

```bash
sqlite3 data/apex-trade.db ".tables"
sqlite3 data/apex-trade.db "SELECT * FROM watchlist;"
```

## Notes

- Paper trading starts with **$100,000** virtual balance.
- Live watchlist prices refresh every ~15s.
- Previous browser localStorage watchlist is imported once into SQLite.
- TradingView widgets need network access (ad blockers may block them).
- This is **not** a real broker. No orders are sent to any exchange.
