import {
  type ChangeEventHandler,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  Suspense,
  lazy,
} from "react";

import { ChartSkeleton, Section } from "./DashboardBits";
import { DashboardControlPanel } from "./DashboardControlPanel";
import { DashboardFiltersPanel } from "./DashboardFiltersPanel";
import type {
  AchievementBadge,
  DashboardResponse,
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MemoryLaneEntry,
  PersonaProfile,
  PlaylistBundle,
  SmartInsight,
  TasteEvolutionPoint,
  TimeframeOption,
  UploadQualitySummary,
} from "../lib/types";
import { TIMEFRAME_LABELS } from "../lib/utils";

const DashboardAdvancedSections = lazy(() =>
  import("./DashboardAdvancedSections").then((module) => ({
    default: module.DashboardAdvancedSections,
  })),
);
const DashboardOverviewSections = lazy(() =>
  import("./DashboardOverviewSections").then((module) => ({
    default: module.DashboardOverviewSections,
  })),
);

type DashboardDensity = "simple" | "full";
type DashboardTheme = {
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  pieColors: string[];
};

type DashboardWorkspaceProps = {
  isUploading: boolean;
  isYoutubeProfileMode: boolean;
  dashboard: DashboardResponse | null;
  parsedHistoryLength: number;
  uniqueSongs: number;
  totalPlays: number;
  uploadQuality: UploadQualitySummary | null;
  timeframe: TimeframeOption;
  setTimeframe: Dispatch<SetStateAction<TimeframeOption>>;
  dashboardDensity: DashboardDensity;
  setDashboardDensity: Dispatch<SetStateAction<DashboardDensity>>;
  recapTheme: "gold-noir" | "violet-dusk" | "teal-afterglow";
  setRecapTheme: Dispatch<SetStateAction<"gold-noir" | "violet-dusk" | "teal-afterglow">>;
  savedSessions: import("../lib/types").SavedSession[];
  handleSaveSession: () => void;
  handleRestoreSession: (session: import("../lib/types").SavedSession) => void;
  handleDeleteSession: (sessionId: string) => void;
  scrollToSection: (sectionId: string) => void;
  setIsRecapOpen: Dispatch<SetStateAction<boolean>>;
  stats: import("../lib/types").StatsPayload | null;
  topSongs: EnrichedHistoryEntry[];
  topArtists: Array<{ artist: string; playCount: number }>;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: import("../lib/types").MoodTimelineEntry[];
  heatmapEntries: EnrichedHistoryEntry[];
  filteredEntries: EnrichedHistoryEntry[];
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  selectedGenre: string;
  setSelectedGenre: Dispatch<SetStateAction<string>>;
  selectedArtist: string;
  setSelectedArtist: Dispatch<SetStateAction<string>>;
  selectedMood: string;
  setSelectedMood: Dispatch<SetStateAction<string>>;
  genreOptions: string[];
  artistOptions: string[];
  moodOptions: string[];
  dashboardTheme: DashboardTheme;
  isSimpleDashboard: boolean;
  isAdvancedAnalyticsLoading: boolean;
  shouldShowAdvancedInsights: boolean;
  heroHours: string;
  personaProfile: PersonaProfile | null;
  smartInsights: SmartInsight[];
  tasteEvolution: TasteEvolutionPoint[];
  memoryLane: MemoryLaneEntry[];
  achievementBadges: AchievementBadge[];
  selectedPlaylist: PlaylistBundle | null;
  handleExportPlaylist: (bundle: PlaylistBundle) => void;
  setActionMessage: Dispatch<SetStateAction<string | null>>;
  sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
};

export function DashboardWorkspace({
  isUploading,
  isYoutubeProfileMode,
  dashboard,
  parsedHistoryLength,
  uniqueSongs,
  totalPlays,
  uploadQuality,
  timeframe,
  setTimeframe,
  dashboardDensity,
  setDashboardDensity,
  recapTheme,
  setRecapTheme,
  savedSessions,
  handleSaveSession,
  handleRestoreSession,
  handleDeleteSession,
  scrollToSection,
  setIsRecapOpen,
  stats,
  topSongs,
  topArtists,
  genreBreakdown,
  moodTimeline,
  heatmapEntries,
  filteredEntries,
  searchTerm,
  setSearchTerm,
  selectedGenre,
  setSelectedGenre,
  selectedArtist,
  setSelectedArtist,
  selectedMood,
  setSelectedMood,
  genreOptions,
  artistOptions,
  moodOptions,
  dashboardTheme,
  isSimpleDashboard,
  isAdvancedAnalyticsLoading,
  shouldShowAdvancedInsights,
  heroHours,
  personaProfile,
  smartInsights,
  tasteEvolution,
  memoryLane,
  achievementBadges,
  selectedPlaylist,
  handleExportPlaylist,
  setActionMessage,
  sectionRefs,
}: DashboardWorkspaceProps) {
  const handleSearchTermChange: ChangeEventHandler<HTMLInputElement> = (event) =>
    setSearchTerm(event.target.value);
  const handleSelectedGenreChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
    setSelectedGenre(event.target.value);
  const handleSelectedArtistChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
    setSelectedArtist(event.target.value);
  const handleSelectedMoodChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
    setSelectedMood(event.target.value);
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGenre("");
    setSelectedArtist("");
    setSelectedMood("");
  };

  if (isUploading) {
    return (
      <>
        <Section title="Your Music Profile" subtitle="Crunching your listening summary.">
          <ChartSkeleton heightClass="h-[220px]" />
        </Section>
        <Section title="Top Songs" subtitle="Preparing your top tracks.">
          <ChartSkeleton heightClass="h-[420px]" />
        </Section>
        <Section title="Top Artists" subtitle="Preparing your artist rankings.">
          <ChartSkeleton heightClass="h-[340px]" />
        </Section>
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Genre DNA" subtitle="Classifying genres.">
            <ChartSkeleton />
          </Section>
          <Section title="Mood Timeline" subtitle="Mapping moods by time of day.">
            <ChartSkeleton />
          </Section>
        </div>
        <Section title="Listening Heatmap" subtitle="Building a weekly heatmap.">
          <ChartSkeleton heightClass="h-[280px]" />
        </Section>
      </>
    );
  }

  if (!stats || isYoutubeProfileMode) {
    return (
      <Section
        title="Dashboard Preview"
        subtitle="Upload a file or enter a Last.fm username to unlock your dashboard and passport."
      >
        <div className="rounded-[1.75rem] border border-dashed border-[#1E293B] bg-[#111827] px-6 py-16 text-center text-[#9CA3AF]">
          Your dashboard and shareable passport will appear here after data loads successfully.
        </div>
      </Section>
    );
  }

  return (
    <>
      <div className="insight-metrics-box grid gap-5 py-5 md:grid-cols-3">
        <div className="border-r border-[var(--panel-border,#1E293B)] pr-4 last:border-r-0 md:pr-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Unique Songs</p>
          <p className="mt-2 text-4xl font-semibold leading-none text-[var(--heading,#FFFFFF)]">{uniqueSongs}</p>
        </div>
        <div className="border-r border-[var(--panel-border,#1E293B)] pr-4 last:border-r-0 md:pr-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Total Plays</p>
          <p className="mt-2 text-4xl font-semibold leading-none text-[var(--heading,#FFFFFF)]">{totalPlays}</p>
        </div>
        <div className="pr-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
            {dashboard?.source === "lastfm" ? "Live User" : "Parsed Tracks"}
          </p>
          <p className="mt-2 text-4xl font-semibold leading-none text-[var(--heading,#FFFFFF)]">
            {dashboard?.source === "lastfm" ? dashboard.username ?? "-" : parsedHistoryLength}
          </p>
        </div>
      </div>

      <Section
        title="Timeframe"
        subtitle="Choose the listening window you want this dashboard and recap to analyze."
        className="timeframe-inline insight-box"
      >
          <div className="timeframe-controls flex flex-wrap items-center gap-2 border-b border-[var(--panel-border,#1E293B)] pb-2">
            {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map((option) => (
              <button
                key={option}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  timeframe === option
                    ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                    : "border border-transparent bg-transparent text-white hover:border-[#3A332B] hover:bg-[#1A1714]"
                }`}
                onClick={() => setTimeframe(option)}
                type="button"
              >
                {TIMEFRAME_LABELS[option]}
              </button>
            ))}
          </div>
      </Section>

      {uploadQuality ? (
        <Section
          title="Data Quality Review"
          subtitle="A quick trust check showing what Auralize used, ignored, and inferred from this source."
          className="data-quality-open insight-box insight-box-soft"
        >
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4 border-b border-[var(--panel-border,#1E293B)] pb-4 sm:grid-cols-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[#F59E0B]">Usable</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {uploadQuality.usableEntries}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">tracks kept for analysis</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[#F59E0B]">Ignored</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {uploadQuality.searchEntries}
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">search-history rows skipped</p>
                </div>
              </div>
              <div className="grid gap-3">
                {Object.entries(uploadQuality.sourceBreakdown ?? {}).map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between border-b border-[var(--panel-border,#1E293B)] py-2 text-sm"
                  >
                    <span className="font-semibold text-white">{source}</span>
                    <span className="text-[#D4A853]">{count} plays</span>
                  </div>
                ))}
                {!Object.keys(uploadQuality.sourceBreakdown ?? {}).length ? (
                  <div className="border-b border-[var(--panel-border,#1E293B)] py-2 text-sm text-[#9CA3AF]">
                    Source confidence will appear here when the uploaded format exposes it.
                  </div>
                ) : null}
              </div>
            </div>
            {uploadQuality.warnings.length ? (
              <div className="mt-5 grid gap-2 border-t border-[var(--panel-border,#1E293B)] pt-3">
              {uploadQuality.warnings.map((warning) => (
                <div
                  key={warning}
                  className="border-l border-amber-300/35 pl-3 text-sm text-amber-100"
                >
                  {warning}
                </div>
              ))}
              </div>
            ) : null}
        </Section>
      ) : null}

      <DashboardControlPanel
        dashboardDensity={dashboardDensity}
        isYoutubeProfileMode={false}
        onDashboardDensityChange={setDashboardDensity}
        onDeleteSession={handleDeleteSession}
        onOpenRecap={() => setIsRecapOpen(true)}
        onRecapThemeChange={setRecapTheme}
        onRestoreSession={handleRestoreSession}
        onSaveSession={handleSaveSession}
        onScrollToSection={scrollToSection}
        currentDashboard={dashboard}
        currentTimeframe={timeframe}
        recapTheme={recapTheme}
        savedSessions={savedSessions}
        statsPresent
      />

      <DashboardFiltersPanel
        artistOptions={artistOptions}
        filteredCount={filteredEntries.length}
        genreOptions={genreOptions}
        moodOptions={moodOptions}
        onClearFilters={clearFilters}
        onSearchTermChange={handleSearchTermChange}
        onSelectedArtistChange={handleSelectedArtistChange}
        onSelectedGenreChange={handleSelectedGenreChange}
        onSelectedMoodChange={handleSelectedMoodChange}
        searchTerm={searchTerm}
        selectedArtist={selectedArtist}
        selectedGenre={selectedGenre}
        selectedMood={selectedMood}
      />

      <div ref={(node) => { sectionRefs.current.overview = node; }}>
        <Section
          title="Your Music Profile"
          subtitle="A snapshot of how much time you have spent inside your listening archive."
        >
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm uppercase tracking-[0.3em] text-[#F59E0B]">
                  Total listening time
                </p>
                {dashboard?.source === "lastfm" ? (
                  <span className="rounded-full border border-[#D4A853]/20 bg-[#D4A853]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F0D080]">
                    Live Mode
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-4xl font-semibold text-white md:text-6xl">{heroHours}</p>
              <p className="mt-4 max-w-2xl text-sm text-[#9CA3AF] md:text-base">
                Based on source data currently loaded into the dashboard.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                <p className="text-sm text-[#9CA3AF]">Top song</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {topSongs[0]?.title ?? "No data yet"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                <p className="text-sm text-[#9CA3AF]">Top artist</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {topArtists[0]?.artist ?? "No data yet"}
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div ref={(node) => { sectionRefs.current.habits = node; }} className="flex flex-col gap-6">
        <Suspense
          fallback={
            <>
              <Section title="Top Songs" subtitle="Preparing your top tracks.">
                <ChartSkeleton heightClass="h-[420px]" />
              </Section>
              <Section title="Top Artists" subtitle="Preparing your artist rankings.">
                <ChartSkeleton heightClass="h-[340px]" />
              </Section>
              <div className="grid gap-6 xl:grid-cols-2">
                <Section title="Genre DNA" subtitle="Classifying genres.">
                  <ChartSkeleton />
                </Section>
                <Section title="Listening Habits" subtitle="Mapping your strongest patterns.">
                  <ChartSkeleton />
                </Section>
              </div>
            </>
          }
        >
          <DashboardOverviewSections
            dashboardTheme={dashboardTheme}
            genreBreakdown={genreBreakdown}
            heatmapEntries={heatmapEntries}
            isSimpleDashboard={isSimpleDashboard}
            moodTimeline={moodTimeline}
            statsEntries={stats.rawEnrichedHistory}
            topArtists={topArtists}
            topSongs={topSongs}
          />
        </Suspense>
      </div>

      {shouldShowAdvancedInsights ? (
        <div ref={(node) => { sectionRefs.current["deep-dive"] = node; }}>
          {isAdvancedAnalyticsLoading ? (
            <Section title="Loading Insights" subtitle="Preparing the advanced dashboard layer.">
              <ChartSkeleton heightClass="h-[260px]" />
            </Section>
          ) : (
            <Suspense
              fallback={
                <Section title="Loading Insights" subtitle="Preparing the advanced dashboard layer.">
                  <ChartSkeleton heightClass="h-[260px]" />
                </Section>
              }
            >
              <DashboardAdvancedSections
                achievementBadges={achievementBadges}
                memoryLane={memoryLane}
                onActionMessage={setActionMessage}
                onExportPlaylist={handleExportPlaylist}
                personaProfile={personaProfile}
                recentHistory={stats.rawEnrichedHistory}
                selectedPlaylist={selectedPlaylist}
                smartInsights={smartInsights}
                tasteEvolution={tasteEvolution}
              />
            </Suspense>
          )}
        </div>
      ) : null}
    </>
  );
}
