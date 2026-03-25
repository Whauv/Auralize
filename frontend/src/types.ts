export type ParsedHistoryEntry = {
  videoId: string;
  title: string;
  playCount: number;
  timestamps: string[];
};

export type EnrichedHistoryEntry = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  duration: string;
  tags: string[];
  playCount: number;
  timestamps: string[];
};

export type StatsPayload = {
  topSongs: EnrichedHistoryEntry[];
  topArtists: { artist: string; playCount: number }[];
  totalListeningMinutes: number;
  rawEnrichedHistory: EnrichedHistoryEntry[];
};

export type GenreBreakdownEntry = {
  genre: string;
  count: number;
  percentage: number;
};

export type MoodTimelineEntry = {
  mood: string;
  playCount: number;
};

export type DashboardResponse = {
  source: "takeout" | "lastfm" | "youtube-profile";
  username: string | null;
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  profileSummary?: {
    name: string;
    handle: string;
    thumbnail: string | null;
    url: string;
  } | null;
};

export type TimeframeOption = "all" | "30d" | "90d" | "365d";
