import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { useTrading } from "../../context/TradingContext";
import { normalizeTvSymbolForChart } from "../../data/symbols";

interface Props {
  symbol: string;
}

export function TechnicalAnalysis({ symbol }: Props) {
  const { theme } = useTrading();
  const tvSymbol = normalizeTvSymbolForChart(symbol);
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js",
    {
      interval: "1h",
      width: "100%",
      isTransparent: true,
      height: "100%",
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: theme,
    },
    [tvSymbol, theme],
  );

  return (
    <div className="tv-widget-fill">
      <div
        className="tradingview-widget-container"
        ref={ref}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
