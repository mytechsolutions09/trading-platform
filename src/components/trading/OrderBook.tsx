import { useMemo } from "react";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../data/symbols";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function OrderBook() {
  const { selected } = useTrading();

  const { asks, bids, mid } = useMemo(() => {
    const base = selected.price;
    const asks = Array.from({ length: 12 }, (_, i) => {
      const price = base * (1 + (i + 1) * 0.00035);
      const size =
        seededRandom(base + i + 1) * (selected.assetClass === "crypto" ? 2.5 : 120) +
        0.1;
      return { price, size };
    }).reverse();

    const bids = Array.from({ length: 12 }, (_, i) => {
      const price = base * (1 - (i + 1) * 0.00035);
      const size =
        seededRandom(base + i + 50) *
          (selected.assetClass === "crypto" ? 2.5 : 120) +
        0.1;
      return { price, size };
    });

    return { asks, bids, mid: base };
  }, [selected]);

  const maxSize = Math.max(
    ...asks.map((a) => a.size),
    ...bids.map((b) => b.size),
  );

  return (
    <div className="panel order-book">
      <div className="panel-header">
        <h3>Order book</h3>
        <span className="panel-meta">Simulated</span>
      </div>
      <div className="ob-head">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      <div className="ob-asks">
        {asks.map((row, i) => {
          const total = row.price * row.size;
          const depth = (row.size / maxSize) * 100;
          return (
            <div key={`a-${i}`} className="ob-row ask">
              <div className="ob-depth" style={{ width: `${depth}%` }} />
              <span className="mono negative">
                {formatPrice(row.price, selected.assetClass)}
              </span>
              <span className="mono">{row.size.toFixed(4)}</span>
              <span className="mono muted">{total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      <div className="ob-mid mono">
        {formatPrice(mid, selected.assetClass)}
        <span className="ob-spread">spread ~0.07%</span>
      </div>
      <div className="ob-bids">
        {bids.map((row, i) => {
          const total = row.price * row.size;
          const depth = (row.size / maxSize) * 100;
          return (
            <div key={`b-${i}`} className="ob-row bid">
              <div className="ob-depth" style={{ width: `${depth}%` }} />
              <span className="mono positive">
                {formatPrice(row.price, selected.assetClass)}
              </span>
              <span className="mono">{row.size.toFixed(4)}</span>
              <span className="mono muted">{total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
