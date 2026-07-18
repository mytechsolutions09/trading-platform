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
let trades   = LS.get('tj_trades',   []);
let journal  = LS.get('tj_journal',  {});
let settings = LS.get('tj_settings', { capital: 10000, currency: 'USD' });
let theme    = localStorage.getItem('tj_theme') || 'dark';

function saveTrades() {
  LS.set('tj_trades', trades);
  fetch('/api/journal/trades/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trades),
  }).catch(() => undefined);
}

function saveJournal() {
  LS.set('tj_journal', journal);
  fetch('/api/journal/notes/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(journal),
  }).catch(() => undefined);
}

function saveSettings() { LS.set('tj_settings', settings); }

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  const text = document.getElementById('theme-toggle-text');
  if (icon && text) {
    if (theme === 'light') {
      icon.innerHTML = `<svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      text.textContent = 'Dark Mode';
    } else {
      icon.innerHTML = `<svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
      text.textContent = 'Light Mode';
    }
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
const PAGES = ['dashboard', 'trades', 'analytics', 'psychology', 'journal', 'settings'];
let currentPage = 'dashboard';

function navigate(page) {
  if (!PAGES.includes(page)) page = 'dashboard';
  currentPage = page;
  history.replaceState(null, '', '#' + page);
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  renderPage(page);
  closeSidebar();
}

function renderPage(page) {
  const container = document.getElementById('app-content');
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'page';
  container.appendChild(el);

  switch (page) {
    case 'dashboard':   renderDashboard(el);   break;
    case 'trades':      renderTrades(el);       break;
    case 'analytics':   renderAnalytics(el);    break;
    case 'psychology':  renderPsychology(el);   break;
    case 'journal':     renderJournal(el);      break;
    case 'settings':    renderSettings(el);     break;
  }
  updateCapitalDisplay();
}

// ── Sidebar mobile ────────────────────────────────────────────────────
function openSidebar() {
  document.querySelector('.sidebar').classList.add('open');
  document.querySelector('.sidebar-overlay').classList.add('show');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('show');
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

  // Emotion distribution
  const emotionCount = {};
  EMOTIONS.forEach(e => emotionCount[e.key] = 0);
  closed.forEach(t => { if (t.emotion) emotionCount[t.emotion] = (emotionCount[t.emotion] || 0) + 1; });

  // Emotion avg P&L
  const emotionPnl = {};
  EMOTIONS.forEach(e => emotionPnl[e.key] = []);
  closed.forEach(t => { if (t.emotion) emotionPnl[t.emotion].push(calcPnl(t)); });

  // Scatter data
  const scatterData = closed.filter(t => t.emotion).map(t => ({ id: t.id, emotion: t.emotion, pnl: calcPnl(t) }));

  // Mindset trend
  const mindsetPts = closed.filter(t => t.mindsetScore && t.date)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .map(t => ({ date: t.date, value: parseFloat(t.mindsetScore) }));

  const avgMindset = mindsetPts.length ? (mindsetPts.reduce((a,p) => a+p.value, 0) / mindsetPts.length) : 0;

  // Rule violations
  const violations = {};
  RULE_VIOLATIONS.forEach(r => violations[r] = 0);
  closed.forEach(t => { (t.ruleViolations || []).forEach(r => { violations[r] = (violations[r] || 0) + 1; }); });
  const totalViolations = Object.values(violations).reduce((a,b) => a+b, 0);
  const totalPossible   = closed.length * RULE_VIOLATIONS.length;
  const disciplineScore = totalPossible > 0 ? Math.max(0, Math.round((1 - totalViolations / totalPossible) * 100)) : 100;
  const discPct = disciplineScore + '%';

  // Emotion win rates
  const emotionWinRate = {};
  EMOTIONS.forEach(e => {
    const pts = emotionPnl[e.key];
    emotionWinRate[e.key] = pts.length ? pts.filter(p=>p>0).length / pts.length : null;
  });

  const maxEmotionCount = Math.max(...Object.values(emotionCount), 1);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Psychology</h1>
        <p class="page-subtitle">Your mental edge — emotion tracking & discipline analysis</p>
      </div>
    </div>
    <div class="page-content">

      <!-- Discipline + Mindset KPIs -->
      <div class="grid-3">
        <div class="card">
          <div class="card-header"><span class="card-title">Discipline Score</span></div>
          <div class="card-body flex-center" style="flex-direction:column;gap:12px;padding-top:20px;">
            <div class="discipline-ring" style="--pct:${discPct}">
              <div class="discipline-inner">
                <div style="font-family:var(--ff-head);font-size:1.6rem;font-weight:800;color:${disciplineScore>=70?'var(--cyan)':disciplineScore>=40?'var(--amber)':'var(--red)'};">${disciplineScore}</div>
                <div style="font-size:0.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;">/ 100</div>
              </div>
            </div>
            <div style="font-size:0.8rem;color:var(--text3);text-align:center;">${totalViolations} violations across ${closed.length} trades</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Avg Mindset Score</span></div>
          <div class="card-body flex-center" style="flex-direction:column;gap:8px;padding-top:20px;">
            <div style="font-family:var(--ff-head);font-size:3rem;font-weight:800;color:${avgMindset>=7?'var(--green)':avgMindset>=4?'var(--amber)':'var(--red)'};">${avgMindset.toFixed(1)}<span style="font-size:1rem;color:var(--text3)">/10</span></div>
            <div style="font-size:0.8rem;color:var(--text3);">${mindsetPts.length} trades rated</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Emotion Distribution</span></div>
          <div class="card-body">
            <div class="emotion-summary">
              ${EMOTIONS.map(e => `
                <div class="emotion-row">
                  <span style="min-width:80px;color:${e.color};font-size:.8rem;font-weight:600;">${e.icon} ${e.key}</span>
                  <div class="emotion-bar-track">
                    <div class="emotion-bar-fill" style="width:${(emotionCount[e.key]/maxEmotionCount*100).toFixed(0)}%;background:${e.color};"></div>
                  </div>
                  <span style="min-width:20px;text-align:right;font-size:.75rem;color:var(--text3);">${emotionCount[e.key]}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Scatter + Mindset Trend -->
      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header"><span class="card-title">Emotion vs P&L</span></div>
          <div class="card-body"><canvas id="ps-scatter" class="chart chart-lg"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Mindset Score Trend</span></div>
          <div class="card-body"><canvas id="ps-mindset" class="chart chart-lg"></canvas></div>
        </div>
      </div>

      <!-- Rule Violations + Emotion Win Rates -->
      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header"><span class="card-title">Rule Violations</span></div>
          <div class="card-body" style="height:${Math.max(240, RULE_VIOLATIONS.length * 36 + 32)}px;position:relative;">
            <canvas id="ps-violations" class="chart" style="height:${Math.max(220, RULE_VIOLATIONS.length * 36)}px;"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Emotion Win Rates</span></div>
          <div class="card-body">
            ${EMOTIONS.map(e => {
              const wr = emotionWinRate[e.key];
              const cnt = emotionPnl[e.key].length;
              if (!cnt) return `<div class="emotion-row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
                <span style="min-width:100px;color:${e.color};font-size:.82rem;">${e.icon} ${e.key}</span>
                <span style="font-size:.75rem;color:var(--text3);">No data</span>
              </div>`;
              const avg  = emotionPnl[e.key].reduce((a,b)=>a+b,0) / cnt;
              return `<div class="emotion-row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
                <span style="min-width:100px;color:${e.color};font-size:.82rem;">${e.icon} ${e.key}</span>
                <div style="flex:1;display:flex;align-items:center;gap:8px;">
                  <div style="height:4px;flex:1;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${(wr*100).toFixed(0)}%;background:${e.color};border-radius:99px;"></div>
                  </div>
                  <span style="font-size:.75rem;min-width:32px;text-align:right;color:${e.color};">${(wr*100).toFixed(0)}%</span>
                </div>
                <span style="min-width:70px;text-align:right;font-size:.75rem;color:${avg>=0?'var(--green)':'var(--red)'};">${fmtCurr(avg,true)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const scatter          = el.querySelector('#ps-scatter');
    const mindset          = el.querySelector('#ps-mindset');
    const violationsCanvas = el.querySelector('#ps-violations');
    if (scatter)    TJCharts.scatterChart(scatter, scatterData);
    if (mindset)    TJCharts.lineTrend(mindset, mindsetPts);
    if (violationsCanvas) TJCharts.hBarChart(violationsCanvas, RULE_VIOLATIONS, RULE_VIOLATIONS.map(r => violations[r]));
  });
}

// ══════════════════════════════════════════════════════════════════════
//  JOURNAL
// ══════════════════════════════════════════════════════════════════════
let journalDate = new Date().toISOString().slice(0,10);

function renderJournal(el) {
  const entries = Object.entries(journal).sort((a,b) => b[0].localeCompare(a[0]));

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Journal</h1>
        <p class="page-subtitle">Daily trading notes & reflections</p>
      </div>
    </div>
    <div class="page-content">
      <div class="journal-grid">
        <!-- Entry list -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div class="section-label">Entries</div>
            <button class="btn btn-ghost btn-sm" id="journal-today-btn">Today</button>
          </div>
          <div class="journal-entries" id="journal-list">
            ${entries.length ? entries.map(([date, text]) => `
              <div class="journal-entry-item ${date === journalDate ? 'active' : ''}" data-date="${date}" onclick="selectJournalDate('${date}')">
                <div class="journal-entry-date">${new Date(date + 'T12:00').toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}</div>
                <div class="journal-entry-preview">${text.slice(0,80) || '…'}</div>
              </div>`) .join('') : '<div style="font-size:.8rem;color:var(--text3);padding:8px;">No entries yet</div>'}
          </div>
        </div>

        <!-- Editor -->
        <div class="journal-editor card">
          <div class="card-header">
            <input type="date" id="journal-date-input" value="${journalDate}" style="background:transparent;border:none;color:var(--text);font-family:var(--ff-head);font-size:1rem;font-weight:600;cursor:pointer;">
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm" id="journal-save-btn">Save</button>
              <button class="btn btn-danger btn-sm" id="journal-del-btn" ${!journal[journalDate]?'disabled':''}>Delete</button>
            </div>
          </div>
          <div class="card-body">
            <textarea id="journal-textarea" placeholder="Write your trading reflections here…
• What went well today?
• What mistakes did you make?
• How was your emotional state?
• What will you improve tomorrow?" style="min-height:380px;">${journal[journalDate] || ''}</textarea>
          </div>
        </div>
      </div>
    </div>`;

  el.querySelector('#journal-today-btn').onclick = () => {
    journalDate = new Date().toISOString().slice(0,10);
    renderPage('journal');
  };

  el.querySelector('#journal-date-input').addEventListener('change', e => {
    journalDate = e.target.value;
    renderPage('journal');
  });

  el.querySelector('#journal-save-btn').onclick = () => {
    const text = el.querySelector('#journal-textarea').value.trim();
    if (text) { journal[journalDate] = text; } else { delete journal[journalDate]; }
    saveJournal();
    toast('Journal entry saved ✓', 'success');
    renderPage('journal');
  };

  el.querySelector('#journal-del-btn').onclick = () => {
    if (!journal[journalDate]) return;
    delete journal[journalDate];
    saveJournal();
    toast('Entry deleted', 'info');
    renderPage('journal');
  };
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
  document.getElementById('modal-close').onclick = closeTradeModal;
  document.getElementById('modal-submit').onclick = handleTradeSubmit;
  document.getElementById('detail-close').onclick = () => document.getElementById('detail-modal').close();

  // Fallback light-dismiss for dialog (Safari)
  [document.getElementById('trade-modal'), document.getElementById('detail-modal')].forEach(dlg => {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dlg.addEventListener('click', e => {
        if (e.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (r.top <= e.clientY && e.clientY <= r.top + r.height && r.left <= e.clientX && e.clientX <= r.left + r.width) return;
        dlg.close();
      });
    }
  });

  // Mobile menu
  document.querySelector('.menu-toggle').onclick = openSidebar;
  document.querySelector('.sidebar-overlay').onclick = closeSidebar;

  // Theme toggle
  applyTheme();
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('tj_theme', theme);
      applyTheme();
    });
  }

  // Route
  const hash = location.hash.slice(1) || 'dashboard';
  loadFromSql().then(() => {
    navigate(hash);
  });
}

async function loadFromSql() {
  let dbTradesEmpty = false;
  let dbNotesEmpty = false;

  try {
    const resTrades = await fetch('/api/journal/trades');
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
    const resNotes = await fetch('/api/journal/notes');
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

  if (dbTradesEmpty && trades && trades.length > 0) {
    saveTrades();
  }
  if (dbNotesEmpty && journal && Object.keys(journal).length > 0) {
    saveJournal();
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
