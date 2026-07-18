import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Search, Check, RefreshCw } from "lucide-react";
import {
  formatPrice,
  parseCustomTvSymbol,
  searchCatalog,
  type SymbolInfo,
} from "../../data/symbols";
import { useTrading } from "../../context/TradingContext";

export function Watchlist() {
  const {
    watchlist,
    selected,
    setSelectedSymbol,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    pricesStatus,
    lastPriceUpdate,
    refreshPrices,
  } = useTrading();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFeedback(null);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => searchCatalog(query), [query]);

  const handleAdd = async (item: SymbolInfo) => {
    const result = await addToWatchlist(item);
    setFeedback(result.message);
    if (result.ok) {
      setTimeout(() => setOpen(false), 400);
    }
  };

  const handleAddCustom = () => {
    const custom = parseCustomTvSymbol(query);
    if (!custom) {
      setFeedback(
        "Use a TradingView id like NASDAQ:MSFT or BINANCE:PEPEUSDT",
      );
      return;
    }
    void handleAdd(custom);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    void removeFromWatchlist(id);
  };

  return (
    <div className="panel watchlist">
      <div className="panel-header">
        <div className="wl-title-block">
          <h3>Watchlist</h3>
          <span
            className={`price-status ${pricesStatus}`}
            title={
              lastPriceUpdate
                ? `Updated ${new Date(lastPriceUpdate).toLocaleTimeString()}`
                : "Fetching market prices"
            }
          >
            <span className="price-status-dot" />
            {pricesStatus === "live"
              ? "Live"
              : pricesStatus === "loading"
                ? "Updating…"
                : pricesStatus === "error"
                  ? "Offline"
                  : "—"}
          </span>
        </div>
        <div className="wl-header-actions">
          <span className="panel-meta">{watchlist.length}</span>
          <button
            type="button"
            className="wl-icon-btn"
            onClick={() => void refreshPrices()}
            title="Refresh live prices"
            aria-label="Refresh live prices"
            disabled={pricesStatus === "loading"}
          >
            <RefreshCw
              size={14}
              className={pricesStatus === "loading" ? "spin" : undefined}
            />
          </button>
          <button
            type="button"
            className="wl-add-btn"
            onClick={() => setOpen(true)}
            title="Add to watchlist"
            aria-label="Add to watchlist"
          >
            <Plus size={16} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className="watchlist-table-head">
        <span>Symbol</span>
        <span>Price</span>
        <span>24h</span>
        <span />
      </div>

      <ul className="watchlist-list">
        {watchlist.map((item) => {
          const active = item.id === selected?.id;
          const up = item.changePct >= 0;
          return (
            <li key={item.id}>
              <div
                className={`watchlist-row ${active ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSymbol(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSymbol(item.id);
                  }
                }}
              >
                <div className="wl-symbol">
                  <span className="wl-ticker">{item.symbol}</span>
                  <span className="wl-name">{item.name}</span>
                </div>
                <span className="mono wl-price">
                  {formatPrice(item.price, item.assetClass)}
                </span>
                <span className={`mono wl-chg ${up ? "positive" : "negative"}`}>
                  {up ? "+" : ""}
                  {item.changePct.toFixed(2)}%
                </span>
                <button
                  type="button"
                  className="wl-remove-btn"
                  title={`Remove ${item.symbol}`}
                  aria-label={`Remove ${item.symbol}`}
                  onClick={(e) => handleRemove(e, item.id)}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="wl-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="wl-modal"
            role="dialog"
            aria-labelledby="wl-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wl-modal-header">
              <h3 id="wl-modal-title">Add to watchlist</h3>
              <button
                type="button"
                className="icon-btn sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="wl-search">
              <Search size={15} className="wl-search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFeedback(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const first = results.find((r) => !isInWatchlist(r.id));
                    if (first) void handleAdd(first);
                    else if (query.trim()) handleAddCustom();
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search or paste TV symbol (NASDAQ:MSFT)"
              />
            </div>

            {feedback && <p className="wl-feedback">{feedback}</p>}

            <ul className="wl-results">
              {results.map((item) => {
                const added = isInWatchlist(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`wl-result-row ${added ? "added" : ""}`}
                      disabled={added}
                      onClick={() => void handleAdd(item)}
                    >
                      <div className="wl-symbol">
                        <span className="wl-ticker">{item.symbol}</span>
                        <span className="wl-name">
                          {item.name} · {item.assetClass}
                        </span>
                      </div>
                      <span className="wl-result-action">
                        {added ? (
                          <>
                            <Check size={14} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="wl-empty">
                  <p>No catalog match for “{query}”.</p>
                  <button
                    type="button"
                    className="btn-primary wl-custom-btn"
                    onClick={handleAddCustom}
                  >
                    Add as TradingView symbol
                  </button>
                  <p className="wl-hint">
                    Examples: <code>NASDAQ:MSFT</code>,{" "}
                    <code>BINANCE:PEPEUSDT</code>, <code>FX:USDJPY</code>
                  </p>
                </li>
              )}
            </ul>

            <p className="wl-persist-note">
              Saved in local SQLite (data/apex-trade.db)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
