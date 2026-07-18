import type { DrawingItem, DrawingPoint } from "./drawingTypes";
import { normalizeDrawingType } from "./drawingTypes";

export type ScreenPt = { x: number; y: number };
export type ChartPointFn = (pt: DrawingPoint) => ScreenPt | null;
export type PriceToYFn = (price: number) => number | null;

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/** Extend a line through s1→s2 to canvas bounds (infinite line) */
export function extendLineToBounds(
  s1: ScreenPt,
  s2: ScreenPt,
  w: number,
  h: number
): [ScreenPt, ScreenPt] | null {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null;

  const candidates: ScreenPt[] = [];
  // intersect with x=0, x=w, y=0, y=h
  if (Math.abs(dx) > 1e-6) {
    const t0 = (0 - s1.x) / dx;
    const y0 = s1.y + t0 * dy;
    if (y0 >= -1 && y0 <= h + 1) candidates.push({ x: 0, y: y0 });
    const tw = (w - s1.x) / dx;
    const yw = s1.y + tw * dy;
    if (yw >= -1 && yw <= h + 1) candidates.push({ x: w, y: yw });
  }
  if (Math.abs(dy) > 1e-6) {
    const t0 = (0 - s1.y) / dy;
    const x0 = s1.x + t0 * dx;
    if (x0 >= -1 && x0 <= w + 1) candidates.push({ x: x0, y: 0 });
    const th = (h - s1.y) / dy;
    const xh = s1.x + th * dx;
    if (xh >= -1 && xh <= w + 1) candidates.push({ x: xh, y: h });
  }

  // Pick two farthest intersections
  if (candidates.length < 2) return [s1, s2];
  let bestA = candidates[0];
  let bestB = candidates[1];
  let bestD = -1;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const d = Math.hypot(candidates[i].x - candidates[j].x, candidates[i].y - candidates[j].y);
      if (d > bestD) {
        bestD = d;
        bestA = candidates[i];
        bestB = candidates[j];
      }
    }
  }
  return [bestA, bestB];
}

/** Ray from s1 through s2, clipped to canvas */
export function rayToBounds(s1: ScreenPt, s2: ScreenPt, w: number, h: number): [ScreenPt, ScreenPt] {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return [s1, s2];

  // large t in direction of s2
  let tMax = 1e6;
  if (dx > 0) tMax = Math.min(tMax, (w - s1.x) / dx);
  if (dx < 0) tMax = Math.min(tMax, (0 - s1.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (h - s1.y) / dy);
  if (dy < 0) tMax = Math.min(tMax, (0 - s1.y) / dy);
  tMax = Math.max(tMax, 1);
  return [s1, { x: s1.x + dx * tMax, y: s1.y + dy * tMax }];
}

function drawHandles(ctx: CanvasRenderingContext2D, pts: ScreenPt[], selected: boolean) {
  pts.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, selected ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#2563eb" : "#60a5fa";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawDeleteBadge(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.roundRect(x - 32, y - 9, 64, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🗑 Delete", x, y);
}

function drawArrowHead(ctx: CanvasRenderingContext2D, from: ScreenPt, to: ScreenPt, color: string) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 12;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - 0.4), to.y - size * Math.sin(angle - 0.4));
  ctx.lineTo(to.x - size * Math.cos(angle + 0.4), to.y - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  chartPointToScreen: ChartPointFn;
  priceToY: PriceToYFn;
  selectedId: string | null;
  isDark: boolean;
  isPreview?: boolean;
}

export function renderDrawing(item: DrawingItem, rc: RenderContext) {
  const { ctx, width, height, chartPointToScreen, priceToY, selectedId, isDark, isPreview } = rc;
  const type = normalizeDrawingType(item.type);
  const isSelected = item.id === selectedId;
  const lineColor = "#3b82f6";
  const bgBadge = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)";

  ctx.save();
  if (isPreview) {
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.85;
  }

  const s1 = item.p1 ? chartPointToScreen(item.p1) : null;
  const s2 = item.p2 ? chartPointToScreen(item.p2) : null;
  const s3 = item.p3 ? chartPointToScreen(item.p3) : null;

  // ─── Lines ───
  if (
    (type === "trendline" || type === "info_line" || type === "arrow") &&
    s1 &&
    s2
  ) {
    if (isSelected) {
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.strokeStyle = isSelected ? "#2563eb" : lineColor;
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.stroke();

    if (type === "arrow") {
      drawArrowHead(ctx, s1, s2, isSelected ? "#2563eb" : lineColor);
    }

    if (type === "info_line" || type === "trendline") {
      const pDiff = item.p2!.price - item.p1.price;
      const pPct = ((pDiff / item.p1.price) * 100).toFixed(2);
      const sign = pDiff >= 0 ? "+" : "";
      const badgeText =
        type === "info_line"
          ? `${sign}${pPct}% · Δ${sign}${pDiff.toFixed(2)}`
          : `${sign}${pPct}% (${sign}${pDiff.toFixed(2)})`;
      const midX = (s1.x + s2.x) / 2;
      const midY = (s1.y + s2.y) / 2 - 12;
      ctx.setLineDash([]);
      ctx.font = "500 11px Inter, sans-serif";
      const tw = ctx.measureText(badgeText).width;
      ctx.fillStyle = bgBadge;
      ctx.beginPath();
      ctx.roundRect(midX - tw / 2 - 6, midY - 10, tw + 12, 18, 4);
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = pDiff >= 0 ? "#10b981" : "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, midX, midY);
      if (isSelected && !isPreview) drawDeleteBadge(ctx, midX, midY - 22);
    } else if (isSelected && !isPreview) {
      drawDeleteBadge(ctx, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2 - 16);
    }
    drawHandles(ctx, [s1, s2], isSelected);
  } else if (type === "ray" && s1 && s2) {
    const [a, b] = rayToBounds(s1, s2, width, height);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = isSelected ? "#2563eb" : lineColor;
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.stroke();
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x, s1.y - 16);
  } else if (type === "extended_line" && s1 && s2) {
    const ext = extendLineToBounds(s1, s2, width, height);
    if (ext) {
      ctx.beginPath();
      ctx.moveTo(ext[0].x, ext[0].y);
      ctx.lineTo(ext[1].x, ext[1].y);
      ctx.strokeStyle = isSelected ? "#2563eb" : lineColor;
      ctx.lineWidth = isSelected ? 2.5 : 2;
      ctx.stroke();
    }
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2 - 16);
  } else if (type === "horizontal_line" && s1) {
    ctx.beginPath();
    ctx.moveTo(0, s1.y);
    ctx.lineTo(width, s1.y);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#f59e0b";
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.stroke();
    // price label
    const label = item.p1.price.toFixed(2);
    ctx.setLineDash([]);
    ctx.font = "600 11px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = isSelected ? "#2563eb" : "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(width - tw - 16, s1.y - 10, tw + 12, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width - tw - 10, s1.y);
    drawHandles(ctx, [s1], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, 48, s1.y - 16);
  } else if (type === "vertical_line" && s1) {
    ctx.beginPath();
    ctx.moveTo(s1.x, 0);
    ctx.lineTo(s1.x, height);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#a855f7";
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.stroke();
    drawHandles(ctx, [s1], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x, 20);
  } else if (type === "cross_line" && s1) {
    ctx.beginPath();
    ctx.moveTo(0, s1.y);
    ctx.lineTo(width, s1.y);
    ctx.moveTo(s1.x, 0);
    ctx.lineTo(s1.x, height);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#06b6d4";
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.stroke();
    drawHandles(ctx, [s1], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x + 40, s1.y - 16);
  } else if (type === "parallel_channel" && s1 && s2) {
    // Channel width from p3 if present, else fixed offset
    let offsetY = 40;
    if (s3) {
      // perpendicular offset: project s3 onto line normal
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      offsetY = (s3.x - s1.x) * nx + (s3.y - s1.y) * ny;
    }
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const len = Math.hypot(dx, dy) || 1;
    const unx = -dy / len;
    const uny = dx / len;
    const ox = unx * offsetY;
    const oy = uny * offsetY;

    const a1 = { x: s1.x, y: s1.y };
    const a2 = { x: s2.x, y: s2.y };
    const b1 = { x: s1.x + ox, y: s1.y + oy };
    const b2 = { x: s2.x + ox, y: s2.y + oy };

    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.moveTo(a2.x, a2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#3b82f6";
    ctx.lineWidth = isSelected ? 2.5 : 1.75;
    ctx.stroke();

    ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.closePath();
    ctx.fill();

    drawHandles(ctx, [s1, s2, ...(s3 ? [s3] : [])], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2 - 16);
  } else if (type === "pitchfork" && s1 && s2 && s3) {
    // Andrews pitchfork: median from p1 to midpoint of p2-p3, plus outer tines
    const mid = { x: (s2.x + s3.x) / 2, y: (s2.y + s3.y) / 2 };
    const [medA, medB] = rayToBounds(s1, mid, width, height);
    // outer rays parallel through s2 and s3
    const dx = mid.x - s1.x;
    const dy = mid.y - s1.y;
    const s2End = { x: s2.x + dx * 20, y: s2.y + dy * 20 };
    const s3End = { x: s3.x + dx * 20, y: s3.y + dy * 20 };
    const r2 = rayToBounds(s2, s2End, width, height);
    const r3 = rayToBounds(s3, s3End, width, height);

    ctx.beginPath();
    ctx.moveTo(medA.x, medA.y);
    ctx.lineTo(medB.x, medB.y);
    ctx.moveTo(r2[0].x, r2[0].y);
    ctx.lineTo(r2[1].x, r2[1].y);
    ctx.moveTo(r3[0].x, r3[0].y);
    ctx.lineTo(r3[1].x, r3[1].y);
    // base
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#8b5cf6";
    ctx.lineWidth = isSelected ? 2.5 : 1.75;
    ctx.stroke();
    drawHandles(ctx, [s1, s2, s3], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x, s1.y - 16);
  } else if ((type === "fibonacci" || type === "fib_extension") && s1 && s2) {
    const levels =
      type === "fib_extension"
        ? [0, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618]
        : [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const colors = ["#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6"];
    const pMin = Math.min(item.p1.price, item.p2!.price);
    const pMax = Math.max(item.p1.price, item.p2!.price);
    const pRange = pMax - pMin || 1;
    // Direction: from p1 (0) to p2 (1) for extension, high-low for retracement
    const base = type === "fib_extension" ? item.p1.price : pMax;
    const range = type === "fib_extension" ? item.p2!.price - item.p1.price : -pRange;

    levels.forEach((lvl, idx) => {
      const priceLvl = base + range * lvl;
      const y = priceToY(priceLvl);
      if (y === null) return;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "600 10px Inter, sans-serif";
      ctx.fillStyle = colors[idx % colors.length];
      ctx.textAlign = "left";
      ctx.fillText(`Fib ${lvl} (${priceLvl.toFixed(2)})`, 10, y - 4);
    });
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2);
  } else if ((type === "rectangle" || type === "shapes") && s1 && s2) {
    const x = Math.min(s1.x, s2.x);
    const y = Math.min(s1.y, s2.y);
    const w = Math.abs(s2.x - s1.x);
    const h = Math.abs(s2.y - s1.y);
    ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeRect(x, y, w, h);
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, x + w / 2, y - 12);
  } else if (type === "ellipse" && s1 && s2) {
    const cx = (s1.x + s2.x) / 2;
    const cy = (s1.y + s2.y) / 2;
    const rx = Math.abs(s2.x - s1.x) / 2;
    const ry = Math.abs(s2.y - s1.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, cx, cy - ry - 14);
  } else if (type === "triangle" && s1 && s2 && s3) {
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.closePath();
    ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.18)" : "rgba(59, 130, 246, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();
    drawHandles(ctx, [s1, s2, s3], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, (s1.x + s2.x + s3.x) / 3, (s1.y + s2.y + s3.y) / 3 - 16);
  } else if ((type === "brush" || type === "highlighter") && item.points && item.points.length > 1) {
    ctx.beginPath();
    let started = false;
    item.points.forEach((pt) => {
      const s = chartPointToScreen(pt);
      if (!s) return;
      if (!started) {
        ctx.moveTo(s.x, s.y);
        started = true;
      } else {
        ctx.lineTo(s.x, s.y);
      }
    });
    if (type === "highlighter") {
      ctx.strokeStyle = isSelected ? "rgba(250, 204, 21, 0.75)" : "rgba(250, 204, 21, 0.55)";
      ctx.lineWidth = isSelected ? 14 : 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else {
      ctx.strokeStyle = isSelected ? "#db2777" : "#ec4899";
      ctx.lineWidth = isSelected ? 3.5 : 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    ctx.stroke();
    if (isSelected && !isPreview && item.points.length > 0) {
      const mid = item.points[Math.floor(item.points.length / 2)];
      const sMid = chartPointToScreen(mid);
      if (sMid) drawDeleteBadge(ctx, sMid.x, sMid.y - 16);
    }
  } else if (type === "text" && s1) {
    const label = item.text || "Note";
    ctx.setLineDash([]);
    ctx.font = "600 12px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = isSelected ? "#2563eb" : "#3b82f6";
    ctx.beginPath();
    ctx.roundRect(s1.x, s1.y - 12, tw + 16, 24, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, s1.x + 8, s1.y);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x + tw / 2 + 8, s1.y - 28);
  } else if (type === "callout" && s1) {
    const label = item.text || "Callout";
    const sTarget = s2 || { x: s1.x + 80, y: s1.y - 40 };
    ctx.setLineDash([]);
    ctx.font = "600 12px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    const bx = sTarget.x;
    const by = sTarget.y - 12;
    const bw = tw + 16;
    const bh = 28;
    ctx.fillStyle = isSelected ? "rgba(37, 99, 235, 0.95)" : "rgba(59, 130, 246, 0.9)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(bx + 8, by + bh);
    ctx.lineTo(bx + 20, by + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + 8, by + bh / 2);
    drawHandles(ctx, [s1, sTarget], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, bx + bw / 2, by - 12);
  } else if (type === "price_label" && s1) {
    const label = item.text || item.p1.price.toFixed(2);
    ctx.setLineDash([]);
    ctx.font = "600 11px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = isSelected ? "#2563eb" : "#10b981";
    ctx.beginPath();
    // tag shape
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s1.x + 8, s1.y - 10);
    ctx.lineTo(s1.x + tw + 20, s1.y - 10);
    ctx.lineTo(s1.x + tw + 20, s1.y + 10);
    ctx.lineTo(s1.x + 8, s1.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, s1.x + 12, s1.y);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x + tw / 2 + 10, s1.y - 24);
  } else if (type === "smile" && s1) {
    ctx.setLineDash([]);
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text || "🚀", s1.x, s1.y);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, s1.x, s1.y - 24);
  } else if ((type === "ruler" || type === "date_range" || type === "price_range") && s1 && s2) {
    const x = Math.min(s1.x, s2.x);
    const y = Math.min(s1.y, s2.y);
    const w = Math.abs(s2.x - s1.x);
    const h = Math.abs(s2.y - s1.y);
    const color = type === "ruler" ? "#a855f7" : type === "date_range" ? "#06b6d4" : "#f59e0b";
    ctx.fillStyle =
      type === "ruler"
        ? "rgba(168, 85, 247, 0.15)"
        : type === "date_range"
          ? "rgba(6, 182, 212, 0.12)"
          : "rgba(245, 158, 11, 0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeRect(x, y, w, h);

    const barsApprox = Math.abs(item.p2!.time - item.p1.time);
    const diffPct = (((item.p2!.price - item.p1.price) / item.p1.price) * 100).toFixed(2);
    const priceDiff = (item.p2!.price - item.p1.price).toFixed(2);
    let label = "";
    if (type === "date_range") label = `Δt: ${barsApprox}s · bars span`;
    else if (type === "price_range") label = `ΔP: ${priceDiff} (${diffPct}%)`;
    else label = `Measure: ${diffPct}% (${priceDiff})`;

    ctx.setLineDash([]);
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillStyle = bgBadge;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x + 4, y + 4, tw + 12, 20);
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 10, y + 14);
    drawHandles(ctx, [s1, s2], isSelected);
    if (isSelected && !isPreview) drawDeleteBadge(ctx, x + w / 2, y - 12);
  }

  ctx.restore();
}

/** Live zoom-box preview (screen coords only) */
export function renderZoomBox(
  ctx: CanvasRenderingContext2D,
  a: ScreenPt,
  b: ScreenPt
) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);
  ctx.save();
  ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function hitTestDrawing(
  item: DrawingItem,
  x: number,
  y: number,
  chartPointToScreen: ChartPointFn,
  priceToY: PriceToYFn,
  canvasW: number,
  canvasH: number
): boolean {
  const type = normalizeDrawingType(item.type);
  const s1 = item.p1 ? chartPointToScreen(item.p1) : null;
  const s2 = item.p2 ? chartPointToScreen(item.p2) : null;
  const s3 = item.p3 ? chartPointToScreen(item.p3) : null;

  if (
    (type === "trendline" ||
      type === "info_line" ||
      type === "arrow" ||
      type === "ray" ||
      type === "extended_line") &&
    s1 &&
    s2
  ) {
    if (type === "ray") {
      const [a, b] = rayToBounds(s1, s2, canvasW, canvasH);
      return distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= 12;
    }
    if (type === "extended_line") {
      const ext = extendLineToBounds(s1, s2, canvasW, canvasH);
      if (!ext) return false;
      return distanceToSegment(x, y, ext[0].x, ext[0].y, ext[1].x, ext[1].y) <= 12;
    }
    return distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y) <= 12;
  }

  if (type === "horizontal_line" && s1) {
    return Math.abs(y - s1.y) <= 8;
  }
  if (type === "vertical_line" && s1) {
    return Math.abs(x - s1.x) <= 8;
  }
  if (type === "cross_line" && s1) {
    return Math.abs(y - s1.y) <= 8 || Math.abs(x - s1.x) <= 8;
  }

  if ((type === "fibonacci" || type === "fib_extension") && item.p1 && item.p2) {
    const levels =
      type === "fib_extension"
        ? [0, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618]
        : [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const pMin = Math.min(item.p1.price, item.p2.price);
    const pMax = Math.max(item.p1.price, item.p2.price);
    const pRange = pMax - pMin || 1;
    const base = type === "fib_extension" ? item.p1.price : pMax;
    const range = type === "fib_extension" ? item.p2.price - item.p1.price : -pRange;
    for (const lvl of levels) {
      const priceLvl = base + range * lvl;
      const sy = priceToY(priceLvl);
      if (sy !== null && Math.abs(y - sy) <= 8) return true;
    }
    return false;
  }

  if (
    (type === "rectangle" ||
      type === "shapes" ||
      type === "ellipse" ||
      type === "ruler" ||
      type === "date_range" ||
      type === "price_range") &&
    s1 &&
    s2
  ) {
    const minX = Math.min(s1.x, s2.x) - 6;
    const maxX = Math.max(s1.x, s2.x) + 6;
    const minY = Math.min(s1.y, s2.y) - 6;
    const maxY = Math.max(s1.y, s2.y) + 6;
    if (type === "ellipse") {
      const cx = (s1.x + s2.x) / 2;
      const cy = (s1.y + s2.y) / 2;
      const rx = Math.max(Math.abs(s2.x - s1.x) / 2, 1);
      const ry = Math.max(Math.abs(s2.y - s1.y) / 2, 1);
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      return d <= 1.15;
    }
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  if (type === "triangle" && s1 && s2 && s3) {
    // barycentric inside + edge distance
    const d1 = distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y);
    const d2 = distanceToSegment(x, y, s2.x, s2.y, s3.x, s3.y);
    const d3 = distanceToSegment(x, y, s3.x, s3.y, s1.x, s1.y);
    return Math.min(d1, d2, d3) <= 12;
  }

  if (type === "parallel_channel" && s1 && s2) {
    return distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y) <= 14;
  }

  if (type === "pitchfork" && s1 && s2 && s3) {
    const d1 = distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y);
    const d2 = distanceToSegment(x, y, s1.x, s1.y, s3.x, s3.y);
    const d3 = distanceToSegment(x, y, s2.x, s2.y, s3.x, s3.y);
    return Math.min(d1, d2, d3) <= 14;
  }

  if ((type === "brush" || type === "highlighter") && item.points && item.points.length > 1) {
    for (let j = 0; j < item.points.length - 1; j++) {
      const a = chartPointToScreen(item.points[j]);
      const b = chartPointToScreen(item.points[j + 1]);
      if (a && b && distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= (type === "highlighter" ? 16 : 12)) {
        return true;
      }
    }
  }

  if ((type === "text" || type === "smile" || type === "price_label") && s1) {
    return Math.hypot(x - s1.x, y - s1.y) <= 28;
  }

  if (type === "callout" && s1) {
    const sTarget = s2 || { x: s1.x + 80, y: s1.y - 40 };
    return (
      Math.hypot(x - s1.x, y - s1.y) <= 16 ||
      (x >= sTarget.x - 4 && x <= sTarget.x + 120 && y >= sTarget.y - 20 && y <= sTarget.y + 20)
    );
  }

  return false;
}
