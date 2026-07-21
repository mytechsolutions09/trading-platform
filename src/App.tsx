import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TradingProvider } from "./context/TradingContext";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Charts } from "./pages/Charts";
import { Trade } from "./pages/Trade";
import { Portfolio } from "./pages/Portfolio";
import { Markets } from "./pages/Markets";
import { Calendar } from "./pages/Calendar";
import { Settings } from "./pages/Settings";
import { Journal } from "./pages/Journal";
import "./App.css";

export default function App() {
  return (
    <TradingProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="charts" element={<Charts />} />
            <Route path="trade" element={<Trade />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="markets" element={<Markets />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<Settings />} />
            <Route path="journal" element={<Journal />} />
            <Route path="journal/:tab" element={<Journal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TradingProvider>
  );
}
