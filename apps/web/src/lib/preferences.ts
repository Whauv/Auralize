import type { RecapThemePack, RecapVariant, SavedSession, TimeframeOption } from "./types";

export const PREFERENCES_STORAGE_KEY = "auralize-dashboard-preferences";
export const SAVED_SESSIONS_STORAGE_KEY = "auralize-saved-sessions";

export type DashboardPreferences = Partial<{
  timeframe: TimeframeOption;
  recapTheme: RecapThemePack;
  recapVariant: RecapVariant;
  dashboardDensity: "simple" | "full";
  exportThemeId: string;
  performanceMode: "smooth" | "cinematic";
}>;

export function loadDashboardPreferences(): DashboardPreferences | null {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DashboardPreferences) : null;
  } catch {
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    return null;
  }
}

export function saveDashboardPreferences(preferences: DashboardPreferences) {
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function loadSavedSessions(): SavedSession[] {
  try {
    const raw = window.localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch {
    window.localStorage.removeItem(SAVED_SESSIONS_STORAGE_KEY);
    return [];
  }
}

export function saveSavedSessions(sessions: SavedSession[]) {
  window.localStorage.setItem(SAVED_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}
