import { useEffect, useRef } from "react";

/**
 * Loads a free TradingView embed widget into a container using reliable iframe embedding.
 * Widgets: https://www.tradingview.com/widget/
 */
export function useTradingViewWidget(
  scriptSrc: string,
  config: Record<string, unknown>,
  deps: unknown[] = [],
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget content immediately
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.position = "relative";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";

    const widgetEl = document.createElement("div");
    widgetEl.className = "tradingview-widget-container__widget";
    widgetEl.style.height = "100%";
    widgetEl.style.width = "100%";
    widgetEl.style.flex = "1";
    widgetEl.style.display = "flex";
    wrapper.appendChild(widgetEl);

    // Extract widget name from scriptSrc, e.g. embed-widget-advanced-chart
    const fileName = scriptSrc.split("/").pop()?.replace(".js", "") || "";
    const endpointName = fileName.replace("embed-widget-", "");

    // Events and Timeline widgets require direct script tag injection by TradingView specs
    const useScriptTag = endpointName === "events" || endpointName === "timeline" || !endpointName;

    if (!useScriptTag && endpointName) {
      const iframe = document.createElement("iframe");
      iframe.title = `TradingView ${endpointName}`;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.style.flex = "1";
      iframe.src = `https://www.tradingview-widget.com/embed-widget/${endpointName}/?locale=en#${encodeURIComponent(
        JSON.stringify(config),
      )}`;
      widgetEl.appendChild(iframe);
    } else {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify(config);
      wrapper.appendChild(script);
    }

    container.appendChild(wrapper);

    return () => {
      container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}



