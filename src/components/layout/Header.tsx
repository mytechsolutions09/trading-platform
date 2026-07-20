import { Search, Bell, Wallet } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../data/symbols";

export function Header() {
  const { selected, setSelectedSymbol, watchlist, pricesStatus, balance } =
    useTrading();
  const location = useLocation();
  const isDashboardOrCharts =
    location.pathname === "/" || location.pathname === "/charts";

  return (
    <header className="header">
      <div className="header-left">
        {isDashboardOrCharts && (
          <>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <select
                value={selected.id}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                aria-label="Select symbol"
              >
                {watchlist.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <div className="header-price mono">
                <span className="header-price-val">
                  {formatPrice(selected.price, selected.assetClass)}
                </span>
                <span
                  className={
                    selected.changePct >= 0 ? "positive" : "negative"
                  }
                >
                  {selected.changePct >= 0 ? "+" : ""}
                  {selected.changePct.toFixed(2)}%
                </span>
                {pricesStatus === "live" && (
                  <span className="header-live">LIVE</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="header-right">
        <div className="balance-chip" title="Paper Balance">
          <Wallet size={16} />
          <div>
            <span className="chip-label">Paper balance</span>
            <span className="chip-value mono">
              $
              {balance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="avatar">AT</div>
      </div>
    </header>
  );
}
