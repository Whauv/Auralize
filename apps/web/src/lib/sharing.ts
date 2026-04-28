import type {
  DashboardResponse,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  PersonaProfile,
  PublicProfileSharePayload,
  SavedSession,
  StatsPayload,
  TimeframeOption,
} from "./types";
import type { MusicPassportData } from "../components/MusicPassportCard";
import { PROFILE_SHARE_PARAM, SHARE_PARAM, TIMEFRAME_LABELS } from "./constants";
import { getLongestListeningStreak } from "./analytics";

const MAX_ENCODED_SHARE_PAYLOAD_LENGTH = 350_000;
const MAX_DECODED_SHARE_PAYLOAD_BYTES = 250_000;

function encodeBase64(value: string): string {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const bufferApi = (globalThis as { Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (bufferApi) {
    return bufferApi.from(value, "binary").toString("base64");
  }
  throw new Error("No base64 encoder is available in this environment.");
}

function decodeBase64(value: string): string {
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(value);
  }
  const bufferApi = (globalThis as { Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (bufferApi) {
    return bufferApi.from(value, "base64").toString("binary");
  }
  throw new Error("No base64 decoder is available in this environment.");
}

export function encodeSharePayload(payload: MusicPassportData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return encodeBase64(binary);
}

export function decodeSharePayload(value: string): MusicPassportData {
  if (value.length > MAX_ENCODED_SHARE_PAYLOAD_LENGTH) {
    throw new Error("Shared payload is too large.");
  }
  const binary = decodeBase64(value);
  if (binary.length > MAX_DECODED_SHARE_PAYLOAD_BYTES) {
    throw new Error("Shared payload is too large.");
  }
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
  return encodeBase64(binary);
}

export function decodePublicProfilePayload(value: string): PublicProfileSharePayload {
  if (value.length > MAX_ENCODED_SHARE_PAYLOAD_LENGTH) {
    throw new Error("Shared profile payload is too large.");
  }
  const binary = decodeBase64(value);
  if (binary.length > MAX_DECODED_SHARE_PAYLOAD_BYTES) {
    throw new Error("Shared profile payload is too large.");
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as PublicProfileSharePayload;
}

export function getPublicProfileUrl(payload: PublicProfileSharePayload): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.set(PROFILE_SHARE_PARAM, encodePublicProfilePayload(payload));
  return url.toString();
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
  const { stats, genreBreakdown, moodTimeline, passportData, persona, timeframeLabel, sourceLabel } =
    args;

  return {
    sourceLabel,
    timeframeLabel,
    generatedAt: new Date().toISOString(),
    stats: {
      topSongs: stats.topSongs.slice(0, 10),
      topArtists: stats.topArtists.slice(0, 10),
      totalListeningMinutes: stats.totalListeningMinutes,
    },
    genreBreakdown: genreBreakdown.slice(0, 6),
    moodTimeline,
    passport: {
      topArtist: passportData?.topArtist ?? {
        name: stats.topArtists[0]?.artist ?? "Unknown artist",
        thumbnail: null,
      },
      totalListeningHours: passportData?.totalListeningHours ?? stats.totalListeningMinutes / 60,
      dominantGenre: passportData?.dominantGenre ?? genreBreakdown[0]?.genre ?? "Other",
      dominantMood: passportData?.dominantMood ?? moodTimeline[0]?.mood ?? "Unknown",
      listeningStreakDays:
        passportData?.listeningStreakDays ?? getLongestListeningStreak(stats.rawEnrichedHistory),
    },
    persona,
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
    dashboard,
  };
}
