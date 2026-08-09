import { useTrading } from "../context/TradingContext";
import { useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const VALID_TABS = [
  "dashboard",
  "trades",
  "analytics",
  "charts",
  "psychology",
  "journal",
  "new-entry",
  "nakshatra",
  "settings",
];

export function Journal() {
  const { theme } = useTrading();
  const { tab, subTab } = useParams<{ tab?: string; subTab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isNakshatraPath = location.pathname.startsWith("/nakshatra");
  const activeTab = isNakshatraPath
    ? "nakshatra"
    : tab && VALID_TABS.includes(tab)
    ? tab
    : "dashboard";
  const nkSubTab = isNakshatraPath ? (subTab || "mansion") : undefined;

  // Sync route changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: "APEX_NAVIGATE", page: activeTab, nkSubTab },
          "*"
        );
      } catch {}
    }
  }, [activeTab, nkSubTab]);

  // Sync theme changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: "APEX_THEME_CHANGE", theme },
          "*"
        );
      } catch {}
    }
  }, [theme]);

  // Listen to tab changes & fullscreen requests from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "TOGGLE_NAKSHATRA_FULLSCREEN") {
        const isFs = event.data.fullscreen;
        if (isFs) {
          document.body.classList.add("nakshatra-fullscreen");
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => undefined);
          }
        } else {
          document.body.classList.remove("nakshatra-fullscreen");
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => undefined);
          }
        }
      }
      if (event.data && event.data.type === "APEX_NK_SUBTAB_CHANGED") {
        const sub = event.data.subTab;
        const targetPath = sub === "mansion" || !sub ? "/nakshatra" : `/nakshatra/${sub}`;
        if (location.pathname !== targetPath) {
          navigate(targetPath, { replace: false });
        }
      }
      if (event.data && event.data.type === "APEX_TAB_CHANGED") {
        const page = event.data.page;
        if (page !== "nakshatra") {
          document.body.classList.remove("nakshatra-fullscreen");
        }
        if (page && VALID_TABS.includes(page)) {
          if (page === "nakshatra") {
            if (!location.pathname.startsWith("/nakshatra")) {
              navigate("/nakshatra", { replace: false });
            }
          } else {
            const targetPath = `/journal/${page}`;
            if (location.pathname !== targetPath) {
              navigate(targetPath, { replace: false });
            }
          }
        }
      }
    };

    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("nakshatra-fullscreen");
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.body.classList.remove("nakshatra-fullscreen");
    };
  }, [location.pathname, navigate]);

  return (
    <div
      className="journal-container"
      style={{
        width: "100%",
        height: "100%",
        background: theme === "light" ? "#f8fafc" : "#08080f",
        overflow: "hidden",
      }}
    >
      <iframe
        ref={iframeRef}
        src={`/journal/index.html?theme=${theme}#${activeTab}${nkSubTab ? '/' + nkSubTab : ''}`}
        title="Trading Journal"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "calc(100vh - 2px)",
          border: "none",
        }}
        onLoad={(e) => {
          try {
            const win = (e.currentTarget as HTMLIFrameElement).contentWindow;
            win?.postMessage({ type: "APEX_THEME_CHANGE", theme }, "*");
            win?.postMessage({ type: "APEX_NAVIGATE", page: activeTab, nkSubTab }, "*");
          } catch {}
        }}
      />
    </div>
  );
}
