'use strict';

const TJCharts = (() => {
  function getC() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      grid:        isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.07)',
      text:        isLight ? '#64748b' : '#475569',
      textBright:  isLight ? '#334155' : '#94a3b8',
      purple:      '#7c3aed',
      cyan:        '#06b6d4',
      green:       '#10b981',
      red:         '#ef4444',
      amber:       '#f59e0b',
      orange:      '#f97316',
      surface:     isLight ? '#ffffff' : '#0f0f1a',
      strokeOuter: isLight ? '#ffffff' : '#0a0a0f',
      gridDashed:  isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.15)'
    };
  }

  const EMOTION_COLORS = {
    Calm:       '#10b981',
    Confident:  '#06b6d4',
    Greedy:     '#f59e0b',
    FOMO:       '#f97316',
    Fearful:    '#8b5cf6',
    Frustrated: '#ef4444',
  };

  function hiDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const r   = canvas.getBoundingClientRect();
    canvas.width  = Math.round(r.width  * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w: r.width, h: r.height };
  }

  function fmtMoney(v) {
    const abs = Math.abs(v);
    const str = abs >= 1000 ? (abs / 1000).toFixed(1) + 'k' : abs.toFixed(0);
    return (v < 0 ? '-' : '') + str;
  }

  // ── Equity Curve ─────────────────────────────────────────────────────────
  function equityCurve(canvas, points) {
    const C = getC();
    const { ctx, w, h } = hiDPI(canvas);
    const pad = { t: 24, r: 20, b: 36, l: 58 };
    const aw  = w - pad.l - pad.r;
    const ah  = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);

    if (!points || points.length < 2) {
      _empty(ctx, w, h, 'Add trades to see your equity curve');
      return;
    }

    const vals  = points.map(p => p.value);
    const minV  = Math.min(...vals);
    const maxV  = Math.max(...vals);
    const range = maxV - minV || 1;

    const tx = (i) => pad.l + (i / (points.length - 1)) * aw;
    const ty = (v) => pad.t + ah - ((v - minV) / range) * ah;

    for (let i = 0; i <= 5; i++) {
      const y   = pad.t + (i / 5) * ah;
      const val = maxV - (i / 5) * range;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + aw, y); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(fmtMoney(val), pad.l - 6, y + 4);
    }

    const isPositive = points[points.length - 1].value >= points[0].value;
    const accentColor = isPositive ? C.green : C.red;
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ah);
    grad.addColorStop(0, accentColor + '50');
    grad.addColorStop(1, accentColor + '00');

    ctx.beginPath();
    points.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(tx(i), ty(pt.value)) : ctx.lineTo(tx(i), ty(pt.value));
    });
    ctx.lineTo(tx(points.length - 1), pad.t + ah);
    ctx.lineTo(tx(0), pad.t + ah);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    points.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(tx(i), ty(pt.value)) : ctx.lineTo(tx(i), ty(pt.value));
    });
    ctx.strokeStyle = accentColor; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();

    const lx = tx(points.length - 1);
    const ly = ty(points[points.length - 1].value);
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = accentColor; ctx.fill();
    ctx.strokeStyle = C.strokeOuter; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = C.text; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    const n = Math.min(points.length, 6);
    for (let i = 0; i < n; i++) {
      const idx = Math.round(i * (points.length - 1) / Math.max(n - 1, 1));
      const lbl = new Date(points[idx].date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      ctx.fillText(lbl, tx(idx), h - 6);
    }
  }

  // ── Vertical Bar Chart ────────────────────────────────────────────────────
  function barChart(canvas, labels, values) {
    const C = getC();
    const { ctx, w, h } = hiDPI(canvas);
    const pad = { t: 24, r: 16, b: 40, l: 58 };
    const aw  = w - pad.l - pad.r;
    const ah  = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);

    if (!values || values.length === 0) { _empty(ctx, w, h, 'No data yet'); return; }

    const maxAbs = Math.max(...values.map(Math.abs)) || 1;
    const unit   = aw / values.length;
    const barW   = unit * 0.65;
    const offset = (unit - barW) / 2;
    const zeroY  = pad.t + ah / 2;

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * ah;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + aw, y); ctx.stroke();
    }

    ctx.strokeStyle = C.gridDashed; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(pad.l + aw, zeroY); ctx.stroke();
    ctx.setLineDash([]);

    [-2, -1, 0, 1, 2].forEach(s => {
      const val = s * maxAbs / 2;
      const y   = zeroY - (val / maxAbs) * (ah / 2);
      if (y < pad.t || y > pad.t + ah) return;
      ctx.fillStyle = C.text; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(fmtMoney(val), pad.l - 6, y + 4);
    });

    values.forEach((v, i) => {
      const x     = pad.l + i * unit + offset;
      const barH  = (Math.abs(v) / maxAbs) * (ah / 2);
      const y     = v >= 0 ? zeroY - barH : zeroY;
      const color = v >= 0 ? C.green : C.red;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color); grad.addColorStop(1, color + '44');

      ctx.beginPath(); ctx.roundRect(x, y, barW, barH || 1, [4, 4, 0, 0]);
      ctx.fillStyle = grad; ctx.fill();

      ctx.fillStyle = C.textBright; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
      const lbl = (labels[i] || '').length > 7 ? labels[i].slice(0, 7) : (labels[i] || '');
      ctx.fillText(lbl, x + barW / 2, h - 8);

      if (Math.abs(v) > 0) {
        ctx.fillStyle = color; ctx.font = '10px Inter,sans-serif';
        ctx.fillText(fmtMoney(v), x + barW / 2, v >= 0 ? y - 5 : y + barH + 13);
      }
    });
  }

  // ── Horizontal Bar (Rule violations) ──────────────────────────────────────
  function hBarChart(canvas, labels, values) {
    const C = getC();
    const { ctx, w, h } = hiDPI(canvas);
    const pad = { t: 8, r: 48, b: 8, l: 134 };
    const aw  = w - pad.l - pad.r;
    const ah  = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);

    if (!values || values.every(v => v === 0)) {
      _empty(ctx, w, h, 'No rule violations — great discipline!');
      return;
    }

    const maxV = Math.max(...values) || 1;
    const rowH = ah / labels.length;
    const barH = Math.min(rowH * 0.55, 22);

    labels.forEach((lbl, i) => {
      const y  = pad.t + i * rowH + (rowH - barH) / 2;
      const bw = (values[i] / maxV) * aw;

      ctx.beginPath(); ctx.roundRect(pad.l, y, aw, barH, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();

      if (bw > 0) {
        const grad = ctx.createLinearGradient(pad.l, 0, pad.l + bw, 0);
        grad.addColorStop(0, C.amber + 'cc'); grad.addColorStop(1, C.red + 'cc');
        ctx.beginPath(); ctx.roundRect(pad.l, y, bw, barH, 4);
        ctx.fillStyle = grad; ctx.fill();
      }

      ctx.fillStyle = C.textBright; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(lbl, pad.l - 8, y + barH / 2 + 4);
      ctx.fillStyle = values[i] > 0 ? C.amber : C.text;
      ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(values[i], pad.l + aw + 8, y + barH / 2 + 4);
    });
  }

  // ── Emotion vs P&L Scatter ────────────────────────────────────────────────
  function scatterChart(canvas, points) {
    const C = getC();
    const { ctx, w, h } = hiDPI(canvas);
    const pad = { t: 24, r: 24, b: 44, l: 58 };
    const aw  = w - pad.l - pad.r;
    const ah  = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);

    const emotions = Object.keys(EMOTION_COLORS);

    if (!points || points.length === 0) {
      _empty(ctx, w, h, 'Log emotions on trades to see correlation');
      return;
    }

    const pnls  = points.map(p => p.pnl);
    const minP  = Math.min(...pnls, 0);
    const maxP  = Math.max(...pnls, 0);
    const range = maxP - minP || 1;
    const ew    = aw / emotions.length;

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * ah;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + aw, y); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(fmtMoney(maxP - (i / 4) * range), pad.l - 6, y + 4);
    }

    const zy = pad.t + (maxP / range) * ah;
    if (zy >= pad.t && zy <= pad.t + ah) {
      ctx.strokeStyle = C.gridDashed; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, zy); ctx.lineTo(pad.l + aw, zy); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
    emotions.forEach((e, i) => {
      ctx.fillStyle = EMOTION_COLORS[e];
      ctx.fillText(e, pad.l + i * ew + ew / 2, h - 8);
    });

    points.forEach(pt => {
      const ei = emotions.indexOf(pt.emotion);
      if (ei === -1) return;
      const seed   = pt.id ? ((pt.id.charCodeAt(0) || 65) - 65) / 90 : 0.5;
      const jitter = (seed - 0.5) * ew * 0.55;
      const x      = pad.l + ei * ew + ew / 2 + jitter;
      const y      = Math.min(Math.max(pad.t + ((maxP - pt.pnl) / range) * ah, pad.t), pad.t + ah);
      const color  = EMOTION_COLORS[pt.emotion] || C.textBright;

      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color + 'bb'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  // ── Mindset Score Line Trend ───────────────────────────────────────────────
  function lineTrend(canvas, points, color) {
    const C = getC();
    color = color || C.cyan;
    const { ctx, w, h } = hiDPI(canvas);
    const pad = { t: 20, r: 20, b: 36, l: 40 };
    const aw  = w - pad.l - pad.r;
    const ah  = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);

    if (!points || points.length < 2) {
      _empty(ctx, w, h, 'Not enough data yet');
      return;
    }

    const vals  = points.map(p => p.value);
    const minV  = Math.min(...vals) - 0.5;
    const maxV  = Math.max(...vals) + 0.5;
    const range = maxV - minV || 1;

    const tx = (i) => pad.l + (i / (points.length - 1)) * aw;
    const ty = (v) => pad.t + ah - ((v - minV) / range) * ah;

    for (let i = 0; i <= 4; i++) {
      const y   = pad.t + (i / 4) * ah;
      const val = maxV - (i / 4) * range;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + aw, y); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.l - 5, y + 4);
    }

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ah);
    grad.addColorStop(0, color + '40'); grad.addColorStop(1, color + '00');
    ctx.beginPath();
    points.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(tx(i), ty(pt.value)) : ctx.lineTo(tx(i), ty(pt.value));
    });
    ctx.lineTo(tx(points.length - 1), pad.t + ah);
    ctx.lineTo(tx(0), pad.t + ah);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    points.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(tx(i), ty(pt.value)) : ctx.lineTo(tx(i), ty(pt.value));
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

    points.forEach((pt, i) => {
      ctx.beginPath(); ctx.arc(tx(i), ty(pt.value), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });

    ctx.fillStyle = C.text; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    const n = Math.min(points.length, 5);
    for (let i = 0; i < n; i++) {
      const idx = Math.round(i * (points.length - 1) / Math.max(n - 1, 1));
      ctx.fillText(new Date(points[idx].date).toLocaleDateString('en', { month: 'short', day: 'numeric' }), tx(idx), h - 6);
    }
  }

  // ── Win/Loss Donut ────────────────────────────────────────────────────────
  function donut(canvas, wins, losses, scratches) {
    const C = getC();
    const { ctx, w, h } = hiDPI(canvas);
    ctx.clearRect(0, 0, w, h);
    const total = wins + losses + scratches;
    if (total === 0) { _empty(ctx, w, h, 'No trades yet'); return; }

    const cx = w / 2, cy = h / 2;
    const r  = Math.min(w, h) / 2 - 10;
    const ir = r * 0.62;

    const segments = [
      { value: wins,      color: C.green  },
      { value: losses,    color: C.red    },
      { value: scratches, color: C.amber  },
    ].filter(s => s.value > 0);

    let start = -Math.PI / 2;
    segments.forEach(s => {
      const angle = (s.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath(); ctx.fillStyle = s.color + 'cc'; ctx.fill();
      start += angle;
    });

    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2);
    ctx.fillStyle = C.surface; ctx.fill();

    const pct = Math.round((wins / total) * 100);
    ctx.fillStyle = C.textBright; ctx.font = 'bold 22px Outfit,sans-serif'; ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pct + '%', cx, cy - 6);
    ctx.fillStyle = C.text; ctx.font = '11px Inter,sans-serif';
    ctx.fillText('win rate', cx, cy + 12);
    ctx.textBaseline = 'alphabetic';
  }

  function _empty(ctx, w, h, msg) {
    ctx.fillStyle = '#334155'; ctx.font = '13px Inter,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, h / 2); ctx.textBaseline = 'alphabetic';
  }

  return { equityCurve, barChart, hBarChart, scatterChart, lineTrend, donut, EMOTION_COLORS };
})();
