import type { DrawingItem, DrawingPoint, DrawingStyle } from "./drawingTypes";
import { normalizeDrawingType } from "./drawingTypes";

export type ScreenPt = { x: number; y: number };
export type ChartPointFn = (pt: DrawingPoint) => ScreenPt | null;
export type PriceToYFn = (price: number) => number | null;

// ─── Geometry helpers ───────────────────────────────────────────────────────

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

  let tMax = 1e6;
  if (dx > 0) tMax = Math.min(tMax, (w - s1.x) / dx);
  if (dx < 0) tMax = Math.min(tMax, (0 - s1.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (h - s1.y) / dy);
  if (dy < 0) tMax = Math.min(tMax, (0 - s1.y) / dy);
  tMax = Math.max(tMax, 1);
  return [s1, { x: s1.x + dx * tMax, y: s1.y + dy * tMax }];
}

/** Extend only in the LEFT direction (from s1 back past canvas left) */
function extendLeftBound(s1: ScreenPt, s2: ScreenPt, w: number, h: number): ScreenPt {
  const dx = s1.x - s2.x; // reversed direction
  const dy = s1.y - s2.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return s1;
  let tMax = 1e6;
  if (dx > 0) tMax = Math.min(tMax, (w - s1.x) / dx);
  if (dx < 0) tMax = Math.min(tMax, (0 - s1.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (h - s1.y) / dy);
  if (dy < 0) tMax = Math.min(tMax, (0 - s1.y) / dy);
  tMax = Math.max(tMax, 1);
  return { x: s1.x + dx * tMax, y: s1.y + dy * tMax };
}

/** Extend only in the RIGHT direction (from s2 past canvas right) */
function extendRightBound(s1: ScreenPt, s2: ScreenPt, w: number, h: number): ScreenPt {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return s2;
  let tMax = 1e6;
  if (dx > 0) tMax = Math.min(tMax, (w - s2.x) / dx);
  if (dx < 0) tMax = Math.min(tMax, (0 - s2.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (h - s2.y) / dy);
  if (dy < 0) tMax = Math.min(tMax, (0 - s2.y) / dy);
  tMax = Math.max(tMax, 1);
  return { x: s2.x + dx * tMax, y: s2.y + dy * tMax };
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function applyLineStyle(ctx: CanvasRenderingContext2D, style: DrawingStyle | undefined, lw?: number) {
  const w = lw ?? style?.lineWidth ?? 2;
  ctx.lineWidth = w;
  switch (style?.lineStyle) {
    case "dashed":
      ctx.setLineDash([w * 4, w * 3]);
      break;
    case "dotted":
      ctx.setLineDash([w * 1.2, w * 2.5]);
      ctx.lineCap = "round";
      break;
    default:
      ctx.setLineDash([]);
  }
}

function resetLineDash(ctx: CanvasRenderingContext2D) {
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
}

/** TradingView-style handle: white circle with colored border */
function drawTVHandle(ctx: CanvasRenderingContext2D, pt: ScreenPt, color: string, large = false) {
  const r = large ? 6 : 5;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

/** Draw all endpoint handles */
function drawHandles(ctx: CanvasRenderingContext2D, pts: ScreenPt[], color: string, isSelected: boolean) {
  pts.forEach((pt) => drawTVHandle(ctx, pt, color, isSelected));
}

/** Draw a small arrow at the end of an extended line (TV extension arrow) */
function drawExtendArrow(ctx: CanvasRenderingContext2D, from: ScreenPt, to: ScreenPt, color: string) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 7;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - 0.45), to.y - size * Math.sin(angle - 0.45));
  ctx.lineTo(to.x - size * Math.cos(angle + 0.45), to.y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.fill();
}

/** Y-axis price label (right side, TV style) */
function drawPriceAxisLabel(
  ctx: CanvasRenderingContext2D,
  y: number,
  price: number,
  color: string,
  w: number,
  isSelected: boolean
) {
  const label = price.toFixed(2);
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  const tw = ctx.measureText(label).width;
  const bw = tw + 10;
  const bh = 18;
  const bx = w - bw - 2;
  const by = y - bh / 2;

  // Dashed horizontal reach-line to price scale
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(0, y);
  ctx.lineTo(bx, y);
  ctx.strokeStyle = color + (isSelected ? "99" : "55");
  ctx.lineWidth = 1;
  ctx.stroke();
  resetLineDash(ctx);

  // Badge
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + bw / 2, y);
}

/** X-axis time marker (bottom, TV style) */
function drawTimeAxisMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  color: string,
  h: number,
  isSelected: boolean
) {
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.strokeStyle = color + (isSelected ? "88" : "44");
  ctx.lineWidth = 1;
  ctx.stroke();
  resetLineDash(ctx);
}

/** Angle badge near p2 endpoint (TV shows angle in degrees) */
function drawAngleBadge(ctx: CanvasRenderingContext2D, s1: ScreenPt, s2: ScreenPt, color: string) {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const angleDeg = Math.abs(Math.atan2(-dy, dx) * (180 / Math.PI));
  const label = `${angleDeg.toFixed(1)}°`;

  ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  const tw = ctx.measureText(label).width;
  const bw = tw + 8;
  const bh = 15;

  // Position above or below p2 depending on direction
  const nx = s2.x + (dx >= 0 ? 12 : -bw - 12);
  const ny = s2.y - (s2.y > s1.y ? bh + 6 : -6);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(nx, ny, bw, bh, 3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, nx + bw / 2, ny + bh / 2);
}

/** Info pill at midpoint: shows +X.XX% (±Y.YY) */
function drawInfoPill(
  ctx: CanvasRenderingContext2D,
  s1: ScreenPt,
  s2: ScreenPt,
  p1Price: number,
  p2Price: number,
  isDark: boolean,
  isPreview: boolean
) {
  const pDiff = p2Price - p1Price;
  const pPct = ((pDiff / p1Price) * 100).toFixed(2);
  const sign = pDiff >= 0 ? "+" : "";
  const label = `${sign}${pPct}% (${sign}${pDiff.toFixed(2)})`;

  const midX = (s1.x + s2.x) / 2;
  const midY = (s1.y + s2.y) / 2;

  ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  const tw = ctx.measureText(label).width;
  const bw = tw + 12;
  const bh = 18;
  const bx = midX - bw / 2;
  const by = midY - bh - 8;

  const bgColor = isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)";
  const textColor = pDiff >= 0 ? "#26a69a" : "#ef5350";
  const borderColor = pDiff >= 0 ? "#26a69a44" : "#ef535044";

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.stroke();

  ctx.fillStyle = isPreview ? textColor + "cc" : textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, by + bh / 2);
}

/** TV-style selection glow: thin colorful halo */
function drawSelectionGlow(ctx: CanvasRenderingContext2D, a: ScreenPt, b: ScreenPt, color: string) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color + "3a";
  ctx.lineWidth = 8;
  ctx.setLineDash([]);
  ctx.stroke();
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

// ─── RenderContext ───────────────────────────────────────────────────────────

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

// ─── Main renderer ───────────────────────────────────────────────────────────

export function renderDrawing(item: DrawingItem, rc: RenderContext) {
  const { ctx, width, height, chartPointToScreen, priceToY, selectedId, isDark, isPreview } = rc;
  const type = normalizeDrawingType(item.type);
  const isSelected = item.id === selectedId;
  const style: DrawingStyle = item.style ?? {};

  // Resolve color — TV default blue
  const TV_BLUE = "#2962FF";
  const lineColor = style.color ?? TV_BLUE;

  const bgBadge = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.92)";

  ctx.save();

  // Preview: semi-transparent solid line (NOT dashed — TV style)
  if (isPreview) {
    ctx.globalAlpha = 0.75;
  }

  const s1 = item.p1 ? chartPointToScreen(item.p1) : null;
  const s2 = item.p2 ? chartPointToScreen(item.p2) : null;
  const s3 = item.p3 ? chartPointToScreen(item.p3) : null;

  // ─── TRENDLINE / INFO_LINE / ARROW ───────────────────────────────────────
  if (
    (type === "trendline" || type === "info_line" || type === "arrow") &&
    s1 &&
    s2
  ) {
    // Determine actual draw endpoints based on extend options
    let drawA: ScreenPt = s1;
    let drawB: ScreenPt = s2;

    if (!isPreview) {
      if (style.extendLeft && style.extendRight) {
        const ext = extendLineToBounds(s1, s2, width, height);
        if (ext) { drawA = ext[0]; drawB = ext[1]; }
      } else if (style.extendLeft) {
        drawA = extendLeftBound(s1, s2, width, height);
      } else if (style.extendRight) {
        drawB = extendRightBound(s1, s2, width, height);
      }
    }

    // Selection glow
    if (isSelected) {
      drawSelectionGlow(ctx, drawA, drawB, lineColor);
    }

    // Main line
    ctx.beginPath();
    ctx.moveTo(drawA.x, drawA.y);
    ctx.lineTo(drawB.x, drawB.y);
    ctx.strokeStyle = lineColor;
    applyLineStyle(ctx, style);
    ctx.stroke();
    resetLineDash(ctx);

    // Arrow head (for arrow tool)
    if (type === "arrow") {
      drawArrowHead(ctx, s1, s2, lineColor);
    }

    // Extension arrows
    if (!isPreview && style.extendRight) {
      drawExtendArrow(ctx, s1, drawB, lineColor);
    }
    if (!isPreview && style.extendLeft) {
      drawExtendArrow(ctx, s2, drawA, lineColor);
    }

    // Handles
    if (isSelected || isPreview) {
      drawHandles(ctx, [s1, s2], lineColor, isSelected);
    }

    // Angle badge (shown when selected and line has some length)
    if (isSelected && !isPreview && Math.hypot(s2.x - s1.x, s2.y - s1.y) > 20) {
      drawAngleBadge(ctx, s1, s2, lineColor);
    }

    // Info pill (only for info_line, not standard trendline)
    if (!isPreview && item.p2 && type === "info_line") {
      drawInfoPill(ctx, s1, s2, item.p1.price, item.p2.price, isDark, false);
    }

    // Axis labels when selected
    if (isSelected && !isPreview) {
      if (item.p2) {
        drawPriceAxisLabel(ctx, s1.y, item.p1.price, lineColor, width, true);
        drawPriceAxisLabel(ctx, s2.y, item.p2.price, lineColor, width, true);
        drawTimeAxisMarker(ctx, s1.x, lineColor, height, true);
        drawTimeAxisMarker(ctx, s2.x, lineColor, height, true);
      }
    }

  } else if (type === "ray" && s1 && s2) {
    // ─── RAY ───────────────────────────────────────────────────────────────
    const [a, b] = rayToBounds(s1, s2, width, height);
    if (isSelected) drawSelectionGlow(ctx, a, b, lineColor);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = lineColor;
    applyLineStyle(ctx, style);
    ctx.stroke();
    resetLineDash(ctx);
    drawExtendArrow(ctx, s1, b, lineColor);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], lineColor, isSelected);
    if (isSelected && !isPreview && item.p2) {
      drawPriceAxisLabel(ctx, s1.y, item.p1.price, lineColor, width, true);
      drawTimeAxisMarker(ctx, s1.x, lineColor, height, true);
    }

  } else if (type === "extended_line" && s1 && s2) {
    // ─── EXTENDED LINE ─────────────────────────────────────────────────────
    const ext = extendLineToBounds(s1, s2, width, height);
    if (ext) {
      if (isSelected) drawSelectionGlow(ctx, ext[0], ext[1], lineColor);
      ctx.beginPath();
      ctx.moveTo(ext[0].x, ext[0].y);
      ctx.lineTo(ext[1].x, ext[1].y);
      ctx.strokeStyle = lineColor;
      applyLineStyle(ctx, style);
      ctx.stroke();
      resetLineDash(ctx);
    }
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], lineColor, isSelected);
    if (isSelected && !isPreview && item.p2) {
      drawPriceAxisLabel(ctx, s1.y, item.p1.price, lineColor, width, true);
      drawPriceAxisLabel(ctx, s2.y, item.p2.price, lineColor, width, true);
    }

  } else if (type === "horizontal_line" && s1) {
    // ─── HORIZONTAL LINE ───────────────────────────────────────────────────
    const hColor = style.color ?? "#F59E0B";
    if (isSelected) {
      ctx.beginPath();
      ctx.moveTo(0, s1.y);
      ctx.lineTo(width, s1.y);
      ctx.strokeStyle = hColor + "3a";
      ctx.lineWidth = 8;
      ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, s1.y);
    ctx.lineTo(width, s1.y);
    ctx.strokeStyle = hColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.stroke();
    resetLineDash(ctx);

    // Price label on right axis
    const label = item.p1.price.toFixed(2);
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    const tw = ctx.measureText(label).width;
    const bw = tw + 10;
    ctx.fillStyle = hColor;
    ctx.beginPath();
    ctx.roundRect(width - bw - 2, s1.y - 9, bw, 18, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width - bw / 2 - 2, s1.y);

    if (isSelected || isPreview) drawHandles(ctx, [s1], hColor, isSelected);

  } else if (type === "vertical_line" && s1) {
    // ─── VERTICAL LINE ─────────────────────────────────────────────────────
    const vColor = style.color ?? "#A855F7";
    ctx.beginPath();
    ctx.moveTo(s1.x, 0);
    ctx.lineTo(s1.x, height);
    ctx.strokeStyle = vColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.stroke();
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1], vColor, isSelected);

  } else if (type === "cross_line" && s1) {
    // ─── CROSS LINE ────────────────────────────────────────────────────────
    const cColor = style.color ?? "#06B6D4";
    ctx.beginPath();
    ctx.moveTo(0, s1.y);
    ctx.lineTo(width, s1.y);
    ctx.moveTo(s1.x, 0);
    ctx.lineTo(s1.x, height);
    ctx.strokeStyle = cColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.stroke();
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1], cColor, isSelected);

  } else if (type === "parallel_channel" && s1 && s2) {
    // ─── PARALLEL CHANNEL ──────────────────────────────────────────────────
    const pcColor = style.color ?? "#3B82F6";
    let offsetY = 40;
    if (s3) {
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

    if (isSelected) drawSelectionGlow(ctx, a1, a2, pcColor);

    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.moveTo(a2.x, a2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.strokeStyle = pcColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.75);
    ctx.stroke();
    resetLineDash(ctx);

    ctx.fillStyle = pcColor + "14";
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.closePath();
    ctx.fill();

    if (isSelected || isPreview) drawHandles(ctx, [s1, s2, ...(s3 ? [s3] : [])], pcColor, isSelected);

  } else if (type === "pitchfork" && s1 && s2 && s3) {
    // ─── PITCHFORK ─────────────────────────────────────────────────────────
    const pfColor = style.color ?? "#8B5CF6";
    const mid = { x: (s2.x + s3.x) / 2, y: (s2.y + s3.y) / 2 };
    const [medA, medB] = rayToBounds(s1, mid, width, height);
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
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.strokeStyle = pfColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.75);
    ctx.stroke();
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2, s3], pfColor, isSelected);

  } else if ((type === "fibonacci" || type === "fib_extension") && s1 && s2) {
    // ─── FIBONACCI ─────────────────────────────────────────────────────────
    const levels =
      type === "fib_extension"
        ? [0, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618]
        : [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const tvFibColors = ["#F44336", "#FF9800", "#EAB308", "#26A69A", "#2196F3", "#9C27B0", "#607D8B"];
    const pMax = Math.max(item.p1.price, item.p2!.price);
    const pMin = Math.min(item.p1.price, item.p2!.price);
    const pRange = pMax - pMin || 1;
    const base = type === "fib_extension" ? item.p1.price : pMax;
    const range = type === "fib_extension" ? item.p2!.price - item.p1.price : -pRange;

    levels.forEach((lvl, idx) => {
      const priceLvl = base + range * lvl;
      const y = priceToY(priceLvl);
      if (y === null) return;
      const fibColor = tvFibColors[idx % tvFibColors.length];
      ctx.beginPath();
      ctx.moveTo(Math.min(s1.x, s2.x), y);
      ctx.lineTo(Math.max(s1.x, s2.x), y);
      ctx.strokeStyle = fibColor;
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.setLineDash([]);
      ctx.stroke();

      // Fill between levels
      if (idx > 0) {
        const prevLvl = levels[idx - 1];
        const prevPrice = base + range * prevLvl;
        const prevY = priceToY(prevPrice);
        if (prevY !== null) {
          ctx.fillStyle = fibColor + "0d";
          ctx.fillRect(Math.min(s1.x, s2.x), Math.min(y, prevY), Math.abs(s2.x - s1.x), Math.abs(prevY - y));
        }
      }

      ctx.setLineDash([]);
      ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.fillStyle = fibColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${lvl} (${priceLvl.toFixed(2)})`, Math.min(s1.x, s2.x) + 4, y - 1);
    });

    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], style.color ?? "#26A69A", isSelected);

  } else if ((type === "rectangle" || type === "shapes") && s1 && s2) {
    // ─── RECTANGLE ─────────────────────────────────────────────────────────
    const rColor = style.color ?? "#3B82F6";
    const x = Math.min(s1.x, s2.x);
    const y = Math.min(s1.y, s2.y);
    const w = Math.abs(s2.x - s1.x);
    const h = Math.abs(s2.y - s1.y);
    ctx.fillStyle = rColor + (isSelected ? "2e" : "1a");
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.strokeRect(x, y, w, h);
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], rColor, isSelected);

  } else if (type === "ellipse" && s1 && s2) {
    // ─── ELLIPSE ───────────────────────────────────────────────────────────
    const eColor = style.color ?? "#3B82F6";
    const cx = (s1.x + s2.x) / 2;
    const cy = (s1.y + s2.y) / 2;
    const rx = Math.abs(s2.x - s1.x) / 2;
    const ry = Math.abs(s2.y - s1.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.fillStyle = eColor + (isSelected ? "26" : "1a");
    ctx.fill();
    ctx.strokeStyle = eColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.stroke();
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], eColor, isSelected);

  } else if (type === "triangle" && s1 && s2 && s3) {
    // ─── TRIANGLE ──────────────────────────────────────────────────────────
    const tColor = style.color ?? "#3B82F6";
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.closePath();
    ctx.fillStyle = tColor + (isSelected ? "26" : "1a");
    ctx.fill();
    ctx.strokeStyle = tColor;
    applyLineStyle(ctx, style, style.lineWidth ?? 1.5);
    ctx.stroke();
    resetLineDash(ctx);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2, s3], tColor, isSelected);

  } else if ((type === "brush" || type === "highlighter") && item.points && item.points.length > 1) {
    // ─── BRUSH / HIGHLIGHTER ───────────────────────────────────────────────
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
      const bColor = style.color ?? "#EC4899";
      ctx.strokeStyle = bColor + (isSelected ? "ee" : "cc");
      ctx.lineWidth = style.lineWidth ?? (isSelected ? 3.5 : 2.5);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    ctx.stroke();

  } else if (type === "text" && s1) {
    // ─── TEXT ──────────────────────────────────────────────────────────────
    const label = item.text || "Note";
    ctx.setLineDash([]);
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    const tw = ctx.measureText(label).width;
    const tColor = style.color ?? "#3B82F6";
    ctx.fillStyle = isSelected ? tColor : tColor + "cc";
    ctx.beginPath();
    ctx.roundRect(s1.x, s1.y - 12, tw + 16, 24, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, s1.x + 8, s1.y);

  } else if (type === "callout" && s1) {
    // ─── CALLOUT ───────────────────────────────────────────────────────────
    const label = item.text || "Callout";
    const sTarget = s2 || { x: s1.x + 80, y: s1.y - 40 };
    ctx.setLineDash([]);
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    const tw = ctx.measureText(label).width;
    const bx = sTarget.x;
    const by = sTarget.y - 12;
    const bw = tw + 16;
    const bh = 28;
    const callColor = style.color ?? "#3B82F6";
    ctx.fillStyle = isSelected ? callColor : callColor + "dd";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
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
    if (isSelected || isPreview) drawHandles(ctx, [s1, sTarget], callColor, isSelected);

  } else if (type === "price_label" && s1) {
    // ─── PRICE LABEL ───────────────────────────────────────────────────────
    const label = item.text || item.p1.price.toFixed(2);
    ctx.setLineDash([]);
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    const tw = ctx.measureText(label).width;
    const plColor = style.color ?? "#10B981";
    ctx.fillStyle = isSelected ? plColor : plColor + "cc";
    ctx.beginPath();
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

  } else if (type === "smile" && s1) {
    // ─── EMOJI ─────────────────────────────────────────────────────────────
    ctx.setLineDash([]);
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text || "🚀", s1.x, s1.y);

  } else if ((type === "ruler" || type === "date_range" || type === "price_range") && s1 && s2) {
    // ─── RULER / DATE RANGE / PRICE RANGE ─────────────────────────────────
    const x = Math.min(s1.x, s2.x);
    const y = Math.min(s1.y, s2.y);
    const w = Math.abs(s2.x - s1.x);
    const h = Math.abs(s2.y - s1.y);
    const color = type === "ruler" ? "#A855F7" : type === "date_range" ? "#06B6D4" : "#F59E0B";
    ctx.fillStyle =
      type === "ruler"
        ? "rgba(168, 85, 247, 0.15)"
        : type === "date_range"
          ? "rgba(6, 182, 212, 0.12)"
          : "rgba(245, 158, 11, 0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    const barsApprox = Math.abs(item.p2!.time - item.p1.time);
    const diffPct = (((item.p2!.price - item.p1.price) / item.p1.price) * 100).toFixed(2);
    const priceDiff = (item.p2!.price - item.p1.price).toFixed(2);
    let label = "";
    if (type === "date_range") label = `Δt: ${barsApprox}s`;
    else if (type === "price_range") label = `ΔP: ${priceDiff} (${diffPct}%)`;
    else label = `${diffPct}% (${priceDiff})`;

    ctx.setLineDash([]);
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = bgBadge;
    ctx.fillRect(x + 4, y + 4, tw + 12, 20);
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 10, y + 14);
    if (isSelected || isPreview) drawHandles(ctx, [s1, s2], color, isSelected);
  }

  ctx.restore();
}

// ─── Zoom box ────────────────────────────────────────────────────────────────

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
  ctx.fillStyle = "rgba(41, 98, 255, 0.10)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#2962FF";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

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
  const style = item.style ?? {};

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
      return distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= 10;
    }
    if (type === "extended_line") {
      const ext = extendLineToBounds(s1, s2, canvasW, canvasH);
      if (!ext) return false;
      return distanceToSegment(x, y, ext[0].x, ext[0].y, ext[1].x, ext[1].y) <= 10;
    }

    // For trendline with extend options
    let drawA = s1;
    let drawB = s2;
    if (style.extendLeft && style.extendRight) {
      const ext = extendLineToBounds(s1, s2, canvasW, canvasH);
      if (ext) { drawA = ext[0]; drawB = ext[1]; }
    } else if (style.extendLeft) {
      drawA = extendLeftBound(s1, s2, canvasW, canvasH);
    } else if (style.extendRight) {
      drawB = extendRightBound(s1, s2, canvasW, canvasH);
    }
    return distanceToSegment(x, y, drawA.x, drawA.y, drawB.x, drawB.y) <= 10;
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
    const pMax = Math.max(item.p1.price, item.p2.price);
    const pMin = Math.min(item.p1.price, item.p2.price);
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
      return nx * nx + ny * ny <= 1.2;
    }
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  if (type === "triangle" && s1 && s2 && s3) {
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

/** Return which handle (p1/p2/p3) is under the cursor, or null */
export function hitTestHandle(
  item: DrawingItem,
  x: number,
  y: number,
  chartPointToScreen: ChartPointFn
): "p1" | "p2" | "p3" | null {
  const HANDLE_RADIUS = 8;
  if (item.p1) {
    const s = chartPointToScreen(item.p1);
    if (s && Math.hypot(x - s.x, y - s.y) <= HANDLE_RADIUS) return "p1";
  }
  if (item.p2) {
    const s = chartPointToScreen(item.p2);
    if (s && Math.hypot(x - s.x, y - s.y) <= HANDLE_RADIUS) return "p2";
  }
  if (item.p3) {
    const s = chartPointToScreen(item.p3);
    if (s && Math.hypot(x - s.x, y - s.y) <= HANDLE_RADIUS) return "p3";
  }
  return null;
}

/** Draw horizontal pane separators and indicator titles between main chart and sub-panes */
export function renderPaneSeparators(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  studies: string[],
  isDark: boolean,
  indicatorRatio: number = 0.35,
  isHovered: boolean = false
) {
  const hasVolume = studies.includes("STD;Volume");
  const hasMACD = studies.includes("STD;MACD");
  const hasRSI = studies.includes("STD;RSI");

  if (!hasMACD && !hasRSI && !hasVolume) return;

  const strokeColor = isDark ? "rgba(51, 65, 85, 0.75)" : "rgba(203, 213, 225, 0.85)";
  const activeStrokeColor = "#2962FF";
  const labelBg = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)";
  const labelText = isDark ? "#94a3b8" : "#475569";

  const mainChartBottomY = Math.round(height * (1 - indicatorRatio));

  ctx.save();
  ctx.setLineDash([]);

  // Main Chart Bottom Separator
  ctx.beginPath();
  ctx.moveTo(0, mainChartBottomY);
  ctx.lineTo(width, mainChartBottomY);
  ctx.strokeStyle = isHovered ? activeStrokeColor : strokeColor;
  ctx.lineWidth = isHovered ? 2.5 : 1.5;
  ctx.stroke();

  // Grip handle pill in center
  const midX = width / 2;
  ctx.fillStyle = isHovered ? activeStrokeColor : strokeColor;
  ctx.beginPath();
  ctx.roundRect(midX - 18, mainChartBottomY - 3, 36, 6, 3);
  ctx.fill();

  ctx.font = "600 10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  const tagText = isHovered ? "DRAG TO RESIZE PANE" : "INDICATORS";
  const tw = ctx.measureText(tagText).width;
  ctx.fillStyle = isHovered ? activeStrokeColor : labelBg;
  ctx.fillRect(8, mainChartBottomY - 16, tw + 10, 15);
  ctx.fillStyle = isHovered ? "#ffffff" : labelText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, 13, mainChartBottomY - 8);

  // MACD Separator & Title
  if (hasMACD) {
    const macdTopY = hasRSI ? Math.round(height * (1 - indicatorRatio * 0.5)) : mainChartBottomY;
    if (hasRSI) {
      ctx.beginPath();
      ctx.moveTo(0, macdTopY);
      ctx.lineTo(width, macdTopY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = labelBg;
    ctx.fillRect(10, macdTopY + 3, 115, 16);
    ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("MACD (12, 26, 9)", 14, macdTopY + 11);
  }

  // RSI Separator & Title
  if (hasRSI) {
    const rsiTopY = Math.round(height * (1 - indicatorRatio * 0.45));
    ctx.beginPath();
    ctx.moveTo(0, rsiTopY);
    ctx.lineTo(width, rsiTopY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = labelBg;
    ctx.fillRect(10, rsiTopY + 3, 65, 16);
    ctx.fillStyle = isDark ? "#f472b6" : "#ec4899";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("RSI (14)", 14, rsiTopY + 11);
  }

  // Volume indicator label
  if (hasVolume && !hasMACD && !hasRSI) {
    const volTopY = mainChartBottomY;
    ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = labelBg;
    ctx.fillRect(10, volTopY + 3, 40, 16);
    ctx.fillStyle = isDark ? "#34d399" : "#10b981";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Vol", 14, volTopY + 11);
  }

  // Right price scale column vertical separator & distinct indicator scale boxes
  const axisX = width - 65;
  const axisWidth = 65;

  // 1. Draw vertical separator dividing chart canvas from right price scale column
  ctx.beginPath();
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, height);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  const axisBg = isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(248, 250, 252, 0.6)";
  const axisTagBg = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(226, 232, 240, 0.95)";

  // 2. MACD Right Scale Box & Labels
  if (hasMACD) {
    const macdTopY = hasRSI ? Math.round(height * (1 - indicatorRatio * 0.5)) : mainChartBottomY;
    const macdBottomY = hasRSI ? Math.round(height * (1 - indicatorRatio * 0.45)) : height;

    ctx.fillStyle = axisBg;
    ctx.fillRect(axisX + 1, macdTopY + 1, axisWidth - 1, (hasRSI ? macdBottomY : height) - macdTopY - 1);

    ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("MACD", axisX + axisWidth / 2, macdTopY + 4);
  }

  // 3. RSI Right Scale Box & Level Tags (70, 50, 30)
  if (hasRSI) {
    const rsiTopY = Math.round(height * (1 - indicatorRatio * 0.45));
    const rsiHeight = height - rsiTopY;

    ctx.fillStyle = axisBg;
    ctx.fillRect(axisX + 1, rsiTopY + 1, axisWidth - 1, rsiHeight - 1);

    ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#f472b6" : "#ec4899";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("RSI", axisX + axisWidth / 2, rsiTopY + 3);

    // Overbought 70 level badge on right axis
    const y70 = Math.round(rsiTopY + rsiHeight * 0.3);
    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.fillRect(axisX + 6, y70 - 7, 24, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("70", axisX + 18, y70);

    // Oversold 30 level badge on right axis
    const y30 = Math.round(rsiTopY + rsiHeight * 0.7);
    ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
    ctx.fillRect(axisX + 6, y30 - 7, 24, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("30", axisX + 18, y30);
  }

  // 4. Volume Right Scale Box
  if (hasVolume && !hasMACD && !hasRSI) {
    ctx.fillStyle = axisBg;
    ctx.fillRect(axisX + 1, mainChartBottomY + 1, axisWidth - 1, height - mainChartBottomY - 1);

    ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillStyle = isDark ? "#34d399" : "#10b981";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("VOL", axisX + axisWidth / 2, mainChartBottomY + 4);
  }

  ctx.restore();
}
