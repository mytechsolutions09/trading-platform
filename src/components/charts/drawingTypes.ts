export interface DrawingPoint {
  time: number;
  price: number;
}

export type DrawingType =
  | "trendline"
  | "ray"
  | "extended_line"
  | "info_line"
  | "horizontal_line"
  | "vertical_line"
  | "cross_line"
  | "parallel_channel"
  | "pitchfork"
  | "fibonacci"
  | "fib_extension"
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
  /** Legacy alias stored in localStorage */
  | "shapes";

export type LineStyle = "solid" | "dashed" | "dotted";

export interface DrawingStyle {
  color?: string;
  lineWidth?: number;       // 1 | 2 | 3 | 4
  lineStyle?: LineStyle;
  extendLeft?: boolean;
  extendRight?: boolean;
}

export interface DrawingItem {
  id: string;
  type: DrawingType;
  p1: DrawingPoint;
  p2?: DrawingPoint;
  p3?: DrawingPoint;
  points?: DrawingPoint[];
  text?: string;
  /** Per-drawing visual style (trendline, ray, extended_line, info_line, h/v lines) */
  style?: DrawingStyle;
}

export const TWO_POINT_TOOLS = new Set([
  "trendline",
  "ray",
  "extended_line",
  "info_line",
  "fibonacci",
  "fib_extension",
  "parallel_channel",
  "rectangle",
  "ellipse",
  "arrow",
  "ruler",
  "date_range",
  "price_range",
  "shapes",
]);

export const THREE_POINT_TOOLS = new Set(["pitchfork", "triangle"]);

export const ONE_POINT_TOOLS = new Set([
  "horizontal_line",
  "vertical_line",
  "cross_line",
  "text",
  "callout",
  "price_label",
  "smile",
]);

export const BRUSH_TOOLS = new Set(["brush", "highlighter"]);

export function normalizeDrawingType(type: string): DrawingType {
  if (type === "shapes") return "rectangle";
  return type as DrawingType;
}
