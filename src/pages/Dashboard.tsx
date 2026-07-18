import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react";
import { TradingViewChart } from "../components/charts/TradingViewChart";
import { MarketOverview } from "../components/charts/MarketOverview";
import { Watchlist } from "../components/trading/Watchlist";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../data/symbols";

export function Dashboard() {
  const { selected, balance, positions, orders } = useTrading();

  const equity =
    balance +
    positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const pnl = equity - 100_000;
  const filled = orders.filter((o) => o.status === "filled").length;

  const stats = [
    {
      label: "Equity",
      value: `$${equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      hint: "Cash + positions",
      icon: Wallet,
      tone: "accent" as const,
    },
    {
      label: "Unrealized PnL",
      value: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
      hint: "vs $100k start",
      icon: pnl >= 0 ? TrendingUp : TrendingDown,
      tone: pnl >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      label: "Open positions",
      value: String(positions.length),
      hint: "Active holdings",
      icon: Activity,
      tone: "neutral" as const,
    },
    {
      label: "Filled orders",
      value: String(filled),
      hint: "Session total",
      icon: TrendingUp,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="page-dashboard">
      <div className="page-title-row">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">
            Live TradingView charts · paper trading workspace
          </p>
        </div>
        <Link to="/trade" className="btn-primary">
          Open trade desk
        </Link>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card tone-${s.tone}`}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={16} />
            </div>
            <div className="stat-value mono">{s.value}</div>
            <div className="stat-hint">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>
                {selected.symbol}{" "}
                <span className="panel-meta">{selected.name}</span>
              </h3>
            </div>
            <div className="mono">
              {formatPrice(selected.price, selected.assetClass)}
              <span
                className={
                  selected.changePct >= 0 ? "positive" : "negative"
                }
              >
                {" "}
                {selected.changePct >= 0 ? "+" : ""}
                {selected.changePct.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="chart-body">
            <TradingViewChart symbol={selected.tvSymbol} height="100%" />
          </div>
        </div>

        <Watchlist />

        <div className="panel market-panel">
          <div className="panel-header">
            <h3>Market overview</h3>
          </div>
          <div className="widget-body tall">
            <MarketOverview />
          </div>
        </div>
      </div>
    </div>
  );
}
