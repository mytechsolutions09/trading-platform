import { useTradingViewWidget } from "../../hooks/useTradingViewWidget";
import { useTrading } from "../../context/TradingContext";

interface EconomicCalendarProps {
  importanceFilter?: string;
  countryFilter?: string;
}

export function EconomicCalendar({
  importanceFilter = "0,1",
  countryFilter = "us,eu,gb,jp,cn,in",
}: EconomicCalendarProps) {
  const { theme } = useTrading();
  const ref = useTradingViewWidget(
    "https://s3.tradingview.com/external-embedding/embed-widget-events.js",
    {
      colorTheme: theme,
      isTransparent: true,
      width: "100%",
      height: "100%",
      locale: "en",
      importanceFilter,
      countryFilter,
    },
    [theme, importanceFilter, countryFilter],
  );

  return (
    <div className="tv-widget-fill" style={{ width: "100%", height: "100%", minHeight: "520px" }}>
      <div
        className="tradingview-widget-container"
        ref={ref}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
