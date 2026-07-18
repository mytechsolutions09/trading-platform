import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { useTrading } from "../../context/TradingContext";

export function EconomicCalendar() {
  const { theme } = useTrading();
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-events.js",
    {
      colorTheme: theme,
      isTransparent: true,
      width: "100%",
      height: "100%",
      locale: "en",
      importanceFilter: "0,1",
      countryFilter: "us,eu,gb,jp,cn",
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
