import { useTrading } from "../context/TradingContext";
import { useEffect, useRef } from "react";

export function Journal() {
  const { theme } = useTrading();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        src={`/journal/index.html?theme=${theme}`}
        title="Trading Journal"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "calc(100vh - 2px)",
          border: "none",
        }}
        onLoad={(e) => {
          try {
            (e.currentTarget as HTMLIFrameElement).contentWindow?.postMessage(
              { type: "APEX_THEME_CHANGE", theme },
              "*"
            );
          } catch {}
        }}
      />
    </div>
  );
}
