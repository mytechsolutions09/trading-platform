import { EconomicCalendar } from "../components/charts/EconomicCalendar";

export function Calendar() {
  return (
    <div className="page-calendar">
      <div className="page-title-row">
        <div>
          <h1>Economic calendar</h1>
          <p className="page-sub">
            Macro events from TradingView · filter by impact & region
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Upcoming events</h3>
        </div>
        <div className="widget-body" style={{ height: "calc(100vh - 180px)", minHeight: "480px" }}>
          <EconomicCalendar />
        </div>
      </div>
    </div>
  );
}
