import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { TICKER_SYMBOLS } from "../../data/symbols";
import { useTrading } from "../../context/TradingContext";

export function TickerTape() {
  const { theme } = useTrading();
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    {
      symbols: TICKER_SYMBOLS,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: theme,
      locale: "en",
    },
    [theme],
  );

  return (
    <div className="ticker-tape">
      <div
        className="tradingview-widget-container"
        ref={ref}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
