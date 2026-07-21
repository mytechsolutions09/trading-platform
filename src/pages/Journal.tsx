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
  "settings",
];

export function Journal() {
  const { theme } = useTrading();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : "dashboard";

  // Sync route changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: "APEX_NAVIGATE", page: activeTab },
          "*"
        );
      } catch {}
    }
  }, [activeTab]);

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

  // Listen to tab changes from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "APEX_TAB_CHANGED") {
        const page = event.data.page;
        if (page && VALID_TABS.includes(page)) {
          const targetPath = `/journal/${page}`;
          if (location.pathname !== targetPath) {
            navigate(targetPath, { replace: false });
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [location.pathname, navigate]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme === "light" ? "#f8fafc" : "#08080f",
        overflow: "hidden",
      }}
    >
      <iframe
        ref={iframeRef}
        src={`/journal/index.html?theme=${theme}#${activeTab}`}
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
            win?.postMessage({ type: "APEX_NAVIGATE", page: activeTab }, "*");
          } catch {}
        }}
      />
    </div>
  );
}
