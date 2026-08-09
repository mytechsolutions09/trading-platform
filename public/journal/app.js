'use strict';

/* =====================================================================
   Trading Journal — Application Logic
   ===================================================================== */

// ── Storage helpers ────────────────────────────────────────────────────
const LS = {
  get: (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── State ──────────────────────────────────────────────────────────────
function getAppTheme() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get('theme');
    if (paramTheme === 'light' || paramTheme === 'dark') return paramTheme;
  } catch {}
  return localStorage.getItem('apex-trade-theme') || localStorage.getItem('tj_theme') || 'dark';
}

const DEFAULT_TRADES = [
  {
    id: "tr-1",
    date: "2026-07-28",
    ticker: "BTCUSDT",
    assetType: "Crypto",
    direction: "Long",
    entryPrice: 64200,
    exitPrice: 67800,
    quantity: 0.5,
    fees: 15,
    stopLoss: 63000,
    takeProfit: 68000,
    emotion: "Confident",
    mindsetScore: 9,
    setup: "Bullish Flag",
    outcome: "Win",
    notes: "Perfect retest of 4H flag pattern."
  },
  {
    id: "tr-2",
    date: "2026-07-29",
    ticker: "NVDA",
    assetType: "Stock",
    direction: "Long",
    entryPrice: 118.5,
    exitPrice: 124.2,
    quantity: 100,
    fees: 5,
    stopLoss: 116.0,
    takeProfit: 125.0,
    emotion: "Calm",
    mindsetScore: 8,
    setup: "VWAP Bounce",
    outcome: "Win",
    notes: "Bounced right off session VWAP with high volume."
  },
  {
    id: "tr-3",
    date: "2026-07-30",
    ticker: "ETHUSDT",
    assetType: "Crypto",
    direction: "Short",
    entryPrice: 3450,
    exitPrice: 3510,
    quantity: 4,
    fees: 12,
    stopLoss: 3500,
    takeProfit: 3300,
    emotion: "FOMO",
    mindsetScore: 4,
    setup: "Breakout",
    outcome: "Loss",
    ruleViolations: ["Chased entry", "No stop loss set"],
    notes: "Chased entry after impulse move. Cut loss quickly."
  },
  {
    id: "tr-4",
    date: "2026-08-01",
    ticker: "AAPL",
    assetType: "Stock",
    direction: "Long",
    entryPrice: 222.0,
    exitPrice: 228.5,
    quantity: 50,
    fees: 4,
    stopLoss: 219.5,
    takeProfit: 229.0,
    emotion: "Confident",
    mindsetScore: 9,
    setup: "FVG Tap",
    outcome: "Win",
    notes: "Filled 1H Fair Value Gap cleanly."
  },
  {
    id: "tr-5",
    date: "2026-08-02",
    ticker: "SOLUSDT",
    assetType: "Crypto",
    direction: "Long",
    entryPrice: 172.5,
    exitPrice: 185.0,
    quantity: 20,
    fees: 8,
    stopLoss: 168.0,
    takeProfit: 186.0,
    emotion: "Calm",
    mindsetScore: 8,
    setup: "Liquidity Sweep",
    outcome: "Win",
    notes: "Swept sell-side liquidity before rapid expansion."
  }
];

const DEFAULT_CUSTOM_CHARTS = [
  {
    id: "custom-1",
    title: "Bullish Flag Breakout & Retest",
    category: "Continuations",
    badgeClass: "badge-continuation",
    winRate: "78% Win Rate",
    rr: "1 : 3.5 RR",
    description: "A continuation chart pattern formed after a strong upward pole movement followed by a downward sloping flag consolidation channel. Entry occurs on the breakout with high volume or the subsequent retest of the broken channel line.",
    rules: [
      "1. Identify strong upward momentum (the flagpole).",
      "2. Confirm flag consolidation stays above 38.2% Fibonacci retracement level.",
      "3. Enter long on high volume candle close above the upper flag trendline.",
      "4. Place Stop Loss slightly below the lowest point of the flag consolidation.",
      "5. Target project distance equal to length of initial flagpole."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="flagGrad1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/></linearGradient></defs><line x1="40" y1="60" x2="560" y2="60" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="150" x2="560" y2="150" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="240" x2="560" y2="240" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><path d="M 60 270 L 210 90" stroke="#10b981" stroke-width="4" stroke-linecap="round"/><line x1="200" y1="80" x2="350" y2="170" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4"/><line x1="200" y1="120" x2="350" y2="210" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4"/><path d="M 210 90 L 240 145 L 270 115 L 300 175 L 330 140 L 350 170" stroke="#06b6d4" stroke-width="2.5" fill="none"/><path d="M 350 170 L 380 110 L 520 40" stroke="#10b981" stroke-width="4" stroke-linecap="round"/><circle cx="380" cy="110" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/><text x="390" y="105" fill="#10b981" font-size="12" font-weight="bold" font-family="Inter,sans-serif">ENTRY BREAKOUT</text><circle cx="520" cy="40" r="6" fill="#06b6d4" stroke="#ffffff" stroke-width="2"/><text x="440" y="32" fill="#06b6d4" font-size="12" font-weight="bold" font-family="Inter,sans-serif">TARGET (1:3.5 RR)</text><line x1="320" y1="205" x2="400" y2="205" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/><text x="405" y="209" fill="#ef4444" font-size="11" font-weight="bold" font-family="Inter,sans-serif">STOP LOSS</text></svg>`
  },
  {
    id: "custom-2",
    title: "Head & Shoulders Top Reversal",
    category: "Reversals",
    badgeClass: "badge-reversal",
    winRate: "82% Win Rate",
    rr: "1 : 4.0 RR",
    description: "A major bearish reversal pattern formed by a peak (left shoulder), followed by a higher peak (head), and then another lower peak (right shoulder). A breakdown of the neckline confirms the trend reversal.",
    rules: [
      "1. Confirm left shoulder and head formation with strong volume peaks.",
      "2. Draw the neckline connecting the trough low points.",
      "3. Look for lower volume on the right shoulder rally.",
      "4. Enter short on candle closing below the neckline trigger.",
      "5. Stop loss above right shoulder high point."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="70" x2="560" y2="70" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="160" x2="560" y2="160" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="250" x2="560" y2="250" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><path d="M 50 230 L 120 120 L 170 200 L 270 50 L 360 200 L 420 130 L 470 200 L 540 280" stroke="#8b5cf6" stroke-width="3.5" fill="none" stroke-linejoin="round"/><line x1="150" y1="200" x2="490" y2="200" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6 4"/><text x="495" y="195" fill="#ef4444" font-size="11" font-weight="bold" font-family="Inter,sans-serif">NECKLINE</text><text x="95" y="105" fill="#94a3b8" font-size="11" font-weight="bold" font-family="Inter,sans-serif">Left Shoulder</text><text x="255" y="38" fill="#a855f7" font-size="13" font-weight="bold" font-family="Inter,sans-serif">HEAD</text><text x="400" y="115" fill="#94a3b8" font-size="11" font-weight="bold" font-family="Inter,sans-serif">Right Shoulder</text><circle cx="470" cy="200" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="2"/><text x="375" y="225" fill="#ef4444" font-size="12" font-weight="bold" font-family="Inter,sans-serif">ENTRY BREAKDOWN</text></svg>`
  },
  {
    id: "custom-3",
    title: "Double Bottom (W-Pattern) Reversal",
    category: "Reversals",
    badgeClass: "badge-reversal",
    winRate: "76% Win Rate",
    rr: "1 : 3.0 RR",
    description: "A classic bullish reversal pattern where price touches a key support level twice without breaking through, forming a 'W' shape. Re-gaining the central peak confirms higher prices.",
    rules: [
      "1. Ensure support level has been validated by past market structure.",
      "2. Second bottom must show bullish divergence on RSI or MACD.",
      "3. Enter long when price breaks above the central neckline peak.",
      "4. Place Stop Loss below the lowest point of the second bottom."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="80" x2="560" y2="80" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="170" x2="560" y2="170" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><line x1="40" y1="260" x2="560" y2="260" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4"/><path d="M 50 70 L 150 250 L 250 140 L 350 250 L 440 140 L 530 60" stroke="#06b6d4" stroke-width="3.5" fill="none" stroke-linejoin="round"/><rect x="120" y="245" width="250" height="18" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="1" stroke-dasharray="4 4"/><text x="180" y="278" fill="#10b981" font-size="11" font-weight="bold" font-family="Inter,sans-serif">KEY SUPPORT ZONE</text><line x1="210" y1="140" x2="480" y2="140" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 3"/><circle cx="440" cy="140" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/><text x="445" y="128" fill="#10b981" font-size="12" font-weight="bold" font-family="Inter,sans-serif">ENTRY</text></svg>`
  },
  {
    id: "custom-4",
    title: "VWAP Retest & Trend Bounce",
    category: "Market Structure",
    badgeClass: "badge-structure",
    winRate: "80% Win Rate",
    rr: "1 : 2.8 RR",
    description: "Institutional entry setup targeting intraday momentum. After an initial trending push, price pulls back to test the Volume-Weighted Average Price (VWAP) line before continuing in trend direction.",
    rules: [
      "1. Trend must be clearly established above session VWAP.",
      "2. Wait for orderly low-volume pullback touching VWAP line.",
      "3. Look for bullish rejection candlestick (pinbar / engulfing) at VWAP.",
      "4. Enter long on confirmation candle close.",
      "5. Stop loss tight below VWAP bounce candle low."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><path d="M 40 220 Q 180 180 340 150 T 560 120" stroke="#f97316" stroke-width="3" fill="none" stroke-dasharray="8 4"/><text x="50" y="240" fill="#f97316" font-size="12" font-weight="bold" font-family="Inter,sans-serif">SESSION VWAP LINE</text><path d="M 50 200 L 140 100 L 220 140 L 310 155 L 410 80 L 520 40" stroke="#10b981" stroke-width="3.5" fill="none"/><circle cx="310" cy="155" r="14" fill="#f97316" fill-opacity="0.25" stroke="#f97316" stroke-width="2"/><circle cx="310" cy="155" r="5" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/><text x="325" y="178" fill="#10b981" font-size="12" font-weight="bold" font-family="Inter,sans-serif">VWAP REJECTION ENTRY</text></svg>`
  },
  {
    id: "custom-5",
    title: "Fair Value Gap (FVG) Mitigation",
    category: "Market Structure",
    badgeClass: "badge-structure",
    winRate: "84% Win Rate",
    rr: "1 : 4.2 RR",
    description: "SMC / Inner Circle Trader (ICT) concept setup. An aggressive 3-candle displacement leaves an unfilled price gap (FVG). Price returns to fill (mitigate) the gap before continuing the trend.",
    rules: [
      "1. Identify 3-candle displacement creating clear gap between candle 1 high & candle 3 low.",
      "2. Mark the FVG zone on chart.",
      "3. Wait patiently for price to retrace into at least 50% (consequent encroachment) of the gap.",
      "4. Enter in direction of initial displacement.",
      "5. Stop loss placed beyond the origin candle of displacement."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><rect x="170" y="110" width="220" height="70" fill="#a855f7" fill-opacity="0.2" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4 4"/><text x="185" y="148" fill="#c084fc" font-size="13" font-weight="bold" font-family="Inter,sans-serif">FAIR VALUE GAP (FVG)</text><path d="M 50 260 L 160 80 L 250 120 L 310 150 L 390 135 L 530 30" stroke="#10b981" stroke-width="3.5" fill="none"/><circle cx="310" cy="150" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/><text x="320" y="175" fill="#10b981" font-size="12" font-weight="bold" font-family="Inter,sans-serif">FVG MITIGATION ENTRY</text></svg>`
  },
  {
    id: "custom-6",
    title: "Liquidity Sweep & AMD Expansion",
    category: "Market Structure",
    badgeClass: "badge-structure",
    winRate: "86% Win Rate",
    rr: "1 : 5.0 RR",
    description: "Accumulation, Manipulation, and Distribution (AMD) setup. Smart money sweeps retail stop losses below equal lows (sell-side liquidity) before executing violent reversal expansion.",
    rules: [
      "1. Identify clear equal lows (retail liquidity pool).",
      "2. Observe sharp manipulation probe breaking below support to hunt stops.",
      "3. Look for immediate sharp V-reversal reclaiming market structure (Market Structure Shift / MSS).",
      "4. Enter on OTE (Optimal Trade Entry) 61.8% / 70.5% retracement.",
      "5. Target opposing buy-side liquidity high."
    ],
    svg: `<svg viewBox="0 0 600 320" style="width:100%;height:100%;background:#0b0d17;border-radius:8px;" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="210" x2="310" y2="210" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 4"/><text x="50" y="200" fill="#ef4444" font-size="11" font-weight="bold" font-family="Inter,sans-serif">SELL-SIDE LIQUIDITY (EQUAL LOWS)</text><path d="M 50 170 L 100 210 L 150 175 L 200 210 L 260 240 L 300 130 L 400 80 L 530 20" stroke="#06b6d4" stroke-width="3.5" fill="none"/><circle cx="260" cy="240" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/><text x="190" y="270" fill="#ef4444" font-size="12" font-weight="bold" font-family="Inter,sans-serif">SWEEP (MANIPULATION)</text><circle cx="300" cy="130" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/><text x="315" y="125" fill="#10b981" font-size="12" font-weight="bold" font-family="Inter,sans-serif">BOS & EXPANSION ENTRY</text></svg>`
  }
];

let trades   = LS.get('tj_trades', null);
if (!trades || !Array.isArray(trades) || trades.length === 0) {
  trades = DEFAULT_TRADES;
  LS.set('tj_trades', trades);
}
let journal  = LS.get('tj_journal',  {});
let sheets   = LS.get('tj_sheets',   []);
let settings = LS.get('tj_settings', { capital: 10000, currency: 'USD' });
let theme    = getAppTheme();

let initialCustom = LS.get('tj_custom_charts', null);
if (!initialCustom || !Array.isArray(initialCustom) || initialCustom.length === 0) {
  LS.set('tj_custom_charts', DEFAULT_CUSTOM_CHARTS);
}

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? ''
  : 'https://apex-trade-api.arpitkanotra.workers.dev';
function apiFetch(path, options) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, options);
}

function saveTrades() {
  LS.set('tj_trades', trades);
  apiFetch('/api/journal/trades/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trades),
  }).catch(() => undefined);
}

function saveJournal() {
  LS.set('tj_journal', journal);
  apiFetch('/api/journal/notes/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(journal),
  }).catch(() => undefined);
}

function saveSheets() {
  LS.set('tj_sheets', sheets);
  apiFetch('/api/journal/sheets/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sheets),
  }).catch(() => undefined);
}

function savePsychLogs(psychLogs) {
  LS.set('tj_psych_logs', psychLogs);
  apiFetch('/api/journal/psych-logs/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(psychLogs),
  }).catch(() => undefined);
}

function saveSettings() { LS.set('tj_settings', settings); }

function applyTheme(newTheme) {
  if (newTheme === 'light' || newTheme === 'dark') {
    theme = newTheme;
  } else {
    theme = getAppTheme();
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.body?.setAttribute('data-theme', theme);
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.body?.classList.add('light-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.body?.classList.remove('light-theme');
  }
  updateCharts();
}

function updateCharts() {
  if (typeof TJCharts === 'undefined') return;
  if (currentPage === 'dashboard') {
    const stats = calcStats(trades);
    const curve = document.getElementById('dash-equity');
    const dnt = document.getElementById('dash-donut');
    if (curve) TJCharts.equityCurve(curve, getEquityCurve(trades));
    if (dnt) TJCharts.donut(dnt, stats.wins, stats.losses, stats.scratches);
  } else if (currentPage === 'analytics') {
    const closed = trades.filter(t => t.exitPrice);
    const byTicker = {};
    closed.forEach(t => { byTicker[t.ticker] = (byTicker[t.ticker] || 0) + calcPnl(t); });
    const tickerEntries = Object.entries(byTicker).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,10);
    const bySetup = {};
    closed.forEach(t => { if (t.setup) bySetup[t.setup] = (bySetup[t.setup] || 0) + calcPnl(t); });
    const setupEntries = Object.entries(bySetup).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]));
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const byDay = Array(7).fill(0);
    closed.forEach(t => { const d = new Date(t.date).getDay(); byDay[d] += calcPnl(t); });

    const equity = document.getElementById('an-equity');
    const ticker = document.getElementById('an-ticker');
    const setup  = document.getElementById('an-setup');
    const day    = document.getElementById('an-day');
    if (equity) TJCharts.equityCurve(equity, getEquityCurve(trades));
    if (ticker) TJCharts.barChart(ticker, tickerEntries.map(e=>e[0]), tickerEntries.map(e=>e[1]));
    if (setup)  TJCharts.barChart(setup, setupEntries.map(e=>e[0]), setupEntries.map(e=>e[1]));
    if (day)    TJCharts.barChart(day, days, byDay);
  } else if (currentPage === 'psychology') {
    const closed = trades.filter(t => t.exitPrice);
    const scatterData = closed.filter(t => t.emotion).map(t => ({ id: t.id, emotion: t.emotion, pnl: calcPnl(t) }));
    const mindsetPts = closed.filter(t => t.mindsetScore && t.date)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .map(t => ({ date: t.date, value: parseFloat(t.mindsetScore) }));
    const violations = {};
    RULE_VIOLATIONS.forEach(r => violations[r] = 0);
    closed.forEach(t => { (t.ruleViolations || []).forEach(r => { violations[r] = (violations[r] || 0) + 1; }); });

    const scatter    = document.getElementById('ps-scatter');
    const mindset    = document.getElementById('ps-mindset');
    const violationsCanvas = document.getElementById('ps-violations');
    if (scatter)    TJCharts.scatterChart(scatter, scatterData);
    if (mindset)    TJCharts.lineTrend(mindset, mindsetPts);
    if (violationsCanvas) TJCharts.hBarChart(violationsCanvas, RULE_VIOLATIONS, RULE_VIOLATIONS.map(r => violations[r]));
  }
}

// ── Unique ID ──────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Currencies ────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', CAD: 'C$', AUD: 'A$' };

function currSym() { return CURRENCY_SYMBOLS[settings.currency] || '$'; }

function fmtCurr(v, forceSign = false) {
  const sym = currSym();
  const abs = Math.abs(v);
  const str = abs >= 1000 ? sym + (abs / 1000).toFixed(2) + 'k' : sym + abs.toFixed(2);
  if (forceSign && v > 0) return '+' + str;
  if (v < 0) return '-' + str;
  return str;
}

// ── P&L Calculation ───────────────────────────────────────────────────
function calcPnl(t) {
  const dir = t.direction === 'Long' ? 1 : -1;
  return (parseFloat(t.exitPrice) - parseFloat(t.entryPrice)) * dir * parseFloat(t.quantity) - (parseFloat(t.fees) || 0);
}

// ── Stats ──────────────────────────────────────────────────────────────
function calcStats(tList) {
  if (!tList.length) return { totalPnl: 0, winRate: 0, totalTrades: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0, wins: 0, losses: 0, scratches: 0 };
  const closed  = tList.filter(t => t.exitPrice);
  const pnls    = closed.map(t => ({ pnl: calcPnl(t), t }));
  const wins    = pnls.filter(p => p.pnl > 0);
  const losses  = pnls.filter(p => p.pnl < 0);
  const scratch = pnls.filter(p => p.pnl === 0);
  const totalPnl = pnls.reduce((a, p) => a + p.pnl, 0);
  const avgWin   = wins.length   ? wins.reduce((a, p) => a + p.pnl, 0) / wins.length     : 0;
  const avgLoss  = losses.length ? losses.reduce((a, p) => a + p.pnl, 0) / losses.length : 0;
  const grossWin  = wins.reduce((a, p) => a + p.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, p) => a + p.pnl, 0));
  return {
    totalPnl,
    winRate:      closed.length ? wins.length / closed.length : 0,
    totalTrades:  closed.length,
    avgWin, avgLoss,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    bestTrade:    pnls.length ? Math.max(...pnls.map(p => p.pnl)) : 0,
    worstTrade:   pnls.length ? Math.min(...pnls.map(p => p.pnl)) : 0,
    wins:         wins.length,
    losses:       losses.length,
    scratches:    scratch.length,
  };
}

// ── Equity Curve Data ─────────────────────────────────────────────────
function getEquityCurve(tList) {
  const sorted = [...tList].filter(t => t.exitPrice && t.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  let cum = 0;
  const pts = [{ date: sorted[0]?.date || new Date().toISOString().slice(0,10), value: 0 }];
  sorted.forEach(t => {
    cum += calcPnl(t);
    pts.push({ date: t.date, value: parseFloat(cum.toFixed(2)) });
  });
  return pts;
}

// ── Emotion meta ──────────────────────────────────────────────────────
const EMOTIONS = [
  { key: 'Calm',       icon: '😌', color: '#10b981' },
  { key: 'Confident',  icon: '💪', color: '#06b6d4' },
  { key: 'Greedy',     icon: '🤑', color: '#f59e0b' },
  { key: 'FOMO',       icon: '😱', color: '#f97316' },
  { key: 'Fearful',    icon: '😨', color: '#8b5cf6' },
  { key: 'Frustrated', icon: '😤', color: '#ef4444' },
];

const RULE_VIOLATIONS = [
  'Over-leveraged',
  'Moved stop loss',
  'Chased entry',
  'Took revenge trade',
  'Ignored trade plan',
  'Overtraded',
  'Cut winner early',
  'No stop loss set',
];

// ── Router ────────────────────────────────────────────────────────────
const PAGES = ['dashboard', 'trades', 'analytics', 'charts', 'psychology', 'journal', 'new-entry', 'nakshatra', 'settings'];
let currentPage = 'dashboard';

function navigate(page) {
  let sub = undefined;
  if (page && page.includes('/')) {
    const parts = page.split('/');
    page = parts[0];
    sub = parts[1];
  }
  if (!PAGES.includes(page)) page = 'dashboard';
  if (page === 'nakshatra' && sub) {
    currentNkTab = sub;
  }
  currentPage = page;
  history.replaceState(null, '', '#' + page + (sub ? '/' + sub : ''));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  renderPage(page);
  closeSidebar();
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'APEX_TAB_CHANGED', page }, '*');
    }
  } catch (err) {}
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'APEX_NAVIGATE') {
    if (event.data.nkSubTab) {
      currentNkTab = event.data.nkSubTab;
      document.querySelectorAll('.nk-sub-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.nkTab === currentNkTab);
      });
    }
    if (event.data.page && event.data.page !== currentPage) {
      navigate(event.data.page);
    } else if (event.data.page === 'nakshatra') {
      const pageEl = document.querySelector('.page');
      if (pageEl) renderNakshatra(pageEl);
    }
  }
  if (event.data && event.data.type === 'APEX_THEME_CHANGE') {
    if (event.data.theme) {
      applyTheme(event.data.theme);
    }
  }
});

let currentNkTab = 'mansion';

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nk-sub-tab');
  if (btn) {
    const tab = btn.dataset.nkTab;
    if (tab) {
      currentNkTab = tab;
      document.querySelectorAll('.nk-sub-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.nkTab === tab);
      });
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'APEX_NK_SUBTAB_CHANGED', subTab: tab }, '*');
        }
      } catch (err) {}
      // Update right panel in-place without full re-render
      const rightPanel = document.getElementById('nk-right-panel');
      if (rightPanel && currentPage === 'nakshatra') {
        updateNkRightPanel(rightPanel, tab);
      } else {
        const pageEl = document.querySelector('.page');
        if (pageEl && currentPage === 'nakshatra') {
          renderNakshatra(pageEl);
        }
      }
    }
  }
});

function updateNkRightPanel(panel, tab) {
  if (tab === 'mansion') {
    panel.classList.remove('nk-right-panel--open');
    panel.innerHTML = '';
    document.getElementById('nk-split-layout')?.classList.remove('nk-split-layout--open');
    return;
  }
  panel.classList.add('nk-right-panel--open');
  document.getElementById('nk-split-layout')?.classList.add('nk-split-layout--open');
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  // Header with close / tab title
  const tabNames = { rulers: 'Planet Lords', analytics: 'Star Performance', rules: 'Astro Guidelines' };
  const header = document.createElement('div');
  header.className = 'nk-right-panel-header';
  header.innerHTML = `
    <span class="nk-right-panel-title">${tabNames[tab] || tab}</span>
    <button class="nk-right-panel-close" title="Close panel" aria-label="Close panel">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  header.querySelector('.nk-right-panel-close').addEventListener('click', () => {
    currentNkTab = 'mansion';
    document.querySelectorAll('.nk-sub-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.nkTab === 'mansion');
    });
    panel.classList.remove('nk-right-panel--open');
    panel.innerHTML = '';
    document.getElementById('nk-split-layout')?.classList.remove('nk-split-layout--open');
  });
  panel.innerHTML = '';
  panel.appendChild(header);
  panel.appendChild(wrap);
  const nkState = LS.get('tj_nakshatra_state', {});
  if (tab === 'rulers') renderRulersTab(wrap, nkState);
  else if (tab === 'analytics') renderAnalyticsTab(wrap, nkState);
  else if (tab === 'rules') renderRulesTab(wrap);
}

function renderPage(page) {
  const stdNav = document.getElementById('subbar-nav-standard');
  const nkNav = document.getElementById('subbar-nav-nakshatra');
  if (stdNav && nkNav) {
    if (page === 'nakshatra') {
      stdNav.style.display = 'none';
      nkNav.style.display = 'block';
    } else {
      stdNav.style.display = 'block';
      nkNav.style.display = 'none';
    }
  }

  const container = document.getElementById('app-content');
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = (page === 'new-entry' || page === 'nakshatra') ? 'page page-no-padding' : 'page';
  container.appendChild(el);

  switch (page) {
    case 'dashboard':   renderDashboard(el);   break;
    case 'trades':      renderTrades(el);       break;
    case 'analytics':   renderAnalytics(el);    break;
    case 'charts':      renderChartsGallery(el); break;
    case 'psychology':  renderPsychology(el);   break;
    case 'journal':     renderJournal(el, { hideSavedEntries: false }); break;
    case 'new-entry':   journalDate = new Date().toISOString().slice(0, 10); renderJournal(el, { hideSavedEntries: true }); break;
    case 'nakshatra':   renderNakshatra(el);    break;
    case 'settings':    renderSettings(el);     break;
  }
  updateCapitalDisplay();
}

// ══════════════════════════════════════════════════════════════════════
//  NAKSHATRA TRADING JOURNAL
// ══════════════════════════════════════════════════════════════════════
const NAKSHATRA_DATA = [
 {d:"Aug 8",  dow:"Sat", nak:"Rohini",          lord:"Moon",    time:"Until 4:51 PM", note:"In effect since the previous night. Hands off to Mrigashirsha at 4:51 PM today."},
 {d:"Aug 9",  dow:"Sun", nak:"Mrigashirsha",     lord:"Mars",    time:"Full Day (from 4:51 PM)", note:"Began yesterday, 4:51 PM. Holds for the full day today."},
 {d:"Aug 10", dow:"Mon", nak:"Ardra",            lord:"Rahu",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 11", dow:"Tue", nak:"Punarvasu",        lord:"Jupiter", time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 12", dow:"Wed", nak:"Pushya",           lord:"Saturn",  time:"Full Day (Amavasya)", note:"Amavasya today. Nakshatra unchanged through the day."},
 {d:"Aug 13", dow:"Thu", nak:"Ashlesha",         lord:"Mercury", time:"From 6:06 AM", note:"Begins near sunrise, 6:06 AM today."},
 {d:"Aug 14", dow:"Fri", nak:"Purva Phalguni",   lord:"Venus",   time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 15", dow:"Sat", nak:"Uttara Phalguni",  lord:"Sun",     time:"From 9:34 AM", note:"Begins 9:34 AM today. Independence Day."},
 {d:"Aug 16", dow:"Sun", nak:"Hasta",            lord:"Moon",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 17", dow:"Mon", nak:"Chitra",           lord:"Mars",    time:"From 4:19 PM", note:"Begins 4:19 PM today. Nag Panchami."},
 {d:"Aug 18", dow:"Tue", nak:"Swati",            lord:"Rahu",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 19", dow:"Wed", nak:"Swati",            lord:"Rahu",    time:"Full Day (Day 2)", note:"Still Swati — second full day of this mansion."},
 {d:"Aug 20", dow:"Thu", nak:"Vishakha",         lord:"Jupiter", time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 21", dow:"Fri", nak:"Anuradha",         lord:"Saturn",  time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 22", dow:"Sat", nak:"Jyeshtha",         lord:"Mercury", time:"From 2:49 PM", note:"Begins 2:49 PM today."},
 {d:"Aug 23", dow:"Sun", nak:"Mula",             lord:"Ketu",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 24", dow:"Mon", nak:"Purva Ashadha",    lord:"Venus",   time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 25", dow:"Tue", nak:"Uttara Ashadha",   lord:"Sun",     time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 26", dow:"Wed", nak:"Shravana",         lord:"Moon",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 27", dow:"Thu", nak:"Dhanishta",        lord:"Mars",    time:"From 1:35 PM", note:"Begins 1:35 PM today. Panchak begins."},
 {d:"Aug 28", dow:"Fri", nak:"Shatabhisha",      lord:"Rahu",    time:"Full Day (Purnima)", note:"Purnima / Raksha Bandhan. Unchanged through the day."},
 {d:"Aug 29", dow:"Sat", nak:"Purva Bhadrapada", lord:"Jupiter", time:"From 9:37 PM", note:"Begins 9:37 PM today."},
 {d:"Aug 30", dow:"Sun", nak:"Uttara Bhadrapada",lord:"Saturn",  time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Aug 31", dow:"Mon", nak:"Revati",           lord:"Mercury", time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Sep 1",  dow:"Tue", nak:"Ashwini",          lord:"Ketu",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Sep 2",  dow:"Wed", nak:"Bharani",          lord:"Venus",   time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Sep 3",  dow:"Thu", nak:"Krittika",         lord:"Sun",     time:"From 7:25 AM", note:"Begins 7:25 AM today."},
 {d:"Sep 4",  dow:"Fri", nak:"Rohini",           lord:"Moon",    time:"Full Day (Janmashtami)", note:"Krishna Janmashtami. Unchanged through the day."},
 {d:"Sep 5",  dow:"Sat", nak:"Mrigashirsha",     lord:"Mars",    time:"From 10:18 AM", note:"Begins 10:18 AM today."},
 {d:"Sep 6",  dow:"Sun", nak:"Ardra",            lord:"Rahu",    time:"Full Day (24 hrs)", note:"Carries through the day unchanged."},
 {d:"Sep 7",  dow:"Mon", nak:"Punarvasu",        lord:"Jupiter", time:"From 12:38 PM", note:"Begins 12:38 PM today."}
];

const NAKSHATRA_PALETTE = {
  "Moon":    {c:"#CE8A96", d:"#B5677A"}, // rose
  "Mars":    {c:"#BD5B5B", d:"#9C4444"}, // coral-red
  "Rahu":    {c:"#A793C4", d:"#7E63A6"}, // lavender
  "Jupiter": {c:"#D9A441", d:"#B9862A"}, // marigold
  "Saturn":  {c:"#8FA588", d:"#6C8768"}, // sage
  "Mercury": {c:"#7FA6A0", d:"#5C807A"}, // eucalyptus
  "Venus":   {c:"#E0A8C4", d:"#C77E9E"}, // orchid pink
  "Sun":     {c:"#E3B23C", d:"#C89226"}, // gold
  "Ketu":    {c:"#B39CD0", d:"#8F73B0"}  // violet
};

function renderRulersTab(wrapEl, state) {
  const rulersData = {};
  Object.keys(NAKSHATRA_PALETTE).forEach(lord => {
    rulersData[lord] = { lord, count: 0, wins: 0, pnl: 0, nakshatras: [] };
  });

  NAKSHATRA_DATA.forEach((day, i) => {
    const s = state['day' + i] || {};
    const lord = day.lord;
    if (rulersData[lord]) {
      if (!rulersData[lord].nakshatras.includes(day.nak)) {
        rulersData[lord].nakshatras.push(day.nak);
      }
      if (s.entry !== '' && s.exit !== '' && s.entry !== undefined && s.exit !== undefined && s.entry !== null && s.exit !== null && !isNaN(s.entry) && !isNaN(s.exit)) {
        rulersData[lord].count++;
        const qty = parseFloat(s.qty) || 1;
        const dir = s.direction === 'short' ? -1 : 1;
        const pnl = (parseFloat(s.exit) - parseFloat(s.entry)) * qty * dir;
        rulersData[lord].pnl += pnl;
        if (pnl > 0) rulersData[lord].wins++;
      }
    }
  });

  wrapEl.innerHTML = `
    <div class="nk-rulers-grid">
      ${Object.values(rulersData).map(r => {
        const pal = NAKSHATRA_PALETTE[r.lord] || { c: '#A793C4', d: '#7E63A6' };
        const winRate = r.count > 0 ? Math.round((r.wins / r.count) * 100) + '%' : '0%';
        const pnlFormatted = (r.pnl >= 0 ? '₹' : '-₹') + Math.abs(Math.round(r.pnl)).toLocaleString('en-IN');
        const pnlClass = r.pnl > 0 ? 'profit' : (r.pnl < 0 ? 'loss' : '');
        return `
          <div class="nk-ruler-card" style="border-left: 4px solid ${pal.c};">
            <div class="nk-ruler-header">
              <span class="nk-ruler-dot" style="background:${pal.c};"></span>
              <span class="nk-ruler-name">${r.lord}</span>
              <span class="nk-ruler-pnl ${pnlClass}">${pnlFormatted}</span>
            </div>
            <div class="nk-ruler-naks">
              <strong>Mansions:</strong> ${r.nakshatras.join(', ')}
            </div>
            <div class="nk-ruler-stats">
              <div><span>Trades Logged:</span> <strong>${r.count}</strong></div>
              <div><span>Win Rate:</span> <strong>${winRate}</strong></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAnalyticsTab(wrapEl, state) {
  let totalTrades = 0, wins = 0, totalPnl = 0, longPnl = 0, shortPnl = 0;
  NAKSHATRA_DATA.forEach((day, i) => {
    const s = state['day' + i] || {};
    if (s.entry !== '' && s.exit !== '' && s.entry !== undefined && s.exit !== undefined && s.entry !== null && s.exit !== null && !isNaN(s.entry) && !isNaN(s.exit)) {
      totalTrades++;
      const qty = parseFloat(s.qty) || 1;
      const dir = s.direction === 'short' ? -1 : 1;
      const pnl = (parseFloat(s.exit) - parseFloat(s.entry)) * qty * dir;
      totalPnl += pnl;
      if (pnl > 0) wins++;
      if (s.direction === 'short') shortPnl += pnl;
      else longPnl += pnl;
    }
  });

  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const pnlFormatted = (totalPnl >= 0 ? '₹' : '-₹') + Math.abs(Math.round(totalPnl)).toLocaleString('en-IN');
  const longPnlFmt = (longPnl >= 0 ? '₹' : '-₹') + Math.abs(Math.round(longPnl)).toLocaleString('en-IN');
  const shortPnlFmt = (shortPnl >= 0 ? '₹' : '-₹') + Math.abs(Math.round(shortPnl)).toLocaleString('en-IN');

  wrapEl.innerHTML = `
    <div class="nk-analytics-container">
      <div class="nk-analytics-card">
        <h3>Session Performance</h3>
        <div class="nk-analytics-row"><span>Total Trades Logged</span><strong>${totalTrades}</strong></div>
        <div class="nk-analytics-row"><span>Win Rate</span><strong>${winRate}%</strong></div>
        <div class="nk-analytics-row"><span>Total Net P&amp;L</span><strong class="${totalPnl >= 0 ? 'profit' : 'loss'}">${pnlFormatted}</strong></div>
      </div>
      <div class="nk-analytics-card">
        <h3>Directional Breakdown</h3>
        <div class="nk-analytics-row"><span>Long Trades P&amp;L</span><strong class="${longPnl >= 0 ? 'profit' : 'loss'}">${longPnlFmt}</strong></div>
        <div class="nk-analytics-row"><span>Short Trades P&amp;L</span><strong class="${shortPnl >= 0 ? 'profit' : 'loss'}">${shortPnlFmt}</strong></div>
        <div class="nk-progress-bar-wrap" style="margin-top:12px;">
          <div style="font-size:11px; margin-bottom:4px; color:var(--plum-soft);">Win Rate Progress</div>
          <div class="nk-progress-bar"><div class="nk-progress-fill" style="width:${winRate}%;"></div></div>
        </div>
      </div>
    </div>
  `;
}

function renderRulesTab(wrapEl) {
  const rules = LS.get('tj_nakshatra_rules_text', '1. Rahu/Ketu Star Days (Swati, Shatabhisha, Magha): Strict 0.5% risk limit per trade.\n2. Jupiter Star Days (Punarvasu, Vishakha): Favor trend-following breakout setups.\n3. Saturn Star Days (Pushya, Anuradha): Expect slower range consolidations; avoid chasing late entries.');

  wrapEl.innerHTML = `
    <div class="nk-rules-container">
      <div class="nk-rule-card">
        <h3>Astro Rules &amp; Pre-Trade Checklist</h3>
        <textarea id="nk-rules-editor" class="nk-rules-textarea" rows="8" placeholder="Log your rules for Rahu, Ketu, Mars, and Jupiter star days…">${rules}</textarea>
        <button class="btn-nk primary" id="nk-save-rules-btn" style="margin-top:12px;">Save Astro Guidelines</button>
      </div>
    </div>
  `;

  setTimeout(() => {
    const btn = wrapEl.querySelector('#nk-save-rules-btn');
    const txt = wrapEl.querySelector('#nk-rules-editor');
    if (btn && txt) {
      btn.addEventListener('click', () => {
        LS.set('tj_nakshatra_rules_text', txt.value);
        toast('Astro guidelines saved successfully!', 'success');
      });
    }
  }, 50);
}

async function renderNakshatra(el) {
  let state = LS.get('tj_nakshatra_state', {});

  try {
    const res = await apiFetch('/api/journal/nakshatra');
    if (res.ok) {
      const sqlState = await res.json();
      if (sqlState && Object.keys(sqlState).length > 0) {
        state = { ...state, ...sqlState };
        LS.set('tj_nakshatra_state', state);
      } else if (state && Object.keys(state).length > 0) {
        apiFetch('/api/journal/nakshatra/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        }).catch(() => undefined);
      }
    }
  } catch (err) {
    console.warn('Nakshatra SQL sync fallback:', err);
  }

  // Initialize state keys if empty
  NAKSHATRA_DATA.forEach((day, i) => {
    const id = 'day' + i;
    if (!state[id]) {
      state[id] = { instrument: '', direction: '', entry: '', exit: '', qty: '', notes: '' };
    }
  });

  // Split-panel layout: left = mansion journal, right = subtab panel
  const splitLayout = document.createElement('div');
  splitLayout.id = 'nk-split-layout';
  splitLayout.className = 'nk-split-layout' + (currentNkTab !== 'mansion' ? ' nk-split-layout--open' : '');

  // Left pane always contains the mansion journal
  const leftPane = document.createElement('div');
  leftPane.id = 'nk-left-pane';
  leftPane.className = 'nk-left-pane';

  // Right pane for subtab content
  const rightPanel = document.createElement('div');
  rightPanel.id = 'nk-right-panel';
  rightPanel.className = 'nk-right-panel' + (currentNkTab !== 'mansion' ? ' nk-right-panel--open' : '');

  splitLayout.appendChild(leftPane);
  splitLayout.appendChild(rightPanel);

  const pageWrap = document.createElement('div');
  pageWrap.className = 'nakshatra-page-wrap';
  pageWrap.appendChild(splitLayout);
  el.appendChild(pageWrap);

  // If on a non-mansion tab, populate right panel immediately
  if (currentNkTab !== 'mansion') {
    updateNkRightPanel(rightPanel, currentNkTab);
  }

  leftPane.innerHTML = `
    <header>
      <div class="eyebrow">Sravana – Bhadrapada · Vikram Samvat 2083</div>
      <h1>The <em>Nakshatra</em> Trading Journal</h1>
      <p class="sub">One page for every lunar mansion the Moon walks through this cycle — track setups, entries &amp; exits alongside the star of the day.</p>
      <div class="range">08 AUG — 07 SEP 2026 &nbsp;·&nbsp; NEW DELHI, IST</div>
      <button type="button" class="btn-nk-fullscreen" id="nk-fullscreen-btn" title="Fullscreen Mode">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
    </header>

    <div class="wrap">
      <svg class="bloom-divider" viewBox="0 0 1180 34" preserveAspectRatio="none">
        <line x1="0" y1="17" x2="1180" y2="17" stroke="#E9DCCF" stroke-width="1"/>
        <g transform="translate(590,17)">
          <circle r="3.4" fill="#CE8A96"/>
          <circle cx="10" r="2.4" fill="#8FA588"/>
          <circle cx="-10" r="2.4" fill="#A793C4"/>
          <circle cx="20" r="1.8" fill="#D9A441"/>
          <circle cx="-20" r="1.8" fill="#CE8A96"/>
        </g>
      </svg>

      <section class="strip-section">
        <div class="strip-title">Jump to a day</div>
        <div class="strip" id="nk-strip"></div>
        <div class="legend" id="nk-legend"></div>
      </section>

      <section class="summary">
        <div class="stat"><div class="n" id="nk-statDays">31</div><div class="l">Days tracked</div></div>
        <div class="stat" id="nk-statTrades"><div class="n">0</div><div class="l">Trades logged</div></div>
        <div class="stat profit" id="nk-statWin"><div class="n">0</div><div class="l">Winning days</div></div>
        <div class="stat" id="nk-statPnl"><div class="n">₹0</div><div class="l">Net P&amp;L (this session)</div></div>
      </section>

      <div class="grid" id="nk-grid"></div>

      <div class="actions">
        <button class="btn-nk primary" id="nk-exportBtn">Download journal as JSON</button>
        <button class="btn-nk" id="nk-printBtn">Print / save as PDF</button>
      </div>
      <p class="note-strip">Entries auto-saved locally in your browser session.<br>Download the JSON to backup or share what you've logged.</p>
    </div>
  `;

  const gridEl = leftPane.querySelector('#nk-grid');
  const stripEl = leftPane.querySelector('#nk-strip');
  const legendEl = leftPane.querySelector('#nk-legend');

  const usedLords = [...new Set(NAKSHATRA_DATA.map(d => d.lord))];
  legendEl.innerHTML = usedLords.map(l => {
    const p = NAKSHATRA_PALETTE[l];
    return `<span><i style="background:${p.d}"></i>${l}</span>`;
  }).join('');

  NAKSHATRA_DATA.forEach((day, i) => {
    const p = NAKSHATRA_PALETTE[day.lord] || NAKSHATRA_PALETTE["Moon"];
    const id = 'day' + i;
    const cur = state[id] || {};
    const dayNum = day.d.match(/\d+/)?.[0] || day.d;

    // strip dot
    const dot = document.createElement('div');
    dot.className = i === 0 ? 'dot active' : 'dot';
    dot.style.background = p.d;
    dot.textContent = dayNum;
    dot.title = `${day.d} — ${day.nak} (${day.lord})`;
    dot.addEventListener('click', () => {
      const cardEl = leftPane.querySelector('#nk-card-' + id);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      stripEl.querySelectorAll('.dot').forEach(x => x.classList.remove('active'));
      dot.classList.add('active');
    });
    stripEl.appendChild(dot);

    // card
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'nk-card-' + id;
    card.style.setProperty('--petal-color', p.c);
    card.style.setProperty('--petal-color-deep', p.d);

    const isLongOn = cur.direction === 'long' ? 'on' : '';
    const isShortOn = cur.direction === 'short' ? 'on' : '';

    const isToday = i === 0;
    const todayBadgeHtml = isToday ? `<span class="today-badge">✨ TODAY</span>` : '';

    card.innerHTML = `
      <div class="card-top">
        <div class="date-block">
          <div class="dow">${day.dow}, 2026 ${todayBadgeHtml}</div>
          <div class="dnum">${day.d}</div>
        </div>
        <div class="naksh-badge">
          <div class="naksh-name">${day.nak}</div>
          <div class="naksh-lord">Ruled by ${day.lord}</div>
          <div class="naksh-timing-badge" title="Nakshatra Timing">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px;vertical-align:-1px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${day.time || ''}</span>
          </div>
        </div>
      </div>
      <div class="naksh-note">${day.note}</div>
      <div class="divider"></div>

      <div class="row">
        <div class="field">
          <label>Instrument</label>
          <input type="text" placeholder="NIFTY, BANKNIFTY, RELIANCE…" data-id="${id}" data-k="instrument" value="${cur.instrument || ''}">
        </div>
        <div class="field" style="max-width:110px;">
          <label>Qty / Lots</label>
          <input type="text" placeholder="—" data-id="${id}" data-k="qty" value="${cur.qty || ''}">
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Direction</label>
          <div class="dir-toggle">
            <button type="button" class="dir-btn long ${isLongOn}" data-id="${id}">Long</button>
            <button type="button" class="dir-btn short ${isShortOn}" data-id="${id}">Short</button>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Entry price</label>
          <input type="number" step="0.01" placeholder="0.00" data-id="${id}" data-k="entry" value="${cur.entry || ''}">
        </div>
        <div class="field">
          <label>Exit price</label>
          <input type="number" step="0.01" placeholder="0.00" data-id="${id}" data-k="exit" value="${cur.exit || ''}">
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Notes — setup, mood, what the star said vs. what the chart said</label>
          <textarea data-id="${id}" data-k="notes" placeholder="Setup, confluence, how it felt to trade under ${day.nak}…">${cur.notes || ''}</textarea>
        </div>
      </div>

      <div class="pnl-row">
        <span class="pnl-label">Day P&amp;L</span>
        <span class="pnl-value zero" id="nk-pnl-${id}">₹0</span>
      </div>
    `;
    gridEl.appendChild(card);
    updateNkCardPnl(id, true);
  });

  function saveNkState() {
    LS.set('tj_nakshatra_state', state);
    apiFetch('/api/journal/nakshatra/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => undefined);
  }

  function recalcNkSummary() {
    let tradesCount = 0, wins = 0, net = 0;
    if (state && typeof state === 'object') {
      Object.values(state).forEach(s => {
        if (s && typeof s === 'object' && s.entry !== '' && s.exit !== '' && s.entry !== undefined && s.exit !== undefined && s.entry !== null && s.exit !== null && !isNaN(s.entry) && !isNaN(s.exit)) {
          tradesCount++;
          const qty = parseFloat(s.qty) || 1;
          const dir = s.direction === 'short' ? -1 : 1;
          const pnl = (parseFloat(s.exit) - parseFloat(s.entry)) * qty * dir;
          net += pnl;
          if (pnl > 0) wins++;
        }
      });
    }

    const statTradesEl = leftPane.querySelector('#nk-statTrades .n');
    const statWinEl = leftPane.querySelector('#nk-statWin .n');
    const pnlEl = leftPane.querySelector('#nk-statPnl .n');
    const pnlCard = leftPane.querySelector('#nk-statPnl');

    if (statTradesEl) statTradesEl.textContent = tradesCount;
    if (statWinEl) statWinEl.textContent = wins;
    if (pnlEl) pnlEl.textContent = (net >= 0 ? '₹' : '-₹') + Math.abs(Math.round(net)).toLocaleString('en-IN');
    if (pnlCard) {
      pnlCard.classList.remove('profit', 'loss');
      if (net > 0) pnlCard.classList.add('profit');
      else if (net < 0) pnlCard.classList.add('loss');
    }
  }

  function updateNkCardPnl(id, skipSummary = false) {
    const s = state[id];
    const pnlValEl = leftPane.querySelector('#nk-pnl-' + id);
    if (!pnlValEl || !s) return;

    if (s.entry !== '' && s.exit !== '' && s.entry !== undefined && s.exit !== undefined && s.entry !== null && s.exit !== null && !isNaN(s.entry) && !isNaN(s.exit)) {
      const qty = parseFloat(s.qty) || 1;
      const dir = s.direction === 'short' ? -1 : 1;
      const pnl = (parseFloat(s.exit) - parseFloat(s.entry)) * qty * dir;
      pnlValEl.textContent = (pnl >= 0 ? '₹' : '-₹') + Math.abs(Math.round(pnl)).toLocaleString('en-IN');
      pnlValEl.className = 'pnl-value ' + (pnl > 0 ? 'pos' : (pnl < 0 ? 'neg' : 'zero'));
    } else {
      pnlValEl.textContent = '₹0';
      pnlValEl.className = 'pnl-value zero';
    }
    if (!skipSummary) recalcNkSummary();
  }

  gridEl.addEventListener('input', (e) => {
    const id = e.target.getAttribute('data-id');
    const k = e.target.getAttribute('data-k');
    if (!id || !k) return;
    state[id][k] = e.target.value;
    saveNkState();
    if (k === 'entry' || k === 'exit' || k === 'qty') updateNkCardPnl(id);
  });

  gridEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('dir-btn')) {
      const id = e.target.getAttribute('data-id');
      const isLong = e.target.classList.contains('long');
      const card = leftPane.querySelector('#nk-card-' + id);
      if (card) card.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('on'));
      e.target.classList.add('on');
      state[id].direction = isLong ? 'long' : 'short';
      saveNkState();
      updateNkCardPnl(id);
    }
  });

  const exportBtn = leftPane.querySelector('#nk-exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const payload = NAKSHATRA_DATA.map((day, i) => ({
        date: day.d,
        nakshatra: day.nak,
        lord: day.lord,
        ...state['day' + i]
      }));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nakshatra-trading-journal-aug-sep-2026.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const fsBtn = leftPane.querySelector('#nk-fullscreen-btn');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const isFs = document.body.classList.toggle('nk-fullscreen');
      const label = fsBtn.querySelector('span');
      const svg = fsBtn.querySelector('svg');
      if (isFs) {
        fsBtn.title = 'Exit Fullscreen';
        if (svg) { svg.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>'; }
      } else {
        fsBtn.title = 'Fullscreen Mode';
        if (svg) { svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'; }
      }
      try {
        window.parent.postMessage({ type: 'TOGGLE_NAKSHATRA_FULLSCREEN', fullscreen: isFs }, '*');
      } catch (err) {}
    });
  }

  const handleEsc = (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nk-fullscreen')) {
      document.body.classList.remove('nk-fullscreen');
      if (fsBtn) {
        fsBtn.title = 'Fullscreen Mode';
        const svg = fsBtn.querySelector('svg');
        if (svg) svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
      }
      try {
        window.parent.postMessage({ type: 'TOGGLE_NAKSHATRA_FULLSCREEN', fullscreen: false }, '*');
      } catch (err) {}
    }
  };
  window.addEventListener('keydown', handleEsc);

  const printBtn = leftPane.querySelector('#nk-printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  recalcNkSummary();
}

// ── Sidebar mobile ────────────────────────────────────────────────────
function openSidebar() {
  document.querySelector('.sidebar')?.classList.add('open');
  document.querySelector('.sidebar-overlay')?.classList.add('show');
}
function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');
}

// ── Capital display ───────────────────────────────────────────────────
function updateCapitalDisplay() {
  const stats = calcStats(trades);
  const current = settings.capital + stats.totalPnl;
  const el = document.getElementById('capital-display');
  if (el) {
    el.textContent = fmtCurr(current);
    el.className = 'capital-value ' + (stats.totalPnl >= 0 ? 'text-green' : 'text-red');
  }
}

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════════
function renderDashboard(el) {
  const stats = calcStats(trades);
  const pnlClass = stats.totalPnl >= 0 ? 'green' : 'red';
  const recentTrades = [...trades].filter(t => t.exitPrice).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,6);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">${new Date().toLocaleDateString('en', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>
      <button class="btn btn-primary" id="dash-add-btn">＋ New Trade</button>
    </div>
    <div class="page-content">
      <!-- Stat Cards -->
      <div class="grid-4">
        <div class="stat-card ${pnlClass}">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-label">Total P&L</div>
          <div class="stat-value ${pnlClass}">${fmtCurr(stats.totalPnl, true)}</div>
          <div class="stat-sub">${stats.totalTrades} closed trades</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div class="stat-label">Win Rate</div>
          <div class="stat-value purple">${(stats.winRate * 100).toFixed(1)}%</div>
          <div class="stat-sub">${stats.wins}W / ${stats.losses}L / ${stats.scratches}S</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div class="stat-label">Profit Factor</div>
          <div class="stat-value cyan">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}</div>
          <div class="stat-sub">Avg win ${fmtCurr(stats.avgWin)}</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3.5c0 1.66-1.34 3-3 3H9c-1.66 0-3-1.34-3-3V8a6 6 0 0 1 6-6z"/></svg>
          </div>
          <div class="stat-label">Best Trade</div>
          <div class="stat-value amber">${fmtCurr(stats.bestTrade)}</div>
          <div class="stat-sub">Worst: ${fmtCurr(stats.worstTrade)}</div>
        </div>
      </div>

      <!-- Equity + Donut -->
      <div class="grid-2-1 mt-24">
        <div class="card">
          <div class="card-header"><span class="card-title">Equity Curve</span></div>
          <div class="card-body"><canvas id="dash-equity" class="chart chart-lg"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Win / Loss</span></div>
          <div class="card-body flex-center" style="flex-direction:column;gap:16px;">
            <canvas id="dash-donut" class="chart" style="height:180px;"></canvas>
            <div style="display:flex;gap:16px;justify-content:center;">
              <span class="badge badge-win">✓ ${stats.wins} Wins</span>
              <span class="badge badge-loss">✗ ${stats.losses} Losses</span>
              ${stats.scratches ? `<span class="badge badge-scratch">~ ${stats.scratches}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Trades -->
      <div class="card mt-24">
        <div class="card-header">
          <span class="card-title">Recent Trades</span>
          <button class="btn btn-ghost btn-sm" onclick="navigate('trades')">View All →</button>
        </div>
        <div class="card-body">
          ${recentTrades.length ? recentTrades.map(t => {
            const pnl = calcPnl(t);
            const em  = EMOTIONS.find(e => e.key === t.emotion);
            return `
              <div class="trade-mini-row">
                <div>
                  <div class="trade-mini-ticker">${t.ticker}</div>
                  <div class="trade-mini-meta">${t.date} · <span class="badge badge-${t.direction.toLowerCase()}">${t.direction}</span> ${em ? em.icon : ''}</div>
                </div>
                <div class="trade-mini-pnl ${pnl >= 0 ? 'text-green' : 'text-red'}">${fmtCurr(pnl, true)}</div>
              </div>`;
          }).join('') : '<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div><div class="empty-title">No trades yet</div><div class="empty-sub">Add your first trade to get started</div></div>'}
        </div>
      </div>
    </div>`;

  el.querySelector('#dash-add-btn').onclick = () => openTradeModal();

  requestAnimationFrame(() => {
    const curve  = el.querySelector('#dash-equity');
    const donut_ = el.querySelector('#dash-donut');
    if (curve)  TJCharts.equityCurve(curve, getEquityCurve(trades));
    if (donut_) TJCharts.donut(donut_, stats.wins, stats.losses, stats.scratches);
  });
}

// ══════════════════════════════════════════════════════════════════════
//  TRADES
// ══════════════════════════════════════════════════════════════════════
let tradeFilters = { search: '', direction: '', outcome: '', asset: '', emotion: '' };

function renderTrades(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Trade Log</h1>
        <p class="page-subtitle">${trades.length} trades recorded</p>
      </div>
      <button class="btn btn-primary" id="trades-add-btn">＋ New Trade</button>
    </div>
    <div class="page-content">
      <div class="filters-bar">
        <input type="text" id="search-input" class="search-input" placeholder="Search ticker…" value="${tradeFilters.search}">
        <select id="filter-direction" class="filter-select">
          <option value="">All Directions</option>
          <option value="Long">Long</option>
          <option value="Short">Short</option>
        </select>
        <select id="filter-outcome" class="filter-select">
          <option value="">All Outcomes</option>
          <option value="Win">Win</option>
          <option value="Loss">Loss</option>
          <option value="Scratch">Scratch</option>
        </select>
        <select id="filter-asset" class="filter-select">
          <option value="">All Assets</option>
          <option value="Stock">Stock</option>
          <option value="Crypto">Crypto</option>
          <option value="Options">Options</option>
          <option value="Forex">Forex</option>
        </select>
        <select id="filter-emotion" class="filter-select">
          <option value="">All Emotions</option>
          ${EMOTIONS.map(e => `<option value="${e.key}">${e.icon} ${e.key}</option>`).join('')}
        </select>
      </div>

      <div class="mt-16">
        <div class="table-wrap" id="trades-table-container"></div>
      </div>
    </div>`;

  // set filter values
  el.querySelector('#filter-direction').value = tradeFilters.direction;
  el.querySelector('#filter-outcome').value   = tradeFilters.outcome;
  el.querySelector('#filter-asset').value     = tradeFilters.asset;
  el.querySelector('#filter-emotion').value   = tradeFilters.emotion;

  // Events
  el.querySelector('#trades-add-btn').onclick = () => openTradeModal();
  el.querySelector('#search-input').addEventListener('input', e => { tradeFilters.search = e.target.value; renderTradesTable(); });
  el.querySelector('#filter-direction').addEventListener('change', e => { tradeFilters.direction = e.target.value; renderTradesTable(); });
  el.querySelector('#filter-outcome').addEventListener('change', e => { tradeFilters.outcome = e.target.value; renderTradesTable(); });
  el.querySelector('#filter-asset').addEventListener('change', e => { tradeFilters.asset = e.target.value; renderTradesTable(); });
  el.querySelector('#filter-emotion').addEventListener('change', e => { tradeFilters.emotion = e.target.value; renderTradesTable(); });

  renderTradesTable();
}

function getFilteredTrades() {
  return trades.filter(t => {
    if (tradeFilters.search && !t.ticker.toUpperCase().includes(tradeFilters.search.toUpperCase())) return false;
    if (tradeFilters.direction && t.direction !== tradeFilters.direction) return false;
    if (tradeFilters.outcome && t.outcome !== tradeFilters.outcome) return false;
    if (tradeFilters.asset && t.assetType !== tradeFilters.asset) return false;
    if (tradeFilters.emotion && t.emotion !== tradeFilters.emotion) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTradesTable() {
  const container = document.getElementById('trades-table-container');
  if (!container) return;
  const filtered = getFilteredTrades();

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-title">No trades found</div><div class="empty-sub">Try adjusting your filters</div></div>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Ticker</th>
          <th>Type</th>
          <th>Direction</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>Qty</th>
          <th>P&L</th>
          <th>Emotion</th>
          <th>Mindset</th>
          <th>Setup</th>
          <th>Outcome</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(t => {
          const pnl = t.exitPrice ? calcPnl(t) : null;
          const em  = EMOTIONS.find(e => e.key === t.emotion);
          const mScore = t.mindsetScore;
          const scoreClass = mScore >= 7 ? 'score-high' : mScore >= 4 ? 'score-mid' : 'score-low';
          return `
            <tr onclick="openTradeDetail('${t.id}')">
              <td class="muted">${t.date}</td>
              <td><strong>${t.ticker}</strong></td>
              <td><span class="badge badge-${(t.assetType||'stock').toLowerCase()}">${t.assetType || '—'}</span></td>
              <td><span class="badge badge-${t.direction.toLowerCase()}">${t.direction}</span></td>
              <td class="mono">${currSym()}${parseFloat(t.entryPrice).toFixed(2)}</td>
              <td class="mono">${t.exitPrice ? currSym() + parseFloat(t.exitPrice).toFixed(2) : '—'}</td>
              <td class="mono">${t.quantity}</td>
              <td class="mono ${pnl !== null ? (pnl >= 0 ? 'text-green' : 'text-red') : ''}">${pnl !== null ? fmtCurr(pnl, true) : '—'}</td>
              <td>${em ? `<span class="emotion-badge" style="background:${em.color}22;color:${em.color}">${em.icon} ${em.key}</span>` : '—'}</td>
              <td>${mScore ? `<span class="score-pill ${scoreClass}">${mScore}/10</span>` : '—'}</td>
              <td class="muted">${t.setup || '—'}</td>
              <td>${t.outcome ? `<span class="badge badge-${t.outcome.toLowerCase()}">${t.outcome}</span>` : '—'}</td>
              <td>
                <button class="btn btn-icon btn-ghost btn-sm" onclick="event.stopPropagation();openTradeModal('${t.id}')" title="Edit" aria-label="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="btn btn-icon btn-danger btn-sm" onclick="event.stopPropagation();deleteTrade('${t.id}')" title="Delete" aria-label="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ══════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════════════════
function renderAnalytics(el) {
  const closed = trades.filter(t => t.exitPrice);
  const stats  = calcStats(trades);

  // By ticker
  const byTicker = {};
  closed.forEach(t => { byTicker[t.ticker] = (byTicker[t.ticker] || 0) + calcPnl(t); });
  const tickerEntries = Object.entries(byTicker).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,10);

  // By setup
  const bySetup = {};
  closed.forEach(t => { if (t.setup) bySetup[t.setup] = (bySetup[t.setup] || 0) + calcPnl(t); });
  const setupEntries = Object.entries(bySetup).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]));

  // By day of week
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const byDay = Array(7).fill(0);
  closed.forEach(t => { const d = new Date(t.date).getDay(); byDay[d] += calcPnl(t); });

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Analytics</h1>
        <p class="page-subtitle">Performance breakdown across all your trades</p>
      </div>
    </div>
    <div class="page-content">
      <!-- KPI Row -->
      <div class="grid-4">
        <div class="stat-card cyan">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div class="stat-label">Avg Win</div>
          <div class="stat-value cyan">${fmtCurr(stats.avgWin)}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
          </div>
          <div class="stat-label">Avg Loss</div>
          <div class="stat-value red">${fmtCurr(stats.avgLoss)}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="stat-label">R:R Ratio</div>
          <div class="stat-value green">${stats.avgLoss ? (Math.abs(stats.avgWin / stats.avgLoss)).toFixed(2) : '—'}</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3.5c0 1.66-1.34 3-3 3H9c-1.66 0-3-1.34-3-3V8a6 6 0 0 1 6-6z"/></svg>
          </div>
          <div class="stat-label">Profit Factor</div>
          <div class="stat-value purple">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}</div>
        </div>
      </div>

      <!-- Equity + By Ticker -->
      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header"><span class="card-title">Equity Curve</span></div>
          <div class="card-body"><canvas id="an-equity" class="chart chart-md"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">P&L by Ticker</span></div>
          <div class="card-body"><canvas id="an-ticker" class="chart chart-md"></canvas></div>
        </div>
      </div>

      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header"><span class="card-title">P&L by Setup</span></div>
          <div class="card-body"><canvas id="an-setup" class="chart chart-md"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">P&L by Day of Week</span></div>
          <div class="card-body"><canvas id="an-day" class="chart chart-md"></canvas></div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const equity = el.querySelector('#an-equity');
    const ticker = el.querySelector('#an-ticker');
    const setup  = el.querySelector('#an-setup');
    const day    = el.querySelector('#an-day');
    if (equity) TJCharts.equityCurve(equity, getEquityCurve(trades));
    if (ticker) TJCharts.barChart(ticker, tickerEntries.map(e=>e[0]), tickerEntries.map(e=>e[1]));
    if (setup)  TJCharts.barChart(setup, setupEntries.map(e=>e[0]), setupEntries.map(e=>e[1]));
    if (day)    TJCharts.barChart(day, days, byDay);
  });
}

// ══════════════════════════════════════════════════════════════════════
//  PSYCHOLOGY
// ══════════════════════════════════════════════════════════════════════
function renderPsychology(el) {
  const closed = trades.filter(t => t.exitPrice);

  // ── Stats & Calculations ──
  const emotionCount = {};
  EMOTIONS.forEach(e => emotionCount[e.key] = 0);
  closed.forEach(t => { if (t.emotion) emotionCount[t.emotion] = (emotionCount[t.emotion] || 0) + 1; });

  const emotionPnl = {};
  EMOTIONS.forEach(e => emotionPnl[e.key] = []);
  closed.forEach(t => { if (t.emotion) emotionPnl[t.emotion].push(calcPnl(t)); });

  const scatterData = closed.filter(t => t.emotion).map(t => ({ id: t.id, emotion: t.emotion, pnl: calcPnl(t) }));

  const mindsetPts = closed.filter(t => t.mindsetScore && t.date)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .map(t => ({ date: t.date, value: parseFloat(t.mindsetScore) }));

  const avgMindset = mindsetPts.length ? (mindsetPts.reduce((a,p) => a+p.value, 0) / mindsetPts.length) : 0;

  const violations = {};
  RULE_VIOLATIONS.forEach(r => violations[r] = 0);
  closed.forEach(t => { (t.ruleViolations || []).forEach(r => { violations[r] = (violations[r] || 0) + 1; }); });
  const totalViolations = Object.values(violations).reduce((a,b) => a+b, 0);
  const totalPossible   = closed.length * RULE_VIOLATIONS.length;
  const disciplineScore = totalPossible > 0 ? Math.max(0, Math.round((1 - totalViolations / totalPossible) * 100)) : 100;
  const discPct = disciplineScore + '%';

  const emotionWinRate = {};
  EMOTIONS.forEach(e => {
    const pts = emotionPnl[e.key];
    emotionWinRate[e.key] = pts.length ? pts.filter(p=>p>0).length / pts.length : null;
  });

  const maxEmotionCount = Math.max(...Object.values(emotionCount), 1);

  // Psychology persistent logs
  let psychLogs = LS.get('tj_psych_logs', []);
  let activeTab = LS.get('tj_psych_tab', 'checkin');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCheckin = psychLogs.find(l => l.date === todayStr);

  el.innerHTML = `
    <div class="page-header justify-between items-center" style="display:flex;flex-wrap:wrap;gap:16px;">
      <div>
        <h1 class="page-title">Mindset & Psychology Studio</h1>
        <p class="page-subtitle">Master emotional discipline, prevent tilt, audit rule adherence, and track psychological readiness</p>
      </div>
      <div class="psych-tab-pills">
        <button class="psych-pill-btn ${activeTab==='checkin'?'active':''}" data-psych-tab="checkin">Daily Readiness Check</button>
        <button class="psych-pill-btn ${activeTab==='analytics'?'active':''}" data-psych-tab="analytics">State Analytics</button>
        <button class="psych-pill-btn ${activeTab==='tilt'?'active':''}" data-psych-tab="tilt">Tilt & Risk Control</button>
        <button class="psych-pill-btn ${activeTab==='reflections'?'active':''}" data-psych-tab="reflections">Mindset Log</button>
      </div>
    </div>

    <div class="page-content mt-16">
      <!-- SECTION 1: DAILY READINESS CHECK-IN -->
      <div class="psych-tab-panel ${activeTab==='checkin'?'active':''}" id="psych-panel-checkin">
        <div class="grid-2-1" style="display:grid;grid-template-columns: 2fr 1fr;gap:20px;">
          
          <div class="card psych-card">
            <div class="card-header justify-between items-center">
              <span class="card-title">Pre-Session Mental Readiness Check-in</span>
              <span class="badge" style="background:var(--surface2);color:var(--purple-l);">${todayStr}</span>
            </div>
            <div class="card-body">
              <form id="psych-checkin-form">
                <div class="psych-form-grid">
                  <div class="form-group">
                    <label>Energy Level (1-10)</label>
                    <div class="range-display-wrap">
                      <input type="range" id="psych-energy" min="1" max="10" value="${todayCheckin?.energy || 7}">
                      <span class="range-val" id="psych-energy-val">${todayCheckin?.energy || 7}</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Focus & Clarity (1-10)</label>
                    <div class="range-display-wrap">
                      <input type="range" id="psych-focus" min="1" max="10" value="${todayCheckin?.focus || 8}">
                      <span class="range-val" id="psych-focus-val">${todayCheckin?.focus || 8}</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Sleep Quality (Hours/10)</label>
                    <div class="range-display-wrap">
                      <input type="range" id="psych-sleep" min="1" max="10" value="${todayCheckin?.sleep || 7}">
                      <span class="range-val" id="psych-sleep-val">${todayCheckin?.sleep || 7}</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Stress Level (1-10, lower is better)</label>
                    <div class="range-display-wrap">
                      <input type="range" id="psych-stress" min="1" max="10" value="${todayCheckin?.stress || 3}">
                      <span class="range-val" id="psych-stress-val">${todayCheckin?.stress || 3}</span>
                    </div>
                  </div>
                </div>

                <div class="form-group mt-16">
                  <label>Current Dominant Emotion / Mood</label>
                  <div class="emotion-grid-select">
                    ${EMOTIONS.map(e => `
                      <button type="button" class="psych-emotion-chip ${(todayCheckin?.emotion || 'Calm')===e.key?'selected':''}" data-emotion="${e.key}">
                        ${e.key}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <div class="form-group mt-16">
                  <label>Primary Focus / Mantra for Today</label>
                  <input type="text" id="psych-mantra" placeholder="e.g., Wait for key levels, stick to 1% risk max, no revenge trading..." value="${todayCheckin?.mantra || ''}">
                </div>

                <div class="form-group mt-16">
                  <label>Pre-Market Mindset Notes</label>
                  <textarea id="psych-notes" rows="3" placeholder="Any personal stresses, market context, or rules to keep front of mind today...">${todayCheckin?.notes || ''}</textarea>
                </div>

                <button type="submit" class="btn btn-primary mt-16" style="width:100%;">
                  Save Daily Readiness Check
                </button>
              </form>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:20px;">
            <div class="card psych-card">
              <div class="card-header"><span class="card-title">Readiness Index</span></div>
              <div class="card-body flex-center" style="flex-direction:column;padding:24px 16px;text-align:center;">
                <div class="psych-score-circle" id="psych-readiness-circle">
                  <span id="psych-readiness-score">--</span>
                  <small>/100</small>
                </div>
                <div id="psych-readiness-status" style="margin-top:12px;font-weight:700;font-size:0.95rem;color:var(--purple-l);">
                  Log check-in to compute status
                </div>
                <p style="font-size:0.75rem;color:var(--text3);margin-top:6px;">Calculated from Energy, Focus, Sleep, & Stress</p>
              </div>
            </div>

            <div class="card psych-card">
              <div class="card-header"><span class="card-title">Golden Trading Rules</span></div>
              <div class="card-body">
                <ul class="psych-rules-checklist">
                  <li><input type="checkbox" id="rule1"> <label for="rule1">I will not risk > 2% per trade</label></li>
                  <li><input type="checkbox" id="rule2"> <label for="rule2">I will wait for high-probability setups</label></li>
                  <li><input type="checkbox" id="rule3"> <label for="rule3">I will respect my pre-defined stop loss</label></li>
                  <li><input type="checkbox" id="rule4"> <label for="rule4">I will stop trading if down 3 consecutive trades</label></li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- SECTION 2: ENHANCED STATE ANALYTICS & PSYCH MATRIX -->
      <div class="psych-tab-panel ${activeTab==='analytics'?'active':''}" id="psych-panel-analytics">
        
        <!-- Top Level Psychological KPIs -->
        <div class="grid-4">
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Discipline Score</span></div>
            <div class="card-body flex-center" style="flex-direction:column;gap:8px;padding-top:16px;">
              <div class="discipline-ring" style="--pct:${discPct}">
                <div class="discipline-inner">
                  <div style="font-family:var(--ff-head);font-size:1.5rem;font-weight:800;color:${disciplineScore>=70?'var(--cyan)':disciplineScore>=40?'var(--amber)':'var(--red)'};">${disciplineScore}</div>
                  <div style="font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;">/ 100</div>
                </div>
              </div>
              <div style="font-size:0.75rem;color:var(--text3);text-align:center;">${totalViolations} violations across ${closed.length} trades</div>
            </div>
          </div>

          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Optimal Mindset Win Rate</span></div>
            <div class="card-body flex-center" style="flex-direction:column;gap:6px;padding-top:16px;">
              ${(() => {
                const highMindsetTrades = closed.filter(t => parseFloat(t.mindsetScore || 0) >= 7);
                const highWins = highMindsetTrades.filter(t => calcPnl(t) > 0).length;
                const highWr = highMindsetTrades.length ? Math.round((highWins / highMindsetTrades.length) * 100) : 0;
                return `
                  <div style="font-family:var(--ff-head);font-size:2.4rem;font-weight:800;color:var(--green);">${highWr}%</div>
                  <div style="font-size:0.75rem;color:var(--text3);">${highMindsetTrades.length} trades with Mindset >= 7</div>
                `;
              })()}
            </div>
          </div>

          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Revenge Trade Count</span></div>
            <div class="card-body flex-center" style="flex-direction:column;gap:6px;padding-top:16px;">
              ${(() => {
                const revengeTrades = closed.filter(t => (t.ruleViolations || []).includes('Took revenge trade') || t.emotion === 'Frustrated');
                const revengeLoss = revengeTrades.reduce((acc, t) => acc + calcPnl(t), 0);
                return `
                  <div style="font-family:var(--ff-head);font-size:2.4rem;font-weight:800;color:${revengeTrades.length>0?'var(--red)':'var(--green)'};">${revengeTrades.length}</div>
                  <div style="font-size:0.75rem;color:${revengeLoss < 0 ? 'var(--red)' : 'var(--text3)'};">Impact: ${fmtCurr(revengeLoss, true)}</div>
                `;
              })()}
            </div>
          </div>

          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Avg Mindset Rating</span></div>
            <div class="card-body flex-center" style="flex-direction:column;gap:6px;padding-top:16px;">
              <div style="font-family:var(--ff-head);font-size:2.4rem;font-weight:800;color:${avgMindset>=7?'var(--green)':avgMindset>=4?'var(--amber)':'var(--red)'};">${avgMindset.toFixed(1)}<span style="font-size:0.9rem;color:var(--text3)">/10</span></div>
              <div style="font-size:0.75rem;color:var(--text3);">${mindsetPts.length} rated trades</div>
            </div>
          </div>
        </div>

        <!-- Emotion Expectancy & Performance Matrix -->
        <div class="card psych-card mt-24">
          <div class="card-header justify-between items-center">
            <span class="card-title">Psychological Performance & Expectancy Matrix</span>
            <span class="badge" style="background:var(--surface2);color:var(--text2);font-size:0.7rem;">Real-time Expected Value by State</span>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Emotional State</th>
                    <th>Trade Count</th>
                    <th>Win Rate</th>
                    <th>Avg Win</th>
                    <th>Avg Loss</th>
                    <th>Expectancy / Trade</th>
                    <th>Total State P&L</th>
                  </tr>
                </thead>
                <tbody>
                  ${EMOTIONS.map(e => {
                    const pts = emotionPnl[e.key];
                    const cnt = pts.length;
                    if (!cnt) return `
                      <tr>
                        <td><strong style="color:${e.color};">${e.key}</strong></td>
                        <td>0</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                      </tr>
                    `;
                    const wins = pts.filter(p => p > 0);
                    const losses = pts.filter(p => p < 0);
                    const wr = (wins.length / cnt);
                    const avgW = wins.length ? wins.reduce((a,b)=>a+b,0)/wins.length : 0;
                    const avgL = losses.length ? Math.abs(losses.reduce((a,b)=>a+b,0)/losses.length) : 0;
                    const expectancy = (wr * avgW) - ((1 - wr) * avgL);
                    const totalStatePnl = pts.reduce((a,b)=>a+b,0);

                    return `
                      <tr>
                        <td><strong style="color:${e.color};">${e.key}</strong></td>
                        <td>${cnt}</td>
                        <td><span class="badge" style="background:rgba(255,255,255,0.05);color:${wr>=0.5?'var(--green)':'var(--red)'};">${(wr*100).toFixed(0)}%</span></td>
                        <td style="color:var(--green);">${fmtCurr(avgW)}</td>
                        <td style="color:var(--red);">${avgL > 0 ? '-' + fmtCurr(avgL) : '$0.00'}</td>
                        <td><strong style="color:${expectancy>=0?'var(--green)':'var(--red)'};">${fmtCurr(expectancy, true)}</strong></td>
                        <td><strong style="color:${totalStatePnl>=0?'var(--green)':'var(--red)'};">${fmtCurr(totalStatePnl, true)}</strong></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="grid-2 mt-24">
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Emotion vs P&L Impact</span></div>
            <div class="card-body"><canvas id="ps-scatter" class="chart chart-lg"></canvas></div>
          </div>
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Pre-Trade Mindset Trend</span></div>
            <div class="card-body"><canvas id="ps-mindset" class="chart chart-lg"></canvas></div>
          </div>
        </div>

        <div class="grid-2 mt-24">
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Rule Violation Frequency</span></div>
            <div class="card-body" style="height:${Math.max(240, RULE_VIOLATIONS.length * 36 + 32)}px;position:relative;">
              <canvas id="ps-violations" class="chart" style="height:${Math.max(220, RULE_VIOLATIONS.length * 36)}px;"></canvas>
            </div>
          </div>
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">State Share & Volume Distribution</span></div>
            <div class="card-body">
              <div class="emotion-summary">
                ${EMOTIONS.map(e => `
                  <div class="emotion-row">
                    <span style="min-width:90px;color:${e.color};font-size:.8rem;font-weight:600;">${e.key}</span>
                    <div class="emotion-bar-track">
                      <div class="emotion-bar-fill" style="width:${(emotionCount[e.key]/maxEmotionCount*100).toFixed(0)}%;background:${e.color};"></div>
                    </div>
                    <span style="min-width:24px;text-align:right;font-size:.75rem;color:var(--text3);">${emotionCount[e.key]}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 3: TILT PROTECTION & RISK CONTROLS -->
      <div class="psych-tab-panel ${activeTab==='tilt'?'active':''}" id="psych-panel-tilt">
        <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Circuit Breakers & Anti-Tilt System</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:16px;">
              <div class="tilt-alert-box">
                <div class="tilt-alert-title">Emergency Breathing Protocol</div>
                <p style="font-size:0.8rem;color:var(--text2);margin-top:4px;">
                  If you lost 2 consecutive trades or feel urge to revenge trade, pause 3 minutes.
                </p>
                <button type="button" class="btn btn-secondary mt-12" id="psych-timer-btn" style="width:100%;">
                  Start 3-Minute Cool Down Timer
                </button>
                <div id="psych-timer-display" class="timer-display hidden">03:00</div>
              </div>

              <div class="psych-tilt-indicator">
                <div style="font-weight:600;font-size:0.85rem;color:var(--text);">Tilt Vulnerability Meter</div>
                <div class="tilt-bar-bg mt-8">
                  <div class="tilt-bar-fill" id="tilt-bar-level" style="width:${Math.min(100, (totalViolations * 20))}%"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text3);margin-top:4px;">
                  <span>Zen / Focused</span>
                  <span>Moderate Risk</span>
                  <span style="color:var(--red);">High Tilt Danger</span>
                </div>
              </div>

              <div class="cognitive-bias-card mt-8">
                <div style="font-weight:700;font-size:0.85rem;color:var(--purple-l);">Cognitive Bias Antidote</div>
                <p style="font-size:0.8rem;color:var(--text2);margin-top:6px;">
                  <strong>Gambler's Fallacy:</strong> Past losses do not increase the probability of your next trade winning. Evaluate every setup independently on its edge.
                </p>
              </div>
            </div>
          </div>

          <div class="card psych-card">
            <div class="card-header"><span class="card-title">Trading Rules & Discipline Standard</span></div>
            <div class="card-body">
              <div class="psych-rule-editor">
                <p style="font-size:0.8rem;color:var(--text3);margin-bottom:12px;">Add personal psychological rules to enforce during every trading session:</p>
                <div id="psych-rules-list">
                  <div class="psych-rule-item">1. Never move stop-loss further away once filled</div>
                  <div class="psych-rule-item">2. Max 3 trades per day regardless of market opportunities</div>
                  <div class="psych-rule-item">3. No trading within 15 minutes of high-impact FOMC/CPI news</div>
                  <div class="psych-rule-item">4. Close positions completely when daily profit target of 3R is reached</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: MINDSET LOG HISTORY -->
      <div class="psych-tab-panel ${activeTab==='reflections'?'active':''}" id="psych-panel-reflections">
        <div class="card psych-card">
          <div class="card-header justify-between items-center">
            <span class="card-title">Psychological Readiness & Mindset Journal Logs</span>
            <button class="btn btn-sm btn-secondary" id="psych-export-btn">Export Mindset History</button>
          </div>
          <div class="card-body">
            ${psychLogs.length === 0 ? `
              <div class="empty-state">
                <div class="empty-title">No Daily Check-ins Logged Yet</div>
                <div class="empty-sub">Use the "Daily Readiness Check" tab to record your daily mental state before market open.</div>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Emotion</th>
                      <th>Energy</th>
                      <th>Focus</th>
                      <th>Sleep</th>
                      <th>Stress</th>
                      <th>Readiness</th>
                      <th>Mantra / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${psychLogs.map(l => {
                      const score = Math.round(((parseInt(l.energy||7)*10 + parseInt(l.focus||8)*10 + parseInt(l.sleep||7)*10 + (11 - parseInt(l.stress||3))*10) / 40) * 10);
                      return `
                        <tr>
                          <td><strong>${l.date}</strong></td>
                          <td><span class="chip">${l.emotion || 'Calm'}</span></td>
                          <td>${l.energy}/10</td>
                          <td>${l.focus}/10</td>
                          <td>${l.sleep}h</td>
                          <td>${l.stress}/10</td>
                          <td><span class="badge" style="background:${score>=70?'var(--green-glow)':'var(--amber-glow)'};color:${score>=70?'var(--green)':'var(--amber)'};">${score}%</span></td>
                          <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${l.mantra || ''} ${l.notes || ''}">
                            <em>${l.mantra || l.notes || '—'}</em>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Event Handlers & Dynamic Binding ──

  // Tab switching
  el.querySelectorAll('.psych-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-psych-tab');
      LS.set('tj_psych_tab', tab);
      el.querySelectorAll('.psych-pill-btn').forEach(b => b.classList.remove('active'));
      el.querySelectorAll('.psych-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = el.querySelector(`#psych-panel-${tab}`);
      if (panel) panel.classList.add('active');

      if (tab === 'analytics') {
        updateCharts();
      }
    });
  });

  // Range slider display synchronization
  ['energy', 'focus', 'sleep', 'stress'].forEach(field => {
    const slider = el.querySelector(`#psych-${field}`);
    const display = el.querySelector(`#psych-${field}-val`);
    if (slider && display) {
      slider.addEventListener('input', () => {
        display.textContent = slider.value;
        updateReadinessScore();
      });
    }
  });

  // Emotion chip selection
  let selectedEmotion = todayCheckin?.emotion || 'Calm';
  el.querySelectorAll('.psych-emotion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      el.querySelectorAll('.psych-emotion-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedEmotion = chip.getAttribute('data-emotion');
    });
  });

  // Calculate Readiness Score Index
  function updateReadinessScore() {
    const energy = parseInt(el.querySelector('#psych-energy')?.value || 7);
    const focus = parseInt(el.querySelector('#psych-focus')?.value || 8);
    const sleep = parseInt(el.querySelector('#psych-sleep')?.value || 7);
    const stress = parseInt(el.querySelector('#psych-stress')?.value || 3);

    // Stress inverted (10 - stress)
    const rawScore = ((energy + focus + sleep + (11 - stress)) / 40) * 100;
    const score = Math.round(rawScore);

    const scoreEl = el.querySelector('#psych-readiness-score');
    const statusEl = el.querySelector('#psych-readiness-status');
    const circleEl = el.querySelector('#psych-readiness-circle');

    if (scoreEl) scoreEl.textContent = score;

    let statusText = 'Optimal Readiness';
    let color = 'var(--green)';
    if (score < 50) {
      statusText = '⚠️ High Risk / Fatigue — Caution';
      color = 'var(--red)';
    } else if (score < 75) {
      statusText = '⚡ Moderate State — Stay Disciplined';
      color = 'var(--amber)';
    }

    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.style.color = color;
    }
    if (circleEl) {
      circleEl.style.borderColor = color;
    }
  }
  updateReadinessScore();

  // Handle Form Submit
  const checkinForm = el.querySelector('#psych-checkin-form');
  if (checkinForm) {
    checkinForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const newEntry = {
        date: todayStr,
        energy: el.querySelector('#psych-energy').value,
        focus: el.querySelector('#psych-focus').value,
        sleep: el.querySelector('#psych-sleep').value,
        stress: el.querySelector('#psych-stress').value,
        emotion: selectedEmotion,
        mantra: el.querySelector('#psych-mantra').value.trim(),
        notes: el.querySelector('#psych-notes').value.trim(),
        timestamp: Date.now()
      };

      const existingIdx = psychLogs.findIndex(l => l.date === todayStr);
      if (existingIdx >= 0) {
        psychLogs[existingIdx] = newEntry;
      } else {
        psychLogs.unshift(newEntry);
      }

      savePsychLogs(psychLogs);
      if (typeof showToast === 'function') showToast('Mental readiness check saved successfully!', 'success');
      renderPsychology(el);
    });
  }

  // Cool down 3 min timer
  const timerBtn = el.querySelector('#psych-timer-btn');
  const timerDisplay = el.querySelector('#psych-timer-display');
  let timerInterval = null;

  if (timerBtn && timerDisplay) {
    timerBtn.addEventListener('click', () => {
      let seconds = 180;
      timerBtn.disabled = true;
      timerDisplay.classList.remove('hidden');

      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${m}:${s}`;

        if (seconds <= 0) {
          clearInterval(timerInterval);
          timerDisplay.textContent = '✅ Session complete! Deep breath.';
          timerBtn.disabled = false;
        }
      }, 1000);
    });
  }

  // Export mindset log
  const exportBtn = el.querySelector('#psych-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(psychLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mindset-log-${todayStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // Initialize Canvas Charts
  requestAnimationFrame(() => {
    const scatter          = el.querySelector('#ps-scatter');
    const mindset          = el.querySelector('#ps-mindset');
    const violationsCanvas = el.querySelector('#ps-violations');
    if (scatter)          TJCharts.scatterChart(scatter, scatterData);
    if (mindset)          TJCharts.lineTrend(mindset, mindsetPts);
    if (violationsCanvas) TJCharts.hBarChart(violationsCanvas, RULE_VIOLATIONS, RULE_VIOLATIONS.map(r => violations[r]));
  });
}

// ══════════════════════════════════════════════════════════════════════
//  JOURNAL
// ══════════════════════════════════════════════════════════════════════
let journalDate = new Date().toISOString().slice(0,10);

function renderJournal(el, options = {}) {
  const hideSaved = !!options.hideSavedEntries;
  const entries = Object.entries(journal).sort((a,b) => b[0].localeCompare(a[0]));

  if (hideSaved) {
    // ── NEW ENTRY PAGE: Full Trading Journal Log Sheet Template ──────────────
    el.innerHTML = `
      <div class="page-content">
        <div class="tj-sheet-card">
          <!-- Top Banner / Header -->
          <div class="tj-sheet-header">
            <div class="tj-brand-banner">
              <div class="tj-candlestick-logo">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="6" y1="2" x2="6" y2="22"/><rect x="4" y="6" width="4" height="10" fill="currentColor" opacity="0.3"/>
                  <line x1="12" y1="2" x2="12" y2="22"/><rect x="10" y="4" width="4" height="12" fill="currentColor"/>
                  <line x1="18" y1="2" x2="18" y2="22"/><rect x="16" y="8" width="4" height="8" fill="currentColor" opacity="0.3"/>
                </svg>
              </div>
              <div>
                <h1 class="tj-sheet-title">TRADING JOURNAL</h1>
                <p class="tj-sheet-tagline">PLAN. EXECUTE. REVIEW. IMPROVE.</p>
              </div>
            </div>
            <div class="tj-meta-box">
              <div class="tj-meta-row"><label>📅 DATE:</label> <input type="date" id="tj-date" value="${journalDate}"></div>
              <div class="tj-meta-row"><label>🔄 TRADE #:</label> <input type="text" id="tj-trade-no" placeholder="#${(trades.length + 1).toString().padStart(3, '0')}"></div>
              <div class="tj-meta-row"><label>📈 MARKET:</label> <input type="text" id="tj-market" placeholder="Crypto / Forex / Stocks"></div>
              <div class="tj-meta-row"><label>🕒 TIME:</label> <input type="time" id="tj-time" value="${new Date().toTimeString().slice(0,5)}"></div>
            </div>
          </div>

          <!-- Row 1: Account Summary Bar -->
          <div class="tj-account-bar">
            <div class="tj-bar-item"><label>👤 ACCOUNT</label><input type="text" id="tj-account" placeholder="Main Account"></div>
            <div class="tj-bar-item"><label>💼 ACCOUNT SIZE ($)</label><input type="number" id="tj-account-size" value="${settings.capital || 10000}"></div>
            <div class="tj-bar-item"><label>🛡️ RISK PER TRADE (%)</label><input type="number" id="tj-risk-pct" value="1.0" step="0.1"></div>
            <div class="tj-bar-item">
              <label>🏆 RESULT (R)</label>
              <div class="tj-radio-group">
                <label><input type="radio" name="tj-result-r" value="Win"> WIN</label>
                <label><input type="radio" name="tj-result-r" value="Loss"> LOSS</label>
                <label><input type="radio" name="tj-result-r" value="BE"> BE</label>
              </div>
            </div>
            <div class="tj-bar-item"><label>📊 NET P/L ($)</label><input type="number" id="tj-net-pnl" placeholder="0.00" step="0.01"></div>
          </div>

          <!-- Row 2: 3 Section Grid (Setup, Trade Details, Outcome) -->
          <div class="tj-three-col-grid">
            <!-- Col 1: Setup Details -->
            <div class="tj-col-box">
              <div class="tj-box-header">1. SETUP DETAILS</div>
              <div class="tj-box-body">
                <div class="tj-field"><label>ASSET / PAIR:</label><input type="text" id="tj-asset" placeholder="BTC/USDT, AAPL, EUR/USD…"></div>
                <div class="tj-field"><label>TIMEFRAME:</label><input type="text" id="tj-timeframe" placeholder="15m, 1h, 4h…"></div>
                <div class="tj-field">
                  <label>DIRECTION:</label>
                  <div class="tj-btn-toggle-group">
                    <button type="button" class="tj-dir-btn active" data-dir="Long">LONG</button>
                    <button type="button" class="tj-dir-btn" data-dir="Short">SHORT</button>
                  </div>
                </div>
                <div class="tj-field"><label>SETUP / STRATEGY:</label><input type="text" id="tj-setup" placeholder="Breakout, FVG, Order Block…"></div>
                <div class="tj-field"><label>ENTRY REASON:</label><textarea id="tj-entry-reason" rows="4" placeholder="Why did you enter this trade? Key triggers, confluence…"></textarea></div>
              </div>
            </div>

            <!-- Col 2: Trade Details -->
            <div class="tj-col-box">
              <div class="tj-box-header">2. TRADE DETAILS</div>
              <div class="tj-box-body">
                <div class="tj-field"><label>ENTRY PRICE:</label><input type="number" id="tj-entry-price" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>ENTRY TIME:</label><input type="time" id="tj-entry-time"></div>
                <div class="tj-field"><label>STOP LOSS:</label><input type="number" id="tj-stop-loss" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>TAKE PROFIT (1):</label><input type="number" id="tj-tp1" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>TAKE PROFIT (2):</label><input type="number" id="tj-tp2" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>POSITION SIZE:</label><input type="number" id="tj-qty" placeholder="1.0" step="any"></div>
                <div class="tj-field"><label>RISK (AMOUNT $):</label><input type="number" id="tj-risk-amt" placeholder="100.00" step="any"></div>
                <div class="tj-field"><label>RISK (R MULTIPLE):</label><input type="text" id="tj-risk-r" placeholder="1R"></div>
              </div>
            </div>

            <!-- Col 3: Outcome -->
            <div class="tj-col-box">
              <div class="tj-box-header">3. OUTCOME</div>
              <div class="tj-box-body">
                <div class="tj-field"><label>EXIT PRICE:</label><input type="number" id="tj-exit-price" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>EXIT TIME:</label><input type="time" id="tj-exit-time"></div>
                <div class="tj-field">
                  <label>RESULT:</label>
                  <div class="tj-radio-group">
                    <label><input type="radio" name="tj-outcome-res" value="Win"> WIN</label>
                    <label><input type="radio" name="tj-outcome-res" value="Loss"> LOSS</label>
                    <label><input type="radio" name="tj-outcome-res" value="BE"> BE</label>
                  </div>
                </div>
                <div class="tj-field"><label>R-MULTIPLE:</label><input type="text" id="tj-r-multiple" placeholder="2.5R"></div>
                <div class="tj-field"><label>P/L (AMOUNT $):</label><input type="number" id="tj-pnl-amt" placeholder="0.00" step="any"></div>
                <div class="tj-field"><label>P/L (%):</label><input type="number" id="tj-pnl-pct" placeholder="0.00%"></div>
                <div class="tj-field">
                  <label>EMOTIONS DURING TRADE:</label>
                  <div class="tj-emotions-picker">
                    <button type="button" class="tj-emo-btn" data-emo="Calm">😌 Calm</button>
                    <button type="button" class="tj-emo-btn" data-emo="Confident">☺️ Confident</button>
                    <button type="button" class="tj-emo-btn" data-emo="Excited">😀 Excited</button>
                    <button type="button" class="tj-emo-btn" data-emo="Anxious">😟 Anxious</button>
                    <button type="button" class="tj-emo-btn" data-emo="Fearful">😨 Fearful</button>
                    <button type="button" class="tj-emo-btn" data-emo="Frustrated">😣 Frustrated</button>
                  </div>
                  <input type="text" id="tj-emo-other" placeholder="Other emotion…" style="margin-top:6px;">
                </div>
              </div>
            </div>
          </div>

          <!-- Row 3: 4. Chart / Screenshot -->
          <div class="tj-full-box mt-16">
            <div class="tj-box-header">4. CHART / SCREENSHOT</div>
            <div class="tj-chart-container">
              <div class="tj-upload-dropzone" id="tj-chart-dropzone">
                <input type="file" id="tj-chart-file-input" accept="image/*" style="display:none;">
                <div id="tj-chart-preview-wrap" style="display:none;width:100%;height:100%;position:relative;">
                  <img id="tj-chart-preview-img" src="" alt="Chart Screenshot" style="max-height:360px;max-width:100%;object-fit:contain;border-radius:8px;">
                  <button type="button" class="btn btn-danger btn-sm" id="tj-remove-chart-btn" style="position:absolute;top:10px;right:10px;">Remove Image</button>
                </div>
                <div id="tj-chart-prompt" style="text-align:center;padding:30px 20px;">
                  <div style="font-size:2rem;margin-bottom:8px;">📷</div>
                  <div style="font-weight:600;font-size:1rem;color:var(--text);">Drag & Drop Chart Screenshot or Click to Upload</div>
                  <div style="font-size:0.8rem;color:var(--text3);margin-top:4px;">Supports PNG, JPG, WEBP</div>
                </div>
              </div>
              <div class="tj-key-levels-legend">
                <div class="tj-legend-title">MARK KEY LEVELS</div>
                <div class="tj-legend-item"><span class="tj-color-dot" style="background:#10b981;"></span> Entry</div>
                <div class="tj-legend-item"><span class="tj-color-dot" style="background:#ef4444;"></span> Stop Loss</div>
                <div class="tj-legend-item"><span class="tj-color-dot" style="background:#06b6d4;"></span> Take Profit 1</div>
                <div class="tj-legend-item"><span class="tj-color-dot" style="background:#8b5cf6;"></span> Take Profit 2</div>
                <div class="tj-legend-item"><span class="tj-color-dot" style="background:#f59e0b;"></span> Other</div>
              </div>
            </div>
          </div>

          <!-- Row 4: 5. Trade Review -->
          <div class="tj-full-box mt-16">
            <div class="tj-box-header">5. TRADE REVIEW</div>
            <div class="tj-three-col-review">
              <div class="tj-review-col">
                <div class="tj-review-title">WHAT WENT WELL?</div>
                <textarea id="tj-review-well" rows="5" placeholder="• Executed plan well&#10;• Good patience on entry…"></textarea>
              </div>
              <div class="tj-review-col">
                <div class="tj-review-title">WHAT DIDN'T GO WELL?</div>
                <textarea id="tj-review-bad" rows="5" placeholder="• Moved stop loss&#10;• Entered slightly late…"></textarea>
              </div>
              <div class="tj-review-col">
                <div class="tj-review-title">LESSONS LEARNED</div>
                <textarea id="tj-review-lessons" rows="5" placeholder="• Always wait for candle close&#10;• Stick to 1% risk rule…"></textarea>
              </div>
            </div>
          </div>

          <!-- Sheet Actions Bar -->
          <div class="tj-sheet-actions mt-20" style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-style:italic;font-size:0.85rem;color:var(--text3);">
              “The goal is not to be right every time, <strong style="color:var(--green)">but to make money over time.</strong>” 🎯
            </div>
            <div style="display:flex;gap:12px;">
              <button type="button" class="btn btn-ghost" id="tj-clear-btn">Clear Sheet</button>
              <button type="button" class="btn btn-primary btn-lg" id="tj-sheet-save-btn">💾 Save Entry</button>
            </div>
          </div>
        </div>
      </div>`;

    // Bind Direction Buttons
    let activeDirection = 'Long';
    el.querySelectorAll('.tj-dir-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.tj-dir-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDirection = btn.dataset.dir;
      };
    });

    // Bind Emotion Buttons
    let selectedEmotion = 'Calm';
    el.querySelectorAll('.tj-emo-btn').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.tj-emo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedEmotion = btn.dataset.emo;
      };
    });

    // Bind Chart Image Upload
    const dropzone = el.querySelector('#tj-chart-dropzone');
    const fileInput = el.querySelector('#tj-chart-file-input');
    const previewWrap = el.querySelector('#tj-chart-preview-wrap');
    const previewImg = el.querySelector('#tj-chart-preview-img');
    const promptWrap = el.querySelector('#tj-chart-prompt');
    const removeBtn = el.querySelector('#tj-remove-chart-btn');
    let chartImageData = null;

    if (dropzone && fileInput) {
      dropzone.onclick = (e) => {
        if (e.target !== removeBtn && !removeBtn?.contains(e.target)) fileInput.click();
      };
      fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            chartImageData = evt.target.result;
            previewImg.src = chartImageData;
            previewWrap.style.display = 'block';
            promptWrap.style.display = 'none';
          };
          reader.readAsDataURL(file);
        }
      };
    }
    if (removeBtn) {
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        chartImageData = null;
        previewImg.src = '';
        previewWrap.style.display = 'none';
        promptWrap.style.display = 'block';
        if (fileInput) fileInput.value = '';
      };
    }

    // Bind Auto P&L calculation when Entry / Exit / Position size change
    const calcPnlSheet = () => {
      const entryP = parseFloat(el.querySelector('#tj-entry-price')?.value);
      const exitP = parseFloat(el.querySelector('#tj-exit-price')?.value);
      const qtyP = parseFloat(el.querySelector('#tj-qty')?.value) || 1;
      const slP = parseFloat(el.querySelector('#tj-stop-loss')?.value);

      if (!isNaN(entryP) && !isNaN(exitP)) {
        const dirMult = activeDirection === 'Long' ? 1 : -1;
        const pnl = (exitP - entryP) * dirMult * qtyP;
        const netPnlEl = el.querySelector('#tj-net-pnl');
        const pnlAmtEl = el.querySelector('#tj-pnl-amt');
        if (netPnlEl) netPnlEl.value = pnl.toFixed(2);
        if (pnlAmtEl) pnlAmtEl.value = pnl.toFixed(2);

        if (!isNaN(slP) && Math.abs(entryP - slP) > 0) {
          const riskAmt = Math.abs(entryP - slP) * qtyP;
          const rMult = pnl / riskAmt;
          const riskAmtEl = el.querySelector('#tj-risk-amt');
          const rMultEl = el.querySelector('#tj-r-multiple');
          if (riskAmtEl && !riskAmtEl.value) riskAmtEl.value = riskAmt.toFixed(2);
          if (rMultEl) rMultEl.value = rMult.toFixed(2) + 'R';
        }
      }
    };

    ['#tj-entry-price', '#tj-exit-price', '#tj-qty', '#tj-stop-loss'].forEach(id => {
      el.querySelector(id)?.addEventListener('input', calcPnlSheet);
    });

    // Clear Sheet Button
    const clearBtn = el.querySelector('#tj-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => renderPage('new-entry');
    }

    // Save Entry Sheet Button
    const saveSheetBtn = el.querySelector('#tj-sheet-save-btn');
    if (saveSheetBtn) {
      saveSheetBtn.onclick = () => {
        const entryDate = el.querySelector('#tj-date')?.value || journalDate;
        const asset = (el.querySelector('#tj-asset')?.value || '').trim();
        const entryPrice = parseFloat(el.querySelector('#tj-entry-price')?.value);
        const exitPrice = parseFloat(el.querySelector('#tj-exit-price')?.value);
        const quantity = parseFloat(el.querySelector('#tj-qty')?.value) || 1;
        const setupVal = (el.querySelector('#tj-setup')?.value || '').trim();
        const marketVal = (el.querySelector('#tj-market')?.value || '').trim();
        const reasonVal = (el.querySelector('#tj-entry-reason')?.value || '').trim();
        const wellVal = (el.querySelector('#tj-review-well')?.value || '').trim();
        const badVal = (el.querySelector('#tj-review-bad')?.value || '').trim();
        const lessonsVal = (el.querySelector('#tj-review-lessons')?.value || '').trim();

        // Create trade object if asset and entryPrice provided
        if (asset && !isNaN(entryPrice)) {
          const outcomeRadio = el.querySelector('input[name="tj-outcome-res"]:checked') || el.querySelector('input[name="tj-result-r"]:checked');
          const outcomeVal = outcomeRadio ? outcomeRadio.value : (!isNaN(exitPrice) ? (exitPrice > entryPrice ? 'Win' : 'Loss') : 'Win');
          const newTrade = {
            id: uid(),
            date: entryDate,
            ticker: asset.toUpperCase(),
            assetType: marketVal || 'Stock',
            direction: activeDirection,
            entryPrice,
            exitPrice: !isNaN(exitPrice) ? exitPrice : null,
            quantity,
            fees: 0,
            stopLoss: parseFloat(el.querySelector('#tj-stop-loss')?.value) || null,
            takeProfit: parseFloat(el.querySelector('#tj-tp1')?.value) || null,
            emotion: selectedEmotion,
            setup: setupVal,
            outcome: outcomeVal,
            chartImg: chartImageData || null,
          };
          trades.push(newTrade);
          saveTrades();
        }

        // Save Reflection Journal Note
        const compiledNote = `
### 📈 Trading Journal Entry (${entryDate}) ${asset ? `— ${asset.toUpperCase()} (${activeDirection})` : ''}

**Account / Market:** ${el.querySelector('#tj-account')?.value || 'Main'} | ${marketVal || 'General'}
**Setup & Timeframe:** ${setupVal || 'N/A'} (${el.querySelector('#tj-timeframe')?.value || 'N/A'})
**Entry Triggers & Reason:**
${reasonVal || 'No entry notes specified.'}

---
#### 📝 Trade Review:
- **What Went Well:** ${wellVal || 'N/A'}
- **What Didn't Go Well:** ${badVal || 'N/A'}
- **Lessons Learned:** ${lessonsVal || 'N/A'}
        `.trim();

        // Save Sheet Object to SQL & local storage
        const sheetObj = {
          id: uid(),
          date: entryDate,
          tradeNo: el.querySelector('#tj-trade-no')?.value || '',
          market: marketVal,
          time: el.querySelector('#tj-time')?.value || '',
          account: el.querySelector('#tj-account')?.value || '',
          accountSize: parseFloat(el.querySelector('#tj-account-size')?.value) || 0,
          riskPct: parseFloat(el.querySelector('#tj-risk-pct')?.value) || 0,
          resultR: el.querySelector('input[name="tj-result-r"]:checked')?.value || '',
          netPnl: parseFloat(el.querySelector('#tj-net-pnl')?.value) || 0,
          asset: asset,
          timeframe: el.querySelector('#tj-timeframe')?.value || '',
          direction: activeDirection,
          setup: setupVal,
          entryReason: reasonVal,
          entryPrice: !isNaN(entryPrice) ? entryPrice : 0,
          entryTime: el.querySelector('#tj-entry-time')?.value || '',
          stopLoss: parseFloat(el.querySelector('#tj-stop-loss')?.value) || null,
          tp1: parseFloat(el.querySelector('#tj-tp1')?.value) || null,
          tp2: parseFloat(el.querySelector('#tj-tp2')?.value) || null,
          positionSize: quantity,
          riskAmt: parseFloat(el.querySelector('#tj-risk-amt')?.value) || null,
          riskR: el.querySelector('#tj-risk-r')?.value || '',
          exitPrice: !isNaN(exitPrice) ? exitPrice : null,
          exitTime: el.querySelector('#tj-exit-time')?.value || '',
          result: el.querySelector('input[name="tj-outcome-res"]:checked')?.value || '',
          rMultiple: el.querySelector('#tj-r-multiple')?.value || '',
          pnlAmt: parseFloat(el.querySelector('#tj-pnl-amt')?.value) || 0,
          pnlPct: el.querySelector('#tj-pnl-pct')?.value || '',
          emotion: selectedEmotion,
          emotionOther: el.querySelector('#tj-emo-other')?.value || '',
          chartImg: chartImageData || null,
          reviewWell: wellVal,
          reviewBad: badVal,
          reviewLessons: lessonsVal,
          createdAt: new Date().toISOString()
        };
        sheets.push(sheetObj);
        saveSheets();

        journal[entryDate] = compiledNote;
        saveJournal();
        toast('Trading Journal Sheet Saved Successfully ✓', 'success');
        navigate('journal');
      };
    }
  } else {
    // ── SAVED ENTRIES PAGE (Premium Detail Viewer) ─────────
    const journalDates = Object.keys(journal);
    const sheetDates = sheets.map(s => s.date).filter(Boolean);
    const allDatesSet = new Set([...journalDates, ...sheetDates]);
    const sortedDates = Array.from(allDatesSet).sort((a,b) => b.localeCompare(a));

    if (!journalDate && sortedDates.length > 0) {
      journalDate = sortedDates[0];
    }

    const currentNote = journal[journalDate] || '';
    const currentSheetsForDate = sheets.filter(s => s.date === journalDate);

    const renderStatChip = (label, value, color = '') => `
      <div style="display:flex;flex-direction:column;gap:2px;padding:10px 14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);min-width:90px;">
        <span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);">${label}</span>
        <span style="font-size:0.9rem;font-weight:700;color:${color || 'var(--text)'};">${value || '—'}</span>
      </div>`;

    const renderSheet = (s) => {
      const pnl = s.netPnl || 0;
      const isPnlPos = pnl >= 0;
      const resultColor = s.result === 'Win' ? 'var(--green)' : s.result === 'Loss' ? 'var(--red)' : 'var(--text2)';
      const dirColor = (s.direction||'Long') === 'Long' ? '#22d3ee' : '#f87171';
      return `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.18);">
          <!-- Sheet Hero Header -->
          <div style="background:linear-gradient(135deg,rgba(109,40,217,0.18) 0%,rgba(6,182,212,0.1) 100%);border-bottom:1px solid var(--border);padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                <span style="font-size:1.35rem;">📈</span>
                <h2 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0;">${s.asset ? s.asset.toUpperCase() : 'Trading Sheet'}</h2>
                <span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${dirColor}22;color:${dirColor};border:1px solid ${dirColor}44;">${s.direction || 'Long'}</span>
                ${s.result ? `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${resultColor}22;color:${resultColor};border:1px solid ${resultColor}44;">${s.result}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:16px;font-size:0.8rem;color:var(--text3);">
                <span>📅 ${new Date(s.date + 'T12:00').toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</span>
                ${s.time ? `<span>🕐 ${s.time}</span>` : ''}
                ${s.market ? `<span>🌐 ${s.market}</span>` : ''}
                ${s.account ? `<span>🏦 ${s.account}</span>` : ''}
                ${s.timeframe ? `<span>⏱ ${s.timeframe}</span>` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);margin-bottom:2px;">NET P/L</div>
              <div style="font-size:2rem;font-weight:900;color:${isPnlPos ? 'var(--green)' : 'var(--red)'};">${isPnlPos ? '+' : ''}${fmtCurr(pnl, true)}</div>
              ${s.rMultiple ? `<div style="font-size:0.85rem;font-weight:600;color:var(--text2);">${s.rMultiple}</div>` : ''}
            </div>
          </div>

          <!-- Stats Row -->
          <div style="padding:16px 24px;display:flex;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--border);">
            ${renderStatChip('Entry Price', s.entryPrice ? currSym() + s.entryPrice : null)}
            ${renderStatChip('Exit Price', s.exitPrice ? currSym() + s.exitPrice : null)}
            ${renderStatChip('Stop Loss', s.stopLoss ? currSym() + s.stopLoss : null, 'var(--red)')}
            ${renderStatChip('Take Profit 1', s.tp1 ? currSym() + s.tp1 : null, 'var(--green)')}
            ${renderStatChip('Take Profit 2', s.tp2 ? currSym() + s.tp2 : null, 'var(--green)')}
            ${renderStatChip('Position Size', s.positionSize)}
            ${renderStatChip('Risk $', s.riskAmt ? currSym() + s.riskAmt : null, 'var(--red)')}
            ${renderStatChip('P/L %', s.pnlPct ? s.pnlPct + '%' : null, isPnlPos ? 'var(--green)' : 'var(--red)')}
          </div>

          <!-- Setup & Emotion Row -->
          <div style="padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:6px;">Setup / Strategy</div>
              <div style="font-size:0.95rem;font-weight:600;color:var(--text);">${s.setup || '—'}</div>
              ${s.entryReason ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--text2);line-height:1.5;">${s.entryReason}</div>` : ''}
            </div>
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:6px;">Emotional State</div>
              <div style="font-size:1.1rem;font-weight:600;color:var(--text);">${s.emotion || 'Calm 😌'}</div>
              ${s.tradeNo ? `<div style="margin-top:6px;font-size:0.78rem;color:var(--text3);">Trade #${s.tradeNo}</div>` : ''}
            </div>
          </div>

          ${s.chartImg ? `
          <!-- Chart Screenshot -->
          <div style="padding:16px 24px;border-bottom:1px solid var(--border);">
            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:10px;">Chart Screenshot</div>
            <img src="${s.chartImg}" alt="Trade Chart" style="width:100%;border-radius:10px;border:1px solid var(--border);max-height:340px;object-fit:contain;background:var(--surface2);">
          </div>
          ` : ''}

          ${(s.reviewWell || s.reviewBad || s.reviewLessons) ? `
          <!-- Trade Review -->
          <div style="padding:16px 24px;">
            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:12px;">Trade Review</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
              <div style="padding:14px;background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:10px;border-left:3px solid var(--green);">
                <div style="font-size:0.72rem;font-weight:700;color:var(--green);margin-bottom:6px;display:flex;align-items:center;gap:4px;">✅ What Went Well</div>
                <div style="font-size:0.85rem;color:var(--text);line-height:1.5;">${s.reviewWell || '—'}</div>
              </div>
              <div style="padding:14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:10px;border-left:3px solid var(--red);">
                <div style="font-size:0.72rem;font-weight:700;color:var(--red);margin-bottom:6px;display:flex;align-items:center;gap:4px;">❌ What Didn't Go Well</div>
                <div style="font-size:0.85rem;color:var(--text);line-height:1.5;">${s.reviewBad || '—'}</div>
              </div>
              <div style="padding:14px;background:rgba(6,182,212,0.07);border:1px solid rgba(6,182,212,0.2);border-radius:10px;border-left:3px solid var(--cyan);">
                <div style="font-size:0.72rem;font-weight:700;color:var(--cyan);margin-bottom:6px;display:flex;align-items:center;gap:4px;">💡 Lessons Learned</div>
                <div style="font-size:0.85rem;color:var(--text);line-height:1.5;">${s.reviewLessons || '—'}</div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>`;
    };

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Saved Entries</h1>
          <p class="page-subtitle">${sortedDates.length} trading log${sortedDates.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button class="btn btn-primary" id="journal-new-entry-btn" style="display:flex;align-items:center;gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Sheet Entry
        </button>
      </div>
      <div class="page-content">
        <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start;">

          <!-- ── Sidebar ── -->
          <div style="position:sticky;top:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);">Journal Logs · ${sortedDates.length}</span>
              <button class="btn btn-ghost btn-sm" id="journal-today-btn">Today</button>
            </div>
            <div id="journal-list" style="display:flex;flex-direction:column;gap:6px;max-height:80vh;overflow-y:auto;padding-right:2px;">
              ${sortedDates.length ? sortedDates.map(date => {
                const isActive = date === journalDate;
                const dateSheets = sheets.filter(s => s.date === date);
                const mainSheet = dateSheets[0];
                const hasNote = !!journal[date];
                const pnl = mainSheet?.netPnl;
                const isPnlPos = (pnl || 0) >= 0;
                const d = new Date(date + 'T12:00');
                return `<div class="sj-entry-card${isActive ? ' sj-active' : ''}" data-date="${date}" onclick="selectJournalDate('${date}')" style="padding:12px 14px;border-radius:12px;background:${isActive ? 'var(--purple-glow)' : 'var(--card)'};border:1px solid ${isActive ? 'var(--purple-l)' : 'var(--border)'};cursor:pointer;transition:all 0.15s ease;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                    <div>
                      <div style="font-weight:800;font-size:0.92rem;color:${isActive ? 'var(--purple-l)' : 'var(--text)'};">${d.toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
                      <div style="font-size:0.72rem;color:var(--text3);">${d.toLocaleDateString('en',{weekday:'long',year:'numeric'})}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
                      ${mainSheet ? `<span style="padding:2px 7px;border-radius:8px;font-size:0.65rem;font-weight:700;background:rgba(109,40,217,0.2);color:var(--purple-l);">SHEET</span>` : ''}
                      ${hasNote ? `<span style="padding:2px 7px;border-radius:8px;font-size:0.65rem;font-weight:700;background:rgba(6,182,212,0.15);color:var(--cyan);">NOTE</span>` : ''}
                    </div>
                  </div>
                  ${mainSheet ? `
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                      <div style="font-size:0.8rem;font-weight:700;color:var(--text2);">${mainSheet.asset ? mainSheet.asset.toUpperCase() : '—'} <span style="font-size:0.7rem;font-weight:600;color:${(mainSheet.direction||'Long')==='Long'?'#22d3ee':'#f87171'};">${mainSheet.direction||'Long'}</span></div>
                      ${pnl !== null && pnl !== undefined ? `<div style="font-size:0.85rem;font-weight:800;color:${isPnlPos?'var(--green)':'var(--red)'};">${isPnlPos?'+':''}${fmtCurr(pnl,true)}</div>` : ''}
                    </div>
                    ${mainSheet.setup ? `<div style="font-size:0.72rem;color:var(--text3);margin-top:2px;">${mainSheet.setup}</div>` : ''}
                  ` : (hasNote ? `<div style="font-size:0.78rem;color:var(--text3);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${journal[date].replace(/^[#*\s-]+/gm,'').slice(0,80)}</div>` : '')}
                </div>`;
              }).join('') : `
                <div style="text-align:center;padding:32px 16px;color:var(--text3);">
                  <div style="font-size:2.5rem;margin-bottom:10px;">📒</div>
                  <div style="font-weight:700;color:var(--text);font-size:0.95rem;margin-bottom:6px;">No entries yet</div>
                  <div style="font-size:0.8rem;margin-bottom:16px;">Start logging your trades</div>
                  <button class="btn btn-primary btn-sm" onclick="navigate('new-entry')">Create First Entry</button>
                </div>`}
            </div>
          </div>

          <!-- ── Main Detail Panel ── -->
          <div style="display:flex;flex-direction:column;gap:16px;min-width:0;">
            ${sortedDates.length === 0 ? `
              <div style="text-align:center;padding:80px 24px;background:var(--card);border:1px solid var(--border);border-radius:16px;">
                <div style="font-size:3rem;margin-bottom:12px;">📈</div>
                <h2 style="margin:0 0 8px;color:var(--text);">Your Journal is Empty</h2>
                <p style="color:var(--text3);margin-bottom:20px;">Fill in the trading log sheet to track your performance</p>
                <button class="btn btn-primary" onclick="navigate('new-entry')">＋ Create New Entry</button>
              </div>
            ` : journalDate ? `
              ${currentSheetsForDate.map(s => renderSheet(s)).join('')}

              <!-- Daily Notes Card -->
              <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--surface2);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.1rem;">📝</span>
                    <input type="date" id="journal-date-input" value="${journalDate}" style="background:transparent;border:none;outline:none;color:var(--text);font-family:var(--ff-head);font-size:1rem;font-weight:700;cursor:pointer;">
                    <span style="font-size:0.75rem;color:var(--text3);">Daily Reflection</span>
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary btn-sm" id="journal-save-btn" style="display:flex;align-items:center;gap:6px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Save
                    </button>
                    <button class="btn btn-danger btn-sm" id="journal-del-btn" ${!journal[journalDate]?'disabled':''}>Delete</button>
                  </div>
                </div>
                <div style="padding:0;">
                  <textarea id="journal-textarea" placeholder="Write your daily trading notes &amp; reflections here…&#10;&#10;• What was the market doing today?&#10;• How did you feel during trades?&#10;• Key lessons and observations…" style="width:100%;min-height:260px;font-family:var(--ff-body);line-height:1.7;font-size:0.9rem;padding:18px 20px;background:transparent;color:var(--text);border:none;outline:none;resize:vertical;box-sizing:border-box;">${currentNote}</textarea>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>`;

    const newEntryBtn = el.querySelector('#journal-new-entry-btn');
    if (newEntryBtn) newEntryBtn.onclick = () => navigate('new-entry');

    const todayBtn = el.querySelector('#journal-today-btn');
    if (todayBtn) {
      todayBtn.onclick = () => {
        journalDate = new Date().toISOString().slice(0,10);
        renderPage('journal');
      };
    }

    const dateInput = el.querySelector('#journal-date-input');
    if (dateInput) {
      dateInput.addEventListener('change', e => {
        journalDate = e.target.value;
        renderPage(currentPage);
      });
    }

    const saveBtn = el.querySelector('#journal-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const text = el.querySelector('#journal-textarea').value.trim();
        if (text) { journal[journalDate] = text; } else { delete journal[journalDate]; }
        saveJournal();
        toast('Journal entry saved ✓', 'success');
        renderPage('journal');
      };
    }

    const delBtn = el.querySelector('#journal-del-btn');
    if (delBtn) {
      delBtn.onclick = () => {
        if (!journal[journalDate]) return;
        delete journal[journalDate];
        saveJournal();
        toast('Entry deleted', 'info');
        renderPage('journal');
      };
    }
  }
}

function selectJournalDate(date) {
  journalDate = date;
  renderPage('journal');
}


// ══════════════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════════════
function renderSettings(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure your trading journal</p>
      </div>
    </div>
    <div class="page-content">
      <div class="settings-section">
        <div class="settings-title">Account</div>
        <div class="card card-body">
          <div class="form-row">
            <div class="form-group">
              <label for="s-capital">Starting Capital</label>
              <input type="number" id="s-capital" value="${settings.capital}" min="0" step="100">
            </div>
            <div class="form-group">
              <label for="s-currency">Currency</label>
              <select id="s-currency">
                ${Object.keys(CURRENCY_SYMBOLS).map(c => `<option value="${c}" ${c===settings.currency?'selected':''}>${c} (${CURRENCY_SYMBOLS[c]})</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="mt-16">
            <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">Statistics</div>
        <div class="card card-body">
          <div class="grid-3">
            <div><div class="stat-label">Total Trades</div><div class="stat-value" style="font-size:1.4rem;">${trades.length}</div></div>
            <div><div class="stat-label">Journal Entries</div><div class="stat-value" style="font-size:1.4rem;">${Object.keys(journal).length}</div></div>
            <div><div class="stat-label">Data Size</div><div class="stat-value" style="font-size:1.4rem;">${(JSON.stringify({trades,journal}).length/1024).toFixed(1)}kb</div></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">Data Management</div>
        <div class="card card-body">
          <p style="font-size:.875rem;color:var(--text3);margin-bottom:16px;">Export your data as JSON or clear everything. This cannot be undone.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-ghost" id="export-btn">Export JSON</button>
            <button class="btn btn-danger" id="clear-btn">Clear All Data</button>
          </div>
        </div>
      </div>
    </div>`;

  el.querySelector('#save-settings-btn').onclick = () => {
    settings.capital  = parseFloat(el.querySelector('#s-capital').value) || 0;
    settings.currency = el.querySelector('#s-currency').value;
    saveSettings();
    updateCapitalDisplay();
    toast('Settings saved ✓', 'success');
  };

  el.querySelector('#export-btn').onclick = exportData;

  el.querySelector('#clear-btn').onclick = () => {
    if (confirm('Are you sure? This will delete ALL trades and journal entries.')) {
      trades  = [];
      journal = {};
      saveTrades(); saveJournal();
      toast('All data cleared', 'info');
      renderPage('settings');
    }
  };
}

function exportData() {
  const data = { trades, journal, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'trading-journal-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════════════════
//  TRADE MODAL
// ══════════════════════════════════════════════════════════════════════
let editingTradeId = null;

function openTradeModal(id) {
  editingTradeId = id || null;
  const trade    = id ? trades.find(t => t.id === id) : null;
  const modal    = document.getElementById('trade-modal');

  const selectedEmotion = trade?.emotion || '';
  const selectedViolations = trade?.ruleViolations || [];

  modal.querySelector('.modal-title').textContent = trade ? 'Edit Trade' : 'Log New Trade';
  modal.querySelector('#modal-body-content').innerHTML = buildTradeForm(trade);

  // Restore emotion selection
  if (selectedEmotion) {
    const btn = modal.querySelector(`.emotion-btn[data-emotion="${selectedEmotion}"]`);
    if (btn) btn.classList.add('selected');
  }

  // Restore violations
  selectedViolations.forEach(v => {
    const cb = modal.querySelector(`input[data-violation="${v}"]`);
    if (cb) cb.checked = true;
  });

  // Mindset slider
  const slider = modal.querySelector('#trade-mindset');
  const valEl  = modal.querySelector('#mindset-display');
  if (slider) {
    slider.addEventListener('input', () => { valEl.textContent = slider.value; });
  }

  // Emotion buttons
  modal.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  modal.showModal();
}

function closeTradeModal() {
  document.getElementById('trade-modal').close();
}

function buildTradeForm(trade) {
  const t = trade || {};
  return `
    <div class="form-section">
      <div class="form-section-title">Trade Details</div>
      <div class="form-row">
        <div class="form-group">
          <label for="trade-ticker">Ticker / Symbol *</label>
          <input id="trade-ticker" type="text" placeholder="AAPL" value="${t.ticker||''}" style="text-transform:uppercase;" required>
        </div>
        <div class="form-group">
          <label for="trade-date">Date *</label>
          <input id="trade-date" type="date" value="${t.date || new Date().toISOString().slice(0,10)}" required>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label for="trade-asset">Asset Type</label>
          <select id="trade-asset">
            ${['Stock','Crypto','Options','Forex'].map(a=>`<option value="${a}" ${t.assetType===a?'selected':''}>${a}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="trade-direction">Direction *</label>
          <select id="trade-direction">
            <option value="Long" ${t.direction==='Long'?'selected':''}>Long ↑</option>
            <option value="Short" ${t.direction==='Short'?'selected':''}>Short ↓</option>
          </select>
        </div>
        <div class="form-group">
          <label for="trade-setup">Setup Tag</label>
          <input id="trade-setup" type="text" placeholder="Breakout, VWAP…" value="${t.setup||''}">
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Prices & Size</div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label for="trade-entry">Entry Price *</label>
          <input id="trade-entry" type="number" step="0.0001" placeholder="0.00" value="${t.entryPrice||''}" required>
        </div>
        <div class="form-group">
          <label for="trade-exit">Exit Price</label>
          <input id="trade-exit" type="number" step="0.0001" placeholder="0.00" value="${t.exitPrice||''}">
        </div>
        <div class="form-group">
          <label for="trade-qty">Quantity *</label>
          <input id="trade-qty" type="number" step="0.0001" min="0" placeholder="100" value="${t.quantity||''}" required>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label for="trade-sl">Stop Loss</label>
          <input id="trade-sl" type="number" step="0.0001" placeholder="0.00" value="${t.stopLoss||''}">
        </div>
        <div class="form-group">
          <label for="trade-tp">Take Profit</label>
          <input id="trade-tp" type="number" step="0.0001" placeholder="0.00" value="${t.takeProfit||''}">
        </div>
        <div class="form-group">
          <label for="trade-fees">Fees / Commission</label>
          <input id="trade-fees" type="number" step="0.01" min="0" placeholder="0.00" value="${t.fees||''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="trade-outcome">Outcome</label>
          <select id="trade-outcome">
            <option value="">— Select —</option>
            <option value="Win" ${t.outcome==='Win'?'selected':''}>Win</option>
            <option value="Loss" ${t.outcome==='Loss'?'selected':''}>Loss</option>
            <option value="Scratch" ${t.outcome==='Scratch'?'selected':''}>Scratch</option>
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">🧠 Psychology</div>

      <div class="form-group" style="margin-bottom:16px;">
        <label>Emotion at Entry</label>
        <div class="emotion-grid">
          ${EMOTIONS.map(e => `
            <button type="button" class="emotion-btn" data-emotion="${e.key}" style="--em-color:${e.color};color:${e.color};">
              <span class="e-icon">${e.icon}</span>${e.key}
            </button>`).join('')}
        </div>
      </div>

      <div class="form-group" style="margin-bottom:16px;">
        <label for="trade-mindset">Pre-trade Mindset Score: <span id="mindset-display" style="color:var(--purple-l);font-family:var(--ff-head);">${t.mindsetScore || 5}</span>/10</label>
        <div class="mindset-slider-wrap">
          <span style="font-size:.75rem;color:var(--text3);">1</span>
          <input type="range" id="trade-mindset" min="1" max="10" step="1" value="${t.mindsetScore || 5}">
          <span style="font-size:.75rem;color:var(--text3);">10</span>
        </div>
      </div>

      <div class="form-group">
        <label>Rule Violations (check all that apply)</label>
        <div class="checkbox-group">
          ${RULE_VIOLATIONS.map(r => `
            <label class="checkbox-item">
              <input type="checkbox" data-violation="${r}">
              ${r}
            </label>`).join('')}
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Notes</div>
      <div class="form-group">
        <textarea id="trade-notes" placeholder="Trade rationale, observations, lessons learned…">${t.notes||''}</textarea>
      </div>
    </div>`;
}

function handleTradeSubmit() {
  const modal = document.getElementById('trade-modal');
  const get   = (id) => modal.querySelector('#' + id);

  const ticker = get('trade-ticker').value.trim().toUpperCase();
  const date   = get('trade-date').value;
  const entry  = parseFloat(get('trade-entry').value);
  const qty    = parseFloat(get('trade-qty').value);

  if (!ticker) { toast('Ticker is required', 'error'); return; }
  if (!date)   { toast('Date is required', 'error');   return; }
  if (!entry || isNaN(entry)) { toast('Entry price is required', 'error'); return; }
  if (!qty   || isNaN(qty))   { toast('Quantity is required', 'error');    return; }

  const selectedEmotionBtn = modal.querySelector('.emotion-btn.selected');
  const checkedViolations  = [...modal.querySelectorAll('input[data-violation]:checked')].map(el => el.dataset.violation);

  const tradeData = {
    ticker,
    date,
    assetType:      get('trade-asset').value,
    direction:      get('trade-direction').value,
    setup:          get('trade-setup').value.trim(),
    entryPrice:     entry,
    exitPrice:      parseFloat(get('trade-exit').value) || null,
    quantity:       qty,
    stopLoss:       parseFloat(get('trade-sl').value)   || null,
    takeProfit:     parseFloat(get('trade-tp').value)   || null,
    fees:           parseFloat(get('trade-fees').value) || 0,
    outcome:        get('trade-outcome').value,
    emotion:        selectedEmotionBtn?.dataset.emotion || '',
    mindsetScore:   parseInt(get('trade-mindset').value) || null,
    ruleViolations: checkedViolations,
    notes:          get('trade-notes').value.trim(),
  };

  if (editingTradeId) {
    const idx = trades.findIndex(t => t.id === editingTradeId);
    if (idx !== -1) { trades[idx] = { ...trades[idx], ...tradeData }; }
    toast('Trade updated ✓', 'success');
  } else {
    trades.push({ id: uid(), ...tradeData });
    toast('Trade logged ✓', 'success');
  }

  saveTrades();
  modal.close();
  renderPage(currentPage);
}

// ── Trade Detail View ─────────────────────────────────────────────────
function openTradeDetail(id) {
  const t     = trades.find(tr => tr.id === id);
  if (!t) return;
  const pnl   = t.exitPrice ? calcPnl(t) : null;
  const em    = EMOTIONS.find(e => e.key === t.emotion);
  const modal = document.getElementById('detail-modal');
  modal.classList.remove('chart-modal-wide');

  modal.querySelector('#detail-body').innerHTML = `
    <div class="grid-2" style="gap:16px;">
      <div>
        <div class="section-label">Trade</div>
        <div style="font-family:var(--ff-head);font-size:2rem;font-weight:800;">${t.ticker}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <span class="badge badge-${t.direction.toLowerCase()}">${t.direction}</span>
          <span class="badge badge-${(t.assetType||'stock').toLowerCase()}">${t.assetType}</span>
          ${t.outcome ? `<span class="badge badge-${t.outcome.toLowerCase()}">${t.outcome}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div class="section-label">P&L</div>
        <div style="font-family:var(--ff-head);font-size:2rem;font-weight:800;color:${pnl===null?'var(--text)':pnl>=0?'var(--green)':'var(--red)'};">
          ${pnl !== null ? fmtCurr(pnl, true) : 'Open'}
        </div>
        <div style="font-size:.8rem;color:var(--text3);">${t.date}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="grid-3" style="gap:16px;">
      <div><div class="stat-label">Entry</div><div style="font-size:1.1rem;font-weight:600;">${currSym()}${parseFloat(t.entryPrice).toFixed(4)}</div></div>
      <div><div class="stat-label">Exit</div><div style="font-size:1.1rem;font-weight:600;">${t.exitPrice ? currSym() + parseFloat(t.exitPrice).toFixed(4) : '—'}</div></div>
      <div><div class="stat-label">Quantity</div><div style="font-size:1.1rem;font-weight:600;">${t.quantity}</div></div>
      <div><div class="stat-label">Stop Loss</div><div style="font-size:1.1rem;">${t.stopLoss ? currSym() + t.stopLoss : '—'}</div></div>
      <div><div class="stat-label">Take Profit</div><div style="font-size:1.1rem;">${t.takeProfit ? currSym() + t.takeProfit : '—'}</div></div>
      <div><div class="stat-label">Fees</div><div style="font-size:1.1rem;">${fmtCurr(t.fees || 0)}</div></div>
    </div>

    ${t.setup ? `<div class="mt-12"><span class="badge badge-stock" style="font-size:.8rem;">📋 ${t.setup}</span></div>` : ''}

    <div class="divider"></div>

    <div class="section-label">🧠 Psychology</div>
    <div class="grid-3" style="gap:12px;margin-top:8px;">
      <div>
        <div class="stat-label">Emotion</div>
        <div style="margin-top:4px;">${em ? `<span class="emotion-badge" style="background:${em.color}22;color:${em.color};font-size:.85rem;">${em.icon} ${em.key}</span>` : '—'}</div>
      </div>
      <div>
        <div class="stat-label">Mindset Score</div>
        <div style="margin-top:4px;">${t.mindsetScore ? `<span class="score-pill ${t.mindsetScore>=7?'score-high':t.mindsetScore>=4?'score-mid':'score-low'}">${t.mindsetScore}/10</span>` : '—'}</div>
      </div>
      <div>
        <div class="stat-label">Violations</div>
        <div style="margin-top:4px;font-size:.85rem;color:${(t.ruleViolations||[]).length?'var(--red)':'var(--green)'};">${(t.ruleViolations||[]).length ? t.ruleViolations.length + ' Violations' : 'None'}</div>
      </div>
    </div>
    ${(t.ruleViolations||[]).length ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${t.ruleViolations.map(v=>`<span class="badge badge-loss" style="font-size:.72rem;">${v}</span>`).join('')}</div>` : ''}

    ${t.notes ? `<div class="divider"></div><div class="section-label">Notes</div><div style="font-size:.875rem;line-height:1.7;color:var(--text2);margin-top:8px;">${t.notes.replace(/\n/g,'<br>')}</div>` : ''}`;

  modal.querySelector('#detail-edit-btn').onclick = () => { modal.close(); openTradeModal(id); };
  modal.showModal();
}

// ── Delete Trade ──────────────────────────────────────────────────────
function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  trades = trades.filter(t => t.id !== id);
  saveTrades();
  toast('Trade deleted', 'info');
  renderPage(currentPage);
}

// ── Toast ──────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .25s ease forwards';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

// ── Init ───────────────────────────────────────────────────────────────
function init() {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Modal close buttons
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.onclick = closeTradeModal;
  const modalSubmit = document.getElementById('modal-submit');
  if (modalSubmit) modalSubmit.onclick = handleTradeSubmit;
  const detailClose = document.getElementById('detail-close');
  if (detailClose) detailClose.onclick = () => document.getElementById('detail-modal')?.close();
  const ccClose = document.getElementById('custom-chart-close');
  if (ccClose) ccClose.onclick = () => document.getElementById('custom-chart-modal')?.close();
  const pinClose = document.getElementById('pinterest-modal-close');
  if (pinClose) pinClose.onclick = () => document.getElementById('pinterest-import-modal')?.close();
  const zoomClose = document.getElementById('zoom-modal-close');
  if (zoomClose) zoomClose.onclick = () => document.getElementById('chart-zoom-modal')?.close();

  document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
  document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
  document.getElementById('zoom-reset-btn')?.addEventListener('click', resetZoom);

  const zoomBody = document.getElementById('zoom-modal-body');
  if (zoomBody) {
    attachHoverZoom(zoomBody, '#zoom-img-wrapper');
    zoomBody.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });
  }

  // Fallback light-dismiss for dialog (Safari)
  [document.getElementById('trade-modal'), document.getElementById('detail-modal'), document.getElementById('custom-chart-modal'), document.getElementById('pinterest-import-modal'), document.getElementById('chart-zoom-modal')].forEach(dlg => {
    if (dlg && !('closedBy' in HTMLDialogElement.prototype)) {
      dlg.addEventListener('click', e => {
        if (e.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (r.top <= e.clientY && e.clientY <= r.top + r.height && r.left <= e.clientX && e.clientX <= r.left + r.width) return;
        dlg.close();
      });
    }
  });

  // Mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) menuToggle.onclick = openSidebar;
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;

  // Theme toggle (auto-synced with main platform)
  applyTheme();
  window.addEventListener('storage', (e) => {
    if (e.key === 'apex-trade-theme' || e.key === 'tj_theme') applyTheme(e.newValue);
  });
  window.addEventListener('message', (e) => {
    if (e.data) {
      const t = e.data.theme || (e.data.type === 'APEX_THEME_CHANGE' ? e.data.theme : null);
      if (t) applyTheme(t);
      if (e.data.type === 'APEX_NAVIGATE' && e.data.page) {
        if (e.data.page !== currentPage) {
          navigate(e.data.page);
        }
      }
    }
  });

  // Sidebar collapse toggle
  const collapseBtn = document.getElementById('sidebar-toggle-btn');
  const isCollapsed = localStorage.getItem('tj_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    document.body.classList.add('sidebar-collapsed');
    document.querySelector('.sidebar')?.classList.add('collapsed');
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      document.querySelector('.sidebar')?.classList.toggle('collapsed');
      const collapsedNow = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('tj_sidebar_collapsed', collapsedNow);
      collapseBtn.title = collapsedNow ? 'Expand sidebar' : 'Collapse sidebar';
    });
  }

  // Route
  const hash = location.hash.slice(1) || 'dashboard';
  loadFromSql().then(() => {
    navigate(hash);
  });
}

function saveCustomCharts(chartsList) {
  LS.set('tj_custom_charts', chartsList);
  apiFetch('/api/journal/custom-charts/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chartsList),
  }).catch(() => undefined);
}

async function loadFromSql() {
  let dbTradesEmpty = false;
  let dbNotesEmpty = false;
  let dbChartsEmpty = false;

  try {
    const resTrades = await apiFetch('/api/journal/trades');
    if (resTrades.ok) {
      const data = await resTrades.json();
      if (data && data.length > 0) {
        trades = data;
        LS.set('tj_trades', trades);
      } else {
        dbTradesEmpty = true;
      }
    }
  } catch (err) {
    console.warn('Failed to load trades from SQL:', err);
  }

  try {
    const resNotes = await apiFetch('/api/journal/notes');
    if (resNotes.ok) {
      const data = await resNotes.json();
      if (data && Object.keys(data).length > 0) {
        journal = data;
        LS.set('tj_journal', journal);
      } else {
        dbNotesEmpty = true;
      }
    }
  } catch (err) {
    console.warn('Failed to load notes from SQL:', err);
  }

  try {
    const resCharts = await apiFetch('/api/journal/custom-charts');
    if (resCharts.ok) {
      const data = await resCharts.json();
      if (data && data.length > 0) {
        const parseRules = (val) => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return []; }
          }
          return [];
        };
        const normalized = data.map(c => ({
          ...c,
          image: c.image || c.image_url || c.imageUrl,
          badgeClass: c.badgeClass || c.badge_class,
          rules: parseRules(c.rules || c.rules_json)
        }));
        LS.set('tj_custom_charts', normalized);
      } else {
        dbChartsEmpty = true;
      }
    }
  } catch (err) {
    console.warn('Failed to load custom charts from SQL:', err);
  }

  let dbSheetsEmpty = false;
  try {
    const resSheets = await apiFetch('/api/journal/sheets');
    if (resSheets.ok) {
      const data = await resSheets.json();
      if (data && data.length > 0) {
        sheets = data;
        LS.set('tj_sheets', sheets);
      } else {
        dbSheetsEmpty = true;
      }
    }
  } catch (err) {
    console.warn('Failed to load sheets from SQL:', err);
  }

  if (dbTradesEmpty && trades && trades.length > 0) {
    saveTrades();
  }
  if (dbNotesEmpty && journal && Object.keys(journal).length > 0) {
    saveJournal();
  }
  const localCustom = LS.get('tj_custom_charts', []);
  if (dbChartsEmpty && localCustom && localCustom.length > 0) {
    saveCustomCharts(localCustom);
  }
  if (dbSheetsEmpty && sheets && sheets.length > 0) {
    saveSheets();
  }
}

window.addEventListener('DOMContentLoaded', init);
window.navigate          = navigate;
window.openTradeModal    = openTradeModal;
window.closeTradeModal   = closeTradeModal;
window.openTradeDetail   = openTradeDetail;
window.deleteTrade       = deleteTrade;
window.selectJournalDate = selectJournalDate;
window.exportData        = exportData;
window.filterCharts      = function(cat) {
  chartFilterCategory = cat;
  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
};

let chartFilterCategory = 'All';

function renderChartsGallery(el) {
  let custom = LS.get('tj_custom_charts', []);
  if (!custom || !Array.isArray(custom) || custom.length === 0) {
    custom = DEFAULT_CUSTOM_CHARTS;
    LS.set('tj_custom_charts', custom);
  }
  const pinterestCharts = custom.filter(c => c.category === 'Pinterest');
  const myCharts = custom.filter(c => c.category !== 'Pinterest');

  const filtered = chartFilterCategory === 'All'
    ? custom
    : chartFilterCategory === 'My Custom Charts'
      ? myCharts
      : chartFilterCategory === 'Pinterest'
        ? pinterestCharts
        : custom.filter(c => c.category === chartFilterCategory);

  el.innerHTML = `
    <div class="chart-toolbar-header">
      <div class="chart-filter-bar">
        ${['All', 'My Custom Charts', 'Pinterest'].map(cat => `
          <button class="chart-filter-pill ${cat === 'Pinterest' ? 'pinterest-pill' : ''} ${chartFilterCategory === cat ? 'active' : ''}" onclick="filterCharts('${cat}')">
            ${cat === 'Pinterest' ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:-1px;"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>` : ''} ${cat}
          </button>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${chartFilterCategory === 'Pinterest' ? `<button class="btn btn-ghost btn-sm pinterest-import-btn" onclick="openPinterestModal()">＋ Import from Pinterest</button>` : ''}
        <button class="btn btn-primary btn-sm" id="add-custom-chart-btn" onclick="openAddChartModal()">＋ Add Custom Chart</button>
      </div>
    </div>


    <div class="chart-gallery-grid">
      ${filtered.length ? filtered.map(c => `
        <div class="chart-card" onclick="openChartModal('${c.id}')">
          <div class="chart-card-header">
            <span class="chart-card-title">${c.title}</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="chart-card-badge ${c.badgeClass || 'badge-structure'}">${c.category}</span>
              <button class="btn btn-ghost btn-xs chart-card-edit-btn" title="Edit" onclick="event.stopPropagation(); openEditChartModal('${c.id}')" style="padding:2px 6px;font-size:.72rem;border-radius:6px;opacity:.7;">
                ✏️
              </button>
              <button class="btn btn-ghost btn-xs chart-card-delete-btn" title="Delete" onclick="event.stopPropagation(); deleteCustomChart('${c.id}')" style="padding:2px 6px;font-size:.72rem;border-radius:6px;opacity:.7;color:var(--red);">
                🗑
              </button>
            </div>
          </div>
          <div class="chart-card-img-wrap">
            ${c.svg ? c.svg : `<img src="${c.image || c.image_url || c.imageUrl}" alt="${c.title}" />`}
          </div>
          <div class="chart-card-body">
            <p class="chart-card-desc">${c.description}</p>
            <div class="chart-card-footer">
              <span style="color:var(--green);font-weight:700;">${c.winRate || 'High Probability'}</span>
              <span style="color:var(--cyan);font-weight:600;">${c.rr || '1:3 RR'}</span>
            </div>
          </div>
        </div>`
      ).join('') : `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text2);">
          No chart studies found for "${chartFilterCategory}". Click "Add Custom Chart" above to upload or save your own!
        </div>
      `}
    </div>
  `;

  const addBtn = document.getElementById('add-custom-chart-btn');
  if (addBtn) addBtn.onclick = openAddChartModal;
}

function attachHoverZoom(container, targetSelector) {
  if (!container) return;
  container.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const target = targetSelector ? container.querySelector(targetSelector) : container;
    if (target) {
      target.style.transformOrigin = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    }
  });
  container.addEventListener('mouseleave', () => {
    const target = targetSelector ? container.querySelector(targetSelector) : container;
    if (target) {
      target.style.transformOrigin = 'center center';
    }
  });
}

let currentZoomScale = 1;

function openChartZoomModal(id) {
  const custom = LS.get('tj_custom_charts', []);
  const allCharts = custom;
  const chart = allCharts.find(c => c.id === id);
  if (!chart) return;

  const modal = document.getElementById('chart-zoom-modal');
  if (!modal) return;
  const title = document.getElementById('zoom-modal-title');
  const wrapper = document.getElementById('zoom-img-wrapper');

  if (title) title.innerHTML = `🔍 ${chart.title}`;
  if (wrapper) wrapper.innerHTML = chart.svg ? chart.svg : `<img src="${chart.image || chart.image_url || chart.imageUrl}" alt="${chart.title}" />`;

  currentZoomScale = 1;
  updateZoomTransform();

  modal.showModal();
}

function updateZoomTransform() {
  const wrapper = document.getElementById('zoom-img-wrapper');
  if (wrapper) {
    wrapper.style.transform = `scale(${currentZoomScale})`;
    const resetBtn = document.getElementById('zoom-reset-btn');
    if (resetBtn) resetBtn.textContent = `${Math.round(currentZoomScale * 100)}%`;
  }
}

function zoomIn() {
  currentZoomScale = Math.min(currentZoomScale + 0.25, 4);
  updateZoomTransform();
}

function zoomOut() {
  currentZoomScale = Math.max(currentZoomScale - 0.25, 0.5);
  updateZoomTransform();
}

function resetZoom() {
  currentZoomScale = 1;
  updateZoomTransform();
}

function openChartModal(id) {
  const custom = LS.get('tj_custom_charts', []);
  const allCharts = custom;
  const chart = allCharts.find(c => c.id === id);
  if (!chart) return;

  const modal = document.getElementById('detail-modal');
  const title = modal.querySelector('#detail-modal-title');
  const body = modal.querySelector('#detail-body');

  title.textContent = chart.title;
  modal.classList.add('chart-modal-wide');
  const isCustom = chart.id.startsWith('custom-') || chart.id.startsWith('pin-');

  body.innerHTML = `
    <div class="chart-modal-split-container">
      <div class="chart-detail-display-wrap" title="Click to zoom in" onclick="openChartZoomModal('${chart.id}')">
        ${chart.svg ? chart.svg : `<img src="${chart.image || chart.image_url || chart.imageUrl}" alt="${chart.title}" />`}
        <div class="chart-zoom-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          <span>Click to zoom</span>
        </div>
      </div>

      <div class="chart-modal-right-content">
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface2);padding:12px 16px;border-radius:10px;border:1px solid var(--border);">
          <span class="chart-card-badge ${chart.badgeClass || 'badge-structure'}" style="font-size:.82rem;padding:5px 14px;">${chart.category}</span>
          <div style="display:flex;gap:14px;font-size:.88rem;font-weight:700;">
            <span style="color:var(--green);">${chart.winRate || 'High Probability'}</span>
            <span style="color:var(--cyan);">${chart.rr || '1 : 3.0 RR'}</span>
          </div>
        </div>

        <div style="background:var(--surface2);padding:16px;border-radius:10px;border:1px solid var(--border);">
          <div class="section-label" style="font-size:.78rem;font-weight:700;color:var(--text3);margin-bottom:6px;">SETUP OVERVIEW & PSYCHOLOGY</div>
          <p style="font-size:.88rem;color:var(--text2);line-height:1.6;margin:0;">${chart.description || 'No detailed description provided.'}</p>
        </div>

        <div>
          <div class="section-label" style="font-size:.8rem;font-weight:700;color:var(--purple-l);margin-bottom:8px;">📌 EXECUTION RULES & CRITERIA</div>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;padding:0;margin:0;">
            ${(chart.rules && chart.rules.length) ? chart.rules.map(r => `
              <li style="display:flex;align-items:flex-start;gap:10px;font-size:.88rem;color:var(--text);line-height:1.5;background:rgba(255,255,255,0.02);padding:10px 14px;border-radius:8px;border:1px solid var(--border);">
                <span style="color:var(--green);font-weight:bold;font-size:1rem;line-height:1;">✓</span>
                <span>${r}</span>
              </li>
            `).join('') : `
              <li style="font-size:.85rem;color:var(--text3);font-style:italic;">No custom rules specified for this chart study.</li>
            `}
          </ul>
        </div>

        ${isCustom ? `
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:auto;padding-top:10px;">
            <button class="btn btn-ghost btn-sm" onclick="modal.close(); openEditChartModal('${chart.id}')" style="color:var(--cyan);border-color:rgba(6,182,212,0.3);">
              ✏️ Edit
            </button>
            <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(239,68,68,0.3);" onclick="deleteCustomChart('${chart.id}')">
              🗑 Delete
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const displayWrap = body.querySelector('.chart-detail-display-wrap');
  if (displayWrap) {
    attachHoverZoom(displayWrap, 'img, svg');
  }

  const editBtn = modal.querySelector('#detail-edit-btn');
  if (editBtn) editBtn.style.display = 'none';

  modal.showModal();
}

// ── Edit Custom Chart ──────────────────────────────────────────────────
let editingChartId = null;

function openEditChartModal(id) {
  const custom = LS.get('tj_custom_charts', []);
  const chart = custom.find(c => c.id === id);
  if (!chart) { toast('Chart not found', 'error'); return; }

  editingChartId = id;

  const modal = document.getElementById('custom-chart-modal');
  if (!modal) return;

  // Change modal title to Edit
  const modalTitle = modal.querySelector('h2, .modal-title, [data-modal-title]');
  if (modalTitle) modalTitle.textContent = 'Edit Chart Study';

  // Pre-fill form fields
  const titleEl = document.getElementById('cc-title');
  const categoryEl = document.getElementById('cc-category');
  const winrateEl = document.getElementById('cc-winrate');
  const rrEl = document.getElementById('cc-rr');
  const descEl = document.getElementById('cc-desc');
  const rulesEl = document.getElementById('cc-rules');
  const urlEl = document.getElementById('cc-image-url');

  if (titleEl) titleEl.value = chart.title || '';
  if (categoryEl) categoryEl.value = chart.category || 'Market Structure';
  if (winrateEl) winrateEl.value = chart.winRate || '';
  if (rrEl) rrEl.value = chart.rr || '';
  if (descEl) descEl.value = chart.description || '';
  if (rulesEl) rulesEl.value = Array.isArray(chart.rules) ? chart.rules.join('\n') : (chart.rules || '');

  // Set image preview
  const existingImg = chart.image || chart.image_url || chart.imageUrl || '';
  currentCustomImageBase64 = existingImg;
  const previewWrap = document.getElementById('cc-image-preview-wrap');
  const promptWrap = document.getElementById('cc-upload-prompt');
  const previewImg = document.getElementById('cc-image-preview');
  if (existingImg && previewWrap && promptWrap && previewImg) {
    previewImg.src = existingImg;
    previewWrap.style.display = 'block';
    promptWrap.style.display = 'none';
  } else if (previewWrap && promptWrap) {
    previewWrap.style.display = 'none';
    promptWrap.style.display = 'block';
  }
  if (urlEl) urlEl.value = existingImg.startsWith('http') ? existingImg : '';

  // Wire submit button to update handler
  const submitBtn = document.getElementById('cc-submit-btn');
  if (submitBtn) {
    submitBtn.textContent = 'Update Chart Study';
    submitBtn.onclick = handleEditChartSubmit;
  }

  setupChartUploadHandlers();
  modal.showModal();
}

async function handleEditChartSubmit() {
  const id = editingChartId;
  if (!id) return;

  const title = document.getElementById('cc-title')?.value?.trim();
  if (!title) { toast('Please enter a chart title', 'error'); return; }

  const category = document.getElementById('cc-category')?.value || 'Market Structure';
  const winRate = document.getElementById('cc-winrate')?.value?.trim() || '';
  const rr = document.getElementById('cc-rr')?.value?.trim() || '';
  const desc = document.getElementById('cc-desc')?.value?.trim() || '';
  const rulesRaw = document.getElementById('cc-rules')?.value?.trim() || '';
  const urlVal = document.getElementById('cc-image-url')?.value?.trim();
  const rules = rulesRaw ? rulesRaw.split('\n').map(r => r.trim()).filter(Boolean) : [];

  const badgeClass = category === 'Reversals'
    ? 'badge-reversal'
    : category === 'Continuations'
      ? 'badge-continuation'
      : category === 'Candlesticks'
        ? 'badge-candlestick'
        : category === 'Pinterest'
          ? 'badge-pinterest'
          : 'badge-structure';

  let finalImg = currentCustomImageBase64 || urlVal || '';
  let r2Key = null;

  if (finalImg && finalImg.startsWith('data:image/')) {
    try {
      const uploadRes = await apiFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: finalImg })
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.url) { finalImg = uploadData.url; r2Key = uploadData.key; }
      }
    } catch (e) { console.warn('Upload fallback:', e); }
  }

  const updatedChart = { id, title, category, badgeClass, winRate, rr, description: desc, rules, image: finalImg, r2Key };

  let custom = LS.get('tj_custom_charts', []);
  const idx = custom.findIndex(c => c.id === id);
  if (idx !== -1) custom[idx] = updatedChart;
  saveCustomCharts(custom);

  // Sync to D1
  apiFetch(`/api/journal/custom-charts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedChart),
  }).catch(() => undefined);

  editingChartId = null;
  document.getElementById('custom-chart-modal')?.close();
  toast('Chart study updated!', 'success');
  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
}

function deleteCustomChart(id) {
  if (!confirm('Are you sure you want to delete this custom chart study?')) return;
  let custom = LS.get('tj_custom_charts', []);
  custom = custom.filter(c => c.id !== id);
  saveCustomCharts(custom);

  apiFetch(`/api/journal/custom-charts/${id}`, { method: 'DELETE' }).catch(() => undefined);

  document.getElementById('detail-modal')?.close();
  toast('Custom chart study deleted', 'info');
  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
}

let currentCustomImageBase64 = "";

function openPinterestModal() {
  const modal = document.getElementById('pinterest-import-modal');
  if (!modal) return;
  document.getElementById('pinterest-urls-input').value = '';
  document.getElementById('pinterest-preview-grid').innerHTML = '';
  modal.showModal();
}

function handlePinterestUrlsInput() {
  const raw = document.getElementById('pinterest-urls-input').value;
  const previewGrid = document.getElementById('pinterest-preview-grid');

  // Match all http/https URLs from input text
  const urlRegex = /https?:\/\/[^\s,\n"'<>]+/gi;
  const allUrls = [...new Set(raw.match(urlRegex) || [])];

  if (!allUrls.length) {
    previewGrid.innerHTML = `<p style="color:var(--text3);font-size:.85rem;grid-column:1/-1;">No links detected yet. Paste Pinterest pin or image links above.</p>`;
    return;
  }

  previewGrid.innerHTML = allUrls.map((url, i) => `
    <div class="pin-preview-item" id="pin-item-${i}">
      <div style="position:relative;width:100%;height:120px;background:var(--surface);border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <div class="pin-loading" style="font-size:.78rem;color:var(--text3);display:flex;align-items:center;gap:6px;">
          <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Resolving link...
        </div>
        <img class="pin-img" src="" alt="Pinterest chart ${i+1}"
          style="display:none;width:100%;height:100%;object-fit:cover;border-radius:8px;"
          onerror="this.style.display='none'; if(this.parentElement.querySelector('.pin-loading')) this.parentElement.querySelector('.pin-loading').style.display='none'; this.parentElement.querySelector('.pin-err').style.display='flex';"
          onload="this.style.display='block'; if(this.parentElement.querySelector('.pin-loading')) this.parentElement.querySelector('.pin-loading').style.display='none'; this.parentElement.querySelector('.pin-ok').style.display='flex';" />
        <div class="pin-ok" style="display:none;position:absolute;top:4px;right:4px;background:#10b981;border-radius:50%;width:18px;height:18px;align-items:center;justify-content:center;font-size:10px;color:#fff;">✓</div>
        <div class="pin-err" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);border-radius:8px;font-size:.7rem;color:#f87171;padding:4px;text-align:center;">Failed to resolve image</div>
      </div>
      <input type="text" class="form-input pin-title-input" placeholder="Chart title…" value="Pinterest Chart ${i+1}" style="margin-top:6px;font-size:.78rem;padding:4px 8px;" />
      <input type="hidden" class="pin-url-val" value="${url.replace(/"/g,'&quot;')}" />
    </div>
  `).join('');

  // Resolve each URL asynchronously
  allUrls.forEach((url, i) => {
    const itemEl = document.getElementById(`pin-item-${i}`);
    if (!itemEl) return;
    const imgEl = itemEl.querySelector('.pin-img');
    const loadingEl = itemEl.querySelector('.pin-loading');
    const errEl = itemEl.querySelector('.pin-err');
    const titleEl = itemEl.querySelector('.pin-title-input');
    const urlValEl = itemEl.querySelector('.pin-url-val');

    // If direct image URL
    if (url.includes('i.pinimg.com') || /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(url)) {
      imgEl.src = url;
      return;
    }

    // Call backend API resolver for pin.it or pinterest.com/pin/... links
    apiFetch('/api/pinterest-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.imageUrl) {
          imgEl.src = data.imageUrl;
          if (urlValEl) urlValEl.value = data.imageUrl;
          if (data.title && titleEl && (titleEl.value.startsWith('Pinterest Chart') || !titleEl.value)) {
            titleEl.value = data.title;
          }
        } else {
          if (loadingEl) loadingEl.style.display = 'none';
          if (errEl) {
            errEl.innerText = data.message || 'Image not found';
            errEl.style.display = 'flex';
          }
          itemEl.style.opacity = '0.4';
        }
      })
      .catch(err => {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errEl) errEl.style.display = 'flex';
        itemEl.style.opacity = '0.4';
      });
  });
}

function handlePinterestImport() {
  const items = document.querySelectorAll('#pinterest-preview-grid .pin-preview-item');
  if (!items.length) {
    toast('Paste some Pinterest image URLs first', 'error');
    return;
  }

  const existing = LS.get('tj_custom_charts', []);
  let added = 0;

  items.forEach(item => {
    const img = item.querySelector('img');
    const titleInput = item.querySelector('.pin-title-input');
    const urlInput = item.querySelector('.pin-url-val');

    if (!img || item.style.opacity === '0.4' || !img.src) return; // skip failed images

    const url = (img.src && img.src.startsWith('http')) ? img.src : (urlInput ? urlInput.value : '');
    if (!url) return;
    const title = titleInput ? titleInput.value.trim() || 'Pinterest Chart' : 'Pinterest Chart';

    existing.unshift({
      id: 'pin-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      title,
      category: 'Pinterest',
      badgeClass: 'badge-pinterest',
      winRate: '',
      rr: '',
      description: 'Saved from Pinterest board.',
      rules: [],
      image: url,
    });
    added++;
  });

  if (!added) {
    toast('No valid images to import', 'error');
    return;
  }

  saveCustomCharts(existing);
  document.getElementById('pinterest-import-modal')?.close();
  chartFilterCategory = 'Pinterest';
  toast(`Imported ${added} Pinterest chart${added > 1 ? 's' : ''}!`, 'success');
  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
}



function openAddChartModal() {
  const modal = document.getElementById('custom-chart-modal');
  if (!modal) return;

  const form = document.getElementById('custom-chart-form');
  if (form) form.reset();

  editingChartId = null;
  currentCustomImageBase64 = "";
  const previewWrap = document.getElementById('cc-image-preview-wrap');
  const promptWrap = document.getElementById('cc-upload-prompt');
  if (previewWrap) previewWrap.style.display = 'none';
  if (promptWrap) promptWrap.style.display = 'block';

  // Reset modal title and submit button to Add mode
  const modalTitle = modal.querySelector('h2, .modal-title, [data-modal-title]');
  if (modalTitle) modalTitle.textContent = 'Add Custom Chart Study';
  const submitBtn = document.getElementById('cc-submit-btn');
  if (submitBtn) {
    submitBtn.textContent = 'Save Chart Study';
    submitBtn.onclick = handleCustomChartSubmit;
  }

  setupChartUploadHandlers();
  modal.showModal();
}

function setupChartUploadHandlers() {
  const dropZone = document.getElementById('cc-drop-zone');
  const fileInput = document.getElementById('cc-file-input');
  const removeBtn = document.getElementById('cc-remove-img');
  const urlInput = document.getElementById('cc-image-url');

  if (!dropZone || !fileInput) return;

  dropZone.onclick = (e) => {
    if (e.target.id === 'cc-remove-img') return;
    fileInput.click();
  };

  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files[0]) {
      readChartFile(fileInput.files[0]);
    }
  };

  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  };

  dropZone.ondragleave = () => {
    dropZone.classList.remove('dragover');
  };

  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readChartFile(e.dataTransfer.files[0]);
    }
  };

  if (removeBtn) {
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      currentCustomImageBase64 = "";
      fileInput.value = "";
      document.getElementById('cc-image-preview-wrap').style.display = 'none';
      document.getElementById('cc-upload-prompt').style.display = 'block';
    };
  }

  if (urlInput) {
    urlInput.oninput = () => {
      if (urlInput.value) {
        currentCustomImageBase64 = urlInput.value;
        const img = document.getElementById('cc-image-preview');
        if (img) img.src = urlInput.value;
        document.getElementById('cc-image-preview-wrap').style.display = 'block';
        document.getElementById('cc-upload-prompt').style.display = 'none';
      }
    };
  }
}

function readChartFile(file) {
  if (!file.type.startsWith('image/')) {
    toast('Please upload an image file (PNG, JPG, WEBP)', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    currentCustomImageBase64 = e.target.result;
    const img = document.getElementById('cc-image-preview');
    if (img) img.src = currentCustomImageBase64;
    document.getElementById('cc-image-preview-wrap').style.display = 'block';
    document.getElementById('cc-upload-prompt').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function handleCustomChartSubmit() {
  const title = document.getElementById('cc-title')?.value?.trim();
  if (!title) {
    toast('Please enter a chart title', 'error');
    return;
  }

  const category = document.getElementById('cc-category')?.value || 'Market Structure';
  const winRate = document.getElementById('cc-winrate')?.value?.trim() || '85% Win Rate';
  const rr = document.getElementById('cc-rr')?.value?.trim() || '1 : 3.0 RR';
  const desc = document.getElementById('cc-desc')?.value?.trim() || 'Personal chart study setup for technical edge.';
  const rulesRaw = document.getElementById('cc-rules')?.value?.trim() || '';
  const urlVal = document.getElementById('cc-image-url')?.value?.trim();

  const finalImg = currentCustomImageBase64 || urlVal || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%230f172a"/><text x="200" y="100" fill="%2338bdf8" text-anchor="middle" font-weight="bold" font-size="16">Custom Chart Study</text></svg>';

  const rules = rulesRaw ? rulesRaw.split('\n').map(r => r.trim()).filter(Boolean) : [
    'Confirm overall market trend direction.',
    'Wait for strong volume confirmation at entry level.',
    'Maintain disciplined risk management & position sizing.'
  ];

  const badgeClass = category === 'Reversals'
    ? 'badge-reversal'
    : category === 'Continuations'
      ? 'badge-continuation'
      : category === 'Candlesticks'
        ? 'badge-candlestick'
        : 'badge-structure';

  let r2Key = null;
  if (finalImg && finalImg.startsWith('data:image/')) {
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: finalImg })
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          finalImg = uploadData.url;
          r2Key = uploadData.key;
        }
      }
    } catch (e) {
      console.warn('Cloudflare R2 bucket upload fallback to local image', e);
    }
  }

  const newChart = {
    id: 'custom-' + Date.now(),
    title,
    category,
    badgeClass,
    winRate,
    rr,
    description: desc,
    rules,
    image: finalImg,
    r2Key
  };

  const custom = LS.get('tj_custom_charts', []);
  custom.unshift(newChart);
  saveCustomCharts(custom);

  fetch('/api/journal/custom-charts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newChart),
  }).catch(() => undefined);

  document.getElementById('custom-chart-modal')?.close();
  toast('Custom chart study saved successfully to Cloudflare D1 & R2!', 'success');

  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
}

window.filterCharts = function(cat) {
  chartFilterCategory = cat;
  const pageEl = document.querySelector('.page');
  if (pageEl) renderChartsGallery(pageEl);
};
window.openChartModal = openChartModal;
window.openChartZoomModal = openChartZoomModal;
window.openAddChartModal = openAddChartModal;
window.openEditChartModal = openEditChartModal;
window.openPinterestModal = openPinterestModal;
window.handlePinterestUrlsInput = handlePinterestUrlsInput;
window.handlePinterestImport = handlePinterestImport;
window.deleteCustomChart = deleteCustomChart;
window.handleCustomChartSubmit = handleCustomChartSubmit;


