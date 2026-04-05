import type {
  AchievementBadge,
  CachedDashboardAnalysis,
  DashboardResponse,
  DashboardUploadResponse,
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MemoryLaneEntry,
  MoodTimelineEntry,
  PlaylistBundle,
  PlaylistTrack,
  PersonaProfile,
  PublicProfileSharePayload,
  RecapVariant,
  SavedSession,
  SmartInsight,
  StatsPayload,
  TasteEvolutionPoint,
  TimeframeOption
} from "./types";
import type { MusicPassportData } from "../components/MusicPassportCard";

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

export const TIMEFRAME_COMPARE_OPTIONS: TimeframeOption[] = ["30d", "90d", "365d", "all"];

export const RECAP_VARIANT_LABELS: Record<RecapVariant, string> = {
  auto: "Auto",
  annual: "Annual",
  monthly: "Monthly",
  seasonal: "Seasonal"
};
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const ANALYSIS_CACHE_LIMIT = 10;

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

export function buildFileAnalysisCacheKey(
  source: "takeout" | "unified-takeout" | "apple-music",
  file: File
): string {
  return `${source}:${file.name}:${file.size}:${file.lastModified}`;
}

export function buildJsonAnalysisCacheKey(source: string, value: string): string {
  return `${source}:${value.trim().toLowerCase()}`;
}

export function getCachedAnalysis<T extends DashboardUploadResponse | DashboardResponse>(
  key: string
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
  response: DashboardUploadResponse | DashboardResponse
): void {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_CACHE_STORAGE_KEY);
    const entries = raw ? (JSON.parse(raw) as CachedDashboardAnalysis[]) : [];
    const nextEntries = [
      {
        key,
        source,
        response,
        savedAt: new Date().toISOString()
      },
      ...entries.filter((entry) => entry.key !== key)
    ].slice(0, ANALYSIS_CACHE_LIMIT);

    window.localStorage.setItem(ANALYSIS_CACHE_STORAGE_KEY, JSON.stringify(nextEntries));
  } catch {
    window.localStorage.removeItem(ANALYSIS_CACHE_STORAGE_KEY);
  }
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

export function encodePublicProfilePayload(payload: PublicProfileSharePayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return window.btoa(binary);
}

export function decodePublicProfilePayload(value: string): PublicProfileSharePayload {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as PublicProfileSharePayload;
}

export function getPublicProfileUrl(payload: PublicProfileSharePayload): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.set(PROFILE_SHARE_PARAM, encodePublicProfilePayload(payload));
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

export function downloadTextFile(filename: string, content: string, mimeType = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
  moodTimeline: MoodTimelineEntry[],
  source: DashboardResponse["source"] = "takeout"
): DashboardResponse {
  return {
    source,
    username: null,
    stats,
    genreBreakdown,
    moodTimeline,
    profileSummary: null,
  };
}

export function filterHistoryBySearchAndFacets(
  entries: EnrichedHistoryEntry[],
  options: {
    searchTerm: string;
    genre: string;
    artist: string;
    mood: string;
  }
): EnrichedHistoryEntry[] {
  const term = options.searchTerm.trim().toLowerCase();

  return entries.filter((entry) => {
    const genre = classifyGenre(entry.tags, entry.artist);
    const matchesSearch =
      !term ||
      entry.title.toLowerCase().includes(term) ||
      entry.artist.toLowerCase().includes(term) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(term));
    const matchesGenre = !options.genre || genre === options.genre;
    const matchesArtist = !options.artist || entry.artist === options.artist;
    const matchesMood =
      !options.mood ||
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        if (hour === null) {
          return false;
        }
        const mood =
          hour <= 5
            ? MOOD_LABELS.lateNight
            : hour <= 10
              ? MOOD_LABELS.morning
              : hour <= 16
                ? MOOD_LABELS.afternoon
                : MOOD_LABELS.evening;
        return mood === options.mood;
      });

    return matchesSearch && matchesGenre && matchesArtist && matchesMood;
  });
}

export function getEntryMoodLabels(entry: EnrichedHistoryEntry): string[] {
  return Array.from(
    new Set(
      entry.timestamps.flatMap((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        if (hour === null) {
          return [];
        }

        return [
          hour <= 5
            ? MOOD_LABELS.lateNight
            : hour <= 10
              ? MOOD_LABELS.morning
              : hour <= 16
                ? MOOD_LABELS.afternoon
                : MOOD_LABELS.evening
        ];
      })
    )
  );
}

export function buildPlaylistBundles(
  entries: EnrichedHistoryEntry[],
  moodTimeline: MoodTimelineEntry[]
): PlaylistBundle[] {
  const toTrack = (entry: EnrichedHistoryEntry): PlaylistTrack => ({
    videoId: entry.videoId,
    title: entry.title,
    artist: entry.artist,
    thumbnail: entry.thumbnail,
    playCount: entry.playCount,
    url: `https://music.youtube.com/watch?v=${entry.videoId}`
  });

  const topTracks = [...entries].sort((left, right) => right.playCount - left.playCount).slice(0, 15);
  const lateNightTracks = entries
    .filter((entry) =>
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour !== null && hour <= 5;
      })
    )
    .sort((left, right) => right.playCount - left.playCount)
    .slice(0, 12);
  const focusTracks = entries
    .filter((entry) =>
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour !== null && hour >= 11 && hour <= 16;
      })
    )
    .sort((left, right) => right.playCount - left.playCount)
    .slice(0, 12);
  const discoveryTracks = [...entries]
    .sort((left, right) => left.playCount - right.playCount || left.title.localeCompare(right.title))
    .slice(0, 12)
    .reverse();

  const dominantMood = moodTimeline[0]?.mood ?? "Unknown mood";

  return [
    {
      id: "top",
      title: "Top Rotation",
      description: "Your most-played tracks, ready to replay in one run.",
      tracks: topTracks.map(toTrack)
    },
    {
      id: "late-night",
      title: "Late Night Loop",
      description: "Built from your after-dark listening habits.",
      tracks: (lateNightTracks.length ? lateNightTracks : topTracks).map(toTrack)
    },
    {
      id: "focus",
      title: "Focus Set",
      description: `Anchored by your ${dominantMood.toLowerCase()} listening patterns.`,
      tracks: (focusTracks.length ? focusTracks : topTracks).map(toTrack)
    },
    {
      id: "discovery",
      title: "Hidden Cuts",
      description: "A lighter rotation of lower-play gems from your archive.",
      tracks: discoveryTracks.map(toTrack)
    }
  ];
}

export function playlistToText(bundle: PlaylistBundle): string {
  return [
    `${bundle.title}`,
    `${bundle.description}`,
    "",
    ...bundle.tracks.map(
      (track, index) => `${index + 1}. ${track.title} - ${track.artist} (${track.url})`
    )
  ].join("\n");
}

export function buildPublicProfileSharePayload(args: {
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  passportData: MusicPassportData | null;
  persona: PersonaProfile | null;
  timeframeLabel: string;
  sourceLabel: string;
}): PublicProfileSharePayload {
  const { stats, genreBreakdown, moodTimeline, passportData, persona, timeframeLabel, sourceLabel } = args;

  return {
    sourceLabel,
    timeframeLabel,
    generatedAt: new Date().toISOString(),
    stats: {
      topSongs: stats.topSongs.slice(0, 10),
      topArtists: stats.topArtists.slice(0, 10),
      totalListeningMinutes: stats.totalListeningMinutes
    },
    genreBreakdown: genreBreakdown.slice(0, 6),
    moodTimeline,
    passport: {
      topArtist: passportData?.topArtist ?? { name: stats.topArtists[0]?.artist ?? "Unknown artist", thumbnail: null },
      totalListeningHours: passportData?.totalListeningHours ?? stats.totalListeningMinutes / 60,
      dominantGenre: passportData?.dominantGenre ?? genreBreakdown[0]?.genre ?? "Other",
      dominantMood: passportData?.dominantMood ?? moodTimeline[0]?.mood ?? "Unknown",
      listeningStreakDays: passportData?.listeningStreakDays ?? getLongestListeningStreak(stats.rawEnrichedHistory)
    },
    persona
  };
}

export function buildSavedSession(args: {
  dashboard: DashboardResponse;
  timeframe: TimeframeOption;
  sourceLabel: string;
}): SavedSession {
  const { dashboard, timeframe, sourceLabel } = args;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name:
      dashboard.source === "lastfm"
        ? `${dashboard.username ?? "Last.fm"} snapshot`
        : dashboard.source === "youtube-profile"
          ? `${dashboard.profileSummary?.name ?? "Profile"} preview`
          : `Takeout ${TIMEFRAME_LABELS[timeframe]}`,
    savedAt: new Date().toISOString(),
    sourceLabel,
    timeframe,
    dashboard
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

export function classifyGenre(tags: string[], artist: string): string {
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

export function buildTasteEvolution(
  entries: EnrichedHistoryEntry[],
  timeframe: TimeframeOption
): TasteEvolutionPoint[] {
  const bucketMap = new Map<
    string,
    { label: string; playCount: number; genres: Record<string, number>; artists: Record<string, number> }
  >();

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const { key, label } = getEvolutionBucket(date, timeframe);
      const current =
        bucketMap.get(key) ??
        { label, playCount: 0, genres: {}, artists: {} };

      current.playCount += 1;
      const genre = classifyGenre(entry.tags, entry.artist);
      current.genres[genre] = (current.genres[genre] ?? 0) + 1;
      current.artists[entry.artist] = (current.artists[entry.artist] ?? 0) + 1;
      bucketMap.set(key, current);
    });
  });

  return Array.from(bucketMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([, bucket]) => ({
      label: bucket.label,
      topGenre: getTopKey(bucket.genres) ?? "Other",
      topArtist: getTopKey(bucket.artists) ?? "Unknown artist",
      playCount: bucket.playCount
    }));
}

export function buildSmartInsights(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[]
): SmartInsight[] {
  const peak = findPeakListeningWindow(stats.rawEnrichedHistory);
  const longestTrack = [...stats.topSongs].sort((left, right) => right.playCount - left.playCount)[0];
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const diversityScore = genreBreakdown.length;

  return [
    {
      title: "Peak Listening Window",
      body: `${peak.day} around ${peak.hour}:00 is when your listening energy spikes the most.`
    },
    {
      title: "Core Taste Signal",
      body: `${dominantGenre} leads your archive, while ${dominantMood.toLowerCase()} listening sets the emotional tone.`
    },
    {
      title: "Replay Center",
      body: `${longestTrack?.title ?? "Your top song"} is the strongest repeat magnet in this snapshot.`
    },
    {
      title: "Range Check",
      body:
        diversityScore >= 6
          ? "Your listening spreads across a wide genre mix instead of orbiting a single lane."
          : "Your taste is tight and focused, with a few genres doing most of the heavy lifting."
    }
  ];
}

export function buildPersonaProfile(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[]
): PersonaProfile {
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const peak = findPeakListeningWindow(stats.rawEnrichedHistory);

  const moodTag =
    dominantMood === "Chill/Nocturnal"
      ? "Midnight"
      : dominantMood === "Energized"
        ? "Daybreak"
        : dominantMood === "Focused"
          ? "Signal"
          : "Velvet";

  const genreTag =
    dominantGenre === "Hip-Hop"
      ? "Rhythm Pilot"
      : dominantGenre === "Electronic"
        ? "Circuit Walker"
        : dominantGenre === "Rock"
          ? "Voltage Driver"
          : dominantGenre === "Lo-fi"
            ? "Cloud Drifter"
            : dominantGenre === "Indie"
              ? "Scene Collector"
              : dominantGenre === "Pop"
                ? "Hook Hunter"
                : `${dominantGenre} Oracle`;

  return {
    title: `${moodTag} ${genreTag}`,
    subtitle: `You listen like someone building atmosphere first and letting songs define the room after that.`,
    traits: [
      `${dominantGenre} dominant`,
      `${dominantMood} leaning`,
      `${peak.day} ${peak.hour}:00 peak hour`
    ]
  };
}

export function buildMemoryLane(entries: EnrichedHistoryEntry[]): MemoryLaneEntry[] {
  return entries
    .map((entry) => {
      const sorted = [...entry.timestamps]
        .map((timestamp) => new Date(timestamp))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((left, right) => left.getTime() - right.getTime());

      if (!sorted.length) {
        return null;
      }

      return {
        videoId: entry.videoId,
        title: entry.title,
        artist: entry.artist,
        thumbnail: entry.thumbnail,
        playCount: entry.playCount,
        firstPlayed: sorted[0].toISOString()
      };
    })
    .filter((entry): entry is MemoryLaneEntry => entry !== null)
    .sort((left, right) => left.firstPlayed.localeCompare(right.firstPlayed))
    .slice(0, 5);
}

export function buildAchievementBadges(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[]
): AchievementBadge[] {
  const totalPlays = stats.rawEnrichedHistory.reduce((sum, entry) => sum + entry.playCount, 0);
  const streak = getLongestListeningStreak(stats.rawEnrichedHistory);
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const badges: AchievementBadge[] = [];

  if (streak >= 7) {
    badges.push({
      title: "Streak Keeper",
      description: `${streak} straight days of listens kept your momentum alive.`,
      tone: "gold"
    });
  }

  if (genreBreakdown.length >= 6) {
    badges.push({
      title: "Palette Explorer",
      description: `You spread your plays across ${genreBreakdown.length} active genres.`,
      tone: "teal"
    });
  }

  if (dominantMood === "Chill/Nocturnal") {
    badges.push({
      title: "Night Owl",
      description: "Your strongest listening habits come alive after dark.",
      tone: "ember"
    });
  }

  if (stats.topSongs[0]?.playCount >= 20) {
    badges.push({
      title: "Replay Royalty",
      description: `${stats.topSongs[0]?.title ?? "Your top song"} became a serious repeat obsession.`,
      tone: "gold"
    });
  }

  if (totalPlays >= 250) {
    badges.push({
      title: `${dominantGenre} Loyalist`,
      description: `You kept returning to ${dominantGenre} as your strongest lane.`,
      tone: "teal"
    });
  }

  return badges.slice(0, 5);
}

export function buildArtistClusters(entries: EnrichedHistoryEntry[]) {
  const grouped = new Map<
    string,
    {
      artist: string;
      playCount: number;
      thumbnail: string | null;
      genres: Record<string, number>;
      songs: string[];
    }
  >();

  entries.forEach((entry) => {
    const current =
      grouped.get(entry.artist) ??
      {
        artist: entry.artist,
        playCount: 0,
        thumbnail: entry.thumbnail,
        genres: {},
        songs: []
      };

    const genre = classifyGenre(entry.tags, entry.artist);
    current.playCount += entry.playCount;
    current.thumbnail = current.thumbnail ?? entry.thumbnail;
    current.genres[genre] = (current.genres[genre] ?? 0) + entry.playCount;
    current.songs.push(entry.title);
    grouped.set(entry.artist, current);
  });

  const ranked = Array.from(grouped.values())
    .sort((left, right) => right.playCount - left.playCount || left.artist.localeCompare(right.artist))
    .slice(0, 8);
  const totalPlays = ranked.reduce((sum, entry) => sum + entry.playCount, 0) || 1;

  const nodes = ranked.map((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(ranked.length, 1) - Math.PI / 2;
    const radius = index === 0 ? 0 : index % 2 === 0 ? 102 : 132;
    return {
      id: entry.artist,
      artist: entry.artist,
      playCount: entry.playCount,
      thumbnail: entry.thumbnail,
      genre: getTopKey(entry.genres) ?? "Other",
      songs: entry.songs.slice(0, 3),
      size: 56 + (entry.playCount / totalPlays) * 116,
      x: 180 + Math.cos(angle) * radius,
      y: 180 + Math.sin(angle) * radius
    };
  });

  const hub = nodes[0] ?? null;
  const links = nodes.slice(1).map((node) => ({
    source: hub?.id ?? node.id,
    target: node.id,
    sharedGenre:
      node.genre === hub?.genre ? node.genre : [hub?.genre, node.genre].filter(Boolean).join(" / ")
  }));

  return { nodes, links };
}

function getEvolutionBucket(date: Date, timeframe: TimeframeOption): { key: string; label: string } {
  if (timeframe === "30d") {
    const week = Math.max(1, Math.ceil(date.getDate() / 7));
    return { key: `${date.getFullYear()}-${date.getMonth()}-w${week}`, label: `Week ${week}` };
  }

  if (timeframe === "90d") {
    const month = date.toLocaleString(undefined, { month: "short" });
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: month };
  }

  return {
    key: `${date.getFullYear()}-${date.getMonth()}`,
    label: date.toLocaleString(undefined, { month: "short" })
  };
}

function getTopKey(values: Record<string, number>): string | null {
  const entry = Object.entries(values).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  )[0];
  return entry?.[0] ?? null;
}

function findPeakListeningWindow(entries: EnrichedHistoryEntry[]): { day: string; hour: number } {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${HEATMAP_DAYS[date.getDay()]}-${date.getHours()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });

  const winner = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0];
  if (!winner) {
    return { day: "Sun", hour: 0 };
  }

  const [day, hour] = winner[0].split("-");
  return { day, hour: Number(hour) };
}
