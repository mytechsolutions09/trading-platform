import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  ChevronRight,
} from "lucide-react";
import {
  TWO_POINT_TOOLS,
  THREE_POINT_TOOLS,
  ONE_POINT_TOOLS,
  BRUSH_TOOLS,
} from "../charts/drawingTypes";

export { TWO_POINT_TOOLS, THREE_POINT_TOOLS, ONE_POINT_TOOLS, BRUSH_TOOLS };

interface ToastMsg {
  id: number;
  text: string;
}

export type DrawingToolId =
  | "crosshair"
  | "trendline"
  | "ray"
  | "extended_line"
  | "horizontal_line"
  | "vertical_line"
  | "cross_line"
  | "info_line"
  | "parallel_channel"
  | "pitchfork"
  | "fibonacci"
  | "fib_extension"
  | "fib_channel"
  | "fib_time_zone"
  | "fib_speed_fan"
  | "xabcd_pattern"
  | "cypher_pattern"
  | "head_and_shoulders"
  | "abcd_pattern"
  | "triangle_pattern"
  | "three_drives_pattern"
  | "elliott_impulse"
  | "elliott_correction"
  | "elliott_triangle"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "arrow"
  | "brush"
  | "highlighter"
  | "text"
  | "callout"
  | "price_label"
  | "smile"
  | "ruler"
  | "date_range"
  | "price_range"
  | "zoom";

interface ToolDef {
  id: DrawingToolId;
  label: string;
  shortcut?: string;
  icon: ReactNode;
}

interface ToolGroup {
  id: string;
  title: string;
  tools: ToolDef[];
  /** Tools that keep the chart in drawing mode (not toggles) */
  isDrawingGroup?: boolean;
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

function LineIcon({ d }: { d: ReactNode }) {
  return (
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
      {d}
    </svg>
  );
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "cursors",
    title: "Cursors",
    tools: [
      {
        id: "crosshair",
        label: "Cross",
        shortcut: "Alt+C",
        icon: <Crosshair size={16} strokeWidth={1.75} />,
      },
    ],
  },
  {
    id: "trend",
    title: "Trend Line Tools",
    isDrawingGroup: true,
    tools: [
      {
        id: "trendline",
        label: "Trend Line",
        shortcut: "Alt+T",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="20" x2="20" y2="4" />
                <circle cx="4" cy="20" r="2" fill="currentColor" />
                <circle cx="20" cy="4" r="2" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "ray",
        label: "Ray",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="18" x2="20" y2="6" />
                <circle cx="4" cy="18" r="2" fill="currentColor" />
                <polyline points="16,6 20,6 20,10" />
              </>
            }
          />
        ),
      },
      {
        id: "info_line",
        label: "Info Line",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="20" x2="20" y2="4" />
                <circle cx="4" cy="20" r="2" fill="currentColor" />
                <circle cx="20" cy="4" r="2" fill="currentColor" />
                <rect x="8" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.35" stroke="none" />
              </>
            }
          />
        ),
      },
      {
        id: "extended_line",
        label: "Extended Line",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="2" y1="20" x2="22" y2="4" />
                <circle cx="8" cy="15" r="1.5" fill="currentColor" />
                <circle cx="16" cy="9" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "horizontal_line",
        label: "Horizontal Line",
        shortcut: "Alt+H",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="2" y1="12" x2="22" y2="12" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "vertical_line",
        label: "Vertical Line",
        shortcut: "Alt+V",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="12" y1="2" x2="12" y2="22" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "cross_line",
        label: "Cross Line",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "parallel_channel",
        label: "Parallel Channel",
        shortcut: "Alt+P",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="7" x2="20" y2="5" />
                <line x1="4" y1="17" x2="20" y2="15" />
                <line x1="6" y1="7" x2="6" y2="17" />
                <line x1="18" y1="5" x2="18" y2="15" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "gann",
    title: "Gann and Fibonacci Tools",
    isDrawingGroup: true,
    tools: [
      {
        id: "fibonacci",
        label: "Fib Retracement",
        shortcut: "Alt+F",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="5" x2="20" y2="5" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="4" y1="14" x2="20" y2="14" />
                <line x1="4" y1="19" x2="20" y2="19" />
              </>
            }
          />
        ),
      },
      {
        id: "fib_extension",
        label: "Trend-Based Fib Extension",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="18" x2="10" y2="8" />
                <line x1="10" y1="8" x2="14" y2="14" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </>
            }
          />
        ),
      },
      {
        id: "fib_channel",
        label: "Fib Channel",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="6" x2="20" y2="12" />
                <line x1="4" y1="11" x2="20" y2="17" />
                <line x1="4" y1="16" x2="20" y2="22" />
              </>
            }
          />
        ),
      },
      {
        id: "fib_time_zone",
        label: "Fib Time Zone",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="4" x2="4" y2="20" />
                <line x1="7" y1="4" x2="7" y2="20" />
                <line x1="11" y1="4" x2="11" y2="20" />
                <line x1="17" y1="4" x2="17" y2="20" />
              </>
            }
          />
        ),
      },
      {
        id: "fib_speed_fan",
        label: "Fib Speed Resistance Fan",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="19" x2="20" y2="5" />
                <line x1="4" y1="19" x2="20" y2="10" />
                <line x1="4" y1="19" x2="20" y2="15" />
              </>
            }
          />
        ),
      },
      {
        id: "pitchfork",
        label: "Pitchfork",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="4" y1="18" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "patterns",
    title: "Patterns & Elliott Waves",
    isDrawingGroup: true,
    tools: [
      {
        id: "xabcd_pattern",
        label: "XABCD pattern",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 18 L8 6 L12 15 L16 8 L20 18" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                <circle cx="8" cy="6" r="1.5" fill="currentColor" />
                <circle cx="12" cy="15" r="1.5" fill="currentColor" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                <circle cx="20" cy="18" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "cypher_pattern",
        label: "Cypher pattern",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 16 L8 5 L13 18 L17 9 L20 16" />
                <circle cx="4" cy="16" r="1.5" fill="currentColor" />
                <circle cx="8" cy="5" r="1.5" fill="currentColor" />
                <circle cx="13" cy="18" r="1.5" fill="currentColor" />
                <circle cx="17" cy="9" r="1.5" fill="currentColor" />
                <circle cx="20" cy="16" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "head_and_shoulders",
        label: "Head and shoulders",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M3 18 L7 10 L10 14 L14 4 L17 14 L20 10 L22 18" />
                <circle cx="7" cy="10" r="1.5" fill="currentColor" />
                <circle cx="14" cy="4" r="1.5" fill="currentColor" />
                <circle cx="20" cy="10" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "abcd_pattern",
        label: "ABCD pattern",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 17 L9 6 L14 14 L19 5" />
                <circle cx="4" cy="17" r="1.5" fill="currentColor" />
                <circle cx="9" cy="6" r="1.5" fill="currentColor" />
                <circle cx="14" cy="14" r="1.5" fill="currentColor" />
                <circle cx="19" cy="5" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "triangle_pattern",
        label: "Triangle pattern",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 18 L20 6 L20 18 Z" />
                <path d="M4 18 L12 10 L16 16 L20 6" strokeDasharray="2 2" />
              </>
            }
          />
        ),
      },
      {
        id: "three_drives_pattern",
        label: "Three drives pattern",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M3 18 L7 12 L10 16 L14 9 L17 13 L21 6" />
                <circle cx="7" cy="12" r="1.5" fill="currentColor" />
                <circle cx="14" cy="9" r="1.5" fill="currentColor" />
                <circle cx="21" cy="6" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "elliott_impulse",
        label: "Elliott impulse wave (1-2-3-4-5)",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M3 18 L7 11 L10 15 L15 5 L18 10 L21 4" />
                <text x="6" y="9" fontSize="7" fill="currentColor" fontWeight="bold">1</text>
                <text x="14" y="4" fontSize="7" fill="currentColor" fontWeight="bold">3</text>
                <text x="20" y="3" fontSize="7" fill="currentColor" fontWeight="bold">5</text>
              </>
            }
          />
        ),
      },
      {
        id: "elliott_correction",
        label: "Elliott correction wave (A-B-C)",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 6 L11 17 L16 10 L20 18" />
                <text x="10" y="20" fontSize="7" fill="currentColor" fontWeight="bold">A</text>
                <text x="15" y="8" fontSize="7" fill="currentColor" fontWeight="bold">B</text>
                <text x="19" y="20" fontSize="7" fill="currentColor" fontWeight="bold">C</text>
              </>
            }
          />
        ),
      },
      {
        id: "elliott_triangle",
        label: "Elliott triangle wave (A-B-C-D-E)",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M3 5 L7 17 L11 9 L15 15 L18 11 L21 13" />
                <text x="2" y="12" fontSize="6" fill="currentColor" fontWeight="bold">A</text>
                <text x="10" y="7" fontSize="6" fill="currentColor" fontWeight="bold">C</text>
                <text x="17" y="9" fontSize="6" fill="currentColor" fontWeight="bold">E</text>
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "shapes",
    title: "Geometric Shapes",
    isDrawingGroup: true,
    tools: [
      {
        id: "rectangle",
        label: "Rectangle",
        shortcut: "Alt+Shift+R",
        icon: (
          <LineIcon
            d={
              <>
                <rect x="4" y="6" width="16" height="12" rx="1" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                <circle cx="20" cy="18" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "ellipse",
        label: "Ellipse",
        icon: (
          <LineIcon
            d={
              <>
                <ellipse cx="12" cy="12" rx="9" ry="6" />
                <circle cx="3" cy="12" r="1.5" fill="currentColor" />
                <circle cx="21" cy="12" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "triangle",
        label: "Triangle",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M12 4 L20 19 L4 19 Z" />
                <circle cx="12" cy="4" r="1.5" fill="currentColor" />
              </>
            }
          />
        ),
      },
      {
        id: "arrow",
        label: "Arrow",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="5" y1="19" x2="19" y2="5" />
                <polyline points="11,5 19,5 19,13" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "annotation",
    title: "Annotation Tools",
    isDrawingGroup: true,
    tools: [
      {
        id: "text",
        label: "Text",
        shortcut: "Alt+K",
        icon: <Type size={16} strokeWidth={2} />,
      },
      {
        id: "callout",
        label: "Callout",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M5 5h14v10H9l-4 4V5z" />
              </>
            }
          />
        ),
      },
      {
        id: "price_label",
        label: "Price Label",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 8h12l4 4-4 4H4V8z" />
                <line x1="7" y1="12" x2="13" y2="12" />
              </>
            }
          />
        ),
      },
      {
        id: "smile",
        label: "Emojis",
        icon: <Smile size={16} strokeWidth={1.75} />,
      },
    ],
  },
  {
    id: "brush",
    title: "Brushes",
    isDrawingGroup: true,
    tools: [
      {
        id: "brush",
        label: "Brush",
        shortcut: "Alt+B",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M18.7 8l-5.1-5.2c-.4-.4-1-.4-1.4 0L3.7 11.3c-.4.4-.4 1 0 1.4l5.2 5.1c.4.4 1 .4 1.4 0l8.4-8.4c.4-.4.4-1 0-1.4z" />
                <path
                  d="M14 13l3.5 3.5c.8.8.8 2 0 2.8l-1.4 1.4c-.8.8-2 .8-2.8 0L10 17"
                  fill="currentColor"
                />
              </>
            }
          />
        ),
      },
      {
        id: "highlighter",
        label: "Highlighter",
        icon: (
          <LineIcon
            d={
              <>
                <path d="M4 16l6-10 8 5-6 10z" fill="currentColor" opacity="0.35" />
                <path d="M4 16l6-10 8 5-6 10z" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "measure",
    title: "Measurement",
    isDrawingGroup: true,
    tools: [
      {
        id: "ruler",
        label: "Measure",
        shortcut: "Shift+Alt+M",
        icon: <Ruler size={16} strokeWidth={1.75} />,
      },
      {
        id: "date_range",
        label: "Date Range",
        icon: (
          <LineIcon
            d={
              <>
                <rect x="4" y="5" width="16" height="14" rx="1.5" />
                <line x1="4" y1="10" x2="20" y2="10" />
                <line x1="9" y1="3" x2="9" y2="7" />
                <line x1="15" y1="3" x2="15" y2="7" />
              </>
            }
          />
        ),
      },
      {
        id: "price_range",
        label: "Price Range",
        icon: (
          <LineIcon
            d={
              <>
                <line x1="6" y1="5" x2="6" y2="19" />
                <line x1="4" y1="5" x2="8" y2="5" />
                <line x1="4" y1="19" x2="8" y2="19" />
                <rect x="10" y="8" width="10" height="8" rx="1" fill="currentColor" opacity="0.25" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    id: "zoom",
    title: "Zoom",
    tools: [
      {
        id: "zoom",
        label: "Zoom In",
        icon: <ZoomIn size={16} strokeWidth={1.75} />,
      },
    ],
  },
];

function findTool(id: string): ToolDef | undefined {
  for (const g of TOOL_GROUPS) {
    const t = g.tools.find((x) => x.id === id);
    if (t) return t;
  }
  return undefined;
}

function groupForTool(id: string): ToolGroup | undefined {
  return TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === id));
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
  const [localActiveTool, setLocalActiveTool] = useState<string>("crosshair");
  const [localMagnetActive, setLocalMagnetActive] = useState(false);
  const [localToolsLocked, setLocalToolsLocked] = useState(false);
  const [localDrawingsLocked, setLocalDrawingsLocked] = useState(false);
  const [localDrawingsHidden, setLocalDrawingsHidden] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  /** Remember last selected tool per group (TradingView behavior) */
  const [lastTools, setLastTools] = useState<Record<string, DrawingToolId>>({
    cursors: "crosshair",
    trend: "trendline",
    gann: "fibonacci",
    shapes: "rectangle",
    annotation: "text",
    brush: "brush",
    measure: "ruler",
    zoom: "zoom",
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const groupBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const openFlyoutAt = (groupId: string) => {
    const btn = groupBtnRefs.current[groupId];
    if (btn) {
      const r = btn.getBoundingClientRect();
      const top = Math.min(r.top, window.innerHeight - 80);
      setFlyoutPos({ top: Math.max(8, top), left: r.right + 6 });
    }
    setOpenGroup(groupId);
  };

  const closeFlyout = () => {
    setOpenGroup(null);
    setFlyoutPos(null);
  };

  const activeTool = propActiveTool !== undefined ? propActiveTool : localActiveTool;
  const magnetActive = propMagnetActive !== undefined ? propMagnetActive : localMagnetActive;
  const toolsLocked = propToolsLocked !== undefined ? propToolsLocked : localToolsLocked;
  const drawingsLocked = propDrawingsLocked !== undefined ? propDrawingsLocked : localDrawingsLocked;
  const drawingsHidden = propDrawingsHidden !== undefined ? propDrawingsHidden : localDrawingsHidden;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.(".toolbar-flyout")) return;
      closeFlyout();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFlyout();
    };
    const onScroll = () => {
      if (openGroup) closeFlyout();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, [openGroup]);

  // Keep last-tool memory in sync when parent changes activeTool
  useEffect(() => {
    const g = groupForTool(activeTool);
    if (g) {
      setLastTools((prev) => ({ ...prev, [g.id]: activeTool as DrawingToolId }));
    }
  }, [activeTool]);

  const triggerToast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  };

  const selectTool = (toolId: DrawingToolId, label: string, shouldCloseFlyout = true) => {
    if (onSelectTool) onSelectTool(toolId);
    else setLocalActiveTool(toolId);

    const g = groupForTool(toolId);
    if (g) {
      setLastTools((prev) => ({ ...prev, [g.id]: toolId }));
    }
    if (shouldCloseFlyout) closeFlyout();
    triggerToast(`${label} selected`);
  };

  const handleGroupButtonClick = (group: ToolGroup) => {
    const last = lastTools[group.id] || group.tools[0].id;
    const tool = findTool(last) || group.tools[0];

    // Single-tool groups: just select
    if (group.tools.length === 1) {
      selectTool(tool.id, tool.label);
      return;
    }

    // If already using a tool from this group, toggle flyout
    const isGroupActive = group.tools.some((t) => t.id === activeTool);
    if (isGroupActive && openGroup === group.id) {
      closeFlyout();
      return;
    }
    if (isGroupActive && openGroup !== group.id) {
      openFlyoutAt(group.id);
      return;
    }

    // Select last tool and open flyout so user can switch
    selectTool(tool.id, tool.label, false);
    openFlyoutAt(group.id);
  };

  const handleClearDrawings = () => {
    if (onClearDrawings) onClearDrawings();
    triggerToast("All drawings removed");
  };

  const displayToolForGroup = (group: ToolGroup): ToolDef => {
    const last = lastTools[group.id];
    const activeInGroup = group.tools.find((t) => t.id === activeTool);
    if (activeInGroup) return activeInGroup;
    return findTool(last || group.tools[0].id) || group.tools[0];
  };

  return (
    <div className="drawing-toolbar-wrapper" ref={wrapperRef}>
      <div className="drawing-toolbar">
        {TOOL_GROUPS.map((group, idx) => {
          const display = displayToolForGroup(group);
          const isActive = group.tools.some((t) => t.id === activeTool);
          const hasFlyout = group.tools.length > 1;
          const flyoutOpen = openGroup === group.id;

          return (
            <div key={group.id} className="toolbar-group">
              {idx > 0 &&
                (TOOL_GROUPS[idx - 1].id === "cursors" ||
                  TOOL_GROUPS[idx - 1].id === "annotation" ||
                  TOOL_GROUPS[idx - 1].id === "measure") && (
                  <div className="toolbar-divider" />
                )}

              <div className={`toolbar-group-btn-wrap ${flyoutOpen ? "flyout-open" : ""}`}>
                <button
                  type="button"
                  ref={(el) => {
                    groupBtnRefs.current[group.id] = el;
                  }}
                  className={`toolbar-btn ${isActive ? "active" : ""} ${hasFlyout ? "has-flyout" : ""}`}
                  onClick={() => handleGroupButtonClick(group)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!hasFlyout) return;
                    if (flyoutOpen) closeFlyout();
                    else openFlyoutAt(group.id);
                  }}
                  title={`${display.label}${display.shortcut ? ` (${display.shortcut})` : ""}${
                    hasFlyout ? " · right-click for more" : ""
                  }`}
                  aria-label={display.label}
                  aria-haspopup={hasFlyout ? "menu" : undefined}
                  aria-expanded={hasFlyout ? flyoutOpen : undefined}
                >
                  {display.icon}
                  {hasFlyout && (
                    <span
                      className="toolbar-flyout-chevron"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (flyoutOpen) closeFlyout();
                        else openFlyoutAt(group.id);
                      }}
                      aria-hidden
                    >
                      <ChevronRight size={8} strokeWidth={2.5} />
                    </span>
                  )}
                </button>

                {hasFlyout && flyoutOpen && flyoutPos && createPortal(
                  <div
                    className="toolbar-flyout"
                    role="menu"
                    aria-label={group.title}
                    style={{ top: flyoutPos.top, left: flyoutPos.left }}
                  >
                    <div className="toolbar-flyout-title">{group.title}</div>
                    {group.tools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        role="menuitem"
                        className={`toolbar-flyout-item ${activeTool === tool.id ? "active" : ""}`}
                        onClick={() => selectTool(tool.id, tool.label)}
                      >
                        <span className="toolbar-flyout-icon">{tool.icon}</span>
                        <span className="toolbar-flyout-label">{tool.label}</span>
                        {tool.shortcut && (
                          <span className="toolbar-flyout-shortcut">{tool.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </div>,
                  document.fullscreenElement || document.body
                )}
              </div>
            </div>
          );
        })}

        <div className="toolbar-divider" />

        {/* Magnet */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${magnetActive ? "active glow-magnet" : ""}`}
          onClick={() => {
            if (onToggleMagnet) onToggleMagnet();
            else setLocalMagnetActive(!localMagnetActive);
            triggerToast(magnetActive ? "Magnet off" : "Magnet on (snap to OHLC)");
          }}
          title="Magnet Mode (snap to OHLC)"
          aria-label="Magnet Mode"
        >
          <Magnet size={16} strokeWidth={1.75} />
        </button>

        {/* Stay in drawing mode */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${toolsLocked ? "active glow-lock" : ""}`}
          onClick={() => {
            if (onToggleToolsLocked) onToggleToolsLocked();
            else setLocalToolsLocked(!localToolsLocked);
            triggerToast(toolsLocked ? "Exit drawing mode after each draw" : "Stay in drawing mode");
          }}
          title="Stay in Drawing Mode"
          aria-label="Stay in Drawing Mode"
        >
          <LineIcon
            d={
              <>
                <rect x="3" y="11" width="10" height="10" rx="1.5" />
                <path d="M5 11V7a3 3 0 0 1 6 0v4" />
                <path d="M15 4l5 5m-6.5 2.5l4-4a1 1 0 0 0 0-1.4L16.1 4a1 1 0 0 0-1.4 0l-4 4a1 1 0 0 0-.3.7v1.7h1.7a1 1 0 0 0 .7-.3z" />
              </>
            }
          />
        </button>

        {/* Lock all drawings */}
        <button
          type="button"
          className={`toolbar-btn toggle-btn ${drawingsLocked ? "active glow-lock" : ""}`}
          onClick={() => {
            if (onToggleDrawingsLocked) onToggleDrawingsLocked();
            else setLocalDrawingsLocked(!localDrawingsLocked);
            triggerToast(drawingsLocked ? "Drawings unlocked" : "All drawings locked");
          }}
          title="Lock All Drawings"
          aria-label="Lock Drawings"
        >
          {drawingsLocked ? (
            <Lock size={16} strokeWidth={1.75} />
          ) : (
            <Unlock size={16} strokeWidth={1.75} />
          )}
        </button>

        {/* Hide drawings */}
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

