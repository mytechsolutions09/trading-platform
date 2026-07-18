import { useState, useEffect } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { TradingViewChart } from "../components/charts/TradingViewChart";
import { TechnicalAnalysis } from "../components/charts/TechnicalAnalysis";
import { SymbolOverview } from "../components/charts/SymbolOverview";
import { Watchlist } from "../components/trading/Watchlist";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../data/symbols";

const INTERVALS = [
  { id: "1", label: "1m" },
  { id: "5", label: "5m" },
  { id: "15", label: "15m" },
  { id: "60", label: "1H" },
  { id: "240", label: "4H" },
  { id: "D", label: "1D" },
  { id: "W", label: "1W" },
];

const AVAILABLE_INDICATORS = [
  { id: "STD;SMA", label: "SMA" },
  { id: "STD;EMA", label: "EMA" },
  { id: "STD;MACD", label: "MACD" },
  { id: "STD;RSI", label: "RSI" },
  { id: "STD;Volume", label: "Volume" },
];

export function Charts() {
  const { selected, leftSidebarCollapsed, toggleLeftSidebar } = useTrading();
  const [interval, setInterval] = useState(
    () => localStorage.getItem("apex-trade-chart-interval") || "60"
  );
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(() => {
    const saved = localStorage.getItem("apex-trade-chart-indicators");
    return saved ? JSON.parse(saved) : ["STD;SMA", "STD;EMA", "STD;MACD", "STD;RSI", "STD;Volume"];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = document.querySelector(".chart-panel.full") as HTMLElement;
    if (!isFullscreen) {
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch(() => undefined);
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

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
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleSetInterval = (val: string) => {
    setInterval(val);
    localStorage.setItem("apex-trade-chart-interval", val);
  };

  const toggleIndicator = (id: string) => {
    const next = selectedIndicators.includes(id)
      ? selectedIndicators.filter((x) => x !== id)
      : [...selectedIndicators, id];
    setSelectedIndicators(next);
    localStorage.setItem("apex-trade-chart-indicators", JSON.stringify(next));
  };

  return (
    <div className="page-charts">
      <div className="page-title-row">
        <div>
          <h1>Charts</h1>
          <p className="page-sub">
            Free TradingView Advanced Chart · full drawing tools & indicators
          </p>
        </div>
        <div className="charts-actions-bar">
          <div className="indicator-selector">
            <span className="selector-label">Indicators</span>
            {AVAILABLE_INDICATORS.map((ind) => {
              const active = selectedIndicators.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  className={`indicator-pill ${active ? "active" : ""}`}
                  onClick={() => toggleIndicator(ind.id)}
                >
                  {ind.label}
                </button>
              );
            })}
          </div>

          <div className="interval-bar">
            {INTERVALS.map((i) => (
              <button
                key={i.id}
                type="button"
                className={interval === i.id ? "active" : ""}
                onClick={() => handleSetInterval(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>

          <div className="layout-toggles">
            <button
              type="button"
              className={`layout-toggle-btn ${leftSidebarCollapsed ? "collapsed" : ""}`}
              onClick={toggleLeftSidebar}
              title={leftSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
              aria-label={leftSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            >
              {leftSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <button
              type="button"
              className={`layout-toggle-btn ${rightCollapsed ? "collapsed" : ""}`}
              onClick={() => setRightCollapsed(!rightCollapsed)}
              title={rightCollapsed ? "Expand widgets panel" : "Collapse widgets panel"}
              aria-label={rightCollapsed ? "Expand widgets panel" : "Collapse widgets panel"}
            >
              {rightCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
            </button>
            <button
              type="button"
              className={`layout-toggle-btn ${isFullscreen ? "active" : ""}`}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Full Screen (Esc)" : "Full Screen Chart (F)"}
              aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen Chart"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`charts-layout ${rightCollapsed ? "right-collapsed" : ""}`}>
        <div className={`panel chart-panel full ${isFullscreen ? "is-fullscreen" : ""}`}>
          <div className="panel-header">
            <h3>
              {selected.name} ({selected.symbol}) · {INTERVALS.find((i) => i.id === interval)?.label} Chart
            </h3>
            <div className="panel-header-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="panel-header-price mono">
                <span className="panel-header-price-val">{formatPrice(selected.price, selected.assetClass)}</span>
                <span className={selected.changePct >= 0 ? "positive" : "negative"}>
                  {" "}
                  {selected.changePct >= 0 ? "+" : ""}
                  {selected.changePct.toFixed(2)}%
                </span>
              </div>
              <button
                type="button"
                className="chart-fullscreen-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Full Screen (Esc)" : "Full Screen Chart (F)"}
                aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen Chart"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
          <div className="chart-body large">
            <TradingViewChart
              symbol={selected.tvSymbol}
              interval={interval}
              studies={selectedIndicators}
              height="100%"
            />
          </div>
        </div>

        {!rightCollapsed && (
          <div className="charts-side">
            <Watchlist />
            <div className="panel">
              <div className="panel-header">
                <h3>Technical analysis</h3>
              </div>
              <div className="widget-body" style={{ height: 420 }}>
                <TechnicalAnalysis symbol={selected.tvSymbol} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel overview-strip">
        <div className="panel-header">
          <h3>Multi-asset overview</h3>
        </div>
        <div className="widget-body" style={{ height: 380 }}>
          <SymbolOverview
            symbols={[
              ["BINANCE:BTCUSDT|1D"],
              ["BINANCE:ETHUSDT|1D"],
              ["NASDAQ:AAPL|1D"],
              ["NASDAQ:NVDA|1D"],
              ["FX:EURUSD|1D"],
              ["SP:SPX|1D"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

