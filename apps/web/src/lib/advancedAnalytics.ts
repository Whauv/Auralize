import type {
  AchievementBadge,
  GenreBreakdownEntry,
  MemoryLaneEntry,
  MoodTimelineEntry,
  PersonaProfile,
  PlaylistBundle,
  SmartInsight,
  StatsPayload,
  TasteEvolutionPoint,
  TimeframeOption,
} from "./types";
import {
  buildAchievementBadges,
  buildMemoryLane,
  buildPersonaProfile,
  buildPlaylistBundles,
  buildSmartInsights,
  buildTasteEvolution,
} from "./analytics";

export type AdvancedAnalyticsInput = {
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  timeframe: TimeframeOption;
};

export type AdvancedAnalyticsResult = {
  tasteEvolution: TasteEvolutionPoint[];
  smartInsights: SmartInsight[];
  personaProfile: PersonaProfile | null;
  memoryLane: MemoryLaneEntry[];
  achievementBadges: AchievementBadge[];
  playlistBundles: PlaylistBundle[];
};

export function buildAdvancedAnalytics({
  stats,
  genreBreakdown,
  moodTimeline,
  timeframe,
}: AdvancedAnalyticsInput): AdvancedAnalyticsResult {
  const entries = stats.rawEnrichedHistory;

  return {
    tasteEvolution: buildTasteEvolution(entries, timeframe),
    smartInsights: buildSmartInsights(stats, genreBreakdown, moodTimeline),
    personaProfile: buildPersonaProfile(stats, genreBreakdown, moodTimeline),
    memoryLane: buildMemoryLane(entries),
    achievementBadges: buildAchievementBadges(stats, genreBreakdown, moodTimeline),
    playlistBundles: buildPlaylistBundles(entries, moodTimeline),
  };
}
