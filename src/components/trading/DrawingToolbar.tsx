import { useState } from "react";
import {
  Crosshair,
  Type,
  Smile,
  Ruler,
  ZoomIn,
  Magnet,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";

interface ToastMsg {
  id: number;
  text: string;
}

export interface DrawingToolbarProps {
  activeTool?: string;
  onSelectTool?: (tool: string) => void;
  magnetActive?: boolean;
  onToggleMagnet?: () => void;
  toolsLocked?: boolean;
  onToggleToolsLocked?: () => void;
  drawingsLocked?: boolean;
  onToggleDrawingsLocked?: () => void;
  drawingsHidden?: boolean;
  onToggleDrawingsHidden?: () => void;
  onClearDrawings?: () => void;
}

export function DrawingToolbar({
  activeTool: propActiveTool,
  onSelectTool,
  magnetActive: propMagnetActive,
  onToggleMagnet,
  toolsLocked: propToolsLocked,
  onToggleToolsLocked,
  drawingsLocked: propDrawingsLocked,
  onToggleDrawingsLocked,
  drawingsHidden: propDrawingsHidden,
  onToggleDrawingsHidden,
  onClearDrawings,
}: DrawingToolbarProps) {
  const [localActiveTool, setLocalActiveTool] = useState<string>("trendline");
  const [localMagnetActive, setLocalMagnetActive] = useState(false);
  const [localToolsLocked, setLocalToolsLocked] = useState(false);
  const [localDrawingsLocked, setLocalDrawingsLocked] = useState(false);
  const [localDrawingsHidden, setLocalDrawingsHidden] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const activeTool = propActiveTool !== undefined ? propActiveTool : localActiveTool;
  const magnetActive = propMagnetActive !== undefined ? propMagnetActive : localMagnetActive;
  const toolsLocked = propToolsLocked !== undefined ? propToolsLocked : localToolsLocked;
  const drawingsLocked = propDrawingsLocked !== undefined ? propDrawingsLocked : localDrawingsLocked;
  const drawingsHidden = propDrawingsHidden !== undefined ? propDrawingsHidden : localDrawingsHidden;

  const triggerToast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const handleToolClick = (toolName: string, label: string) => {
    if (onSelectTool) {
      onSelectTool(toolName);
    } else {
      setLocalActiveTool(toolName);
    }
    triggerToast(`${label} drawing tool selected`);
  };

  const handleClearDrawings = () => {
    if (onClearDrawings) {
      onClearDrawings();
    }
    triggerToast("All drawings cleared from the chart");
  };

  return (
    <div className="drawing-toolbar-wrapper">
      <div className="drawing-toolbar">
        {/* 1. Crosshair */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "crosshair" ? "active" : ""}`}
          onClick={() => handleToolClick("crosshair", "Crosshair")}
          title="Crosshair (C)"
          aria-label="Crosshair"
        >
          <Crosshair size={16} strokeWidth={1.75} />
        </button>

        {/* 2. Trend Line */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "trendline" ? "active" : ""}`}
          onClick={() => handleToolClick("trendline", "Trend Line")}
          title="Trend Line (T)"
          aria-label="Trend Line"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="20" x2="20" y2="4" />
            <circle cx="4" cy="20" r="2.5" fill="currentColor" />
            <circle cx="20" cy="4" r="2.5" fill="currentColor" />
          </svg>
        </button>

        {/* 3. Pitchfork / Parallel Lines */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "pitchfork" ? "active" : ""}`}
          onClick={() => handleToolClick("pitchfork", "Parallel Channel")}
          title="Pitchfork / Channels"
          aria-label="Channels"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="4" cy="7" r="1.5" fill="currentColor" />
            <circle cx="20" cy="17" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {/* 4. Fibonacci Retracement */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "fibonacci" ? "active" : ""}`}
          onClick={() => handleToolClick("fibonacci", "Fibonacci Retracement")}
          title="Fibonacci Retracement"
          aria-label="Fibonacci Retracement"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="5" x2="19" y2="5" />
            <line x1="5" y1="10" x2="19" y2="10" />
            <line x1="5" y1="14" x2="19" y2="14" />
            <line x1="5" y1="19" x2="19" y2="19" />
            <circle cx="5" cy="5" r="1" fill="currentColor" />
            <circle cx="5" cy="10" r="1" fill="currentColor" />
            <circle cx="5" cy="14" r="1" fill="currentColor" />
            <circle cx="5" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>

        {/* 5. Shapes / Brush */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "shapes" ? "active" : ""}`}
          onClick={() => handleToolClick("shapes", "Geometric Shapes")}
          title="Geometric Shapes (G)"
          aria-label="Geometric Shapes"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="6" width="16" height="12" rx="1.5" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="20" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {/* 6. Calligraphy Brush */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "brush" ? "active" : ""}`}
          onClick={() => handleToolClick("brush", "Brush Tool")}
          title="Brush (B)"
          aria-label="Brush Tool"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18.7 8l-5.1-5.2c-.4-.4-1-.4-1.4 0L3.7 11.3c-.4.4-.4 1 0 1.4l5.2 5.1c.4.4 1 .4 1.4 0l8.4-8.4c.4-.4.4-1 0-1.4z" />
            <path d="M14 13l3.5 3.5c.8.8.8 2 0 2.8l-1.4 1.4c-.8.8-2 .8-2.8 0L10 17" fill="currentColor" />
          </svg>
        </button>

        {/* 7. Text */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "text" ? "active" : ""}`}
          onClick={() => handleToolClick("text", "Text Tool")}
          title="Text (T)"
          aria-label="Text Tool"
        >
          <Type size={16} strokeWidth={2} />
        </button>

        {/* 8. Smiley */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "smile" ? "active" : ""}`}
          onClick={() => handleToolClick("smile", "Icons & Emojis")}
          title="Icons"
          aria-label="Icons"
        >
          <Smile size={16} strokeWidth={1.75} />
        </button>

        <div className="toolbar-divider" />

        {/* 10. Ruler */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "ruler" ? "active" : ""}`}
          onClick={() => handleToolClick("ruler", "Ruler")}
          title="Measure (Ruler)"
          aria-label="Measure"
        >
          <Ruler size={16} strokeWidth={1.75} />
        </button>

        {/* 11. Zoom */}
        <button
          type="button"
          className={`toolbar-btn ${activeTool === "zoom" ? "active" : ""}`}
          onClick={() => handleToolClick("zoom", "Zoom")}
          title="Zoom In"
          aria-label="Zoom"
        >
          <ZoomIn size={16} strokeWidth={1.75} />
        </button>

        <div className="toolbar-divider" />

        {/* 13. Magnet */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${magnetActive ? "active glow-magnet" : ""}`}
          onClick={() => {
            if (onToggleMagnet) onToggleMagnet();
            else setLocalMagnetActive(!localMagnetActive);
            triggerToast(magnetActive ? "Magnet Mode disabled" : "Magnet Mode enabled (snap to ticks)");
          }}
          title="Magnet Mode (Snap to OHLC)"
          aria-label="Magnet Mode"
        >
          <Magnet size={16} strokeWidth={1.75} />
        </button>

        {/* 14. Lock drawing tools */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${toolsLocked ? "active glow-lock" : ""}`}
          onClick={() => {
            if (onToggleToolsLocked) onToggleToolsLocked();
            else setLocalToolsLocked(!localToolsLocked);
            triggerToast(toolsLocked ? "Drawing tools unlocked" : "Lock drawing mode active");
          }}
          title="Stay in Drawing Mode"
          aria-label="Lock Tools"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="10" height="10" rx="1.5" />
            <path d="M5 11V7a3 3 0 0 1 6 0v4" />
            <path d="M15 4l5 5m-6.5 2.5l4-4a1 1 0 0 0 0-1.4L16.1 4a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0-.3.7v1.7h1.7a1 1 0 0 0 .7-.3z" />
          </svg>
        </button>

        {/* 15. Lock all drawings */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${drawingsLocked ? "active glow-lock" : ""}`}
          onClick={() => {
            if (onToggleDrawingsLocked) onToggleDrawingsLocked();
            else setLocalDrawingsLocked(!localDrawingsLocked);
            triggerToast(drawingsLocked ? "Drawings unlocked" : "All drawings locked in place");
          }}
          title="Lock All Drawing Tools"
          aria-label="Lock Drawings"
        >
          {drawingsLocked ? (
            <Lock size={16} strokeWidth={1.75} />
          ) : (
            <Unlock size={16} strokeWidth={1.75} />
          )}
        </button>

        {/* 16. Hide drawings */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${drawingsHidden ? "active" : ""}`}
          onClick={() => {
            if (onToggleDrawingsHidden) onToggleDrawingsHidden();
            else setLocalDrawingsHidden(!localDrawingsHidden);
            triggerToast(drawingsHidden ? "Drawings visible" : "All drawings hidden");
          }}
          title="Hide All Drawings"
          aria-label="Hide Drawings"
        >
          {drawingsHidden ? (
            <EyeOff size={16} strokeWidth={1.75} className="glow-eye-off" />
          ) : (
            <Eye size={16} strokeWidth={1.75} />
          )}
        </button>

        <div className="toolbar-divider" />

        {/* 18. Delete */}
        <button
          type="button"
          className="toolbar-btn delete-btn"
          onClick={handleClearDrawings}
          title="Remove Drawings"
          aria-label="Remove Drawings"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Mini notification toasts */}
      <div className="toolbar-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toolbar-toast">
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
