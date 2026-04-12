import { describe, expect, it } from "vitest";

import {
  loadDashboardPreferences,
  loadSavedSessions,
  PREFERENCES_STORAGE_KEY,
  SAVED_SESSIONS_STORAGE_KEY,
  saveDashboardPreferences,
  saveSavedSessions,
} from "./preferences";
import type { SavedSession } from "./types";

describe("preferences storage helpers", () => {
  it("round-trips dashboard preferences", () => {
    const preferences = {
      timeframe: "90d" as const,
      recapTheme: "gold-noir" as const,
      recapVariant: "annual" as const,
      dashboardDensity: "full" as const,
      exportThemeId: "aurora-noir",
    };

    saveDashboardPreferences(preferences);

    expect(loadDashboardPreferences()).toEqual(preferences);
  });

  it("clears invalid dashboard preferences payloads", () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, "{not-json");

    expect(loadDashboardPreferences()).toBeNull();
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
  });

  it("round-trips saved sessions and removes invalid cache data", () => {
    const sessions: SavedSession[] = [
      {
        id: "session-1",
        name: "Snapshot",
        savedAt: "2026-04-05T12:00:00.000Z",
        timeframe: "30d",
        sourceLabel: "Google Takeout",
        dashboard: {
          source: "takeout",
          username: null,
          stats: {
            topSongs: [],
            topArtists: [],
            totalListeningMinutes: 0,
            rawEnrichedHistory: [],
          },
          genreBreakdown: [],
          moodTimeline: [],
          profileSummary: null,
        },
      },
    ];

    saveSavedSessions(sessions);
    expect(loadSavedSessions()).toEqual(sessions);

    window.localStorage.setItem(SAVED_SESSIONS_STORAGE_KEY, "{bad-json");
    expect(loadSavedSessions()).toEqual([]);
    expect(window.localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY)).toBeNull();
  });
});
