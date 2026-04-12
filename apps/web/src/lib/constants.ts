import type { RecapVariant, TimeframeOption } from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const SHARE_PARAM = "passport";
export const PROFILE_SHARE_PARAM = "profile";
export const ANALYSIS_CACHE_STORAGE_KEY = "auralize-analysis-cache";
export const CHART_ACCENT = "#67C3C0";
export const CHART_ACCENT_SECONDARY = "#E4A94B";
export const CHART_ACCENT_TERTIARY = "#D97757";
export const PIE_COLORS = [
  "#67C3C0",
  "#8AD4C7",
  "#E4A94B",
  "#D97757",
  "#9ADDD4",
  "#C99244",
  "#D18B6F",
  "#4E8C92",
  "#F59E0B",
  "#B9773E",
  "#79A3A6",
  "#5E4836",
];
export const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HEATMAP_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  all: "All time",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last year",
};
export const TIMEFRAME_COMPARE_OPTIONS: TimeframeOption[] = ["30d", "90d", "365d", "all"];
export const RECAP_VARIANT_LABELS: Record<RecapVariant, string> = {
  auto: "Auto",
  annual: "Annual",
  monthly: "Monthly",
  seasonal: "Seasonal",
};
