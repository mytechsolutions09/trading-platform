/**
 * Cloudflare Worker API Server with D1 (SQL Database) and R2 (Object Storage Bucket)
 * Full parity with local Express + SQLite server backend
 */

export interface Env {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  ASSETS?: Fetcher;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Serve static frontend assets for non-API requests
    if (!path.startsWith("/api")) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
    }

    try {
      // ─── Proxy Binance API Requests with 403 Fallback ───
      if (path.startsWith("/api/binance")) {
        const binancePath = path.replace("/api/binance", "");
        const search = url.search;

        try {
          const bRes = await fetch(`https://api.binance.us${binancePath}${search}`, {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (bRes.ok) {
            const bData = await bRes.arrayBuffer();
            const headers = new Headers(corsHeaders());
            headers.set("Content-Type", bRes.headers.get("content-type") || "application/json");
            return new Response(bData, { status: 200, headers });
          }
        } catch {}

        try {
          const bRes = await fetch(`https://api.binance.com${binancePath}${search}`, {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (bRes.ok) {
            const bData = await bRes.arrayBuffer();
            const headers = new Headers(corsHeaders());
            headers.set("Content-Type", bRes.headers.get("content-type") || "application/json");
            return new Response(bData, { status: 200, headers });
          }
        } catch {}

        // Fallback to Bybit spot API
        if (binancePath.includes("/klines")) {
          const sym = (url.searchParams.get("symbol") || "BTCUSDT").replace(/\.P$/i, "").toUpperCase();
          const interval = url.searchParams.get("interval") || "1h";
          const limit = url.searchParams.get("limit") || "1000";
          const bybitIntMap: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D", "1w": "W" };
          const bInt = bybitIntMap[interval] || "60";
          try {
            const byRes = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${sym}&interval=${bInt}&limit=${limit}`);
            if (byRes.ok) {
              const byData = (await byRes.json()) as any;
              const list = byData?.result?.list || [];
              const binanceKlines = list.reverse().map((k: any) => [
                Number(k[0]), k[1], k[2], k[3], k[4], k[5], Number(k[0]) + 59999, "0", 100, "0", "0", "0"
              ]);
              return jsonResponse(binanceKlines);
            }
          } catch {}
        } else {
          try {
            const byRes = await fetch("https://api.bybit.com/v5/market/tickers?category=spot");
            if (byRes.ok) {
              const byData = (await byRes.json()) as any;
              const list = byData?.result?.list || [];
              const binanceTickers = list.map((k: any) => ({
                symbol: k.symbol,
                lastPrice: k.lastPrice,
                priceChange: String((parseFloat(k.lastPrice) * (parseFloat(k.price24hPcnt) || 0)).toFixed(4)),
                priceChangePercent: String(((parseFloat(k.price24hPcnt) || 0) * 100).toFixed(2)),
                highPrice: k.highPrice24h,
                lowPrice: k.lowPrice24h,
                quoteVolume: k.turnover24h
              }));
              return jsonResponse(binanceTickers);
            }
          } catch {}
        }

        return jsonResponse([]);
      }

      // ─── Proxy Yahoo Finance Requests ───
      if (path.startsWith("/api/yahoo")) {
        const yahooPath = path.replace("/api/yahoo", "");
        const targetUrl = `https://query1.finance.yahoo.com${yahooPath}${url.search}`;
        const yRes = await fetch(targetUrl, {
          headers: {
            "Accept": "application/json,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });
        const yData = await yRes.arrayBuffer();
        const headers = new Headers(corsHeaders());
        headers.set("Content-Type", yRes.headers.get("content-type") || "application/json");
        return new Response(yData, { status: yRes.status, headers });
      }

      // ─── Health Check ───
      if (path === "/api/health") {
        return jsonResponse({
          ok: true,
          engine: "cloudflare:d1+r2",
          d1: !!env.DB,
          r2: !!env.ASSETS_BUCKET,
          time: new Date().toISOString(),
        });
      }

      // ─── R2 Bucket File Upload Endpoint ───
      if (path === "/api/upload" && method === "POST") {
        const contentType = request.headers.get("content-type") || "";
        let key = `charts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        let bodyBuffer: ArrayBuffer;
        let mimeType = "image/png";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          if (!file) {
            return jsonResponse({ ok: false, message: "No file provided in form payload." }, 400);
          }
          bodyBuffer = await file.arrayBuffer();
          mimeType = file.type || "image/png";
          const ext = file.name.split(".").pop();
          if (ext) key = `${key}.${ext}`;
        } else {
          const body = (await request.json()) as {
            imageBase64?: string;
            imageUrl?: string;
            filename?: string;
            mimeType?: string;
          };

          if (body.imageUrl) {
            const imgRes = await fetch(body.imageUrl);
            if (!imgRes.ok) {
              return jsonResponse({ ok: false, message: `Failed to fetch image from URL: ${imgRes.statusText}` }, 400);
            }
            bodyBuffer = await imgRes.arrayBuffer();
            mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            const extMatch = mimeType.split("/")[1]?.split(";")[0];
            if (extMatch) key = `${key}.${extMatch}`;
          } else if (body.imageBase64) {
            const base64Clean = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const binaryStr = atob(base64Clean);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            bodyBuffer = bytes.buffer;
            mimeType = body.mimeType || "image/png";
          } else {
            return jsonResponse({ ok: false, message: "Missing imageBase64 or imageUrl in JSON body." }, 400);
          }
        }

        await env.ASSETS_BUCKET.put(key, bodyBuffer, {
          httpMetadata: { contentType: mimeType },
        });

        const fileUrl = `/api/files/${key}`;
        return jsonResponse({ ok: true, url: fileUrl, key });
      }

      // ─── Serve Files from Cloudflare R2 Bucket ───
      if (path.startsWith("/api/files/") && method === "GET") {
        const key = path.replace("/api/files/", "");
        const object = await env.ASSETS_BUCKET.get(key);

        if (!object) {
          return jsonResponse({ ok: false, message: "File not found in R2 bucket." }, 404);
        }

        const headers = new Headers(corsHeaders());
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000");

        return new Response(object.body, { headers });
      }

      // ─── Bootstrap (Combined D1 Snapshot) ───
      if (path === "/api/bootstrap" && method === "GET") {
        let [account, watchlist, orders, positions, trades, notes, charts] = await env.DB.batch([
          env.DB.prepare("SELECT * FROM account WHERE id = 1"),
          env.DB.prepare("SELECT * FROM watchlist ORDER BY sort_order ASC, created_at ASC"),
          env.DB.prepare("SELECT * FROM orders ORDER BY timestamp DESC"),
          env.DB.prepare("SELECT * FROM positions"),
          env.DB.prepare("SELECT * FROM journal_trades ORDER BY date DESC"),
          env.DB.prepare("SELECT * FROM journal_notes"),
          env.DB.prepare("SELECT * FROM custom_charts ORDER BY created_at DESC"),
        ]);

        // Auto-seed account if empty
        if (account.results.length === 0) {
          await env.DB.prepare("INSERT OR IGNORE INTO account (id, balance, selected_symbol_id, updated_at) VALUES (1, 100000.0, 'btc', datetime('now'))").run();
          const refetchedAccount = await env.DB.prepare("SELECT * FROM account WHERE id = 1").all();
          account = refetchedAccount;
        }

        // Auto-seed default watchlist if empty
        if (watchlist.results.length === 0) {
          const defaults = [
            { id: "btc", symbol: "BTCUSDT.P", tv_symbol: "BYBIT:BTCUSDT.P", name: "Bitcoin", asset_class: "crypto" },
            { id: "eth", symbol: "ETHUSDT.P", tv_symbol: "BYBIT:ETHUSDT.P", name: "Ethereum", asset_class: "crypto" },
            { id: "sol", symbol: "SOLUSDT.P", tv_symbol: "BYBIT:SOLUSDT.P", name: "Solana", asset_class: "crypto" },
            { id: "aapl", symbol: "AAPL", tv_symbol: "NASDAQ:AAPL", name: "Apple Inc.", asset_class: "stock" },
            { id: "tsla", symbol: "TSLA", tv_symbol: "NASDAQ:TSLA", name: "Tesla Inc.", asset_class: "stock" },
            { id: "nvda", symbol: "NVDA", tv_symbol: "NASDAQ:NVDA", name: "NVIDIA Corp.", asset_class: "stock" },
            { id: "eurusd", symbol: "EURUSD", tv_symbol: "FX:EURUSD", name: "Euro / US Dollar", asset_class: "forex" },
            { id: "gbpusd", symbol: "GBPUSD", tv_symbol: "FX:GBPUSD", name: "Pound / US Dollar", asset_class: "forex" },
            { id: "spx", symbol: "SPX", tv_symbol: "SP:SPX", name: "S&P 500", asset_class: "index" },
            { id: "ndx", symbol: "NDX", tv_symbol: "NASDAQ:NDX", name: "Nasdaq 100", asset_class: "index" },
          ];

          const inserts = defaults.map((d, idx) =>
            env.DB.prepare(
              "INSERT OR REPLACE INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(d.id, d.symbol, d.tv_symbol, d.name, d.asset_class, idx)
          );
          await env.DB.batch(inserts);
          const refetchedWatchlist = await env.DB.prepare("SELECT * FROM watchlist ORDER BY sort_order ASC, created_at ASC").all();
          watchlist = refetchedWatchlist;
        }

        const accRow = (account.results[0] as any) || { balance: 100000.0, selected_symbol_id: "btc" };

        return jsonResponse({
          dbPath: "Cloudflare D1 (SQL Database)",
          account: {
            balance: accRow.balance,
            selectedSymbolId: accRow.selected_symbol_id || "btc",
          },
          watchlist: watchlist.results,
          orders: orders.results,
          positions: positions.results,
          journalTrades: trades.results,
          journalNotes: notes.results,
          customCharts: charts.results,
        });
      }

      // ─── Import Client State (D1 SQL) ───
      if (path === "/api/import" && method === "POST") {
        const body = (await request.json()) as any;
        const items = Array.isArray(body?.watchlist) ? body.watchlist : [];
        if (items.length > 0) {
          const inserts = items.map((d: any, idx: number) =>
            env.DB.prepare(
              "INSERT OR REPLACE INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(d.id, d.symbol, d.tvSymbol, d.name, d.assetClass, idx)
          );
          await env.DB.batch(inserts);
        }
        if (body.selectedSymbolId) {
          await env.DB.prepare("UPDATE account SET selected_symbol_id = ?, updated_at = datetime('now') WHERE id = 1").bind(body.selectedSymbolId).run();
        }

        const [account, watchlist, orders, positions, trades, notes, charts] = await env.DB.batch([
          env.DB.prepare("SELECT * FROM account WHERE id = 1"),
          env.DB.prepare("SELECT * FROM watchlist ORDER BY sort_order ASC, created_at ASC"),
          env.DB.prepare("SELECT * FROM orders ORDER BY timestamp DESC"),
          env.DB.prepare("SELECT * FROM positions"),
          env.DB.prepare("SELECT * FROM journal_trades ORDER BY date DESC"),
          env.DB.prepare("SELECT * FROM journal_notes"),
          env.DB.prepare("SELECT * FROM custom_charts ORDER BY created_at DESC"),
        ]);

        const accRow = (account.results[0] as any) || { balance: 100000.0, selected_symbol_id: "btc" };

        return jsonResponse({
          ok: true,
          dbPath: "Cloudflare D1 (SQL Database)",
          account: {
            balance: accRow.balance,
            selectedSymbolId: accRow.selected_symbol_id || "btc",
          },
          watchlist: watchlist.results,
          orders: orders.results,
          positions: positions.results,
          journalTrades: trades.results,
          journalNotes: notes.results,
          customCharts: charts.results,
        });
      }

      // ─── Account (D1 SQL) ───
      if (path === "/api/account" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT balance, selected_symbol_id AS selectedSymbolId FROM account WHERE id = 1").all();
        const acc = results[0] || { balance: 100000.0, selectedSymbolId: "btc" };
        return jsonResponse(acc);
      }

      if (path === "/api/account/selected" && method === "PUT") {
        const body = (await request.json()) as any;
        const selectedId = body.id || null;
        await env.DB.prepare("UPDATE account SET selected_symbol_id = ?, updated_at = datetime('now') WHERE id = 1").bind(selectedId).run();
        return jsonResponse({ ok: true });
      }

      // ─── Watchlist (D1 SQL) ───
      if (path === "/api/watchlist" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM watchlist ORDER BY sort_order ASC, created_at ASC").all();
        return jsonResponse(results);
      }

      if (path === "/api/watchlist" && method === "POST") {
        const item = (await request.json()) as any;
        const maxRow = (await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM watchlist").first()) as any;
        const sortOrder = (maxRow?.m ?? -1) + 1;
        await env.DB.prepare(
          "INSERT OR REPLACE INTO watchlist (id, symbol, tv_symbol, name, asset_class, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(item.id, item.symbol, item.tvSymbol, item.name, item.assetClass, sortOrder).run();
        await env.DB.prepare("UPDATE account SET selected_symbol_id = ?, updated_at = datetime('now') WHERE id = 1").bind(item.id).run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith("/api/watchlist/") && method === "DELETE") {
        const id = path.split("/").pop();
        await env.DB.prepare("DELETE FROM watchlist WHERE id = ?").bind(id).run();
        return jsonResponse({ ok: true });
      }

      // ─── Orders (D1 SQL) ───
      if (path === "/api/orders" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY timestamp DESC").all();
        return jsonResponse(results);
      }

      if (path === "/api/orders" && method === "POST") {
        const order = (await request.json()) as any;
        const id = order.id || `ord-${Date.now()}`;
        const total = (order.quantity || 0) * (order.price || 0);
        const timestamp = order.timestamp || Date.now();

        await env.DB.prepare(
          "INSERT INTO orders (id, side, type, quantity, price, total, symbol, tv_symbol, name, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, order.side, order.type, order.quantity, order.price, total, order.symbol, order.tvSymbol, order.name, order.status || 'FILLED', timestamp).run();

        // Update positions table
        const posRow = (await env.DB.prepare("SELECT * FROM positions WHERE symbol = ?").bind(order.symbol).first()) as any;
        if (order.side === "buy") {
          if (!posRow) {
            await env.DB.prepare(
              "INSERT INTO positions (symbol, tv_symbol, name, quantity, avg_entry, current_price, side, unpnl) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
            ).bind(order.symbol, order.tvSymbol, order.name, order.quantity, order.price, order.price, "long").run();
          } else {
            const newQty = posRow.quantity + order.quantity;
            const newAvg = (posRow.quantity * posRow.avg_entry + order.quantity * order.price) / newQty;
            await env.DB.prepare(
              "UPDATE positions SET quantity = ?, avg_entry = ?, current_price = ? WHERE symbol = ?"
            ).bind(newQty, newAvg, order.price, order.symbol).run();
          }
          // Deduct from balance
          await env.DB.prepare("UPDATE account SET balance = balance - ?, updated_at = datetime('now') WHERE id = 1").bind(total).run();
        } else if (order.side === "sell" && posRow) {
          const newQty = posRow.quantity - order.quantity;
          if (newQty <= 0) {
            await env.DB.prepare("DELETE FROM positions WHERE symbol = ?").bind(order.symbol).run();
          } else {
            await env.DB.prepare("UPDATE positions SET quantity = ? WHERE symbol = ?").bind(newQty, order.symbol).run();
          }
          // Add to balance
          await env.DB.prepare("UPDATE account SET balance = balance + ?, updated_at = datetime('now') WHERE id = 1").bind(total).run();
        }

        return jsonResponse({ ok: true, id });
      }

      if (path.startsWith("/api/orders/") && path.endsWith("/cancel") && method === "POST") {
        const id = path.split("/")[3];
        await env.DB.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").bind(id).run();
        return jsonResponse({ ok: true });
      }

      // ─── Positions (D1 SQL) ───
      if (path === "/api/positions" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM positions").all();
        return jsonResponse(results);
      }

      if (path === "/api/positions/prices" && method === "POST") {
        const body = (await request.json()) as any;
        const updates = Array.isArray(body?.updates) ? body.updates : [];
        for (const u of updates) {
          if (u && u.symbol && typeof u.currentPrice === "number") {
            await env.DB.prepare("UPDATE positions SET current_price = ? WHERE symbol = ?").bind(u.currentPrice, u.symbol).run();
          }
        }
        const { results } = await env.DB.prepare("SELECT * FROM positions").all();
        return jsonResponse(results);
      }

      // ─── Journal Trades (D1 SQL) ───
      if (path === "/api/journal/trades" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM journal_trades ORDER BY date DESC").all();
        return jsonResponse(results);
      }

      if (path === "/api/journal/trades" && method === "POST") {
        const t = (await request.json()) as any;
        await env.DB.prepare(`
          INSERT OR REPLACE INTO journal_trades 
          (id, ticker, direction, asset_type, entry_price, exit_price, quantity, stop_loss, take_profit, fees, emotion, mindset_score, setup, outcome, notes, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          t.id, t.ticker, t.direction, t.assetType || 'crypto', t.entryPrice, t.exitPrice ?? null,
          t.quantity, t.stopLoss ?? null, t.takeProfit ?? null, t.fees ?? 0,
          t.emotion ?? null, t.mindsetScore ?? null, t.setup ?? null, t.outcome ?? null,
          t.notes ?? null, t.date
        ).run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith("/api/journal/trades/") && method === "DELETE") {
        const id = path.split("/").pop();
        await env.DB.prepare("DELETE FROM journal_trades WHERE id = ?").bind(id).run();
        return jsonResponse({ ok: true });
      }

      if (path === "/api/journal/trades/batch" && method === "POST") {
        const trades = (await request.json()) as any[];
        if (Array.isArray(trades)) {
          const stmt = env.DB.prepare(`
            INSERT OR REPLACE INTO journal_trades 
            (id, ticker, direction, asset_type, entry_price, exit_price, quantity, stop_loss, take_profit, fees, emotion, mindset_score, setup, outcome, notes, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const batchStmts = trades.map((t) =>
            stmt.bind(
              t.id, t.ticker, t.direction, t.assetType || 'crypto', t.entryPrice, t.exitPrice ?? null,
              t.quantity, t.stopLoss ?? null, t.takeProfit ?? null, t.fees ?? 0,
              t.emotion ?? null, t.mindsetScore ?? null, t.setup ?? null, t.outcome ?? null,
              t.notes ?? null, t.date
            )
          );
          await env.DB.batch(batchStmts);
        }
        return jsonResponse({ ok: true });
      }

      // ─── Journal Notes (D1 SQL) ───
      if (path === "/api/journal/notes" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM journal_notes").all();
        const notesObj: Record<string, string> = {};
        for (const row of results as any[]) {
          notesObj[row.date] = row.content;
        }
        return jsonResponse(notesObj);
      }

      if (path === "/api/journal/notes" && method === "POST") {
        const { date, content } = (await request.json()) as any;
        if (!date) {
          return jsonResponse({ ok: false, message: "Missing note date." }, 400);
        }
        if (!content) {
          await env.DB.prepare("DELETE FROM journal_notes WHERE date = ?").bind(date).run();
        } else {
          await env.DB.prepare("INSERT OR REPLACE INTO journal_notes (date, content, updated_at) VALUES (?, ?, datetime('now'))").bind(date, content).run();
        }
        return jsonResponse({ ok: true });
      }

      if (path.startsWith("/api/journal/notes/") && method === "DELETE") {
        const date = path.split("/").pop();
        await env.DB.prepare("DELETE FROM journal_notes WHERE date = ?").bind(date).run();
        return jsonResponse({ ok: true });
      }

      if (path === "/api/journal/notes/batch" && method === "POST") {
        const notes = (await request.json()) as Record<string, string>;
        if (notes && typeof notes === "object") {
          const stmt = env.DB.prepare("INSERT OR REPLACE INTO journal_notes (date, content, updated_at) VALUES (?, ?, datetime('now'))");
          const stmts = Object.entries(notes).map(([date, content]) => stmt.bind(date, content));
          if (stmts.length > 0) await env.DB.batch(stmts);
        }
        return jsonResponse({ ok: true });
      }

      // ─── Journal Custom Charts (D1 SQL + R2 Bucket URLs) ───
      if (path === "/api/journal/custom-charts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM custom_charts ORDER BY created_at DESC").all();
        return jsonResponse(results);
      }

      if (path === "/api/journal/custom-charts" && method === "POST") {
        const chart = (await request.json()) as any;
        await env.DB.prepare(`
          INSERT OR REPLACE INTO custom_charts 
          (id, title, category, badge_class, win_rate, rr, description, rules_json, image_url, r2_key)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          chart.id, chart.title, chart.category, chart.badgeClass || null,
          chart.winRate ?? null, chart.rr ?? null, chart.description ?? null,
          JSON.stringify(chart.rules || []),
          chart.image || chart.imageUrl,
          chart.r2Key ?? null
        ).run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith("/api/journal/custom-charts/") && method === "DELETE") {
        const id = path.split("/").pop();
        const { results } = await env.DB.prepare("SELECT r2_key FROM custom_charts WHERE id = ?").bind(id).all<{ r2_key: string | null }>();
        if (results.length > 0 && results[0].r2_key) {
          await env.ASSETS_BUCKET.delete(results[0].r2_key);
        }
        await env.DB.prepare("DELETE FROM custom_charts WHERE id = ?").bind(id).run();
        return jsonResponse({ ok: true });
      }

      if (path.startsWith("/api/journal/custom-charts/") && method === "PUT") {
        const id = path.split("/").pop();
        const chart = (await request.json()) as any;
        await env.DB.prepare(`
          UPDATE custom_charts SET
            title = ?, category = ?, badge_class = ?, win_rate = ?,
            rr = ?, description = ?, rules_json = ?, image_url = ?, r2_key = ?
          WHERE id = ?
        `).bind(
          chart.title, chart.category, chart.badgeClass ?? null,
          chart.winRate ?? null, chart.rr ?? null, chart.description ?? null,
          JSON.stringify(chart.rules || []),
          chart.image || chart.imageUrl || null,
          chart.r2Key ?? null,
          id
        ).run();
        return jsonResponse({ ok: true });
      }

      if (path === "/api/journal/custom-charts/batch" && method === "POST") {
        const charts = (await request.json()) as any[];
        if (Array.isArray(charts)) {
          const stmt = env.DB.prepare(`
            INSERT OR REPLACE INTO custom_charts 
            (id, title, category, badge_class, win_rate, rr, description, rules_json, image_url, r2_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const stmts = charts.map((chart) =>
            stmt.bind(
              chart.id, chart.title, chart.category, chart.badgeClass || null,
              chart.winRate ?? null, chart.rr ?? null, chart.description ?? null,
              JSON.stringify(chart.rules || []),
              chart.image || chart.imageUrl,
              chart.r2Key ?? null
            )
          );
          if (stmts.length > 0) await env.DB.batch(stmts);
        }
        return jsonResponse({ ok: true });
      }

      // ─── Pinterest Link Resolver ───
      if (path === "/api/pinterest-resolve" && method === "POST") {
        const { url: pinUrl } = (await request.json()) as { url?: string };
        if (!pinUrl || typeof pinUrl !== "string") {
          return jsonResponse({ ok: false, message: "Missing URL." }, 400);
        }

        const cleanUrl = pinUrl.trim();
        if (cleanUrl.includes("i.pinimg.com") || /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(cleanUrl)) {
          return jsonResponse({ ok: true, imageUrl: cleanUrl, title: "Pinterest Chart" });
        }

        try {
          const pRes = await fetch(cleanUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          const html = await pRes.text();
          const ogMatch =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

          const pinimgMatches = html.match(/https:\/\/i\.pinimg\.com\/(?:originals|736x|474x|564x)\/[a-f0-9\/]+\.(?:jpg|png|webp|gif)/gi);
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

          let imageUrl = ogMatch ? ogMatch[1] : (pinimgMatches ? pinimgMatches[0] : null);
          let title = titleMatch ? titleMatch[1].replace(/\|.*$/, "").replace(/ - Pinterest.*$/i, "").trim() : "Pinterest Chart";

          if (imageUrl) {
            imageUrl = imageUrl.replace(/&amp;/g, "&");
            return jsonResponse({ ok: true, imageUrl, title });
          } else {
            return jsonResponse({ ok: false, message: "Could not extract image from Pinterest page." }, 404);
          }
        } catch (err: any) {
          return jsonResponse({ ok: false, message: err?.message || "Failed to fetch Pinterest page." }, 500);
        }
      }

      return jsonResponse({ ok: false, message: `Endpoint not found: ${path}` }, 404);
    } catch (err: any) {
      return jsonResponse({ ok: false, error: err?.message || "Internal server error" }, 500);
    }
  },
};
