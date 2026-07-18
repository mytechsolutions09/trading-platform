export type AssetClass = "crypto" | "stock" | "forex" | "index";

export interface SymbolInfo {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  change24h: number;
  changePct: number;
  volume: string;
  high24h: number;
  low24h: number;
}

/** Full catalog users can search and add from */
const STATIC_SYMBOL_CATALOG: SymbolInfo[] = [
  {
    id: "btc",
    symbol: "BTCUSDT",
    tvSymbol: "BINANCE:BTCUSDT",
    name: "Bitcoin",
    assetClass: "crypto",
    price: 68420.5,
    change24h: 1240.3,
    changePct: 1.85,
    volume: "28.4B",
    high24h: 69120,
    low24h: 66890,
  },
  {
    id: "eth",
    symbol: "ETHUSDT",
    tvSymbol: "BINANCE:ETHUSDT",
    name: "Ethereum",
    assetClass: "crypto",
    price: 3521.8,
    change24h: -42.15,
    changePct: -1.18,
    volume: "12.1B",
    high24h: 3610,
    low24h: 3488,
  },
  {
    id: "sol",
    symbol: "SOLUSDT",
    tvSymbol: "BINANCE:SOLUSDT",
    name: "Solana",
    assetClass: "crypto",
    price: 178.42,
    change24h: 6.88,
    changePct: 4.01,
    volume: "3.2B",
    high24h: 182.1,
    low24h: 169.5,
  },
  {
    id: "bnb",
    symbol: "BNBUSDT",
    tvSymbol: "BINANCE:BNBUSDT",
    name: "BNB",
    assetClass: "crypto",
    price: 612.4,
    change24h: 8.2,
    changePct: 1.36,
    volume: "1.8B",
    high24h: 620,
    low24h: 598,
  },
  {
    id: "xrp",
    symbol: "XRPUSDT",
    tvSymbol: "BINANCE:XRPUSDT",
    name: "XRP",
    assetClass: "crypto",
    price: 0.624,
    change24h: 0.018,
    changePct: 2.97,
    volume: "2.1B",
    high24h: 0.635,
    low24h: 0.601,
  },
  {
    id: "ada",
    symbol: "ADAUSDT",
    tvSymbol: "BINANCE:ADAUSDT",
    name: "Cardano",
    assetClass: "crypto",
    price: 0.458,
    change24h: -0.012,
    changePct: -2.55,
    volume: "420M",
    high24h: 0.472,
    low24h: 0.449,
  },
  {
    id: "doge",
    symbol: "DOGEUSDT",
    tvSymbol: "BINANCE:DOGEUSDT",
    name: "Dogecoin",
    assetClass: "crypto",
    price: 0.142,
    change24h: 0.006,
    changePct: 4.41,
    volume: "1.1B",
    high24h: 0.148,
    low24h: 0.135,
  },
  {
    id: "avax",
    symbol: "AVAXUSDT",
    tvSymbol: "BINANCE:AVAXUSDT",
    name: "Avalanche",
    assetClass: "crypto",
    price: 36.8,
    change24h: 1.2,
    changePct: 3.37,
    volume: "380M",
    high24h: 37.5,
    low24h: 35.1,
  },
  {
    id: "link",
    symbol: "LINKUSDT",
    tvSymbol: "BINANCE:LINKUSDT",
    name: "Chainlink",
    assetClass: "crypto",
    price: 14.25,
    change24h: -0.35,
    changePct: -2.4,
    volume: "290M",
    high24h: 14.8,
    low24h: 14.0,
  },
  {
    id: "ltc",
    symbol: "LTCUSDT",
    tvSymbol: "BINANCE:LTCUSDT",
    name: "Litecoin",
    assetClass: "crypto",
    price: 78.5,
    change24h: -0.85,
    changePct: -1.07,
    volume: "350M",
    high24h: 80.1,
    low24h: 77.2,
  },
  {
    id: "dot",
    symbol: "DOTUSDT",
    tvSymbol: "BINANCE:DOTUSDT",
    name: "Polkadot",
    assetClass: "crypto",
    price: 6.25,
    change24h: 0.12,
    changePct: 1.96,
    volume: "180M",
    high24h: 6.35,
    low24h: 6.10,
  },
  {
    id: "matic",
    symbol: "MATICUSDT",
    tvSymbol: "BINANCE:MATICUSDT",
    name: "Polygon",
    assetClass: "crypto",
    price: 0.55,
    change24h: -0.015,
    changePct: -2.65,
    volume: "210M",
    high24h: 0.58,
    low24h: 0.54,
  },
  {
    id: "pepe",
    symbol: "PEPEUSDT",
    tvSymbol: "BINANCE:PEPEUSDT",
    name: "Pepe",
    assetClass: "crypto",
    price: 0.0000115,
    change24h: 0.0000007,
    changePct: 6.48,
    volume: "1.2B",
    high24h: 0.0000125,
    low24h: 0.0000105,
  },
  {
    id: "ton",
    symbol: "TONUSDT",
    tvSymbol: "BINANCE:TONUSDT",
    name: "Toncoin",
    assetClass: "crypto",
    price: 7.35,
    change24h: 0.18,
    changePct: 2.51,
    volume: "280M",
    high24h: 7.50,
    low24h: 7.15,
  },
  {
    id: "shib",
    symbol: "SHIBUSDT",
    tvSymbol: "BINANCE:SHIBUSDT",
    name: "Shiba Inu",
    assetClass: "crypto",
    price: 0.0000185,
    change24h: -0.0000003,
    changePct: -1.60,
    volume: "480M",
    high24h: 0.0000192,
    low24h: 0.0000181,
  },
  {
    id: "uni",
    symbol: "UNIUSDT",
    tvSymbol: "BINANCE:UNIUSDT",
    name: "Uniswap",
    assetClass: "crypto",
    price: 7.85,
    change24h: -0.12,
    changePct: -1.51,
    volume: "150M",
    high24h: 8.05,
    low24h: 7.75,
  },
  {
    id: "sui",
    symbol: "SUIUSDT",
    tvSymbol: "BINANCE:SUIUSDT",
    name: "Sui",
    assetClass: "crypto",
    price: 1.12,
    change24h: 0.045,
    changePct: 4.19,
    volume: "240M",
    high24h: 1.18,
    low24h: 1.06,
  },
  {
    id: "near",
    symbol: "NEARUSDT",
    tvSymbol: "BINANCE:NEARUSDT",
    name: "Near Protocol",
    assetClass: "crypto",
    price: 5.42,
    change24h: 0.20,
    changePct: 3.83,
    volume: "290M",
    high24h: 5.60,
    low24h: 5.15,
  },
  {
    id: "aapl",
    symbol: "AAPL",
    tvSymbol: "NASDAQ:AAPL",
    name: "Apple Inc.",
    assetClass: "stock",
    price: 214.35,
    change24h: 1.92,
    changePct: 0.9,
    volume: "52.1M",
    high24h: 215.8,
    low24h: 211.4,
  },
  {
    id: "tsla",
    symbol: "TSLA",
    tvSymbol: "NASDAQ:TSLA",
    name: "Tesla Inc.",
    assetClass: "stock",
    price: 248.6,
    change24h: -5.4,
    changePct: -2.13,
    volume: "98.7M",
    high24h: 256.2,
    low24h: 246.1,
  },
  {
    id: "nvda",
    symbol: "NVDA",
    tvSymbol: "NASDAQ:NVDA",
    name: "NVIDIA Corp.",
    assetClass: "stock",
    price: 131.28,
    change24h: 3.45,
    changePct: 2.7,
    volume: "312M",
    high24h: 132.9,
    low24h: 127.5,
  },
  {
    id: "msft",
    symbol: "MSFT",
    tvSymbol: "NASDAQ:MSFT",
    name: "Microsoft Corp.",
    assetClass: "stock",
    price: 428.9,
    change24h: 2.1,
    changePct: 0.49,
    volume: "22.4M",
    high24h: 431.2,
    low24h: 424.5,
  },
  {
    id: "amzn",
    symbol: "AMZN",
    tvSymbol: "NASDAQ:AMZN",
    name: "Amazon.com Inc.",
    assetClass: "stock",
    price: 186.4,
    change24h: -1.8,
    changePct: -0.96,
    volume: "38.2M",
    high24h: 189.1,
    low24h: 185.2,
  },
  {
    id: "meta",
    symbol: "META",
    tvSymbol: "NASDAQ:META",
    name: "Meta Platforms",
    assetClass: "stock",
    price: 512.8,
    change24h: 6.4,
    changePct: 1.26,
    volume: "14.8M",
    high24h: 518.2,
    low24h: 505.1,
  },
  {
    id: "googl",
    symbol: "GOOGL",
    tvSymbol: "NASDAQ:GOOGL",
    name: "Alphabet Inc.",
    assetClass: "stock",
    price: 178.2,
    change24h: 1.1,
    changePct: 0.62,
    volume: "26.5M",
    high24h: 179.8,
    low24h: 176.4,
  },
  {
    id: "amd",
    symbol: "AMD",
    tvSymbol: "NASDAQ:AMD",
    name: "Advanced Micro Devices",
    assetClass: "stock",
    price: 162.5,
    change24h: 4.2,
    changePct: 2.65,
    volume: "48.1M",
    high24h: 164.8,
    low24h: 157.9,
  },
  {
    id: "eurusd",
    symbol: "EURUSD",
    tvSymbol: "FX:EURUSD",
    name: "Euro / US Dollar",
    assetClass: "forex",
    price: 1.0864,
    change24h: 0.0012,
    changePct: 0.11,
    volume: "—",
    high24h: 1.0889,
    low24h: 1.0841,
  },
  {
    id: "gbpusd",
    symbol: "GBPUSD",
    tvSymbol: "FX:GBPUSD",
    name: "Pound / US Dollar",
    assetClass: "forex",
    price: 1.2742,
    change24h: -0.0028,
    changePct: -0.22,
    volume: "—",
    high24h: 1.2788,
    low24h: 1.2721,
  },
  {
    id: "usdjpy",
    symbol: "USDJPY",
    tvSymbol: "FX:USDJPY",
    name: "US Dollar / Yen",
    assetClass: "forex",
    price: 157.42,
    change24h: 0.38,
    changePct: 0.24,
    volume: "—",
    high24h: 157.9,
    low24h: 156.8,
  },
  {
    id: "audusd",
    symbol: "AUDUSD",
    tvSymbol: "FX:AUDUSD",
    name: "Aussie / US Dollar",
    assetClass: "forex",
    price: 0.6621,
    change24h: -0.0015,
    changePct: -0.23,
    volume: "—",
    high24h: 0.665,
    low24h: 0.6605,
  },
  {
    id: "spx",
    symbol: "SPX",
    tvSymbol: "SP:SPX",
    name: "S&P 500",
    assetClass: "index",
    price: 5634.5,
    change24h: 28.4,
    changePct: 0.51,
    volume: "—",
    high24h: 5648,
    low24h: 5598,
  },
  {
    id: "ndx",
    symbol: "NDX",
    tvSymbol: "NASDAQ:NDX",
    name: "Nasdaq 100",
    assetClass: "index",
    price: 20112.3,
    change24h: 145.8,
    changePct: 0.73,
    volume: "—",
    high24h: 20188,
    low24h: 19940,
  },
  {
    id: "dji",
    symbol: "DJI",
    tvSymbol: "DJ:DJI",
    name: "Dow Jones 30",
    assetClass: "index",
    price: 40112,
    change24h: 185,
    changePct: 0.46,
    volume: "—",
    high24h: 40250,
    low24h: 39880,
  },
  {
    id: "gold",
    symbol: "GOLD",
    tvSymbol: "TVC:GOLD",
    name: "Gold",
    assetClass: "index",
    price: 2385.6,
    change24h: 12.4,
    changePct: 0.52,
    volume: "—",
    high24h: 2398,
    low24h: 2368,
  },
  {
    id: "usoil",
    symbol: "USOIL",
    tvSymbol: "TVC:USOIL",
    name: "Crude Oil WTI",
    assetClass: "index",
    price: 78.42,
    change24h: -0.85,
    changePct: -1.07,
    volume: "—",
    high24h: 79.8,
    low24h: 78.1,
  },
];

/** Default watchlist shown on first visit */
export const DEFAULT_WATCHLIST_IDS = [
  "btc",
  "eth",
  "sol",
  "aapl",
  "tsla",
  "nvda",
  "eurusd",
  "gbpusd",
  "spx",
  "ndx",
];

export const DEFAULT_WATCHLIST: SymbolInfo[] = DEFAULT_WATCHLIST_IDS.map(
  (id) => STATIC_SYMBOL_CATALOG.find((s) => s.id === id)!,
).filter(Boolean);

/** @deprecated use DEFAULT_WATCHLIST */
export const WATCHLIST = DEFAULT_WATCHLIST;

export const TICKER_SYMBOLS = [
  { proName: "BINANCE:BTCUSDT", title: "BTC/USDT" },
  { proName: "BINANCE:ETHUSDT", title: "ETH/USDT" },
  { proName: "BINANCE:SOLUSDT", title: "SOL/USDT" },
  { proName: "NASDAQ:AAPL", title: "AAPL" },
  { proName: "NASDAQ:TSLA", title: "TSLA" },
  { proName: "NASDAQ:NVDA", title: "NVDA" },
  { proName: "FX:EURUSD", title: "EUR/USD" },
  { proName: "SP:SPX", title: "S&P 500" },
  { proName: "BINANCE:BNBUSDT", title: "BNB/USDT" },
  { proName: "COINBASE:XRPUSD", title: "XRP/USD" },
];

export const WATCHLIST_STORAGE_KEY = "apex-trade-watchlist";
export const SELECTED_SYMBOL_STORAGE_KEY = "apex-trade-selected-symbol";

export function formatPrice(price: number, assetClass: AssetClass): string {
  if (assetClass === "forex") return price.toFixed(4);
  if (assetClass === "crypto" && price < 10) return price.toFixed(4);
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(2);
}

export const CUSTOM_SYMBOLS_STORAGE_KEY = "apex-trade-custom-symbols";

export function loadCustomSymbols(): SymbolInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SYMBOLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomSymbol(sym: SymbolInfo) {
  try {
    const list = loadCustomSymbols();
    if (!list.some(s => s.id === sym.id)) {
      list.push(sym);
      localStorage.setItem(CUSTOM_SYMBOLS_STORAGE_KEY, JSON.stringify(list));
      refreshSymbolCatalog();
    }
  } catch {}
}

export function deleteCustomSymbol(id: string) {
  try {
    const list = loadCustomSymbols().filter(s => s.id !== id);
    localStorage.setItem(CUSTOM_SYMBOLS_STORAGE_KEY, JSON.stringify(list));
    refreshSymbolCatalog();
  } catch {}
}

export const SYMBOL_CATALOG: SymbolInfo[] = [];

export function refreshSymbolCatalog() {
  SYMBOL_CATALOG.length = 0;
  SYMBOL_CATALOG.push(...STATIC_SYMBOL_CATALOG);
  SYMBOL_CATALOG.push(...loadCustomSymbols());
}

// Initial populate
refreshSymbolCatalog();

export function searchCatalog(query: string): SymbolInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOL_CATALOG;
  return SYMBOL_CATALOG.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.tvSymbol.toLowerCase().includes(q) ||
      s.assetClass.toLowerCase().includes(q),
  );
}

const COMMON_CRYPTO_TICKERS = new Set([
  "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "DOT",
  "MATIC", "LTC", "NEAR", "TRX", "SHIB", "PEPE", "SUI", "APT", "OP", "ARB",
  "LDO", "FET", "RNDR", "FIL", "ICP", "FTM", "WIF", "BONK", "TON", "KAS",
  "FLOKI", "JASMY", "RENDER", "BOME", "ETC", "XLM", "ALGO", "ATOM", "HBAR",
  "VET", "GRT", "THETA", "MKR", "ENA", "PENDLE", "WLD", "TIA", "INJ", "STX",
  "IMX", "RUNE", "SEI", "GALA", "BEAM", "W", "JUP", "PYTH", "STRK", "DYDX",
  "CRV", "AAVE", "RAY", "ORDI", "SATS", "1INCH", "POL", "DOG", "NOT", "PEOPLE",
  "OM", "ZRO", "ENS", "UNI", "BGB"
]);

/** Normalize any symbol into a valid TradingView chart symbol (e.g., BYBIT:FARTCOINUSDT.P, BINANCE:BTCUSDT) */
export function normalizeTvSymbolForChart(rawSymbol: string): string {
  if (!rawSymbol) return "BINANCE:BTCUSDT";

  let s = rawSymbol.trim().toUpperCase();

  // Normalize missing dot before P for perpetuals: FARTCOINUSDTP -> FARTCOINUSDT.P
  if (s.endsWith("USDTP")) {
    s = s.replace(/USDTP$/, "USDT.P");
  }

  if (s.includes(":")) {
    const [ex, ticker] = s.split(":");
    // If it's a perpetual contract (.P) on BINANCE, route to BYBIT for TradingView chart compatibility
    if ((ticker.endsWith(".P") || ticker.endsWith(".PERP")) && (ex === "BINANCE" || !ex)) {
      return `BYBIT:${ticker}`;
    }
    return `${ex}:${ticker}`;
  }

  // Symbol without colon exchange prefix:
  if (s.endsWith(".P") || s.endsWith(".PERP")) {
    return `BYBIT:${s}`;
  }
  if (s.endsWith("USDT") || s.endsWith("USDC") || s.endsWith("BTC") || s.endsWith("ETH")) {
    return `BINANCE:${s}`;
  }
  if (s.endsWith("=X")) {
    return `FX:${s.replace("=X", "")}`;
  }
  if (s.startsWith("^")) {
    return `TVC:${s}`;
  }

  return `NASDAQ:${s}`;
}

/** Build a symbol from a free-form TradingView id like NASDAQ:MSFT or BINANCE:PEPEUSDT or FARTCOINUSDT.P */
export function parseCustomTvSymbol(input: string): SymbolInfo | null {
  let raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;

  if (raw.endsWith("USDTP")) {
    raw = raw.replace(/USDTP$/, "USDT.P");
  }

  let tvSymbol = raw;
  let exchange = "";
  let ticker = raw;

  if (raw.includes(":")) {
    const [ex, rest] = raw.split(":");
    if (!ex || !rest) return null;
    exchange = ex;
    ticker = rest;
    tvSymbol = `${ex}:${rest}`;
  } else {
    // Guess exchange from common patterns
    if (raw.endsWith(".P") || raw.endsWith(".PERP")) {
      exchange = "BYBIT";
      tvSymbol = `BYBIT:${raw}`;
    } else if (raw.endsWith("USDT") || raw.endsWith("USD") || raw.endsWith("BTC")) {
      exchange = "BINANCE";
      tvSymbol = `BINANCE:${raw}`;
    } else if (COMMON_CRYPTO_TICKERS.has(raw)) {
      exchange = "BINANCE";
      ticker = `${raw}USDT`;
      tvSymbol = `BINANCE:${ticker}`;
    } else if (raw.length <= 5) {
      exchange = "NASDAQ";
      tvSymbol = `NASDAQ:${raw}`;
    } else {
      exchange = "BINANCE";
      tvSymbol = `BINANCE:${raw}`;
    }
  }

  const id = `custom_${tvSymbol.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
  const assetClass = inferAssetClass(exchange, ticker);

  return {
    id,
    symbol: ticker,
    tvSymbol,
    name: `${ticker} (${exchange || "Custom"})`,
    assetClass,
    price: 100,
    change24h: 0,
    changePct: 0,
    volume: "—",
    high24h: 100,
    low24h: 100,
  };
}

function inferAssetClass(exchange: string, ticker: string): AssetClass {
  const ex = exchange.toUpperCase();
  if (
    ex === "BINANCE" ||
    ex === "COINBASE" ||
    ex === "BITSTAMP" ||
    ex === "KRAKEN"
  ) {
    return "crypto";
  }
  if (ex === "FX" || ex === "OANDA" || ex === "FX_IDC") return "forex";
  if (
    ex === "SP" ||
    ex === "DJ" ||
    ex === "TVC" ||
    ticker === "SPX" ||
    ticker === "NDX" ||
    ticker === "DJI"
  ) {
    return "index";
  }
  return "stock";
}

export function loadWatchlistFromStorage(): SymbolInfo[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST.map((s) => ({ ...s }));

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_WATCHLIST.map((s) => ({ ...s }));
    }

    const items: SymbolInfo[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Partial<SymbolInfo>;
      if (typeof e.id === "string" && typeof e.tvSymbol === "string") {
        // Prefer latest catalog data when available
        const fromCatalog = SYMBOL_CATALOG.find((s) => s.id === e.id);
        if (fromCatalog) {
          items.push({ ...fromCatalog });
        } else if (
          typeof e.symbol === "string" &&
          typeof e.name === "string" &&
          typeof e.assetClass === "string"
        ) {
          items.push({
            id: e.id,
            symbol: e.symbol,
            tvSymbol: e.tvSymbol,
            name: e.name,
            assetClass: e.assetClass as AssetClass,
            price: typeof e.price === "number" ? e.price : 100,
            change24h: typeof e.change24h === "number" ? e.change24h : 0,
            changePct: typeof e.changePct === "number" ? e.changePct : 0,
            volume: typeof e.volume === "string" ? e.volume : "—",
            high24h: typeof e.high24h === "number" ? e.high24h : 100,
            low24h: typeof e.low24h === "number" ? e.low24h : 100,
          });
        }
      }
    }

    return items.length > 0 ? items : DEFAULT_WATCHLIST.map((s) => ({ ...s }));
  } catch {
    return DEFAULT_WATCHLIST.map((s) => ({ ...s }));
  }
}

export function saveWatchlistToStorage(list: SymbolInfo[]): void {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode errors
  }
}

export function loadSelectedIdFromStorage(fallback: string): string {
  try {
    return localStorage.getItem(SELECTED_SYMBOL_STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function saveSelectedIdToStorage(id: string): void {
  try {
    localStorage.setItem(SELECTED_SYMBOL_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
