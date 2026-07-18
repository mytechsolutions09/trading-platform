import { MarketOverview } from "../components/charts/MarketOverview";
import { SymbolOverview } from "../components/charts/SymbolOverview";
import { TechnicalAnalysis } from "../components/charts/TechnicalAnalysis";
import { useTrading } from "../context/TradingContext";

export function Markets() {
  const { selected } = useTrading();

  return (
    <div className="page-markets">
      <div className="page-title-row">
        <div>
          <h1>Markets</h1>
          <p className="page-sub">
            Crypto, stocks, forex & indices via TradingView market widgets
          </p>
        </div>
      </div>

      <div className="markets-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Market overview</h3>
          </div>
          <div className="widget-body" style={{ height: 560 }}>
            <MarketOverview />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Technicals · {selected.symbol}</h3>
          </div>
          <div className="widget-body" style={{ height: 560 }}>
            <TechnicalAnalysis symbol={selected.tvSymbol} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Heatmap-style overview</h3>
        </div>
        <div className="widget-body" style={{ height: 400 }}>
          <SymbolOverview
            symbols={[
              ["BINANCE:BTCUSDT|1D"],
              ["BINANCE:ETHUSDT|1D"],
              ["BINANCE:SOLUSDT|1D"],
              ["NASDAQ:AAPL|1D"],
              ["NASDAQ:TSLA|1D"],
              ["NASDAQ:NVDA|1D"],
              ["FX:EURUSD|1D"],
              ["TVC:GOLD|1D"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}
