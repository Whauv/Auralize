import type {
  DashboardResponse,
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  StatsPayload,
  TimeframeOption
} from "./types";
import type { MusicPassportData } from "./MusicPassportCard";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const SHARE_PARAM = "passport";
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
  "#5E4836"
];
export const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HEATMAP_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  all: "All time",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last year"
};

const ISO_8601_DURATION_PATTERN =
  /^P(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)$/;

const GENRE_KEYWORDS: Record<string, string[]> = {
  Pop: ["pop", "dance pop", "synthpop", "electropop", "teen pop"],
  "Hip-Hop": ["hip hop", "hip-hop", "rap", "trap", "drill", "freestyle"],
  Rock: ["rock", "punk", "metal", "grunge", "alternative rock", "hard rock"],
  "R&B": ["r&b", "randb", "rhythm and blues", "soul", "neo soul", "neo-soul"],
  Electronic: ["electronic", "edm", "house", "techno", "trance", "dubstep", "dnb"],
  Classical: ["classical", "orchestra", "orchestral", "baroque", "piano sonata"],
  Jazz: ["jazz", "bebop", "swing", "fusion", "smooth jazz"],
  "Lo-fi": ["lofi", "lo-fi", "chillhop", "study beats", "sleep beats"],
  Indie: ["indie", "indie pop", "indie rock", "bedroom pop", "shoegaze"],
  "K-Pop": ["k-pop", "kpop", "korean pop", "idol", "girl group", "boy group"]
};

const ARTIST_HEURISTICS: Record<string, string[]> = {
  "K-Pop": ["bts", "blackpink", "twice", "newjeans", "stray kids", "seventeen", "aespa"],
  "Hip-Hop": ["drake", "kendrick", "j cole", "future", "travis scott", "nicki minaj"],
  "R&B": ["sza", "the weeknd", "brent faiyaz", "summer walker", "frank ocean", "kehlani"],
  Pop: ["taylor swift", "ariana grande", "dua lipa", "olivia rodrigo", "selena gomez"],
  Rock: ["foo fighters", "linkin park", "arctic monkeys", "paramore", "queen"],
  Electronic: ["skrillex", "calvin harris", "fred again", "deadmau5", "odesza"],
  Classical: ["mozart", "beethoven", "chopin", "bach", "vivaldi"],
  Jazz: ["miles davis", "john coltrane", "ella fitzgerald", "chet baker", "duke ellington"],
  "Lo-fi": ["jinsang", "nujabes", "tomppabeats", "idealism", "eevee"],
  Indie: ["phoebe bridgers", "clairo", "beabadoobee", "the smiths", "mac demarco"]
};

const MOOD_LABELS = {
  lateNight: "Chill/Nocturnal",
  morning: "Energized",
  afternoon: "Focused",
  evening: "Relaxed"
} as const;

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

export function filterHistoryByTimeframe(
  entries: EnrichedHistoryEntry[],
  timeframe: TimeframeOption
): EnrichedHistoryEntry[] {
  if (timeframe === "all") {
    return entries;
  }

  const now = new Date();
  const days = timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return entries
    .map((entry) => {
      const filteredTimestamps = entry.timestamps.filter((timestamp) => {
        const date = new Date(timestamp);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
      });

      if (!filteredTimestamps.length) {
        return null;
      }

      return {
        ...entry,
        playCount: filteredTimestamps.length,
        timestamps: filteredTimestamps
      };
    })
    .filter((entry): entry is EnrichedHistoryEntry => entry !== null)
    .sort((left, right) => right.playCount - left.playCount || left.title.localeCompare(right.title));
}

export function buildStatsPayloadFromHistory(entries: EnrichedHistoryEntry[]): StatsPayload {
  const artistTotals: Record<string, number> = {};
  let totalListeningMinutes = 0;

  for (const entry of entries) {
    artistTotals[entry.artist] = (artistTotals[entry.artist] ?? 0) + entry.playCount;
    totalListeningMinutes += durationToMinutes(entry.duration) * entry.playCount;
  }

  return {
    topSongs: [...entries].sort((left, right) => right.playCount - left.playCount).slice(0, 10),
    topArtists: Object.entries(artistTotals)
      .map(([artist, playCount]) => ({ artist, playCount }))
      .sort((left, right) => right.playCount - left.playCount || left.artist.localeCompare(right.artist))
      .slice(0, 10),
    totalListeningMinutes: Number(totalListeningMinutes.toFixed(2)),
    rawEnrichedHistory: entries
  };
}

export function buildGenreBreakdownFromHistory(
  entries: EnrichedHistoryEntry[]
): GenreBreakdownEntry[] {
  const totals: Record<string, number> = {};

  entries.forEach((entry) => {
    const genre = classifyGenre(entry.tags, entry.artist);
    totals[genre] = (totals[genre] ?? 0) + entry.playCount;
  });

  const totalPlays = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.entries(totals)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: totalPlays ? Number(((count / totalPlays) * 100).toFixed(2)) : 0
    }))
    .sort((left, right) => right.count - left.count || left.genre.localeCompare(right.genre));
}

export function buildMoodTimelineFromHistory(
  entries: EnrichedHistoryEntry[]
): MoodTimelineEntry[] {
  const totals: Record<string, number> = {
    [MOOD_LABELS.lateNight]: 0,
    [MOOD_LABELS.morning]: 0,
    [MOOD_LABELS.afternoon]: 0,
    [MOOD_LABELS.evening]: 0
  };

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const hour = parseTimestampHour(timestamp);
      if (hour === null) {
        return;
      }

      const mood =
        hour <= 5
          ? MOOD_LABELS.lateNight
          : hour <= 10
            ? MOOD_LABELS.morning
            : hour <= 16
              ? MOOD_LABELS.afternoon
              : MOOD_LABELS.evening;

      totals[mood] += 1;
    });
  });

  return Object.entries(totals)
    .filter(([, playCount]) => playCount > 0)
    .map(([mood, playCount]) => ({ mood, playCount }))
    .sort((left, right) => right.playCount - left.playCount);
}

export function getHeatmapIntensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) {
    return "bg-[#111111]";
  }

  const ratio = count / maxCount;
  if (ratio < 0.25) {
    return "bg-[#41586d]";
  }
  if (ratio < 0.5) {
    return "bg-[#56768f]";
  }
  if (ratio < 0.75) {
    return "bg-[#7aa29f]";
  }
  return "bg-[#d2b36c]";
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

function durationToMinutes(duration: string): number {
  const match = ISO_8601_DURATION_PATTERN.exec(duration);
  if (!match?.groups) {
    return 0;
  }

  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);
  const seconds = Number(match.groups.seconds ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) / 60;
}

function classifyGenre(tags: string[], artist: string): string {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (normalizedTags.some((tag) => keywords.some((keyword) => tag.includes(keyword)))) {
      return genre;
    }
  }

  const normalizedArtist = artist.toLowerCase();
  for (const [genre, artists] of Object.entries(ARTIST_HEURISTICS)) {
    if (artists.some((candidate) => normalizedArtist.includes(candidate))) {
      return genre;
    }
  }

  return "Other";
}

function parseTimestampHour(timestamp: string): number | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours();
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
    topSongs: stats.topSongs.slice(0, 10).map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail
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
