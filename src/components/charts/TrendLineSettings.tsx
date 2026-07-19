import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { DrawingStyle, LineStyle } from "./drawingTypes";

// TradingView's standard palette
const TV_COLORS = [
  "#2962FF", // TV blue (default)
  "#F44336", // red
  "#FF9800", // orange
  "#FFEB3B", // yellow
  "#4CAF50", // green
  "#00BCD4", // cyan
  "#9C27B0", // purple
  "#795548", // brown
  "#607D8B", // blue-grey
  "#FFFFFF", // white
  "#9E9E9E", // grey
  "#000000", // black
];

const LINE_STYLES: { id: LineStyle; label: string; svg: string }[] = [
  {
    id: "solid",
    label: "Solid",
    svg: '<line x1="2" y1="8" x2="26" y2="8" stroke="currentColor" stroke-width="2"/>',
  },
  {
    id: "dashed",
    label: "Dashed",
    svg: '<line x1="2" y1="8" x2="26" y2="8" stroke="currentColor" stroke-width="2" stroke-dasharray="5,3"/>',
  },
  {
    id: "dotted",
    label: "Dotted",
    svg: '<line x1="2" y1="8" x2="26" y2="8" stroke="currentColor" stroke-width="2" stroke-dasharray="2,3" stroke-linecap="round"/>',
  },
];

const LINE_WIDTHS = [1, 2, 3, 4];

interface TrendLineSettingsProps {
  pos: { x: number; y: number };
  style: DrawingStyle;
  onStyleChange: (patch: Partial<DrawingStyle>) => void;
  onClone: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** If true, shows only the context-menu actions (right-click mode) */
  contextMenuOnly?: boolean;
}

export function TrendLineSettings({
  pos,
  style,
  onStyleChange,
  onClone,
  onDelete,
  onClose,
  contextMenuOnly = false,
}: TrendLineSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const clampedPos = {
    x: Math.min(pos.x, window.innerWidth - 290),
    y: Math.min(pos.y, window.innerHeight - (contextMenuOnly ? 160 : 340)),
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const color = style.color ?? "#2962FF";
  const lineWidth = style.lineWidth ?? 2;
  const lineStyle = style.lineStyle ?? "solid";
  const extendLeft = style.extendLeft ?? false;
  const extendRight = style.extendRight ?? false;

  if (contextMenuOnly) {
    return createPortal(
      <div
        ref={panelRef}
        className="tl-context-menu"
        style={{ top: clampedPos.y, left: clampedPos.x }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          className="tl-ctx-item"
          onClick={() => {
            onClose();
            // small timeout so close animation completes
            setTimeout(() => {
              // re-open as settings
            }, 0);
          }}
          title="Edit line settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit Line</span>
        </button>
        <button className="tl-ctx-item" onClick={onClone}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Clone</span>
        </button>
        <div className="tl-ctx-separator" />
        <button className="tl-ctx-item tl-ctx-danger" onClick={onDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span>Delete</span>
        </button>
      </div>,
      document.fullscreenElement || document.body
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      className="tl-settings-panel"
      style={{ top: clampedPos.y, left: clampedPos.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="tl-settings-header">
        <span>Trend Line</span>
        <button className="tl-settings-close" onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Color Section */}
      <div className="tl-settings-section">
        <div className="tl-settings-label">Color</div>
        <div className="tl-color-grid">
          {TV_COLORS.map((c) => (
            <button
              key={c}
              className={`tl-color-swatch ${c === color ? "active" : ""}`}
              style={{ background: c, border: c === "#FFFFFF" ? "1px solid #555" : "none" }}
              onClick={() => onStyleChange({ color: c })}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Line Style Section */}
      <div className="tl-settings-section">
        <div className="tl-settings-label">Style</div>
        <div className="tl-line-style-row">
          {LINE_STYLES.map((ls) => (
            <button
              key={ls.id}
              className={`tl-line-style-btn ${lineStyle === ls.id ? "active" : ""}`}
              onClick={() => onStyleChange({ lineStyle: ls.id })}
              title={ls.label}
            >
              <svg width="28" height="16" viewBox="0 0 28 16" dangerouslySetInnerHTML={{ __html: ls.svg }} />
            </button>
          ))}
        </div>
      </div>

      {/* Line Width Section */}
      <div className="tl-settings-section">
        <div className="tl-settings-label">Width</div>
        <div className="tl-line-width-row">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`tl-line-width-btn ${lineWidth === w ? "active" : ""}`}
              onClick={() => onStyleChange({ lineWidth: w })}
              title={`${w}px`}
            >
              <svg width="28" height="16" viewBox="0 0 28 16">
                <line x1="2" y1="8" x2="26" y2="8" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Extend Section */}
      <div className="tl-settings-section">
        <div className="tl-settings-label">Extend</div>
        <div className="tl-extend-row">
          <button
            className={`tl-extend-btn ${extendLeft ? "active" : ""}`}
            onClick={() => onStyleChange({ extendLeft: !extendLeft })}
            title="Extend left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 5 5 12 12 19" />
            </svg>
            Left
          </button>
          <button
            className={`tl-extend-btn ${extendRight ? "active" : ""}`}
            onClick={() => onStyleChange({ extendRight: !extendRight })}
            title="Extend right"
          >
            Right
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="tl-settings-actions">
        <button className="tl-action-btn" onClick={onClone} title="Clone this line">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Clone
        </button>
        <button className="tl-action-btn tl-action-danger" onClick={onDelete} title="Delete this line">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          Delete
        </button>
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
}
