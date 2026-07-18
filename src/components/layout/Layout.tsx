import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TickerTape } from "../charts/TickerTape";

export function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isJournal = location.pathname === "/journal";
  const showHeader = isDashboard && !isJournal;

  return (
    <div className={`app-shell ${isJournal ? "journal-layout" : ""}`}>
      {!isJournal && <Sidebar />}
      <div
        className={`main-column${isDashboard ? "" : " no-ticker"}${showHeader ? "" : " no-header"}`}
        style={isJournal ? { gridTemplateRows: "1fr" } : undefined}
      >
        {isDashboard && <TickerTape />}
        {showHeader && <Header />}
        <main className="page" style={isJournal ? { padding: 0 } : undefined}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
