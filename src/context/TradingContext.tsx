import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadSelectedIdFromStorage,
  loadWatchlistFromStorage,
  WATCHLIST_STORAGE_KEY,
  SELECTED_SYMBOL_STORAGE_KEY,
  type SymbolInfo,
} from "../data/symbols";
import { applyQuote, fetchLiveQuotes } from "../services/prices";
import {
  apiAddWatchlist,
  apiCancelOrder,
  apiImportLocalStorage,
  apiPlaceOrder,
  apiRemoveWatchlist,
  apiSetSelected,
  apiUpdatePositionPrices,
  fetchBootstrap,
  fetchHealth,
  toSymbolInfo,
} from "../services/api";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type PricesStatus = "idle" | "loading" | "live" | "error";
export type DbStatus = "connecting" | "online" | "offline";

export interface Order {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price: number;
  total: number;
  status: "filled" | "open" | "cancelled";
  timestamp: number;
}

export interface Position {
  symbol: string;
  tvSymbol: string;
  name: string;
  quantity: number;
  avgEntry: number;
  currentPrice: number;
  side: "long" | "short";
}

interface TradingContextValue {
  ready: boolean;
  dbStatus: DbStatus;
  dbPath: string | null;
  selected: SymbolInfo;
  setSelectedSymbol: (id: string) => void;
  watchlist: SymbolInfo[];
  addToWatchlist: (item: SymbolInfo) => Promise<{ ok: boolean; message: string }>;
  removeFromWatchlist: (id: string) => Promise<{ ok: boolean; message: string }>;
  isInWatchlist: (id: string) => boolean;
  pricesStatus: PricesStatus;
  lastPriceUpdate: number | null;
  refreshPrices: () => Promise<void>;
  balance: number;
  orders: Order[];
  positions: Position[];
  placeOrder: (params: {
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
  }) => Promise<{ ok: boolean; message: string }>;
  cancelOrder: (id: string) => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  leftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

const PRICE_POLL_MS = 15_000;
const MIGRATION_FLAG = "apex-trade-sqlite-migrated";

export function TradingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("connecting");
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<SymbolInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [balance, setBalance] = useState(100_000);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pricesStatus, setPricesStatus] = useState<PricesStatus>("idle");
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("apex-trade-theme") as "light" | "dark") || "dark"
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("apex-trade-theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  }, [theme]);

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("apex-trade-sidebar-collapsed") === "true"
  );

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("apex-trade-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (leftSidebarCollapsed) {
      document.body.classList.add("left-sidebar-collapsed");
    } else {
      document.body.classList.remove("left-sidebar-collapsed");
    }
  }, [leftSidebarCollapsed]);

  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;
  const fetchingRef = useRef(false);

  // Boot: connect to local SQLite API, migrate localStorage once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        setDbPath(health.dbPath);
        setDbStatus("online");

        // One-time import from previous localStorage watchlist
        if (!localStorage.getItem(MIGRATION_FLAG)) {
          try {
            const legacy = loadWatchlistFromStorage();
            const selected = loadSelectedIdFromStorage(legacy[0]?.id ?? "btc");
            if (legacy.length > 0) {
              await apiImportLocalStorage({
                watchlist: legacy.map((s) => ({
                  id: s.id,
                  symbol: s.symbol,
                  tvSymbol: s.tvSymbol,
                  name: s.name,
                  assetClass: s.assetClass,
                })),
                selectedSymbolId: selected,
              });
            }
            localStorage.setItem(MIGRATION_FLAG, "1");
            // Clear legacy keys after successful migration
            localStorage.removeItem(WATCHLIST_STORAGE_KEY);
            localStorage.removeItem(SELECTED_SYMBOL_STORAGE_KEY);
          } catch {
            // non-fatal
          }
        }

        const boot = await fetchBootstrap();
        if (cancelled) return;

        setDbPath(boot.dbPath);
        setBalance(boot.account.balance);
        setOrders(boot.orders);
        setPositions(boot.positions);
        const list = boot.watchlist.map(toSymbolInfo);
        setWatchlist(list);
        const sel =
          boot.account.selectedSymbolId &&
          list.some((s) => s.id === boot.account.selectedSymbolId)
            ? boot.account.selectedSymbolId
            : list[0]?.id ?? "";
        setSelectedId(sel);
        setReady(true);
      } catch {
        if (cancelled) return;
        setDbStatus("offline");
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPrices = useCallback(async () => {
    if (fetchingRef.current) return;
    const list = watchlistRef.current;
    if (list.length === 0) return;

    fetchingRef.current = true;
    setPricesStatus((s) => (s === "live" ? "live" : "loading"));

    try {
      const quotes = await fetchLiveQuotes(list);
      if (quotes.size === 0) {
        setPricesStatus("error");
        return;
      }

      setWatchlist((prev) =>
        prev.map((item) => {
          const q = quotes.get(item.id);
          return q ? applyQuote(item, q) : item;
        }),
      );

      const posUpdates: { symbol: string; currentPrice: number }[] = [];
      setPositions((prev) =>
        prev.map((p) => {
          const match = list.find(
            (w) => w.symbol === p.symbol || w.tvSymbol === p.tvSymbol,
          );
          if (!match) return p;
          const q = quotes.get(match.id);
          if (!q) return p;
          posUpdates.push({ symbol: p.symbol, currentPrice: q.price });
          return { ...p, currentPrice: q.price };
        }),
      );

      if (posUpdates.length > 0 && dbStatus === "online") {
        void apiUpdatePositionPrices(posUpdates).catch(() => undefined);
      }

      setLastPriceUpdate(Date.now());
      setPricesStatus("live");
    } catch {
      setPricesStatus("error");
    } finally {
      fetchingRef.current = false;
    }
  }, [dbStatus]);

  useEffect(() => {
    if (!ready || watchlist.length === 0) return;

    let cancelled = false;
    const run = async () => {
      if (!cancelled) await refreshPrices();
    };
    void run();
    const id = window.setInterval(run, PRICE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ready, refreshPrices, watchlist.map((w) => w.id).join("|")]);

  const selected = useMemo(
    () => watchlist.find((s) => s.id === selectedId) ?? watchlist[0],
    [watchlist, selectedId],
  );

  const setSelectedSymbol = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (dbStatus === "online") {
        void apiSetSelected(id).catch(() => undefined);
      }
    },
    [dbStatus],
  );

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((s) => s.id === id),
    [watchlist],
  );

  const addToWatchlist = useCallback(
    async (item: SymbolInfo) => {
      if (
        watchlist.some((s) => s.id === item.id || s.tvSymbol === item.tvSymbol)
      ) {
        return {
          ok: false,
          message: `${item.symbol} is already on your watchlist.`,
        };
      }

      if (dbStatus !== "online") {
        return {
          ok: false,
          message: "Database offline. Start the API server (npm run dev).",
        };
      }

      try {
        const result = await apiAddWatchlist({
          id: item.id,
          symbol: item.symbol,
          tvSymbol: item.tvSymbol,
          name: item.name,
          assetClass: item.assetClass,
        });
        if (!result.ok) return { ok: false, message: result.message };

        setWatchlist(result.watchlist.map(toSymbolInfo));
        setSelectedId(result.account.selectedSymbolId ?? item.id);
        return { ok: true, message: result.message };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Failed to add symbol.",
        };
      }
    },
    [watchlist, dbStatus],
  );

  const removeFromWatchlist = useCallback(
    async (id: string) => {
      if (dbStatus !== "online") {
        return { ok: false, message: "Database offline." };
      }
      try {
        const result = await apiRemoveWatchlist(id);
        if (!result.ok) return { ok: false, message: result.message };

        setWatchlist(result.watchlist.map(toSymbolInfo));
        if (result.account.selectedSymbolId) {
          setSelectedId(result.account.selectedSymbolId);
        }
        return { ok: true, message: result.message };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Failed to remove.",
        };
      }
    },
    [dbStatus],
  );

  const placeOrder = useCallback(
    async ({
      side,
      type,
      quantity,
      limitPrice,
    }: {
      side: OrderSide;
      type: OrderType;
      quantity: number;
      limitPrice?: number;
    }) => {
      if (!selected) {
        return { ok: false, message: "No symbol selected." };
      }
      if (dbStatus !== "online") {
        return {
          ok: false,
          message: "Database offline. Start the API server (npm run dev).",
        };
      }
      if (!quantity || quantity <= 0) {
        return { ok: false, message: "Enter a valid quantity." };
      }

      const price =
        type === "limit" && limitPrice && limitPrice > 0
          ? limitPrice
          : selected.price;

      if (!price || price <= 0) {
        return {
          ok: false,
          message: "Waiting for live price. Try again in a moment.",
        };
      }

      try {
        const result = await apiPlaceOrder({
          side,
          type,
          quantity,
          price,
          symbol: selected.symbol,
          tvSymbol: selected.tvSymbol,
          name: selected.name,
        });

        if (!result.ok) return { ok: false, message: result.message };

        if (typeof result.balance === "number") setBalance(result.balance);
        if (result.positions) setPositions(result.positions);
        if (result.orders) setOrders(result.orders);

        return { ok: true, message: result.message };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Order failed.",
        };
      }
    },
    [selected, dbStatus],
  );

  const cancelOrder = useCallback(
    async (id: string) => {
      if (dbStatus !== "online") return;
      try {
        const result = await apiCancelOrder(id);
        if (result.orders) setOrders(result.orders);
      } catch {
        // ignore
      }
    },
    [dbStatus],
  );

  const value = useMemo(
    () => ({
      ready,
      dbStatus,
      dbPath,
      selected: selected ?? {
        id: "",
        symbol: "—",
        tvSymbol: "BINANCE:BTCUSDT",
        name: "Loading",
        assetClass: "crypto" as const,
        price: 0,
        change24h: 0,
        changePct: 0,
        volume: "—",
        high24h: 0,
        low24h: 0,
      },
      setSelectedSymbol,
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      pricesStatus,
      lastPriceUpdate,
      refreshPrices,
      balance,
      orders,
      positions,
      placeOrder,
      cancelOrder,
      theme,
      toggleTheme,
      leftSidebarCollapsed,
      toggleLeftSidebar,
    }),
    [
      ready,
      dbStatus,
      dbPath,
      selected,
      setSelectedSymbol,
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      pricesStatus,
      lastPriceUpdate,
      refreshPrices,
      balance,
      orders,
      positions,
      placeOrder,
      cancelOrder,
      theme,
      toggleTheme,
      leftSidebarCollapsed,
      toggleLeftSidebar,
    ],
  );

  return (
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}
