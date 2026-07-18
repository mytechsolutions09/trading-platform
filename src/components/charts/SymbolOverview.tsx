import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { useTrading } from "../../context/TradingContext";

interface Props {
  symbols: string[][];
}

export function SymbolOverview({ symbols }: Props) {
  const { theme } = useTrading();
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js",
    {
      symbols,
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "en",
      colorTheme: theme,
      autosize: true,
      showVolume: true,
      showMA: true,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      isTransparent: true,
    },
    [JSON.stringify(symbols), theme],
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
