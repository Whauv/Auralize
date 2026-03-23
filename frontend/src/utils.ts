import type {
  DashboardResponse,
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  StatsPayload
} from "./types";
import type { MusicPassportData } from "./MusicPassportCard";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const SHARE_PARAM = "passport";
export const CHART_ACCENT = "#2dd4bf";
export const CHART_ACCENT_SECONDARY = "#fb7185";
export const CHART_ACCENT_TERTIARY = "#f59e0b";
export const PIE_COLORS = [
  "#2dd4bf",
  "#34d399",
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#f59e0b",
  "#fb7185",
  "#f97316",
  "#f43f5e",
  "#c084fc",
  "#a78bfa"
];
export const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HEATMAP_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

export function formatHours(totalMinutes: number): string {
  return `${(totalMinutes / 60).toFixed(1)} hrs`;
}

export function truncateLabel(label: string, maxLength: number): string {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label;
}

export function parseLastFmUsername(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("last.fm")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const userIndex = parts.findIndex((part) => part.toLowerCase() === "user");
      if (userIndex >= 0 && parts[userIndex + 1]) {
        return parts[userIndex + 1];
      }
      if (parts[0]) {
        return parts[0];
      }
    }
  } catch {
    return trimmed.replace(/^@/, "");
  }

  return trimmed.replace(/^@/, "");
}

export function parseYoutubeMusicProfileUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (!["music.youtube.com", "www.music.youtube.com"].includes(url.hostname)) {
      return "";
    }

    const path = url.pathname.replace(/\/+$/, "");
    if (/^\/@[^/]+$/i.test(path)) {
      return `https://music.youtube.com${path}`;
    }
    if (/^\/(channel|browse|playlist)\/[^/]+$/i.test(path)) {
      return `https://music.youtube.com${path}`;
    }
    return "";
  } catch {
    return "";
  }
}

export function createFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export function encodeSharePayload(payload: MusicPassportData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return window.btoa(binary);
}

export function decodeSharePayload(value: string): MusicPassportData {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as MusicPassportData;
}

export function getShareUrl(payload: MusicPassportData): string {
  const url = new URL(window.location.href);
  url.searchParams.set(SHARE_PARAM, encodeSharePayload(payload));
  return url.toString();
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export async function postFile<T>(path: string, file: File): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    body: createFormData(file)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(payload?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, payload: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(body?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

export function buildTakeoutDashboardResponse(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[]
): DashboardResponse {
  return {
    source: "takeout",
    username: null,
    stats,
    genreBreakdown,
    moodTimeline,
    profileSummary: null,
  };
}

export function getHeatmapIntensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) {
    return "bg-white/5";
  }

  const ratio = count / maxCount;
  if (ratio < 0.25) {
    return "bg-fuchsia-500/25";
  }
  if (ratio < 0.5) {
    return "bg-fuchsia-500/45";
  }
  if (ratio < 0.75) {
    return "bg-pink-500/65";
  }
  return "bg-pink-400/90";
}

export function buildHeatmapData(entries: EnrichedHistoryEntry[]) {
  const matrix = HEATMAP_DAYS.map((day) => ({
    day,
    hours: HEATMAP_HOURS.map((hour) => ({ hour, count: 0 }))
  }));

  for (const entry of entries) {
    for (const timestamp of entry.timestamps) {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      matrix[date.getDay()].hours[date.getHours()].count += 1;
    }
  }

  const maxCount = matrix.reduce((max, day) => {
    return Math.max(max, ...day.hours.map((hourEntry) => hourEntry.count));
  }, 0);

  return { matrix, maxCount };
}

export function getLongestListeningStreak(entries: EnrichedHistoryEntry[]): number {
  const uniqueDays = Array.from(
    new Set(
      entries.flatMap((entry) =>
        entry.timestamps
          .map((timestamp) => new Date(timestamp))
          .filter((date) => !Number.isNaN(date.getTime()))
          .map((date) => {
            const localDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate()
            );
            return localDate.toISOString().slice(0, 10);
          })
      )
    )
  ).sort();

  if (uniqueDays.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = new Date(uniqueDays[index - 1]);
    const currentDate = new Date(uniqueDays[index]);
    const differenceInDays =
      (currentDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function buildPassportData(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[]
): MusicPassportData {
  const topArtistName = stats.topArtists[0]?.artist ?? "Unknown artist";
  const topArtistSong = stats.rawEnrichedHistory.find(
    (entry) => entry.artist === topArtistName
  );

  return {
    topArtist: {
      name: topArtistName,
      thumbnail: topArtistSong?.thumbnail ?? null
    },
    topSongs: stats.topSongs.slice(0, 3).map((song) => ({
      title: song.title,
      artist: song.artist
    })),
    totalListeningHours: stats.totalListeningMinutes / 60,
    dominantGenre: genreBreakdown[0]?.genre ?? "Other",
    dominantMood: moodTimeline[0]?.mood ?? "Unknown",
    listeningStreakDays: getLongestListeningStreak(stats.rawEnrichedHistory),
    fingerprint: genreBreakdown.slice(0, 5).map((entry) => ({
      genre: entry.genre,
      count: entry.count
    }))
  };
}
