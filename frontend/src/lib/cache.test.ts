import { beforeEach, describe, expect, it, vi } from "vitest";

import { ANALYSIS_CACHE_STORAGE_KEY } from "./constants";
import {
  buildFileAnalysisCacheKey,
  buildJsonAnalysisCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
} from "./cache";
import type { DashboardResponse } from "./types";

describe("analysis cache helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("builds stable file and json cache keys", () => {
    const file = new File(["[]"], "watch-history.json");
    Object.defineProperty(file, "lastModified", { value: 12345 });

    expect(buildFileAnalysisCacheKey("takeout", file)).toContain("watch-history.json");
    expect(buildJsonAnalysisCacheKey("lastfm", " Prana ")).toBe("lastfm:prana");
  });

  it("stores and retrieves cached analysis payloads", () => {
    const response: DashboardResponse = {
      source: "lastfm",
      username: "prana",
      stats: {
        topSongs: [],
        topArtists: [],
        totalListeningMinutes: 0,
        rawEnrichedHistory: [],
      },
      genreBreakdown: [],
      moodTimeline: [],
      profileSummary: null,
    };

    setCachedAnalysis("cache-key", "lastfm", response);

    expect(getCachedAnalysis<DashboardResponse>("cache-key")).toEqual(response);
  });

  it("evicts invalid and expired cache data", () => {
    window.localStorage.setItem(ANALYSIS_CACHE_STORAGE_KEY, "{bad-json");
    expect(getCachedAnalysis("cache-key")).toBeNull();

    const staleEntries = [
      {
        key: "stale",
        source: "lastfm",
        response: {
          source: "lastfm",
          username: "prana",
          stats: { topSongs: [], topArtists: [], totalListeningMinutes: 0, rawEnrichedHistory: [] },
          genreBreakdown: [],
          moodTimeline: [],
          profileSummary: null,
        },
        savedAt: "2000-01-01T00:00:00.000Z",
      },
    ];
    window.localStorage.setItem(ANALYSIS_CACHE_STORAGE_KEY, JSON.stringify(staleEntries));

    expect(getCachedAnalysis("stale")).toBeNull();
    expect(window.localStorage.getItem(ANALYSIS_CACHE_STORAGE_KEY)).toBe("[]");
  });
});
