import { SYMBOL_CATALOG, type AssetClass, type SymbolInfo } from "../data/symbols";
import type { Order, OrderSide, OrderType, Position } from "../context/TradingContext";

export interface ApiWatchlistItem {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  assetClass: AssetClass;
  sortOrder: number;
  createdAt: string;
}

export interface ApiAccount {
  id: number;
  balance: number;
  selectedSymbolId: string | null;
  updatedAt: string;
}

export interface BootstrapResponse {
  dbPath: string;
  account: ApiAccount;
  watchlist: ApiWatchlistItem[];
  orders: Order[];
  positions: Position[];
}

const API_BASE = (import.meta.env.VITE_API_URL || "https://apex-trade-api.arpitkanotra.workers.dev").replace(/\/$/, "");

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `API error ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  engine: string;
  dbPath: string;
}> {
  return request("/api/health");
}

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return request("/api/bootstrap");
}

export async function apiSetSelected(id: string): Promise<ApiAccount> {
  return request("/api/account/selected", {
    method: "PUT",
    body: JSON.stringify({ id }),
  });
}

export async function apiAddWatchlist(item: {
  id: string;
  symbol: string;
  tvSymbol: string;
  name: string;
  assetClass: AssetClass;
}): Promise<{
  ok: boolean;
  message: string;
  watchlist: ApiWatchlistItem[];
  account: ApiAccount;
}> {
  return request("/api/watchlist", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function apiRemoveWatchlist(id: string): Promise<{
  ok: boolean;
  message: string;
  watchlist: ApiWatchlistItem[];
  account: ApiAccount;
  selectedSymbolId?: string | null;
}> {
  return request(`/api/watchlist/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function apiPlaceOrder(input: {
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price: number;
  symbol: string;
  tvSymbol: string;
  name: string;
}): Promise<{
  ok: boolean;
  message: string;
  order?: Order;
  balance?: number;
  positions?: Position[];
  orders?: Order[];
}> {
  return request("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiCancelOrder(id: string): Promise<{
  ok: boolean;
  message: string;
  orders?: Order[];
}> {
  return request(`/api/orders/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}

export async function apiUpdatePositionPrices(
  updates: { symbol: string; currentPrice: number }[],
): Promise<Position[]> {
  return request("/api/positions/prices", {
    method: "POST",
    body: JSON.stringify({ updates }),
  });
}

export async function apiImportLocalStorage(payload: {
  watchlist: {
    id: string;
    symbol: string;
    tvSymbol: string;
    name: string;
    assetClass: AssetClass;
  }[];
  selectedSymbolId?: string | null;
}): Promise<BootstrapResponse & { ok: boolean; message: string }> {
  return request("/api/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Map DB watchlist rows to SymbolInfo — seeds prices from static catalog so UI never shows $0.00 */
export function toSymbolInfo(item: ApiWatchlistItem): SymbolInfo {
  // Try to match from static catalog first so we always have a baseline price
  const catalog = SYMBOL_CATALOG.find(
    (s) => s.id === item.id || s.symbol === item.symbol
  );
  return {
    id: item.id,
    symbol: item.symbol,
    tvSymbol: item.tvSymbol ?? catalog?.tvSymbol ?? item.symbol,
    name: item.name,
    assetClass: item.assetClass,
    price: catalog?.price ?? 0,
    change24h: catalog?.change24h ?? 0,
    changePct: catalog?.changePct ?? 0,
    volume: catalog?.volume ?? "—",
    high24h: catalog?.high24h ?? 0,
    low24h: catalog?.low24h ?? 0,
  };
}
