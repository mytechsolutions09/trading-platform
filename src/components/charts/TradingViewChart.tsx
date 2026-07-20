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
import {
  DrawingToolbar,
  TWO_POINT_TOOLS,
  THREE_POINT_TOOLS,
  ONE_POINT_TOOLS,
  BRUSH_TOOLS,
} from "../trading/DrawingToolbar";
import { fetchCandles, generateSyntheticCandles } from "../../services/prices";
import type { DrawingItem, DrawingPoint, DrawingType, DrawingStyle } from "./drawingTypes";
import { normalizeDrawingType } from "./drawingTypes";
import {
  hitTestDrawing,
  hitTestHandle,
  renderDrawing,
  renderZoomBox,
  type ScreenPt,
} from "./drawingRender";
import { TrendLineSettings } from "./TrendLineSettings";

export type { DrawingItem, DrawingPoint };

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

const EMOJIS = ["🚀", "🔥", "💎", "📈", "📉", "⚡", "🎯", "💰", "✅", "❌"];

export function TradingViewChart({
  interval = "60",
  height = "100%",
  studies = ["STD;SMA", "STD;EMA", "STD;MACD", "STD;RSI", "STD;Volume"],
}: Props) {
  const { selected, theme } = useTrading();
  const activeItem = selected;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandleData[]>([]);

  // Prevent page scroll when scrolling over the chart area
  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  const [activeTool, setActiveTool] = useState<string>("crosshair");
  const [magnetActive, setMagnetActive] = useState(false);
  const [toolsLocked, setToolsLocked] = useState(false);
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  const [drawingsHidden, setDrawingsHidden] = useState(false);

  const [indicatorHeightRatio, setIndicatorHeightRatio] = useState<number>(() => {
    const hasVolume = studies.includes("STD;Volume");
    const hasMACD = studies.includes("STD;MACD");
    const hasRSI = studies.includes("STD;RSI");
    let ratio = 0.05;
    if (hasVolume) ratio += 0.15;
    if (hasMACD) ratio += 0.20;
    if (hasRSI) ratio += 0.20;
    return Math.min(0.65, ratio);
  });

  const indicatorHeightRatioRef = useRef(indicatorHeightRatio);
  useEffect(() => {
    indicatorHeightRatioRef.current = indicatorHeightRatio;
  }, [indicatorHeightRatio]);

  const [macdZoom, setMacdZoom] = useState(1.0);
  const [rsiZoom, setRsiZoom] = useState(1.0);
  const [mainZoom, setMainZoom] = useState(1.0);

  const macdZoomRef = useRef(1.0);
  const rsiZoomRef = useRef(1.0);
  const mainZoomRef = useRef(1.0);

  useEffect(() => { macdZoomRef.current = macdZoom; }, [macdZoom]);
  useEffect(() => { rsiZoomRef.current = rsiZoom; }, [rsiZoom]);
  useEffect(() => { mainZoomRef.current = mainZoom; }, [mainZoom]);

  const isDraggingSeparatorRef = useRef(false);
  const isHoveringSeparatorRef = useRef(false);

  const applyScaleMargins = useCallback(
    (chart: IChartApi, ratio: number, studiesList: string[], macdZ = 1, rsiZ = 1, mainZ = 1) => {
      const hasVolume = studiesList.includes("STD;Volume");
      const hasMACD = studiesList.includes("STD;MACD");
      const hasRSI = studiesList.includes("STD;RSI");

      if (seriesRef.current) {
        const mainBottom = Math.max(0.05, Math.min(0.85, ratio + (1 - mainZ) * 0.15));
        seriesRef.current.priceScale().applyOptions({
          scaleMargins: { top: Math.max(0.01, 0.05 * (2 - mainZ)), bottom: mainBottom },
        });
      }

      const topY = 1 - ratio + 0.02;

      if (hasVolume && !hasMACD && !hasRSI) {
        try {
          chart.priceScale("volume_scale").applyOptions({
            scaleMargins: { top: topY, bottom: 0 },
          });
        } catch {}
      }

      if (hasMACD && hasRSI) {
        const macdTop = Math.max(topY, topY + (1 - macdZ) * 0.08);
        const macdBottom = Math.max(0.02, ratio * 0.48 * macdZ);
        try {
          chart.priceScale("macd_scale").applyOptions({
            scaleMargins: { top: macdTop, bottom: macdBottom },
          });
        } catch {}

        const rsiTop = Math.max(1 - ratio * 0.45, 1 - ratio * 0.45 + (1 - rsiZ) * 0.08);
        try {
          chart.priceScale("rsi_scale").applyOptions({
            scaleMargins: { top: rsiTop, bottom: 0.02 },
          });
        } catch {}
      } else if (hasMACD) {
        const macdTop = Math.max(topY, topY + (1 - macdZ) * 0.08);
        try {
          chart.priceScale("macd_scale").applyOptions({
            scaleMargins: { top: macdTop, bottom: 0.02 },
          });
        } catch {}
      } else if (hasRSI) {
        const rsiTop = Math.max(topY, topY + (1 - rsiZ) * 0.08);
        try {
          chart.priceScale("rsi_scale").applyOptions({
            scaleMargins: { top: rsiTop, bottom: 0.02 },
          });
        } catch {}
      }
    },
    []
  );

  const storageKey = `apex-trade-drawings-${activeItem?.symbol || "default"}`;
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as DrawingItem[];
      return parsed.map((d) => ({ ...d, type: normalizeDrawingType(d.type) }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setDrawings([]);
        return;
      }
      const parsed = JSON.parse(saved) as DrawingItem[];
      setDrawings(parsed.map((d) => ({ ...d, type: normalizeDrawingType(d.type) })));
    } catch {
      setDrawings([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(drawings));
    } catch {
      // ignore
    }
  }, [drawings, storageKey]);

  const [pendingPoints, setPendingPoints] = useState<DrawingPoint[]>([]);
  const mousePosRef = useRef<ScreenPt | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const brushPointsRef = useRef<DrawingPoint[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Floating settings panel (double-click)
  const [settingsPanel, setSettingsPanel] = useState<{
    drawingId: string;
    pos: { x: number; y: number };
  } | null>(null);

  // Context menu (right-click)
  const [contextMenu, setContextMenu] = useState<{
    drawingId: string;
    pos: { x: number; y: number };
  } | null>(null);

  // Zoom box (screen coords)
  const zoomStartRef = useRef<ScreenPt | null>(null);
  const [zoomBox, setZoomBox] = useState<{ a: ScreenPt; b: ScreenPt } | null>(null);

  const dragRef = useRef<{
    drawingId: string;
    part: "p1" | "p2" | "p3" | "body";
    startMouse: ScreenPt;
    initialScreenP1: ScreenPt | null;
    initialScreenP2: ScreenPt | null;
    initialScreenP3: ScreenPt | null;
    initialScreenPoints: ScreenPt[] | null;
  } | null>(null);

  const finishDrawing = useCallback(() => {
    if (!toolsLocked) setActiveTool("crosshair");
  }, [toolsLocked]);

  /** Clone a drawing, offset by ~3 bars to the right */
  const cloneDrawing = useCallback((id: string) => {
    setDrawings((prev) => {
      const item = prev.find((d) => d.id === id);
      if (!item) return prev;
      const offset = 3 * 3600; // ~3 hourly bars
      const cloned: DrawingItem = {
        ...item,
        id: Date.now().toString(),
        p1: { ...item.p1, time: item.p1.time + offset },
        p2: item.p2 ? { ...item.p2, time: item.p2.time + offset } : undefined,
        p3: item.p3 ? { ...item.p3, time: item.p3.time + offset } : undefined,
        points: item.points?.map((p) => ({ ...p, time: p.time + offset })),
      };
      return [...prev, cloned];
    });
    setContextMenu(null);
    setSettingsPanel(null);
  }, []);

  /** Update style of a specific drawing */
  const updateDrawingStyle = useCallback((id: string, patch: Partial<DrawingStyle>) => {
    setDrawings((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, style: { ...d.style, ...patch } } : d
      )
    );
  }, []);

  // Keyboard: Delete selected, Escape cancel pending, shortcuts
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

      if (e.key === "Escape") {
        setPendingPoints([]);
        setZoomBox(null);
        zoomStartRef.current = null;
        setSelectedDrawingId(null);
        setActiveTool("crosshair");
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDrawingId) {
          setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
        }
        return;
      }

      // TradingView-like shortcuts (Alt+key)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const map: Record<string, string> = {
          c: "crosshair",
          t: "trendline",
          h: "horizontal_line",
          v: "vertical_line",
          f: "fibonacci",
          b: "brush",
          k: "text",
          p: "parallel_channel",
        };
        const tool = map[e.key.toLowerCase()];
        if (tool) {
          e.preventDefault();
          setActiveTool(tool);
          setPendingPoints([]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawingId]);

  const screenToChartPoint = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return null;

      const timeScale = chart.timeScale();
      const timeVal = timeScale.coordinateToTime(x);
      const priceVal = series.coordinateToPrice(y);
      if (priceVal === null) return null;

      let rawPrice = Number(priceVal);
      let rawTime: number | null = null;

      if (timeVal !== null) {
        rawTime = typeof timeVal === "number" ? timeVal : Number(timeVal);
      } else {
        // Extrapolate time for coordinates in the future space (past the latest candle)
        const candles = candlesRef.current;
        if (candles.length > 0) {
          const lastIdx = candles.length - 1;
          const firstTime = candles[0].time;
          const lastTime = candles[lastIdx].time;
          const step = candles.length > 1 ? (lastTime - firstTime) / lastIdx : 3600;

          let logNum: number | null = null;
          const logical = timeScale.coordinateToLogical(x);
          if (logical !== null) {
            logNum = Number(logical);
          } else {
            // Calculate logical index using visible bar spacing when past data bounds
            const lastCoord = timeScale.logicalToCoordinate(lastIdx as any);
            const prevIdx = Math.max(0, lastIdx - 10);
            const prevCoord = timeScale.logicalToCoordinate(prevIdx as any);
            if (lastCoord !== null && prevCoord !== null && lastIdx > prevIdx) {
              const barSpacing = (lastCoord - prevCoord) / (lastIdx - prevIdx);
              if (Math.abs(barSpacing) > 0.0001) {
                logNum = lastIdx + (x - lastCoord) / barSpacing;
              }
            }
          }

          if (logNum !== null) {
            rawTime = lastTime + (logNum - lastIdx) * step;
          }
        }
      }

      if (rawTime === null) return null;

      if (magnetActive && candlesRef.current.length > 0 && timeVal !== null) {
        const closestCandle = candlesRef.current.reduce((prev, curr) =>
          Math.abs(curr.time - rawTime!) < Math.abs(prev.time - rawTime!) ? curr : prev
        );
        if (closestCandle) {
          rawTime = closestCandle.time;
          const ohlc = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
          rawPrice = ohlc.reduce((prev, curr) =>
            Math.abs(curr - rawPrice) < Math.abs(prev - rawPrice) ? curr : prev
          );
        }
      }

      return { time: rawTime, price: rawPrice };
    },
    [magnetActive]
  );

  const chartPointToScreen = useCallback((pt: DrawingPoint): ScreenPt | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;

    const timeScale = chart.timeScale();
    let x: number | null = timeScale.timeToCoordinate(pt.time as Time) as number | null;
    const y = series.priceToCoordinate(pt.price);
    if (y === null) return null;

    if (x === null) {
      // Extrapolate screen X for future times (beyond last candle) or past times
      const candles = candlesRef.current;
      if (candles.length > 0) {
        const lastIdx = candles.length - 1;
        const firstTime = candles[0].time;
        const lastTime = candles[lastIdx].time;
        const step = candles.length > 1 ? (lastTime - firstTime) / lastIdx : 3600;

        let logicalIdx: number;
        if (pt.time > lastTime) {
          logicalIdx = lastIdx + (step > 0 ? (pt.time - lastTime) / step : 0);
        } else if (pt.time < firstTime) {
          logicalIdx = step > 0 ? (pt.time - firstTime) / step : 0;
        } else {
          logicalIdx = step > 0 ? (pt.time - firstTime) / step : 0;
        }

        let coord: number | null = timeScale.logicalToCoordinate(logicalIdx as any) as number | null;
        if (coord === null) {
          // Calculate screen X using bar spacing relative to lastIdx
          const lastCoord = timeScale.logicalToCoordinate(lastIdx as any);
          const prevIdx = Math.max(0, lastIdx - 10);
          const prevCoord = timeScale.logicalToCoordinate(prevIdx as any);
          if (lastCoord !== null && prevCoord !== null && lastIdx > prevIdx) {
            const barSpacing = (lastCoord - prevCoord) / (lastIdx - prevIdx);
            coord = (lastCoord as number) + (logicalIdx - lastIdx) * barSpacing;
          }
        }

        if (coord !== null) {
          x = coord;
        }
      }
    }

    if (x === null) return null;
    return { x: Number(x), y: Number(y) };
  }, []);

  const priceToY = useCallback((price: number): number | null => {
    const series = seriesRef.current;
    if (!series) return null;
    const y = series.priceToCoordinate(price);
    return y === null ? null : Number(y);
  }, []);

  const findDrawingAt = useCallback(
    (x: number, y: number): DrawingItem | null => {
      if (drawingsHidden) return null;
      const canvas = overlayCanvasRef.current;
      const w = canvas?.width || 800;
      const h = canvas?.height || 520;
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], x, y, chartPointToScreen, priceToY, w, h)) {
          return drawings[i];
        }
      }
      return null;
    },
    [drawings, drawingsHidden, chartPointToScreen, priceToY]
  );

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (drawingsHidden && !zoomBox) return;

    const isDark = theme === "dark";

    const rc = {
      ctx,
      width: canvas.width,
      height: canvas.height,
      chartPointToScreen,
      priceToY,
      selectedId: selectedDrawingId,
      isDark,
    };

    if (!drawingsHidden) {
      drawings.forEach((item) => renderDrawing(item, { ...rc, isPreview: false }));
    }

    // Pending multi-point preview (SOLID line, TV-style — no dashes)
    if (pendingPoints.length > 0 && mousePosRef.current) {
      const currentPt = screenToChartPoint(mousePosRef.current.x, mousePosRef.current.y);
      if (currentPt) {
        if (THREE_POINT_TOOLS.has(activeTool)) {
          if (pendingPoints.length === 1) {
            renderDrawing(
              {
                id: "preview",
                type: "trendline",
                p1: pendingPoints[0],
                p2: currentPt,
                style: { color: "#2962FF", lineWidth: 2, lineStyle: "solid" },
              },
              { ...rc, isPreview: true }
            );
          } else if (pendingPoints.length === 2) {
            renderDrawing(
              {
                id: "preview",
                type: activeTool as DrawingType,
                p1: pendingPoints[0],
                p2: pendingPoints[1],
                p3: currentPt,
                style: { color: "#2962FF", lineWidth: 2, lineStyle: "solid" },
              },
              { ...rc, isPreview: true }
            );
          }
        } else {
          const previewType =
            activeTool === "parallel_channel"
              ? "parallel_channel"
              : (activeTool as DrawingType);
          renderDrawing(
            {
              id: "preview",
              type: previewType,
              p1: pendingPoints[0],
              p2: currentPt,
              style: { color: "#2962FF", lineWidth: 2, lineStyle: "solid" },
            },
            { ...rc, isPreview: true }
          );
        }
      }
    }

    // Live brush stroke
    if (isBrushing && brushPointsRef.current.length > 1) {
      renderDrawing(
        {
          id: "preview-brush",
          type: activeTool === "highlighter" ? "highlighter" : "brush",
          p1: brushPointsRef.current[0],
          points: brushPointsRef.current,
        },
        { ...rc, isPreview: true }
      );
    }

    // Zoom box
    if (zoomBox) {
      renderZoomBox(ctx, zoomBox.a, zoomBox.b);
    }
  }, [
    drawings,
    drawingsHidden,
    pendingPoints,
    activeTool,
    theme,
    selectedDrawingId,
    screenToChartPoint,
    chartPointToScreen,
    priceToY,
    isBrushing,
    zoomBox,
  ]);

  const drawOverlayRef = useRef(drawOverlay);
  useEffect(() => {
    drawOverlayRef.current = drawOverlay;
  }, [drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Chart setup
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
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        visible: true,
      },
      timeScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 15,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: false,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    }, 0);
    seriesRef.current = candleSeries;

    const hasVolume = studies.includes("STD;Volume");
    const hasSMA = studies.includes("STD;SMA");
    const hasEMA = studies.includes("STD;EMA");
    const hasMACD = studies.includes("STD;MACD");
    const hasRSI = studies.includes("STD;RSI");

    const volumeSeries = hasVolume
      ? chart.addSeries(
          HistogramSeries,
          {
            color: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.2)",
            priceFormat: { type: "volume" },
            priceScaleId: "volume_scale",
          },
          0
        )
      : null;

    if (volumeSeries) {
      chart.priceScale("volume_scale").applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      });
    }

    const smaSeries = hasSMA
      ? chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2, title: "SMA 20" }, 0)
      : null;
    const emaSeries = hasEMA
      ? chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2, title: "EMA 50" }, 0)
      : null;

    let targetPaneIndex = 1;

    let macdFastSeries: ReturnType<typeof chart.addSeries> | null = null;
    let macdSignalSeries: ReturnType<typeof chart.addSeries> | null = null;
    let macdHistSeries: ReturnType<typeof chart.addSeries> | null = null;

    if (hasMACD) {
      const pane = targetPaneIndex++;
      macdFastSeries = chart.addSeries(
        LineSeries,
        {
          color: "#2563eb",
          lineWidth: 2,
          title: "MACD 12,26",
        },
        pane
      );
      macdSignalSeries = chart.addSeries(
        LineSeries,
        {
          color: "#f97316",
          lineWidth: 2,
          title: "Signal 9",
        },
        pane
      );
      macdHistSeries = chart.addSeries(HistogramSeries, {}, pane);
    }

    let rsiSeries: ReturnType<typeof chart.addSeries> | null = null;
    let rsiUpperSeries: ReturnType<typeof chart.addSeries> | null = null;
    let rsiLowerSeries: ReturnType<typeof chart.addSeries> | null = null;

    if (hasRSI) {
      const pane = targetPaneIndex++;
      rsiSeries = chart.addSeries(
        LineSeries,
        {
          color: "#ec4899",
          lineWidth: 2,
          title: "RSI 14",
        },
        pane
      );
      rsiUpperSeries = chart.addSeries(
        LineSeries,
        {
          color: isDark ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.9)",
          lineWidth: 1,
          lineStyle: 2,
          title: "70 OB",
        },
        pane
      );
      rsiLowerSeries = chart.addSeries(
        LineSeries,
        {
          color: isDark ? "rgba(16, 185, 129, 0.8)" : "rgba(16, 185, 129, 0.9)",
          lineWidth: 1,
          lineStyle: 2,
          title: "30 OS",
        },
        pane
      );
    }

    fetchCandles(activeItem, interval)
      .then((data) => {
        if (!isSubscribed) return;

        let candleData = data;
        if (!candleData || candleData.length === 0) {
          candleData = generateSyntheticCandles(activeItem.price || 64127.99, interval);
        }

        candlesRef.current = candleData.map((c) => ({
          time: Number(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        candleSeries.setData(
          candleData.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

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

        if (smaSeries && data.length >= 20) {
          const smaData = [];
          for (let i = 19; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < 20; j++) sum += data[i - j].close;
            smaData.push({ time: data[i].time as Time, value: Number((sum / 20).toFixed(4)) });
          }
          smaSeries.setData(smaData);
        }

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

        if (hasMACD && macdFastSeries && macdSignalSeries && macdHistSeries && data.length >= 26) {
          const k12 = 2 / 13;
          const k26 = 2 / 27;
          const k9 = 2 / 10;
          let ema12 = data[0].close;
          let ema26 = data[0].close;
          const macdLine: { time: Time; macd: number }[] = [];
          for (let i = 0; i < data.length; i++) {
            ema12 = data[i].close * k12 + ema12 * (1 - k12);
            ema26 = data[i].close * k26 + ema26 * (1 - k26);
            if (i >= 25) macdLine.push({ time: data[i].time as Time, macd: ema12 - ema26 });
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

        // Show a generous recent window; full history stays loaded for scroll/zoom
        const barCount = data.length;
        const visibleBars = Math.min(200, Math.max(80, Math.floor(barCount * 0.25)));
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, barCount - visibleBars),
          to: barCount + 5,
        });
        drawOverlayRef.current();
      })
      .catch(() => undefined);

    const handleRangeChange = () => {
      requestAnimationFrame(() => drawOverlayRef.current());
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
          drawOverlayRef.current();
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, interval, theme, JSON.stringify(studies)]);

  // Pan/scale only when crosshair (or no drawing interaction)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canPan = activeTool === "crosshair" && !zoomBox;
    chart.applyOptions({
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: canPan,
        horzTouchDrag: canPan,
        vertTouchDrag: canPan,
      },
      handleScale: {
        axisPressedMouseMove: canPan,
        mouseWheel: false,
        pinch: canPan,
      },
    });
  }, [activeTool, zoomBox]);

  // Clear pending points when tool changes
  useEffect(() => {
    setPendingPoints([]);
    setZoomBox(null);
    zoomStartRef.current = null;
  }, [activeTool]);

  const addDrawing = useCallback(
    (item: DrawingItem) => {
      setDrawings((prev) => [...prev, item]);
      setSelectedDrawingId(item.id);
      setPendingPoints([]);
      finishDrawing();
    },
    [finishDrawing]
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingsLocked) return;
    // Zoom uses drag, not click-complete
    if (activeTool === "zoom") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Delete badge click (approx center of selected drawing)
    if (selectedDrawingId && activeTool === "crosshair") {
      const hit = findDrawingAt(x, y);
      // Secondary: if already selected and click again near it with delete intent — keep select/drag
      if (!hit) {
        setSelectedDrawingId(null);
      }
    }

    const hitDrawing = findDrawingAt(x, y);
    if (hitDrawing && activeTool === "crosshair") {
      setSelectedDrawingId(hitDrawing.id);
      return;
    }

    const pt = screenToChartPoint(x, y);
    if (!pt) return;

    // One-point tools
    if (ONE_POINT_TOOLS.has(activeTool)) {
      if (activeTool === "text" || activeTool === "callout") {
        const text = window.prompt(
          activeTool === "callout" ? "Callout text:" : "Text label:",
          activeTool === "callout" ? "Watch this zone" : "Analysis"
        );
        if (!text) {
          if (!toolsLocked) setActiveTool("crosshair");
          return;
        }
        const item: DrawingItem = {
          id: Date.now().toString(),
          type: activeTool as DrawingType,
          p1: pt,
          p2:
            activeTool === "callout"
              ? { time: pt.time + 3600, price: pt.price * 1.002 }
              : undefined,
          text,
        };
        addDrawing(item);
        return;
      }
      if (activeTool === "price_label") {
        addDrawing({
          id: Date.now().toString(),
          type: "price_label",
          p1: pt,
          text: pt.price.toFixed(2),
        });
        return;
      }
      if (activeTool === "smile") {
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        addDrawing({
          id: Date.now().toString(),
          type: "smile",
          p1: pt,
          text: emoji,
        });
        return;
      }
      // H/V/Cross lines
      addDrawing({
        id: Date.now().toString(),
        type: activeTool as DrawingType,
        p1: pt,
      });
      return;
    }

    // Three-point tools
    if (THREE_POINT_TOOLS.has(activeTool)) {
      if (pendingPoints.length === 0) {
        setPendingPoints([pt]);
        setSelectedDrawingId(null);
      } else if (pendingPoints.length === 1) {
        setPendingPoints([pendingPoints[0], pt]);
      } else {
        addDrawing({
          id: Date.now().toString(),
          type: activeTool as DrawingType,
          p1: pendingPoints[0],
          p2: pendingPoints[1],
          p3: pt,
        });
      }
      return;
    }

    // Two-point tools
    if (TWO_POINT_TOOLS.has(activeTool)) {
      if (pendingPoints.length === 0) {
        setPendingPoints([pt]);
        setSelectedDrawingId(null);
      } else {
        // parallel channel: auto p3 as offset from midpoint
        const p1 = pendingPoints[0];
        const p2 = pt;
        let p3: DrawingPoint | undefined;
        if (activeTool === "parallel_channel") {
          const midPrice = (p1.price + p2.price) / 2;
          const offset = Math.abs(p2.price - p1.price) * 0.35 || p1.price * 0.005;
          p3 = { time: p1.time, price: midPrice + offset };
        }
        addDrawing({
          id: Date.now().toString(),
          type: activeTool as DrawingType,
          p1,
          p2,
          p3,
        });
      }
      return;
    }

    if (activeTool === "crosshair") {
      setSelectedDrawingId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingsLocked && activeTool !== "zoom") return;
    // Close any open panels on new mousedown
    setSettingsPanel(null);
    setContextMenu(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = overlayCanvasRef.current;
    const canvasH = canvas?.height || 520;
    const separatorY = Math.round(canvasH * (1 - indicatorHeightRatioRef.current));
    const hasIndicators = studies.some((s) => ["STD;Volume", "STD;MACD", "STD;RSI"].includes(s));

    if (hasIndicators && Math.abs(y - separatorY) <= 8) {
      isDraggingSeparatorRef.current = true;
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    if (activeTool === "zoom") {
      zoomStartRef.current = { x, y };
      setZoomBox({ a: { x, y }, b: { x, y } });
      return;
    }

    if (BRUSH_TOOLS.has(activeTool)) {
      const pt = screenToChartPoint(x, y);
      if (pt) {
        setIsBrushing(true);
        brushPointsRef.current = [pt];
      }
      return;
    }

    if (activeTool === "crosshair") {
      if (selectedDrawingId) {
        const item = drawings.find((d) => d.id === selectedDrawingId);
        if (item) {
          // Use the new hitTestHandle helper for precise handle detection
          const handle = hitTestHandle(item, x, y, chartPointToScreen);
          if (handle) {
            const s1 = item.p1 ? chartPointToScreen(item.p1) : null;
            const s2 = item.p2 ? chartPointToScreen(item.p2) : null;
            const s3 = item.p3 ? chartPointToScreen(item.p3) : null;
            dragRef.current = {
              drawingId: item.id,
              part: handle,
              startMouse: { x, y },
              initialScreenP1: s1,
              initialScreenP2: s2,
              initialScreenP3: s3,
              initialScreenPoints: null,
            };
            return;
          }
        }
      }

      const hit = findDrawingAt(x, y);
      if (hit) {
        setSelectedDrawingId(hit.id);
        const s1 = hit.p1 ? chartPointToScreen(hit.p1) : null;
        const s2 = hit.p2 ? chartPointToScreen(hit.p2) : null;
        const s3 = hit.p3 ? chartPointToScreen(hit.p3) : null;
        const sPoints = hit.points
          ? hit.points
              .map((p) => chartPointToScreen(p))
              .filter((pt): pt is ScreenPt => pt !== null)
          : null;

        dragRef.current = {
          drawingId: hit.id,
          part: "body",
          startMouse: { x, y },
          initialScreenP1: s1,
          initialScreenP2: s2,
          initialScreenP3: s3,
          initialScreenPoints: sPoints,
        };
        return;
      }

      setSelectedDrawingId(null);
    }
  };

  /** Double-click: open settings panel for the hit drawing */
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = findDrawingAt(x, y);
    if (hit) {
      e.preventDefault();
      setSettingsPanel({
        drawingId: hit.id,
        pos: { x: e.clientX + 8, y: e.clientY - 12 },
      });
      setContextMenu(null);
      setSelectedDrawingId(hit.id);
    }
  };

  /** Right-click: show context menu */
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = findDrawingAt(x, y);
    if (hit) {
      setContextMenu({
        drawingId: hit.id,
        pos: { x: e.clientX, y: e.clientY },
      });
      setSettingsPanel(null);
      setSelectedDrawingId(hit.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };

    const canvas = overlayCanvasRef.current;
    const canvasH = canvas?.height || 520;
    const separatorY = Math.round(canvasH * (1 - indicatorHeightRatioRef.current));
    const hasIndicators = studies.some((s) => ["STD;Volume", "STD;MACD", "STD;RSI"].includes(s));

    // Handle separator drag
    if (isDraggingSeparatorRef.current) {
      const newRatio = Math.max(0.10, Math.min(0.75, (canvasH - y) / canvasH));
      setIndicatorHeightRatio(newRatio);
      if (chartRef.current) {
        applyScaleMargins(chartRef.current, newRatio, studies);
      }
      if (canvas) canvas.style.cursor = "ns-resize";
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    // Hover check over pane separator
    if (hasIndicators && Math.abs(y - separatorY) <= 8) {
      if (canvas) {
        canvas.style.cursor = "ns-resize";
        canvas.style.pointerEvents = "auto";
      }
      if (!isHoveringSeparatorRef.current) {
        isHoveringSeparatorRef.current = true;
        requestAnimationFrame(() => drawOverlayRef.current());
      }
      return;
    } else if (isHoveringSeparatorRef.current) {
      isHoveringSeparatorRef.current = false;
      requestAnimationFrame(() => drawOverlayRef.current());
    }

    // Zoom box drag
    if (zoomStartRef.current && activeTool === "zoom") {
      setZoomBox({ a: zoomStartRef.current, b: { x, y } });
      return;
    }

    if (dragRef.current) {
      if (canvas) canvas.style.cursor = "grabbing";
      const drag = dragRef.current;
      const dx = x - drag.startMouse.x;
      const dy = y - drag.startMouse.y;

      setDrawings((prev) =>
        prev.map((item) => {
          if (item.id !== drag.drawingId) return item;
          const updated = { ...item };

          if (drag.part === "p1") {
            const pt = screenToChartPoint(x, y);
            if (pt) updated.p1 = pt;
          } else if (drag.part === "p2") {
            const pt = screenToChartPoint(x, y);
            if (pt) updated.p2 = pt;
          } else if (drag.part === "p3") {
            const pt = screenToChartPoint(x, y);
            if (pt) updated.p3 = pt;
          } else if (drag.part === "body") {
            if (drag.initialScreenP1) {
              const newPt = screenToChartPoint(drag.initialScreenP1.x + dx, drag.initialScreenP1.y + dy);
              if (newPt) updated.p1 = newPt;
            }
            if (drag.initialScreenP2) {
              const newPt = screenToChartPoint(drag.initialScreenP2.x + dx, drag.initialScreenP2.y + dy);
              if (newPt) updated.p2 = newPt;
            }
            if (drag.initialScreenP3) {
              const newPt = screenToChartPoint(drag.initialScreenP3.x + dx, drag.initialScreenP3.y + dy);
              if (newPt) updated.p3 = newPt;
            }
            if (drag.initialScreenPoints && item.points) {
              const updatedPoints: DrawingPoint[] = [];
              for (let i = 0; i < drag.initialScreenPoints.length; i++) {
                const initS = drag.initialScreenPoints[i];
                const newPt = screenToChartPoint(initS.x + dx, initS.y + dy);
                if (newPt) updatedPoints.push(newPt);
              }
              if (updatedPoints.length > 0) updated.points = updatedPoints;
            }
          }
          return updated;
        })
      );
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    if (activeTool === "crosshair") {
      const hit = findDrawingAt(x, y);
      if (canvas) {
        if (selectedDrawingId) {
          // Check if over a handle → resize cursor
          const selItem = drawings.find((d) => d.id === selectedDrawingId);
          if (selItem) {
            const handle = hitTestHandle(selItem, x, y, chartPointToScreen);
            if (handle) {
              // p1/p2 handles: directional resize cursor based on angle
              const s1 = selItem.p1 ? chartPointToScreen(selItem.p1) : null;
              const s2 = selItem.p2 ? chartPointToScreen(selItem.p2) : null;
              if (s1 && s2) {
                const angle = Math.abs(Math.atan2(s2.y - s1.y, s2.x - s1.x) * 180 / Math.PI);
                if (angle > 67.5) canvas.style.cursor = "ns-resize";
                else if (angle > 22.5) canvas.style.cursor = "nwse-resize";
                else canvas.style.cursor = "ew-resize";
              } else {
                canvas.style.cursor = "crosshair";
              }
              canvas.style.pointerEvents = "auto";
              return;
            }
          }
        }
        if (hit) {
          // Over a line body → show move cursor
          canvas.style.cursor = "move";
          canvas.style.pointerEvents = "auto";
        } else if (selectedDrawingId !== null) {
          canvas.style.cursor = "pointer";
          canvas.style.pointerEvents = "auto";
        } else {
          canvas.style.cursor = "default";
          canvas.style.pointerEvents = "none";
        }
      }
    }

    if (pendingPoints.length > 0 || isBrushing) {
      if (isBrushing && BRUSH_TOOLS.has(activeTool)) {
        const pt = screenToChartPoint(x, y);
        if (pt) brushPointsRef.current.push(pt);
      }
      requestAnimationFrame(() => drawOverlayRef.current());
    }
  };

  const applyZoomBox = (a: ScreenPt, b: ScreenPt) => {
    const chart = chartRef.current;
    if (!chart) return;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    if (maxX - minX < 12) return;

    const timeScale = chart.timeScale();
    const fromLogical = timeScale.coordinateToLogical(minX);
    const toLogical = timeScale.coordinateToLogical(maxX);
    if (fromLogical === null || toLogical === null) return;

    const from = Math.min(Number(fromLogical), Number(toLogical));
    const to = Math.max(Number(fromLogical), Number(toLogical));
    if (to - from >= 2) {
      timeScale.setVisibleLogicalRange({ from, to });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingSeparatorRef.current) {
      isDraggingSeparatorRef.current = false;
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    if (dragRef.current) {
      dragRef.current = null;
    }

    if (zoomStartRef.current && zoomBox && activeTool === "zoom") {
      applyZoomBox(zoomBox.a, zoomBox.b);
      zoomStartRef.current = null;
      setZoomBox(null);
      if (!toolsLocked) setActiveTool("crosshair");
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    if (isBrushing && BRUSH_TOOLS.has(activeTool)) {
      setIsBrushing(false);
      if (brushPointsRef.current.length > 1) {
        const newDrawing: DrawingItem = {
          id: Date.now().toString(),
          type: activeTool === "highlighter" ? "highlighter" : "brush",
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
    if (isBrushing) return;
    e.preventDefault();
    e.stopPropagation();

    const chart = chartRef.current;
    if (!chart) return;

    const deltaSign = Math.sign(e.deltaY);
    if (deltaSign === 0) return;

    const canvas = overlayCanvasRef.current;
    const rect = canvas?.getBoundingClientRect() || containerRef.current?.getBoundingClientRect();
    const mouseX = rect ? e.clientX - rect.left : (canvas?.width || 800) / 2;
    const mouseY = rect ? e.clientY - rect.top : (canvas?.height || 520) / 2;
    const canvasW = canvas?.width || 800;
    const canvasH = canvas?.height || 520;

    const ratio = indicatorHeightRatioRef.current;
    const mainChartBottomY = Math.round(canvasH * (1 - ratio));
    const hasMACD = studies.includes("STD;MACD");
    const hasRSI = studies.includes("STD;RSI");

    // Right-side price scale vertical zoom check (when mouse is over the right axis area)
    if (mouseX > canvasW - 65) {
      const zoomFactor = deltaSign > 0 ? 0.88 : 1.14;

      if (hasRSI && mouseY >= Math.round(canvasH * (1 - ratio * 0.45))) {
        const nextZ = Math.max(0.3, Math.min(3.5, rsiZoomRef.current * zoomFactor));
        setRsiZoom(nextZ);
        applyScaleMargins(chart, ratio, studies, macdZoomRef.current, nextZ, mainZoomRef.current);
      } else if (hasMACD && mouseY >= mainChartBottomY) {
        const nextZ = Math.max(0.3, Math.min(3.5, macdZoomRef.current * zoomFactor));
        setMacdZoom(nextZ);
        applyScaleMargins(chart, ratio, studies, nextZ, rsiZoomRef.current, mainZoomRef.current);
      } else if (mouseY < mainChartBottomY) {
        const nextZ = Math.max(0.3, Math.min(3.5, mainZoomRef.current * zoomFactor));
        setMainZoom(nextZ);
        applyScaleMargins(chart, ratio, studies, macdZoomRef.current, rsiZoomRef.current, nextZ);
      }
      requestAnimationFrame(() => drawOverlayRef.current());
      return;
    }

    // Default horizontal time-scale zoom when mouse is over chart body
    const timeScale = chart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;

    const zoomStep = 1 + deltaSign * 0.035;
    const logicalPos = timeScale.coordinateToLogical(mouseX);
    const pivot = logicalPos !== null ? Number(logicalPos) : (range.from + range.to) / 2;

    const newFrom = pivot - (pivot - range.from) * zoomStep;
    const newTo = pivot + (range.to - pivot) * zoomStep;
    if (newTo - newFrom >= 4) {
      timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
      requestAnimationFrame(() => drawOverlayRef.current());
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

  const handleWrapperMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "crosshair") return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvasH = canvas.height || 520;
    const separatorY = Math.round(canvasH * (1 - indicatorHeightRatioRef.current));
    const hasIndicators = studies.some((s) => ["STD;Volume", "STD;MACD", "STD;RSI"].includes(s));

    if (hasIndicators && Math.abs(y - separatorY) <= 8) {
      canvas.style.pointerEvents = "auto";
      canvas.style.cursor = "ns-resize";
      return;
    }

    const hit = findDrawingAt(x, y);
    if (hit || selectedDrawingId !== null) {
      canvas.style.pointerEvents = "auto";
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.pointerEvents = "none";
      canvas.style.cursor = "default";
    }
  };

  const handleSelectTool = (tool: string) => {
    setActiveTool(tool);
    setPendingPoints([]);
    setSelectedDrawingId(null);
    setSettingsPanel(null);
    setContextMenu(null);
  };

  const isDrawingToolActive =
    activeTool !== "crosshair" ||
    pendingPoints.length > 0 ||
    selectedDrawingId !== null ||
    !!zoomBox ||
    isHoveringSeparatorRef.current ||
    isDraggingSeparatorRef.current;

  const cursorForTool = () => {
    if (activeTool === "crosshair") return "default";
    if (activeTool === "zoom") return "zoom-in";
    if (BRUSH_TOOLS.has(activeTool)) return "crosshair";
    return "crosshair";
  };

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
        onSelectTool={handleSelectTool}
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
        ref={chartWrapperRef}
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
            cursor: cursorForTool(),
            zIndex: 10,
          }}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        {pendingPoints.length > 0 && (
          <div className="drawing-hint">
            {THREE_POINT_TOOLS.has(activeTool)
              ? `Click point ${pendingPoints.length + 1} of 3 · Esc to cancel`
              : "Click second point · Esc to cancel"}
          </div>
        )}
      </div>

      {/* Floating settings panel (double-click) */}
      {settingsPanel && (() => {
        const drawing = drawings.find((d) => d.id === settingsPanel.drawingId);
        if (!drawing) return null;
        const toolTitle = drawing.type
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return (
          <TrendLineSettings
            pos={settingsPanel.pos}
            style={drawing.style ?? {}}
            title={toolTitle}
            onStyleChange={(patch) => updateDrawingStyle(settingsPanel.drawingId, patch)}
            onClone={() => cloneDrawing(settingsPanel.drawingId)}
            onDelete={() => {
              setDrawings((prev) => prev.filter((d) => d.id !== settingsPanel.drawingId));
              setSelectedDrawingId(null);
              setSettingsPanel(null);
            }}
            onClose={() => setSettingsPanel(null)}
          />
        );
      })()}

      {/* Context menu (right-click) */}
      {contextMenu && (() => {
        const drawing = drawings.find((d) => d.id === contextMenu.drawingId);
        if (!drawing) return null;
        const toolTitle = drawing.type
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return (
          <TrendLineSettings
            pos={contextMenu.pos}
            style={drawing.style ?? {}}
            title={toolTitle}
            onStyleChange={(patch) => updateDrawingStyle(contextMenu.drawingId, patch)}
            onClone={() => cloneDrawing(contextMenu.drawingId)}
            onDelete={() => {
              setDrawings((prev) => prev.filter((d) => d.id !== contextMenu.drawingId));
              setSelectedDrawingId(null);
              setContextMenu(null);
            }}
            onClose={() => setContextMenu(null)}
            contextMenuOnly
          />
        );
      })()}
    </div>
  );
}
