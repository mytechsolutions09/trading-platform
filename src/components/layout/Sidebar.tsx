import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CandlestickChart,
  ArrowLeftRight,
  Briefcase,
  Globe2,
  CalendarDays,
  Database,
  Sun,
  Moon,
  Settings,
  BookOpen,
  Sparkles,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useTrading } from "../../context/TradingContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/charts", label: "Charts", icon: CandlestickChart },
  { to: "/trade", label: "Trade", icon: ArrowLeftRight },
  { to: "/journal", label: "Trading Journal", icon: BookOpen },
  { to: "/nakshatra", label: "Nakshatra Trading", icon: Sparkles },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/markets", label: "Markets", icon: Globe2 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const {
    dbStatus,
    dbPath,
    theme,
    toggleTheme,
    leftSidebarCollapsed,
    toggleLeftSidebar,
  } = useTrading();

  const dbLabel =
    dbStatus === "online"
      ? "SQLite online"
      : dbStatus === "connecting"
        ? "Connecting…"
        : "SQLite offline";

  const fileName = dbPath
    ? dbPath.replace(/\\/g, "/").split("/").pop()
    : "apex-trade.db";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <div className="brand-name">Apex Trade</div>
          <div className="brand-tag">Paper · Live charts</div>
        </div>
      </div>

      <nav className="nav">
        {links.map(({ to, label, icon: Icon, end }) => {
          const isNakshatra = to === "/nakshatra";
          const isJournal = to === "/journal";
          const customActive = isNakshatra
            ? location.pathname === "/nakshatra"
            : isJournal
            ? location.pathname.startsWith("/journal")
            : undefined;

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              data-tooltip={label}
              className={({ isActive: defaultActive }) =>
                `nav-link ${(customActive !== undefined ? customActive : defaultActive) ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-collapse-toggle">
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="collapse-btn"
          title={leftSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          data-tooltip={leftSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={leftSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {leftSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span>Collapse Sidebar</span>
        </button>
      </div>

      <div className="sidebar-theme-toggle">
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          data-tooltip={theme === "light" ? "Dark Mode" : "Light Mode"}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <>
              <Moon size={16} strokeWidth={1.75} />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={16} strokeWidth={1.75} />
              <span>Light Mode</span>
            </>
          )}
        </button>
      </div>

      <div className="sidebar-footer">
        <div
          className={`status-dot ${dbStatus === "online" ? "online" : dbStatus === "connecting" ? "pending" : "offline"}`}
        />
        <div>
          <div className="footer-title">
            <Database size={12} style={{ display: "inline", marginRight: 4 }} />
            {dbLabel}
          </div>
          <div className="footer-sub" title={dbPath ?? undefined}>
            {dbStatus === "online"
              ? `Local file · ${fileName}`
              : "Run npm run dev (API + UI)"}
          </div>
        </div>
      </div>
    </aside>
  );
}
