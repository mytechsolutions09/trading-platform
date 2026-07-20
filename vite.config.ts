import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Binance (no CORS issues when proxied)
      "/api/binance": {
        target: "https://api.binance.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ""),
      },
      // Yahoo Finance (no public CORS) — stocks, FX, indices
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
        },
      },
      // Local SQLite API server
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api/binance": {
        target: "https://api.binance.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ""),
      },
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
        },
      },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    modulePreload: {
      polyfill: true,
    },
  },
});
