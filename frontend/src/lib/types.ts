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
  source: "takeout" | "unified-takeout" | "apple-music" | "lastfm" | "youtube-profile";
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

export type RecapThemePack = "gold-noir" | "violet-dusk" | "teal-afterglow";

export type RecapVariant = "auto" | "annual" | "monthly" | "seasonal";

export type UploadQualitySummary = {
  totalEntries: number;
  usableEntries: number;
  searchEntries: number;
  youtubeMusicEntries: number;
  warnings: string[];
};

export type UploadResponse = {
  entries: ParsedHistoryEntry[];
  quality: UploadQualitySummary;
};

export type DashboardUploadResponse = UploadResponse & {
  dashboard: DashboardResponse;
};

export type TasteEvolutionPoint = {
  label: string;
  topGenre: string;
  topArtist: string;
  playCount: number;
};

export type SmartInsight = {
  title: string;
  body: string;
};

export type PersonaProfile = {
  title: string;
  subtitle: string;
  traits: string[];
};

export type MemoryLaneEntry = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  playCount: number;
  firstPlayed: string;
};

export type AchievementBadge = {
  title: string;
  description: string;
  tone: "teal" | "gold" | "ember";
};

export type PlaylistMode = "top" | "late-night" | "focus" | "discovery";

export type PlaylistTrack = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  playCount: number;
  url: string;
};

export type PlaylistBundle = {
  id: PlaylistMode;
  title: string;
  description: string;
  tracks: PlaylistTrack[];
};

export type PublicProfileSharePayload = {
  sourceLabel: string;
  timeframeLabel: string;
  generatedAt: string;
  stats: Pick<StatsPayload, "topSongs" | "topArtists" | "totalListeningMinutes">;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  passport: {
    topArtist: {
      name: string;
      thumbnail: string | null;
    };
    totalListeningHours: number;
    dominantGenre: string;
    dominantMood: string;
    listeningStreakDays: number;
  };
  persona?: PersonaProfile | null;
};

export type SavedSession = {
  id: string;
  name: string;
  savedAt: string;
  sourceLabel: string;
  timeframe: TimeframeOption;
  dashboard: DashboardResponse;
};

export type CachedDashboardAnalysis = {
  key: string;
  savedAt: string;
  source: DashboardResponse["source"] | "youtube-profile-request";
  response: DashboardUploadResponse | DashboardResponse;
};
