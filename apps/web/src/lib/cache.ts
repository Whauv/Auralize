import type { CachedDashboardAnalysis, DashboardResponse, DashboardUploadResponse } from "./types";
import { ANALYSIS_CACHE_STORAGE_KEY } from "./constants";

const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const ANALYSIS_CACHE_LIMIT = 10;

export function buildFileAnalysisCacheKey(
  source: "takeout" | "unified-takeout" | "apple-music",
  file: File,
): string {
  return `${source}:${file.name}:${file.size}:${file.lastModified}`;
}

export function buildJsonAnalysisCacheKey(source: string, value: string): string {
  return `${source}:${value.trim().toLowerCase()}`;
}

export function getCachedAnalysis<T extends DashboardUploadResponse | DashboardResponse>(
  key: string,
): T | null {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const entries = JSON.parse(raw) as CachedDashboardAnalysis[];
    const now = Date.now();
    const freshEntries = entries.filter((entry) => {
      const savedAt = new Date(entry.savedAt).getTime();
      return Number.isFinite(savedAt) && now - savedAt < ANALYSIS_CACHE_TTL_MS;
    });

    if (freshEntries.length !== entries.length) {
      window.localStorage.setItem(ANALYSIS_CACHE_STORAGE_KEY, JSON.stringify(freshEntries));
    }

    const match = freshEntries.find((entry) => entry.key === key);
    return (match?.response as T | undefined) ?? null;
  } catch {
    window.localStorage.removeItem(ANALYSIS_CACHE_STORAGE_KEY);
    return null;
  }
}

export function setCachedAnalysis(
  key: string,
  source: CachedDashboardAnalysis["source"],
  response: DashboardUploadResponse | DashboardResponse,
): void {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_CACHE_STORAGE_KEY);
    const entries = raw ? (JSON.parse(raw) as CachedDashboardAnalysis[]) : [];
    const nextEntries = [
      {
        key,
        source,
        response,
        savedAt: new Date().toISOString(),
      },
      ...entries.filter((entry) => entry.key !== key),
    ].slice(0, ANALYSIS_CACHE_LIMIT);

    window.localStorage.setItem(ANALYSIS_CACHE_STORAGE_KEY, JSON.stringify(nextEntries));
  } catch {
    window.localStorage.removeItem(ANALYSIS_CACHE_STORAGE_KEY);
  }
}
