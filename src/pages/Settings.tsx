import { useState, useEffect } from "react";
import { Plus, Trash2, Check, AlertCircle, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import {
  saveCustomSymbol,
  loadCustomSymbols,
  deleteCustomSymbol,
  type SymbolInfo,
  type AssetClass,
} from "../data/symbols";
import { fetchLiveQuotes } from "../services/prices";

export function Settings() {
  const [customPairs, setCustomPairs] = useState<SymbolInfo[]>([]);
  
  // Form fields
  const [symbol, setSymbol] = useState("");
  const [tvSymbol, setTvSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("crypto");
  const [price, setPrice] = useState("100");
  const [changePct, setChangePct] = useState("0");
  const [volume, setVolume] = useState("100M");
  const [high24h, setHigh24h] = useState("100");
  const [low24h, setLow24h] = useState("100");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load custom pairs on mount
  useEffect(() => {
    setCustomPairs(loadCustomSymbols());
  }, []);

  const [fetchingLive, setFetchingLive] = useState(false);

  const handleFetchLiveMetrics = async () => {
    setFeedback(null);
    const trimmedTvSymbol = tvSymbol.trim().toUpperCase();
    if (!trimmedTvSymbol || !trimmedTvSymbol.includes(":")) {
      setFeedback({
        type: "error",
        message: "Please enter a valid TradingView ID with exchange prefix (e.g. BINANCE:BTCUSDT or NASDAQ:AAPL) to fetch live metrics.",
      });
      return;
    }

    setFetchingLive(true);
    try {
      const tickerPart = trimmedTvSymbol.split(":")[1] || "";
      const dummy: SymbolInfo = {
        id: "temp",
        symbol: symbol.trim().toUpperCase() || tickerPart,
        tvSymbol: trimmedTvSymbol,
        name: name.trim() || tickerPart,
        assetClass,
        price: 0,
        change24h: 0,
        changePct: 0,
        volume: "—",
        high24h: 0,
        low24h: 0,
      };

      const quotes = await fetchLiveQuotes([dummy]);
      const quote = quotes.get("temp");
      if (quote) {
        setPrice(quote.price.toString());
        setChangePct(quote.changePct.toString());
        setVolume(quote.volume);
        setHigh24h(quote.high24h.toString());
        setLow24h(quote.low24h.toString());
        
        // Fill symbol and name if they are empty
        if (!symbol.trim()) {
          setSymbol(dummy.symbol);
        }
        if (!name.trim()) {
          setName(dummy.name);
        }

        setFeedback({
          type: "success",
          message: `Successfully loaded live metrics for ${dummy.symbol}!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: `Could not fetch live price for "${trimmedTvSymbol}". Verify exchange prefix and symbol (e.g., BINANCE:BTCUSDT or NASDAQ:AAPL).`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to fetch live prices.",
      });
    } finally {
      setFetchingLive(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedSymbol = symbol.trim().toUpperCase();
    const trimmedTvSymbol = tvSymbol.trim().toUpperCase();
    const trimmedName = name.trim();
    const numPrice = Number(price);
    const numChangePct = Number(changePct);
    const numHigh = Number(high24h);
    const numLow = Number(low24h);

    if (!trimmedSymbol || !trimmedTvSymbol || !trimmedName) {
      setFeedback({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    // Input Validation
    if (!/^[A-Z0-9:_.-]+$/.test(trimmedSymbol)) {
      setFeedback({
        type: "error",
        message: "Ticker symbol can only contain letters, numbers, and basic punctuation (- or _).",
      });
      return;
    }

    if (!/^[A-Z0-9:_.-]+$/.test(trimmedTvSymbol)) {
      setFeedback({
        type: "error",
        message: "TradingView ID can only contain EXCHANGE:SYMBOL (letters, numbers, colons, dashes).",
      });
      return;
    }

    // HTML Sanitization to prevent XSS
    const sanitizedName = trimmedName
      .replace(/<[^>]*>/g, "") // strip HTML tags
      .replace(/[&<>"']/g, "") // strip HTML entities and quotes
      .trim();

    if (!sanitizedName) {
      setFeedback({ type: "error", message: "Please provide a valid asset name." });
      return;
    }

    if (!trimmedTvSymbol.includes(":")) {
      setFeedback({
        type: "error",
        message: "TradingView symbol must include exchange prefix (e.g. BINANCE:LTCUSDT or NASDAQ:TSLA).",
      });
      return;
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      setFeedback({ type: "error", message: "Price must be a positive number." });
      return;
    }

    // Auto-generate ID based on tvSymbol
    const id = `custom_${trimmedTvSymbol.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

    // Verify duplication
    if (customPairs.some((p) => p.id === id)) {
      setFeedback({ type: "error", message: "This trading pair already exists in your custom catalog." });
      return;
    }

    const newPair: SymbolInfo = {
      id,
      symbol: trimmedSymbol,
      tvSymbol: trimmedTvSymbol,
      name: sanitizedName,
      assetClass,
      price: numPrice,
      change24h: (numPrice * numChangePct) / 100,
      changePct: numChangePct,
      volume: volume.trim() || "—",
      high24h: isNaN(numHigh) ? numPrice : numHigh,
      low24h: isNaN(numLow) ? numPrice : numLow,
    };


    saveCustomSymbol(newPair);
    setCustomPairs(loadCustomSymbols());

    // Reset Form
    setSymbol("");
    setTvSymbol("");
    setName("");
    setPrice("100");
    setChangePct("0");
    setVolume("100M");
    setHigh24h("100");
    setLow24h("100");

    setFeedback({ type: "success", message: `Successfully added ${trimmedSymbol} to the catalog!` });
  };

  const handleDelete = (id: string, ticker: string) => {
    if (confirm(`Are you sure you want to delete ${ticker} from your custom pairs catalog?`)) {
      deleteCustomSymbol(id);
      setCustomPairs(loadCustomSymbols());
      setFeedback({ type: "success", message: `Removed ${ticker} from the catalog.` });
    }
  };

  // Helper to suggest TV symbol based on ticker input
  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    const upper = val.toUpperCase().trim();
    if (!upper) {
      setTvSymbol("");
      return;
    }
    
    // Auto guess exchange based on type
    if (assetClass === "crypto") {
      setTvSymbol(`BINANCE:${upper}USDT`);
    } else if (assetClass === "stock") {
      setTvSymbol(`NASDAQ:${upper}`);
    } else if (assetClass === "forex") {
      setTvSymbol(`FX:${upper}`);
    } else {
      setTvSymbol(`TVC:${upper}`);
    }
  };

  return (
    <div className="page-settings">
      <div className="page-title-row">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">Configure platform variables and manage custom trading assets</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Form Card */}
        <div className="panel settings-panel">
          <div className="panel-header">
            <h3>Add New Trading Pair</h3>
          </div>
          <form onSubmit={handleAdd} className="settings-form">
            {feedback && (
              <div className={`settings-alert ${feedback.type}`}>
                {feedback.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset-class">Asset Class *</label>
                <select
                  id="asset-class"
                  value={assetClass}
                  onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                >
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stock">Stock / Equity</option>
                  <option value="forex">Forex (Currency Pair)</option>
                  <option value="index">Index / Commodity</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ticker">Ticker Symbol *</label>
                <input
                  id="ticker"
                  type="text"
                  placeholder="e.g. LTC"
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="tv-id">TradingView ID *</label>
                <div className="input-with-button">
                  <input
                    id="tv-id"
                    type="text"
                    placeholder="e.g. BINANCE:LTCUSDT"
                    value={tvSymbol}
                    onChange={(e) => setTvSymbol(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary fetch-btn"
                    onClick={handleFetchLiveMetrics}
                    disabled={fetchingLive}
                    title="Fetch current market metrics from TradingView ID"
                  >
                    {fetchingLive ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      "Fetch Live Price"
                    )}
                  </button>
                </div>
                <span className="form-hint">Format: EXCHANGE:SYMBOL</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="asset-name">Asset Full Name *</label>
                <input
                  id="asset-name"
                  type="text"
                  placeholder="e.g. Litecoin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row three-cols">
              <div className="form-group">
                <label htmlFor="price">Initial Price *</label>
                <input
                  id="price"
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="change">24h Change %</label>
                <input
                  id="change"
                  type="number"
                  step="any"
                  value={changePct}
                  onChange={(e) => setChangePct(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vol">24h Volume</label>
                <input
                  id="vol"
                  type="text"
                  placeholder="e.g. 150M"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="high">24h High</label>
                <input
                  id="high"
                  type="number"
                  step="any"
                  value={high24h}
                  onChange={(e) => setHigh24h(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="low">24h Low</label>
                <input
                  id="low"
                  type="number"
                  step="any"
                  value={low24h}
                  onChange={(e) => setLow24h(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary form-submit-btn">
              <Plus size={16} style={{ marginRight: 6 }} /> Add Pair to Catalog
            </button>
          </form>
        </div>

        {/* Directory Card */}
        <div className="panel settings-directory">
          <div className="panel-header">
            <h3>Custom Pairs Catalog ({customPairs.length})</h3>
          </div>
          <div className="settings-table-wrap">
            {customPairs.length === 0 ? (
              <div className="directory-empty">
                <SettingsIcon size={32} className="spin-slow" />
                <p>No custom pairs added yet.</p>
                <span className="directory-hint">Use the form on the left to add assets to your workspace.</span>
              </div>
            ) : (
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>TV Symbol</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {customPairs.map((pair) => (
                    <tr key={pair.id}>
                      <td className="mono font-semibold">{pair.symbol}</td>
                      <td>{pair.name}</td>
                      <td className="mono text-xs color-secondary">{pair.tvSymbol}</td>
                      <td className="capitalize text-xs">{pair.assetClass}</td>
                      <td className="mono font-semibold">{pair.price.toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          className="directory-delete-btn"
                          onClick={() => handleDelete(pair.id, pair.symbol)}
                          title={`Delete ${pair.symbol}`}
                          aria-label={`Delete ${pair.symbol}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
