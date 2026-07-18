import { useState } from "react";
import { formatPrice } from "../../data/symbols";
import {
  useTrading,
  type OrderSide,
  type OrderType,
} from "../../context/TradingContext";

export function OrderPanel() {
  const { selected, balance, placeOrder } = useTrading();
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const qty = parseFloat(quantity) || 0;
  const price =
    type === "limit" && parseFloat(limitPrice) > 0
      ? parseFloat(limitPrice)
      : selected.price;
  const total = qty * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await placeOrder({
      side,
      type,
      quantity: qty,
      limitPrice: type === "limit" ? parseFloat(limitPrice) : undefined,
    });
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      setQuantity("");
      setLimitPrice("");
    }
  };

  return (
    <div className="panel order-panel">
      <div className="panel-header">
        <h3>Trade</h3>
        <span className="panel-meta mono">
          ${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="order-symbol">
        <div>
          <div className="order-symbol-name">{selected.symbol}</div>
          <div className="order-symbol-sub">{selected.name}</div>
        </div>
        <div className="order-last mono">
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

      <div className="side-toggle">
        <button
          type="button"
          className={`side-btn buy ${side === "buy" ? "active" : ""}`}
          onClick={() => setSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          className={`side-btn sell ${side === "sell" ? "active" : ""}`}
          onClick={() => setSide("sell")}
        >
          Sell
        </button>
      </div>

      <div className="type-tabs">
        <button
          type="button"
          className={type === "market" ? "active" : ""}
          onClick={() => setType("market")}
        >
          Market
        </button>
        <button
          type="button"
          className={type === "limit" ? "active" : ""}
          onClick={() => setType("limit")}
        >
          Limit
        </button>
      </div>

      <form className="order-form" onSubmit={handleSubmit}>
        {type === "limit" && (
          <label className="field">
            <span>Limit price</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={String(selected.price)}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Quantity</span>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <div className="qty-presets">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                if (side === "buy") {
                  const afford = (balance * pct) / selected.price;
                  setQuantity(
                    afford.toFixed(selected.assetClass === "forex" ? 2 : 4),
                  );
                } else {
                  setQuantity("");
                }
              }}
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        <div className="order-summary">
          <div>
            <span>Est. total</span>
            <span className="mono">
              $
              {total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div>
            <span>Mode</span>
            <span className="badge">Paper</span>
          </div>
        </div>

        <button
          type="submit"
          className={`submit-order ${side === "buy" ? "buy" : "sell"}`}
        >
          {side === "buy" ? "Buy" : "Sell"} {selected.symbol}
        </button>

        {message && (
          <p className={`order-msg ${message.ok ? "ok" : "err"}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
