import { Positions } from "../components/trading/Positions";
import { useTrading } from "../context/TradingContext";

export function Portfolio() {
  const { balance, positions, orders } = useTrading();

  const holdingsValue = positions.reduce(
    (sum, p) => sum + p.currentPrice * p.quantity,
    0,
  );
  const equity = balance + holdingsValue;
  const start = 100_000;
  const pnl = equity - start;
  const pnlPct = (pnl / start) * 100;

  const allocation = [
    { label: "Cash", value: balance, color: "#f0b90b" },
    { label: "Holdings", value: holdingsValue, color: "#0ecb81" },
  ];

  return (
    <div className="page-portfolio">
      <div className="page-title-row">
        <div>
          <h1>Portfolio</h1>
          <p className="page-sub">
            Paper account summary · session positions & order history
          </p>
        </div>
      </div>

      <div className="portfolio-top">
        <div className="panel portfolio-hero">
          <span className="chip-label">Total equity</span>
          <div className="hero-value mono">
            $
            {equity.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className={`hero-pnl mono ${pnl >= 0 ? "positive" : "negative"}`}>
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)} ({pnlPct.toFixed(2)}%) from start
          </div>

          <div className="alloc-bars">
            {allocation.map((a) => {
              const pct = equity > 0 ? (a.value / equity) * 100 : 0;
              return (
                <div key={a.label} className="alloc-row">
                  <div className="alloc-label">
                    <span
                      className="dot"
                      style={{ background: a.color }}
                    />
                    {a.label}
                    <span className="mono muted">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="alloc-track">
                    <div
                      className="alloc-fill"
                      style={{ width: `${pct}%`, background: a.color }}
                    />
                  </div>
                  <div className="mono alloc-val">
                    $
                    {a.value.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="portfolio-stats">
          <div className="stat-card">
            <div className="stat-top">
              <span>Cash balance</span>
            </div>
            <div className="stat-value mono">
              $
              {balance.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span>Holdings value</span>
            </div>
            <div className="stat-value mono">
              $
              {holdingsValue.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span>Positions</span>
            </div>
            <div className="stat-value mono">{positions.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span>Total orders</span>
            </div>
            <div className="stat-value mono">{orders.length}</div>
          </div>
        </div>
      </div>

      <Positions />
    </div>
  );
}
