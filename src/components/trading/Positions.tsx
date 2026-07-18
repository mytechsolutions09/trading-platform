import { useTrading } from "../../context/TradingContext";

export function Positions() {
  const { positions, orders, cancelOrder } = useTrading();
  const openOrders = orders.filter((o) => o.status === "open");
  const recent = orders.filter((o) => o.status !== "open").slice(0, 8);

  return (
    <div className="panel positions-panel">
      <div className="panel-header">
        <h3>Positions & Orders</h3>
      </div>

      <div className="sub-section">
        <h4>Open positions</h4>
        {positions.length === 0 ? (
          <p className="empty-hint">No open positions. Place a paper trade to begin.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Entry</th>
                  <th>Mark</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const pnl = (p.currentPrice - p.avgEntry) * p.quantity;
                  const pnlPct =
                    ((p.currentPrice - p.avgEntry) / p.avgEntry) * 100;
                  return (
                    <tr key={p.symbol}>
                      <td>
                        <strong>{p.symbol}</strong>
                      </td>
                      <td className="mono">{p.quantity}</td>
                      <td className="mono">{p.avgEntry.toFixed(2)}</td>
                      <td className="mono">{p.currentPrice.toFixed(2)}</td>
                      <td className={`mono ${pnl >= 0 ? "positive" : "negative"}`}>
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sub-section">
        <h4>Open orders</h4>
        {openOrders.length === 0 ? (
          <p className="empty-hint">No open limit orders.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Side</th>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id}>
                    <td className={o.side === "buy" ? "positive" : "negative"}>
                      {o.side.toUpperCase()}
                    </td>
                    <td>{o.symbol}</td>
                    <td className="mono">{o.quantity}</td>
                    <td className="mono">{o.price.toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => void cancelOrder(o.id)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sub-section">
        <h4>Recent fills</h4>
        {recent.length === 0 ? (
          <p className="empty-hint">No filled orders yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="mono muted">
                      {new Date(o.timestamp).toLocaleTimeString()}
                    </td>
                    <td className={o.side === "buy" ? "positive" : "negative"}>
                      {o.side.toUpperCase()}
                    </td>
                    <td>{o.symbol}</td>
                    <td className="mono">{o.quantity}</td>
                    <td className="mono">{o.price.toFixed(2)}</td>
                    <td>
                      <span className={`status-pill ${o.status}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
