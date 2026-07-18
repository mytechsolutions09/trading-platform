import { TradingViewChart } from "../components/charts/TradingViewChart";
import { Watchlist } from "../components/trading/Watchlist";
import { OrderPanel } from "../components/trading/OrderPanel";
import { OrderBook } from "../components/trading/OrderBook";
import { Positions } from "../components/trading/Positions";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../data/symbols";

export function Trade() {
  const { selected } = useTrading();

  return (
    <div className="page-trade">
      <div className="page-title-row">
        <div>
          <h1>Trade desk</h1>
          <p className="page-sub">
            Paper trading · no real funds · live TV chart for {selected.symbol}
          </p>
        </div>
        <div className="trade-meta mono">
          <span className="badge soft">{selected.assetClass}</span>
          <span>
            H {formatPrice(selected.high24h, selected.assetClass)} · L{" "}
            {formatPrice(selected.low24h, selected.assetClass)}
          </span>
          <span>Vol {selected.volume}</span>
        </div>
      </div>

      <div className="trade-grid">
        <Watchlist />

        <div className="panel chart-panel">
          <div className="chart-body trade-chart">
            <TradingViewChart symbol={selected.tvSymbol} height="100%" />
          </div>
        </div>

        <div className="trade-right">
          <OrderPanel />
          <OrderBook />
        </div>
      </div>

      <Positions />
    </div>
  );
}
