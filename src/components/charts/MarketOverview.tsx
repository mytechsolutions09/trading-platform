import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { useTrading } from "../../context/TradingContext";

export function MarketOverview() {
  const { theme } = useTrading();
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    {
      colorTheme: theme,
      dateRange: "12M",
      showChart: true,
      locale: "en",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height: "100%",
      plotLineColorGrowing: "rgba(14, 203, 129, 1)",
      plotLineColorFalling: "rgba(246, 70, 93, 1)",
      gridLineColor: theme === "dark" ? "rgba(42, 49, 64, 0.5)" : "rgba(224, 227, 235, 0.5)",
      scaleFontColor: theme === "dark" ? "rgba(132, 142, 156, 1)" : "rgba(71, 85, 105, 1)",
      belowLineFillColorGrowing: "rgba(14, 203, 129, 0.12)",
      belowLineFillColorFalling: "rgba(246, 70, 93, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(14, 203, 129, 0)",
      belowLineFillColorFallingBottom: "rgba(246, 70, 93, 0)",
      symbolActiveColor: "rgba(240, 185, 11, 0.12)",
      tabs: [
        {
          title: "Crypto",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "Bitcoin" },
            { s: "BINANCE:ETHUSDT", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
            { s: "BINANCE:BNBUSDT", d: "BNB" },
            { s: "BINANCE:XRPUSDT", d: "XRP" },
            { s: "BINANCE:ADAUSDT", d: "Cardano" },
          ],
        },
        {
          title: "Stocks",
          symbols: [
            { s: "NASDAQ:AAPL", d: "Apple" },
            { s: "NASDAQ:TSLA", d: "Tesla" },
            { s: "NASDAQ:NVDA", d: "NVIDIA" },
            { s: "NASDAQ:MSFT", d: "Microsoft" },
            { s: "NASDAQ:AMZN", d: "Amazon" },
            { s: "NASDAQ:META", d: "Meta" },
          ],
        },
        {
          title: "Forex",
          symbols: [
            { s: "FX:EURUSD", d: "EUR/USD" },
            { s: "FX:GBPUSD", d: "GBP/USD" },
            { s: "FX:USDJPY", d: "USD/JPY" },
            { s: "FX:AUDUSD", d: "AUD/USD" },
            { s: "FX:USDCAD", d: "USD/CAD" },
          ],
        },
        {
          title: "Indices",
          symbols: [
            { s: "SP:SPX", d: "S&P 500" },
            { s: "NASDAQ:NDX", d: "Nasdaq 100" },
            { s: "DJ:DJI", d: "Dow 30" },
            { s: "TVC:GOLD", d: "Gold" },
            { s: "TVC:USOIL", d: "Crude Oil" },
          ],
        },
      ],
    },
    [theme],
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
