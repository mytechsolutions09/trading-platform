import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type Time,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { useTrading } from "../../context/TradingContext";
import { DrawingToolbar } from "../trading/DrawingToolbar";
import { fetchCandles } from "../../services/prices";

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingItem {
  id: string;
  type: "trendline" | "pitchfork" | "fibonacci" | "shapes" | "brush" | "text" | "smile" | "ruler";
  p1: DrawingPoint;
  p2?: DrawingPoint;
  points?: DrawingPoint[];
  text?: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Props {
  symbol?: string;
  interval?: string;
  height?: string | number;
  studies?: string[];
}

export function TradingViewChart({
  interval = "60",
  height = "100%",
  studies = ["STD;SMA", "STD;EMA", "STD;MACD", "STD;RSI", "STD;Volume"],
}: Props) {
  const { selected, theme } = useTrading();
  const activeItem = selected;
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandleData[]>([]);

  // Drawing Toolbar State
  const [activeTool, setActiveTool] = useState<string>("trendline");
  const [magnetActive, setMagnetActive] = useState(false);
  const [toolsLocked, setToolsLocked] = useState(false);
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  const [drawingsHidden, setDrawingsHidden] = useState(false);

  // Drawings state
  const storageKey = `apex-trade-drawings-${activeItem?.symbol || "default"}`;
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load symbol-specific drawings on symbol change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setDrawings(saved ? JSON.parse(saved) : []);
    } catch {
      setDrawings([]);
    }
  }, [storageKey]);

  // Persist drawings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(drawings));
    } catch {
      // ignore
    }
  }, [drawings, storageKey]);

  // Active drawing in-progress state
  const [pendingPoints, setPendingPoints] = useState<DrawingPoint[]>([]);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const brushPointsRef = useRef<DrawingPoint[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Keyboard shortcut: Delete or Backspace key deletes selected drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDrawingId) {
          setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawingId]);

  // Helper: Distance from point (px, py) to line segment (x1, y1)-(x2, y2)
  const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Helper: Convert screen pixel (x, y) to { time, price }
  const screenToChartPoint = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return null;

      const timeScale = chart.timeScale();
      const timeVal = timeScale.coordinateToTime(x);
      const priceVal = series.coordinateToPrice(y);

      if (timeVal === null || priceVal === null) return null;

      let rawTime = typeof timeVal === "number" ? timeVal : Number(timeVal);
      let rawPrice = Number(priceVal);

      // Snap to OHLC if magnet is active
      if (magnetActive && candlesRef.current.length > 0) {
        const closestCandle = candlesRef.current.reduce((prev, curr) =>
          Math.abs(curr.time - rawTime) < Math.abs(prev.time - rawTime) ? curr : prev
        );
        if (closestCandle) {
          rawTime = closestCandle.time;
          const ohlc = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
          const closestPrice = ohlc.reduce((prev, curr) =>
            Math.abs(curr - rawPrice) < Math.abs(prev - rawPrice) ? curr : prev
          );
          rawPrice = closestPrice;
        }
      }

      return { time: rawTime, price: rawPrice };
    },
    [magnetActive]
  );

  // Helper: Convert { time, price } to screen pixel (x, y)
  const chartPointToScreen = useCallback((pt: DrawingPoint): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;

    const x = chart.timeScale().timeToCoordinate(pt.time as Time);
    const y = series.priceToCoordinate(pt.price);

    if (x === null || y === null) return null;
    return { x: Number(x), y: Number(y) };
  }, []);

  // Hit testing: Find drawing under (x, y) cursor
  const findDrawingAt = useCallback(
    (x: number, y: number): DrawingItem | null => {
      if (drawingsHidden) return null;
      for (let i = drawings.length - 1; i >= 0; i--) {
        const item = drawings[i];
        if (item.type === "trendline" && item.p1 && item.p2) {
          const s1 = chartPointToScreen(item.p1);
          const s2 = chartPointToScreen(item.p2);
          if (s1 && s2) {
            if (distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y) <= 12) return item;
          }
        } else if (item.type === "fibonacci" && item.p1 && item.p2) {
          const s1 = chartPointToScreen(item.p1);
          const s2 = chartPointToScreen(item.p2);
          if (s1 && s2) {
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
            const pMin = Math.min(item.p1.price, item.p2.price);
            const pMax = Math.max(item.p1.price, item.p2.price);
            const pRange = pMax - pMin;
            for (const lvl of levels) {
              const priceLvl = pMax - pRange * lvl;
              const screenLvl = seriesRef.current?.priceToCoordinate(priceLvl);
              if (screenLvl !== null && screenLvl !== undefined) {
                if (Math.abs(y - Number(screenLvl)) <= 8) return item;
              }
            }
          }
        } else if ((item.type === "shapes" || item.type === "ruler") && item.p1 && item.p2) {
          const s1 = chartPointToScreen(item.p1);
          const s2 = chartPointToScreen(item.p2);
          if (s1 && s2) {
            const minX = Math.min(s1.x, s2.x);
            const maxX = Math.max(s1.x, s2.x);
            const minY = Math.min(s1.y, s2.y);
            const maxY = Math.max(s1.y, s2.y);
            if (x >= minX - 6 && x <= maxX + 6 && y >= minY - 6 && y <= maxY + 6) return item;
          }
        } else if (item.type === "brush" && item.points && item.points.length > 1) {
          for (let j = 0; j < item.points.length - 1; j++) {
            const s1 = chartPointToScreen(item.points[j]);
            const s2 = chartPointToScreen(item.points[j + 1]);
            if (s1 && s2) {
              if (distanceToSegment(x, y, s1.x, s1.y, s2.x, s2.y) <= 12) return item;
            }
          }
        } else if ((item.type === "text" || item.type === "smile") && item.p1) {
          const s = chartPointToScreen(item.p1);
          if (s && Math.hypot(x - s.x, y - s.y) <= 22) return item;
        }
      }
      return null;
    },
    [drawings, drawingsHidden, chartPointToScreen]
  );

  // Redraw Canvas Overlay
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (drawingsHidden) return;

    const isDark = theme === "dark";
    const lineColor = "#3b82f6"; // Vibrant blue
    const handleColor = isDark ? "#60a5fa" : "#2563eb";
    const bgBadge = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)";

    const renderItem = (item: DrawingItem, isPreview = false) => {
      const isSelected = item.id === selectedDrawingId;

      ctx.save();
      if (isPreview) {
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.85;
      }

      if (item.type === "trendline" && item.p1 && item.p2) {
        const s1 = chartPointToScreen(item.p1);
        const s2 = chartPointToScreen(item.p2);
        if (s1 && s2) {
          if (isSelected) {
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
            ctx.lineWidth = 6;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.strokeStyle = isSelected ? "#2563eb" : lineColor;
          ctx.lineWidth = isSelected ? 2.5 : 2;
          ctx.stroke();

          // Endpoint handles
          [s1, s2].forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isSelected ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? "#2563eb" : handleColor;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });

          // Price Change Badge
          const pDiff = item.p2.price - item.p1.price;
          const pPct = ((pDiff / item.p1.price) * 100).toFixed(2);
          const sign = pDiff >= 0 ? "+" : "";
          const badgeText = `${sign}${pPct}% (${sign}${pDiff.toFixed(2)})`;

          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2 - 12;

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

          // Floating Delete Badge when selected
          if (isSelected && !isPreview) {
            const btnX = midX;
            const btnY = midY - 22;
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(btnX - 32, btnY - 9, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", btnX, btnY);
          }
        }
      } else if (item.type === "fibonacci" && item.p1 && item.p2) {
        const s1 = chartPointToScreen(item.p1);
        const s2 = chartPointToScreen(item.p2);
        if (s1 && s2) {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
          const colors = ["#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6"];
          const pMin = Math.min(item.p1.price, item.p2.price);
          const pMax = Math.max(item.p1.price, item.p2.price);
          const pRange = pMax - pMin;

          levels.forEach((lvl, idx) => {
            const priceLvl = pMax - pRange * lvl;
            const screenLvl = seriesRef.current?.priceToCoordinate(priceLvl);
            if (screenLvl !== null && screenLvl !== undefined) {
              const y = Number(screenLvl);
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(canvas.width, y);
              ctx.strokeStyle = colors[idx % colors.length];
              ctx.lineWidth = isSelected ? 2 : 1.5;
              ctx.stroke();

              ctx.font = "600 10px Inter, sans-serif";
              ctx.fillStyle = colors[idx % colors.length];
              ctx.textAlign = "left";
              ctx.fillText(`Fib ${lvl} (${priceLvl.toFixed(2)})`, 10, y - 4);
            }
          });

          if (isSelected && !isPreview) {
            const midX = (s1.x + s2.x) / 2;
            const midY = (s1.y + s2.y) / 2;
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(midX - 32, midY - 9, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", midX, midY);
          }
        }
      } else if (item.type === "shapes" && item.p1 && item.p2) {
        const s1 = chartPointToScreen(item.p1);
        const s2 = chartPointToScreen(item.p2);
        if (s1 && s2) {
          const x = Math.min(s1.x, s2.x);
          const y = Math.min(s1.y, s2.y);
          const w = Math.abs(s2.x - s1.x);
          const h = Math.abs(s2.y - s1.y);

          ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.strokeRect(x, y, w, h);

          if (isSelected && !isPreview) {
            const btnX = x + w / 2;
            const btnY = y - 12;
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(btnX - 32, btnY - 9, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", btnX, btnY);
          }
        }
      } else if (item.type === "ruler" && item.p1 && item.p2) {
        const s1 = chartPointToScreen(item.p1);
        const s2 = chartPointToScreen(item.p2);
        if (s1 && s2) {
          const x = Math.min(s1.x, s2.x);
          const y = Math.min(s1.y, s2.y);
          const w = Math.abs(s2.x - s1.x);
          const h = Math.abs(s2.y - s1.y);

          ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.strokeRect(x, y, w, h);

          const diffPct = (((item.p2.price - item.p1.price) / item.p1.price) * 100).toFixed(2);
          const label = `Measure: ${diffPct}% (${(item.p2.price - item.p1.price).toFixed(2)})`;
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillStyle = bgBadge;
          ctx.fillRect(x + 4, y + 4, ctx.measureText(label).width + 12, 20);
          ctx.fillStyle = "#a855f7";
          ctx.fillText(label, x + 10, y + 18);

          if (isSelected && !isPreview) {
            const btnX = x + w / 2;
            const btnY = y - 12;
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(btnX - 32, btnY - 9, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", btnX, btnY);
          }
        }
      } else if (item.type === "brush" && item.points && item.points.length > 1) {
        ctx.beginPath();
        let started = false;
        item.points.forEach((pt) => {
          const s = chartPointToScreen(pt);
          if (s) {
            if (!started) {
              ctx.moveTo(s.x, s.y);
              started = true;
            } else {
              ctx.lineTo(s.x, s.y);
            }
          }
        });
        ctx.strokeStyle = isSelected ? "#db2777" : "#ec4899";
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.stroke();

        if (isSelected && !isPreview && item.points.length > 0) {
          const midPt = item.points[Math.floor(item.points.length / 2)];
          const sMid = chartPointToScreen(midPt);
          if (sMid) {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(sMid.x - 32, sMid.y - 20, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", sMid.x, sMid.y - 11);
          }
        }
      } else if (item.type === "text" && item.p1) {
        const s = chartPointToScreen(item.p1);
        if (s) {
          const label = item.text || "Note";
          ctx.font = "600 12px Inter, sans-serif";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = isSelected ? "#2563eb" : "#3b82f6";
          ctx.beginPath();
          ctx.roundRect(s.x, s.y - 12, tw + 16, 24, 6);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, s.x + 8, s.y + 4);

          if (isSelected && !isPreview) {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(s.x + tw / 2 - 24, s.y - 32, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", s.x + tw / 2 + 8, s.y - 23);
          }
        }
      } else if (item.type === "smile" && item.p1) {
        const s = chartPointToScreen(item.p1);
        if (s) {
          ctx.font = "20px sans-serif";
          ctx.fillText("🚀", s.x, s.y);

          if (isSelected && !isPreview) {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.roundRect(s.x - 22, s.y - 28, 64, 18, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🗑 Delete", s.x + 10, s.y - 19);
          }
        }
      }

      ctx.restore();
    };

    // Render completed drawings
    drawings.forEach((item) => renderItem(item, false));

    // Render drawing preview in progress
    if (pendingPoints.length > 0 && mousePosRef.current) {
      const currentPt = screenToChartPoint(mousePosRef.current.x, mousePosRef.current.y);
      if (currentPt) {
        const previewItem: DrawingItem = {
          id: "preview",
          type: activeTool as any,
          p1: pendingPoints[0],
          p2: currentPt,
        };
        renderItem(previewItem, true);
      }
    }
  }, [drawings, drawingsHidden, pendingPoints, activeTool, theme, selectedDrawingId, screenToChartPoint, chartPointToScreen]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Chart setup useEffect
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeItem) return;

    let isSubscribed = true;
    container.innerHTML = "";

    const isDark = theme === "dark";
    const bg = isDark ? "#0b0e11" : "#ffffff";
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(226, 232, 240, 0.6)";

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 520,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: textColor,
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        visible: true,
      },
      timeScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    seriesRef.current = candleSeries;

    const hasVolume = studies.includes("STD;Volume");
    const hasSMA = studies.includes("STD;SMA");
    const hasEMA = studies.includes("STD;EMA");
    const hasMACD = studies.includes("STD;MACD");
    const hasRSI = studies.includes("STD;RSI");

    // Adjust candle scale margins dynamically based on active indicators
    let bottomMargin = 0.05;
    if (hasVolume) bottomMargin += 0.15;
    if (hasMACD) bottomMargin += 0.2;
    if (hasRSI) bottomMargin += 0.2;

    candleSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.05,
        bottom: Math.min(0.65, bottomMargin),
      },
    });

    // Volume Series
    const volumeSeries = hasVolume
      ? chart.addSeries(HistogramSeries, {
          color: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.2)",
          priceFormat: { type: "volume" },
          priceScaleId: "volume_scale",
        })
      : null;

    if (volumeSeries) {
      chart.priceScale("volume_scale").applyOptions({
        scaleMargins: {
          top: hasMACD || hasRSI ? 0.55 : 0.75,
          bottom: 0,
        },
      });
    }

    // Moving Averages
    const smaSeries = hasSMA
      ? chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 1.5,
          title: "SMA 20",
        })
      : null;

    const emaSeries = hasEMA
      ? chart.addSeries(LineSeries, {
          color: "#a855f7",
          lineWidth: 1.5,
          title: "EMA 50",
        })
      : null;

    // MACD Series (12, 26, 9)
    let macdFastSeries: any = null;
    let macdSignalSeries: any = null;
    let macdHistSeries: any = null;

    if (hasMACD) {
      macdFastSeries = chart.addSeries(LineSeries, {
        color: "#2563eb",
        lineWidth: 1.5,
        title: "MACD 12,26",
        priceScaleId: "macd_scale",
      });

      macdSignalSeries = chart.addSeries(LineSeries, {
        color: "#f97316",
        lineWidth: 1.5,
        title: "Signal 9",
        priceScaleId: "macd_scale",
      });

      macdHistSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: "macd_scale",
      });

      chart.priceScale("macd_scale").applyOptions({
        scaleMargins: {
          top: hasRSI ? 0.5 : 0.7,
          bottom: hasRSI ? 0.22 : 0.02,
        },
        visible: true,
      });
    }

    // RSI Series (14)
    let rsiSeries: any = null;
    let rsiUpperSeries: any = null;
    let rsiLowerSeries: any = null;

    if (hasRSI) {
      rsiSeries = chart.addSeries(LineSeries, {
        color: "#ec4899",
        lineWidth: 1.5,
        title: "RSI 14",
        priceScaleId: "rsi_scale",
      });

      rsiUpperSeries = chart.addSeries(LineSeries, {
        color: isDark ? "rgba(239, 68, 68, 0.6)" : "rgba(239, 68, 68, 0.7)",
        lineWidth: 1,
        lineStyle: 2,
        title: "70 OB",
        priceScaleId: "rsi_scale",
      });

      rsiLowerSeries = chart.addSeries(LineSeries, {
        color: isDark ? "rgba(16, 185, 129, 0.6)" : "rgba(16, 185, 129, 0.7)",
        lineWidth: 1,
        lineStyle: 2,
        title: "30 OS",
        priceScaleId: "rsi_scale",
      });

      chart.priceScale("rsi_scale").applyOptions({
        scaleMargins: {
          top: 0.75,
          bottom: 0.02,
        },
        visible: true,
      });
    }

    fetchCandles(activeItem, interval)
      .then((data) => {
        if (!isSubscribed || !data || data.length === 0) return;

        candlesRef.current = data.map((c) => ({
          time: Number(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        candleSeries.setData(
          data.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        // Volume data
        if (volumeSeries) {
          volumeSeries.setData(
            data.map((c) => ({
              time: c.time as Time,
              value: c.volume || 0,
              color:
                c.close >= c.open
                  ? isDark
                    ? "rgba(16, 185, 129, 0.35)"
                    : "rgba(16, 185, 129, 0.3)"
                  : isDark
                    ? "rgba(239, 68, 68, 0.35)"
                    : "rgba(239, 68, 68, 0.3)",
            }))
          );
        }

        // SMA 20
        if (smaSeries && data.length >= 20) {
          const smaData = [];
          for (let i = 19; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < 20; j++) sum += data[i - j].close;
            smaData.push({ time: data[i].time as Time, value: Number((sum / 20).toFixed(4)) });
          }
          smaSeries.setData(smaData);
        }

        // EMA 50
        if (emaSeries && data.length >= 50) {
          const emaData = [];
          const k = 2 / (50 + 1);
          let prev = data[0].close;
          for (let i = 0; i < data.length; i++) {
            const val = i === 0 ? prev : data[i].close * k + prev * (1 - k);
            prev = val;
            if (i >= 49) {
              emaData.push({ time: data[i].time as Time, value: Number(val.toFixed(4)) });
            }
          }
          emaSeries.setData(emaData);
        }

        // MACD (12, 26, 9)
        if (hasMACD && macdFastSeries && macdSignalSeries && macdHistSeries && data.length >= 26) {
          const k12 = 2 / (12 + 1);
          const k26 = 2 / (26 + 1);
          const k9 = 2 / (9 + 1);

          let ema12 = data[0].close;
          let ema26 = data[0].close;

          const macdLine: { time: Time; macd: number }[] = [];

          for (let i = 0; i < data.length; i++) {
            ema12 = data[i].close * k12 + ema12 * (1 - k12);
            ema26 = data[i].close * k26 + ema26 * (1 - k26);
            if (i >= 25) {
              macdLine.push({ time: data[i].time as Time, macd: ema12 - ema26 });
            }
          }

          if (macdLine.length >= 9) {
            let signal = macdLine[0].macd;
            const fastData = [];
            const signalData = [];
            const histData = [];

            for (let i = 0; i < macdLine.length; i++) {
              signal = macdLine[i].macd * k9 + signal * (1 - k9);
              const hist = macdLine[i].macd - signal;

              fastData.push({ time: macdLine[i].time, value: Number(macdLine[i].macd.toFixed(4)) });
              if (i >= 8) {
                signalData.push({ time: macdLine[i].time, value: Number(signal.toFixed(4)) });
                histData.push({
                  time: macdLine[i].time,
                  value: Number(hist.toFixed(4)),
                  color: hist >= 0 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)",
                });
              }
            }

            macdFastSeries.setData(fastData);
            macdSignalSeries.setData(signalData);
            macdHistSeries.setData(histData);
          }
        }

        // RSI (14)
        if (hasRSI && rsiSeries && rsiUpperSeries && rsiLowerSeries && data.length >= 15) {
          let gainSum = 0;
          let lossSum = 0;

          for (let i = 1; i <= 14; i++) {
            const diff = data[i].close - data[i - 1].close;
            if (diff >= 0) gainSum += diff;
            else lossSum -= diff;
          }

          let avgGain = gainSum / 14;
          let avgLoss = lossSum / 14;

          const rsiData = [];
          const upperData = [];
          const lowerData = [];

          for (let i = 15; i < data.length; i++) {
            const diff = data[i].close - data[i - 1].close;
            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;

            avgGain = (avgGain * 13 + gain) / 14;
            avgLoss = (avgLoss * 13 + loss) / 14;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - 100 / (1 + rs);

            const t = data[i].time as Time;
            rsiData.push({ time: t, value: Number(rsi.toFixed(2)) });
            upperData.push({ time: t, value: 70 });
            lowerData.push({ time: t, value: 30 });
          }

          rsiSeries.setData(rsiData);
          rsiUpperSeries.setData(upperData);
          rsiLowerSeries.setData(lowerData);
        }

        chart.timeScale().fitContent();
        drawOverlay();
      })
      .catch(() => undefined);

    // Re-render drawings on pan/zoom
    const handleRangeChange = () => {
      requestAnimationFrame(() => drawOverlay());
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);

    const handleResize = () => {
      if (container && container.clientWidth > 0) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight || 520,
        });

        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = container.clientWidth;
          overlayCanvasRef.current.height = container.clientHeight || 520;
          drawOverlay();
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    // Initial canvas sizing
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = container.clientWidth || 800;
      overlayCanvasRef.current.height = container.clientHeight || 520;
    }

    return () => {
      isSubscribed = false;
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [activeItem, interval, theme, JSON.stringify(studies), drawOverlay]);

  // Canvas Mouse Interactions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingsLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked floating delete button of currently selected drawing
    if (selectedDrawingId) {
      const selectedItem = drawings.find((d) => d.id === selectedDrawingId);
      if (selectedItem) {
        const hit = findDrawingAt(x, y);
        if (hit && hit.id === selectedDrawingId) {
          setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
          return;
        }
      }
    }

    // Check hit test for selecting existing drawing
    const hitDrawing = findDrawingAt(x, y);
    if (hitDrawing && activeTool === "crosshair") {
      setSelectedDrawingId(hitDrawing.id);
      return;
    }

    const pt = screenToChartPoint(x, y);
    if (!pt) return;

    if (["trendline", "fibonacci", "pitchfork", "shapes", "ruler"].includes(activeTool)) {
      if (pendingPoints.length === 0) {
        setPendingPoints([pt]);
        setSelectedDrawingId(null);
      } else {
        const newDrawing: DrawingItem = {
          id: Date.now().toString(),
          type: activeTool as any,
          p1: pendingPoints[0],
          p2: pt,
        };
        setDrawings((prev) => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
        setPendingPoints([]);
        if (!toolsLocked) {
          setActiveTool("crosshair");
        }
      }
    } else if (activeTool === "text") {
      const text = prompt("Enter text label for chart:", "Analysis Zone");
      if (text) {
        const newDrawing: DrawingItem = {
          id: Date.now().toString(),
          type: "text",
          p1: pt,
          text,
        };
        setDrawings((prev) => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
      }
      if (!toolsLocked) setActiveTool("crosshair");
    } else if (activeTool === "smile") {
      const newDrawing: DrawingItem = {
        id: Date.now().toString(),
        type: "smile",
        p1: pt,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setSelectedDrawingId(newDrawing.id);
      if (!toolsLocked) setActiveTool("crosshair");
    } else if (activeTool === "crosshair") {
      setSelectedDrawingId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "brush" || drawingsLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = screenToChartPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (pt) {
      setIsBrushing(true);
      brushPointsRef.current = [pt];
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };

    const canvas = overlayCanvasRef.current;

    // Dynamic cursor and pointer-events feedback when hovering over drawings
    if (activeTool === "crosshair") {
      const hit = findDrawingAt(x, y);
      if (canvas) {
        if (hit || selectedDrawingId !== null) {
          canvas.style.cursor = "pointer";
          canvas.style.pointerEvents = "auto";
        } else {
          canvas.style.cursor = "default";
          canvas.style.pointerEvents = "none";
        }
      }
    }

    if (pendingPoints.length > 0 || isBrushing) {
      if (isBrushing && activeTool === "brush") {
        const pt = screenToChartPoint(x, y);
        if (pt) {
          brushPointsRef.current.push(pt);
        }
      }
      requestAnimationFrame(drawOverlay);
    }
  };

  const handleMouseUp = () => {
    if (isBrushing && activeTool === "brush") {
      setIsBrushing(false);
      if (brushPointsRef.current.length > 1) {
        const newDrawing: DrawingItem = {
          id: Date.now().toString(),
          type: "brush",
          p1: brushPointsRef.current[0],
          points: [...brushPointsRef.current],
        };
        setDrawings((prev) => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
      }
      brushPointsRef.current = [];
      if (!toolsLocked) setActiveTool("crosshair");
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement | HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const chart = chartRef.current;
    if (!chart) return;
    const timeScale = chart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;

    // Smooth, gradual zoom step (3.5% per wheel tick)
    const deltaSign = Math.sign(e.deltaY);
    if (deltaSign === 0) return;
    const zoomStep = 1 + deltaSign * 0.035;

    const canvas = overlayCanvasRef.current;
    const rect = canvas?.getBoundingClientRect() || containerRef.current?.getBoundingClientRect();
    const mouseX = rect ? e.clientX - rect.left : (canvas?.width || 800) / 2;

    const logicalPos = timeScale.coordinateToLogical(mouseX);
    const pivot = logicalPos !== null ? Number(logicalPos) : (range.from + range.to) / 2;

    const newFrom = pivot - (pivot - range.from) * zoomStep;
    const newTo = pivot + (range.to - pivot) * zoomStep;

    if (newTo - newFrom >= 4) {
      timeScale.setVisibleLogicalRange({
        from: newFrom,
        to: newTo,
      });
      requestAnimationFrame(drawOverlay);
    }
  };

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
    setPendingPoints([]);
    setSelectedDrawingId(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [storageKey]);

  // Handle wrapper container mouse movements so crosshair mode can detect drawing hovers without blocking chart
  const handleWrapperMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "crosshair") return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = findDrawingAt(x, y);
    if (hit || selectedDrawingId !== null) {
      canvas.style.pointerEvents = "auto";
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.pointerEvents = "none";
      canvas.style.cursor = "default";
    }
  };

  const isDrawingToolActive = activeTool !== "crosshair" || pendingPoints.length > 0 || selectedDrawingId !== null;

  return (
    <div
      className="tv-chart-wrap"
      style={{
        height: height || "100%",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        minHeight: 520,
        position: "relative",
      }}
    >
      <DrawingToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        magnetActive={magnetActive}
        onToggleMagnet={() => setMagnetActive((v) => !v)}
        toolsLocked={toolsLocked}
        onToggleToolsLocked={() => setToolsLocked((v) => !v)}
        drawingsLocked={drawingsLocked}
        onToggleDrawingsLocked={() => setDrawingsLocked((v) => !v)}
        drawingsHidden={drawingsHidden}
        onToggleDrawingsHidden={() => setDrawingsHidden((v) => !v)}
        onClearDrawings={handleClearDrawings}
      />
      <div
        onMouseMove={handleWrapperMouseMove}
        onWheel={handleWheel}
        style={{
          height: "100%",
          flex: 1,
          minWidth: 0,
          minHeight: 520,
          position: "relative",
        }}
      >
        <div
          ref={containerRef}
          style={{
            height: "100%",
            width: "100%",
            minHeight: 520,
            position: "relative",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: isDrawingToolActive ? "auto" : "none",
            cursor: activeTool === "crosshair" ? "default" : "crosshair",
            zIndex: 10,
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
}
