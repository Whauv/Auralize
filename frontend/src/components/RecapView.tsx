import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  RecapThemePack,
  RecapVariant,
  StatsPayload
} from "../lib/types";
import {
  buildHeatmapData,
  formatHours,
  getLongestListeningStreak
} from "../lib/utils";
import { ArtistClusterWeb } from "./DashboardBits";
import { MusicPassportCard, type MusicPassportData } from "./MusicPassportCard";

type RecapSlide = {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  palette: string;
  soundtrack: EnrichedHistoryEntry | null;
  render: () => React.ReactElement;
};

const RECAP_THEME_PACKS: Record<
  RecapThemePack,
  { accent: string; accentSoft: string; glowA: string; glowB: string; glowC: string; kicker: string }
> = {
  "gold-noir": {
    accent: "#D4A853",
    accentSoft: "#F0D080",
    glowA: "#D4A853",
    glowB: "#7C3A5A",
    glowC: "#3B1F5E",
    kicker: "Gold noir theme"
  },
  "violet-dusk": {
    accent: "#C084FC",
    accentSoft: "#E9D5FF",
    glowA: "#7C3AED",
    glowB: "#C026D3",
    glowC: "#F59E0B",
    kicker: "Violet dusk theme"
  },
  "teal-afterglow": {
    accent: "#5EEAD4",
    accentSoft: "#CCFBF1",
    glowA: "#14B8A6",
    glowB: "#0F766E",
    glowC: "#D4A853",
    kicker: "Teal afterglow theme"
  }
};

export function RecapView({
  isOpen,
  onClose,
  stats,
  genreBreakdown,
  moodTimeline,
  passportData,
  timeframeLabel,
  themePack,
  variant
}: {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  passportData: MusicPassportData | null;
  timeframeLabel: string;
  themePack: RecapThemePack;
  variant: RecapVariant;
}) {
  const topSong = stats.topSongs[0] ?? null;
  const topArtist = stats.topArtists[0] ?? null;
  const topArtistSong =
    stats.rawEnrichedHistory.find((entry) => entry.artist === topArtist?.artist) ?? null;
  const dominantGenre = genreBreakdown[0] ?? null;
  const dominantMood = moodTimeline[0] ?? null;
  const heatmapSummary = buildPeakListeningSummary(stats.rawEnrichedHistory);
  const slides = buildSlides({
    stats,
    timeframeLabel,
    themePack,
    variant,
    genreBreakdown,
    topSong,
    topArtist,
    topArtistSong,
    dominantGenre,
    dominantMood,
    heatmapSummary,
    passportData
  });

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isAutoplay, setIsAutoplay] = React.useState(true);
  const [audioMode, setAudioMode] = React.useState(true);
  const slideDurationSeconds = 9.5;
  const theme = RECAP_THEME_PACKS[themePack];

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCurrentIndex(0);
    setIsAutoplay(true);
    setAudioMode(true);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !isAutoplay) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => {
        if (index + 1 >= slides.length) {
          window.clearInterval(timer);
          setIsAutoplay(false);
          return index;
        }

        return index + 1;
      });
    }, slideDurationSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [isAutoplay, isOpen, slideDurationSeconds, slides.length]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowRight") {
        setIsAutoplay(false);
        setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setIsAutoplay(false);
        setCurrentIndex((index) => Math.max(index - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onClose, slides.length]);

  if (!isOpen) {
    return null;
  }

  const activeSlide = slides[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(2,6,23,0.82)] backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="min-h-screen px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#F59E0B]">
                  Auralize Recap
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                  A story told through your listening.
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                  onClick={() => setIsAutoplay((value) => !value)}
                  type="button"
                >
                  {isAutoplay ? "Pause autoplay" : "Resume autoplay"}
                </button>
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    audioMode
                      ? "border-[#D4A853] bg-[#D4A853] text-slate-950 hover:bg-[#F0D080]"
                      : "border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setAudioMode((value) => !value)}
                  type="button"
                >
                  {audioMode ? "Audio mode on" : "Audio mode off"}
                </button>
                <button
                  className="rounded-full bg-[#D4A853] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                  onClick={onClose}
                  type="button"
                >
                  Close recap
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    index === currentIndex
                      ? "bg-[#D4A853]"
                      : "bg-[#1E293B]"
                  }`}
                  onClick={() => {
                    setIsAutoplay(false);
                    setCurrentIndex(index);
                  }}
                  type="button"
                />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.49fr]">
              <div className={`recap-stage relative min-h-[640px] overflow-hidden rounded-[2.25rem] border border-[#1E293B] ${activeSlide.palette} p-6 shadow-[0_35px_140px_rgba(2,6,23,0.42)] md:p-8`}>
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-16 top-8 h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: `${theme.glowA}22` }} />
                  <div className="absolute right-0 top-0 h-52 w-52 rounded-full blur-3xl" style={{ backgroundColor: `${theme.glowB}22` }} />
                  <div className="absolute bottom-8 left-1/3 h-40 w-40 rounded-full blur-3xl" style={{ backgroundColor: `${theme.glowC}20` }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    className="relative z-10 flex h-full flex-col rounded-[2rem] border border-[#1E293B] bg-[linear-gradient(180deg,rgba(10,15,30,0.56),rgba(17,24,39,0.34))] p-5 backdrop-blur-[3px] md:p-6"
                    initial={{ opacity: 0, x: 32, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -32, scale: 0.98 }}
                    transition={{ duration: 0.42, ease: "easeOut" }}
                  >
                    <div className="max-w-3xl">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#F59E0B]">
                          {activeSlide.eyebrow}
                        </p>
                        <div className="rounded-full border border-[#1E293B] bg-[#111827]/80 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9CA3AF]">
                          slide {currentIndex + 1}/{slides.length}
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-[0.35em]" style={{ color: theme.accentSoft }}>
                        {theme.kicker}
                      </p>
                      <h3 className="font-display mt-4 text-4xl leading-[0.9] text-white md:text-6xl">
                        {activeSlide.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-sm text-[#D6D3D1] md:text-lg">
                        {activeSlide.subtitle}
                      </p>
                    </div>

                    <div className="mt-8 flex-1">
                      {activeSlide.render()}
                    </div>

                    <div className="mt-6">
                      <RecapSoundtrack
                        isAutoplay={isAutoplay}
                        song={activeSlide.soundtrack}
                        accent={theme.accent}
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="rounded-[2rem] border border-[#1E293B] bg-[#111827] p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-[#F59E0B]">
                  Story Chapters
                </p>
                <div className="mt-4 space-y-3">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        index === currentIndex
                          ? "border-[#D4A853]/40 bg-[#D4A853]/10 text-white"
                          : "border-[#1E293B] bg-[#0F172A] text-[#9CA3AF] hover:bg-[#182234]"
                      }`}
                      onClick={() => {
                        setIsAutoplay(false);
                        setCurrentIndex(index);
                      }}
                      type="button"
                    >
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#F59E0B]">
                        Chapter {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold">{slide.navLabel}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#0F172A] px-3 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => {
                      setIsAutoplay(false);
                      setCurrentIndex((index) => Math.max(index - 1, 0));
                    }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#0F172A] px-3 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => {
                      setIsAutoplay(false);
                      setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
                    }}
                    type="button"
                  >
                    Next
                  </button>
                </div>

                {audioMode ? (
                  <div className="mt-5">
                    <EmbeddedTrackPlayer song={activeSlide.soundtrack} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function buildSlides({
  stats,
  timeframeLabel,
  themePack,
  variant,
  genreBreakdown,
  topSong,
  topArtist,
  topArtistSong,
  dominantGenre,
  dominantMood,
  heatmapSummary,
  passportData
}: {
  stats: StatsPayload;
  timeframeLabel: string;
  themePack: RecapThemePack;
  variant: RecapVariant;
  genreBreakdown: GenreBreakdownEntry[];
  topSong: EnrichedHistoryEntry | null;
  topArtist: StatsPayload["topArtists"][number] | null;
  topArtistSong: EnrichedHistoryEntry | null;
  dominantGenre: GenreBreakdownEntry | null;
  dominantMood: MoodTimelineEntry | null;
  heatmapSummary: { day: string; hour: number; count: number };
  passportData: MusicPassportData | null;
}): RecapSlide[] {
  const totalHours = formatHours(stats.totalListeningMinutes);
  const soundtrackPool = stats.topSongs.length ? stats.topSongs : stats.rawEnrichedHistory.slice(0, 5);
  const timeframeKey = getTimeframeKey(timeframeLabel);
  const activeVariant = variant === "auto" ? variantFromTimeframe(timeframeKey) : variant;
  const seasonalFavorites = buildSeasonalFavorites(
    stats.rawEnrichedHistory,
    activeVariant,
    timeframeKey
  );
  const trendSeries = buildTrendSeries(stats.rawEnrichedHistory, activeVariant, timeframeKey);
  const themed = makeThemePalette(themePack);
  const timeframeDescriptor =
    timeframeKey === "30d"
      ? "this month"
      : timeframeKey === "90d"
        ? "this quarter"
      : timeframeKey === "365d"
        ? "this year"
        : "your archive";
  const storyLabel =
    activeVariant === "annual"
      ? "year in sound"
      : activeVariant === "monthly"
        ? "month in motion"
        : "season in color";

  return [
    {
      id: "intro",
      navLabel: "Welcome",
      eyebrow: "Opening / Title Card",
      title: `${timeframeLabel} recap`,
      subtitle: `This ${storyLabel} was built from ${stats.rawEnrichedHistory.length} songs, ${stats.topArtists.length} artists, and the habits behind every replay.`,
      soundtrack: soundtrackPool[0] ?? null,
      palette: themed[0],
      render: () => (
        <div className="grid h-full gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-end">
            <p className="font-display text-6xl font-black leading-[0.9] text-white md:text-8xl">
              {totalHours}
            </p>
            <p className="mt-5 max-w-xl text-lg text-white/72">
              Total listening time. Enough to soundtrack a whole season of your life.
            </p>
          </div>
          <div className="grid gap-4">
            <MetricPill label="Top Artist" value={topArtist?.artist ?? "Unknown"} />
            <MetricPill label="Top Song" value={topSong?.title ?? "Unknown"} />
            <MetricPill label="Peak Window" value={`${heatmapSummary.day} ${heatmapSummary.hour}:00`} />
          </div>
        </div>
      )
    },
    {
      id: "artist",
      navLabel: "Top Artist",
      eyebrow: "Top Artist",
      title: topArtist?.artist ?? "Unknown artist",
      subtitle: `No one shaped ${timeframeDescriptor} more. ${topArtist?.artist ?? "Unknown artist"} led the way with ${topArtist?.playCount ?? 0} plays.`,
      soundtrack: topArtistSong ?? soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette: themed[1],
      render: () => (
        <div className="grid h-full gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            {topArtistSong?.thumbnail ? (
              <img
                src={topArtistSong.thumbnail}
                alt={topArtist?.artist ?? "Top artist"}
                className="h-full max-h-[320px] w-full rounded-[1.5rem] object-cover"
              />
            ) : (
              <div className="h-full min-h-[280px] rounded-[1.5rem] bg-white/10" />
            )}
          </div>
          <div className="flex flex-col justify-center gap-5">
            <div className="flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-white/6 p-4">
              {topArtistSong?.thumbnail ? (
                <img
                  src={topArtistSong.thumbnail}
                  alt={topArtist?.artist ?? "Top artist"}
                  className="h-20 w-20 rounded-[1.3rem] object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-[1.3rem] bg-white/10" />
              )}
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Artist Visual</p>
                <p className="font-display mt-2 text-2xl font-bold text-white">
                  {topArtist?.artist ?? "Unknown"}
                </p>
              </div>
            </div>
            <MetricPill label="Artist Plays" value={`${topArtist?.playCount ?? 0} plays`} />
            <MetricPill label="Signature Track" value={topArtistSong?.title ?? "Unknown"} />
            <MetricPill label="Why It Matters" value="your replay gravity" />
          </div>
        </div>
      )
    },
    {
      id: "artist-web",
      navLabel: "Artist Web",
      eyebrow: "Artist Web / Listening Cluster",
      title: "Your listening formed a constellation",
      subtitle: `The artists in your orbit don't sit alone. This cluster view shows which names carried the most weight across ${timeframeDescriptor}.`,
      soundtrack: topArtistSong ?? soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette: themed[2],
      render: () => <ArtistClusterWeb entries={stats.rawEnrichedHistory} />
    },
    {
      id: "song",
      navLabel: "Top Song",
      eyebrow: "Top Song",
      title: topSong?.title ?? "Your anthem",
      subtitle: `${topSong?.artist ?? "Unknown artist"} became your defining song, stacking up ${topSong?.playCount ?? 0} plays in ${timeframeDescriptor}.`,
      soundtrack: topSong,
      palette: themed[3],
      render: () => (
        <div className="grid h-full gap-6 md:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            {topSong?.thumbnail ? (
              <img
                src={topSong.thumbnail}
                alt={topSong.title}
                className="h-full max-h-[320px] w-full rounded-[1.5rem] object-cover"
              />
            ) : (
              <div className="h-full min-h-[280px] rounded-[1.5rem] bg-white/10" />
            )}
          </div>
          <div className="grid gap-4">
            <MetricPill label="Artist" value={topSong?.artist ?? "Unknown"} />
            <MetricPill label="Play Count" value={`${topSong?.playCount ?? 0} plays`} />
            <MetricPill label="Duration" value={topSong?.duration ?? "PT0S"} />
          </div>
        </div>
      )
    },
    {
      id: "taste",
      navLabel: "Taste",
      eyebrow: "Top Genre / Mood",
      title: `${dominantGenre?.genre ?? "Other"} x ${dominantMood?.mood ?? "Unknown"}`,
      subtitle: `Your musical center of gravity lives at the intersection of ${dominantGenre?.genre ?? "Other"} and ${dominantMood?.mood ?? "Unknown"}.`,
      soundtrack: soundtrackPool[2] ?? soundtrackPool[0] ?? null,
      palette: themed[4],
      render: () => (
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.8rem] border border-white/10 bg-black/18 p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Taste profile</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <p className="text-sm text-white/60">Dominant genre</p>
                <p className="font-display mt-2 text-4xl font-black text-white">{dominantGenre?.genre ?? "Other"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <p className="text-sm text-white/60">Dominant mood</p>
                <p className="font-display mt-2 text-4xl font-black text-white">{dominantMood?.mood ?? "Unknown"}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {genreBreakdownBars(genreBreakdown.slice(0, 4), dominantGenre, stats)}
          </div>
        </div>
      )
    },
    {
      id: "trend",
      navLabel: timeframeKey === "30d" ? "Weekly Trend" : timeframeKey === "90d" ? "Quarterly Trend" : "Trend",
      eyebrow: "Listening Trend",
      title:
        activeVariant === "monthly"
          ? "Your month moved in scenes"
          : activeVariant === "seasonal"
            ? "Your season had a pulse"
            : "Your listening had a shape",
      subtitle:
        timeframeKey === "30d"
          ? "Over the last 30 days, your weekly rhythm moved fast and hit hard."
          : timeframeKey === "90d"
            ? "Across the last 90 days, your listening moved in clear waves."
            : timeframeKey === "365d"
              ? "Across the last year, your habits rose and cooled with the calendar."
              : "Across your archive, your listening built long-term peaks and valleys.",
      soundtrack: soundtrackPool[3] ?? soundtrackPool[0] ?? null,
      palette: themed[5],
      render: () => (
        <MonthlyTrend trend={trendSeries} />
      )
    },
    {
      id: "videos",
      navLabel: "Videos",
      eyebrow: "Top Music Videos",
      title: "The visuals in your rotation",
      subtitle: "These tracks didn't just live in your ears. They owned screen time too.",
      soundtrack: soundtrackPool[4] ?? soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette: themed[6],
      render: () => <VideoMosaic songs={stats.topSongs.slice(0, 4)} />
    },
    {
      id: "seasonal",
      navLabel: timeframeKey === "30d" ? "Moments" : timeframeKey === "90d" ? "Phases" : "Seasons",
      eyebrow: "Seasonal Favorites",
      title:
        timeframeKey === "30d"
          ? "Your month had distinct moments"
          : timeframeKey === "90d"
            ? "Your quarter moved in phases"
            : "Your year changed with the weather",
      subtitle:
        timeframeKey === "30d"
          ? "Even inside a month, different songs owned different moments."
          : timeframeKey === "90d"
            ? "Across the last 90 days, different tracks rose as the energy shifted."
            : "Different songs surfaced as the calendar turned. These are the tracks that defined each season.",
      soundtrack: soundtrackPool[4] ?? soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette: themed[7],
      render: () => <SeasonFavorites favorites={seasonalFavorites} />
    },
    {
      id: "deepdive",
      navLabel: "Summary",
      eyebrow: "Deep Dive / Final Summary",
      title: `${stats.totalListeningMinutes.toFixed(0)} minutes`,
      subtitle: `Underneath the highlights, your summary points to ${stats.rawEnrichedHistory.length} unique songs, a ${heatmapSummary.day} peak window, and a ${getLongestStreakLabel(stats.rawEnrichedHistory)} streak.`,
      soundtrack: soundtrackPool[0] ?? null,
      palette: themed[8],
      render: () => (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricPill label="Total Minutes" value={`${stats.totalListeningMinutes.toFixed(0)}`} />
          <MetricPill label="Unique Songs" value={`${stats.rawEnrichedHistory.length}`} />
          <MetricPill label="Peak Window" value={`${heatmapSummary.day} ${heatmapSummary.hour}:00`} />
          <MetricPill label="Top Artist" value={topArtist?.artist ?? "Unknown"} />
        </div>
      )
    },
    {
      id: "share",
      navLabel: "Passport",
      eyebrow: "Shareable Card",
      title: "Share your passport",
      subtitle: "Your recap ends with a poster-style identity card you can export or send anywhere.",
      soundtrack: soundtrackPool[0] ?? null,
      palette: themed[0],
      render: () => (
        <div className="flex h-full items-center justify-center overflow-x-auto">
          {passportData ? <MusicPassportCard data={passportData} /> : <div />}
        </div>
      )
    }
  ];
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B]">{label}</p>
      <p className="font-display mt-3 text-2xl font-bold text-white md:text-3xl">{value}</p>
    </div>
  );
}

function MonthlyTrend({
  trend
}: {
  trend: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(...trend.map((entry) => entry.count), 1);

  return (
    <div className="grid gap-4">
      {trend.map((entry, index) => (
        <div key={entry.label} className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A]/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-bold text-white">{entry.label}</p>
            <p className="text-sm text-[#9CA3AF]">{entry.count} plays</p>
          </div>
          <div className="mt-3 h-3 rounded-full bg-[#1E293B]">
            <div
              className="h-3 rounded-full bg-[linear-gradient(90deg,#D4A853_0%,#F0D080_54%,#C46B7B_100%)]"
              style={{ width: `${(entry.count / max) * 100}%`, opacity: 1 - index * 0.08 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoMosaic({ songs }: { songs: EnrichedHistoryEntry[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {songs.map((song, index) => (
        <div
          key={song.videoId}
          className={`overflow-hidden rounded-[1.8rem] border border-[#1E293B] bg-[#0F172A]/80 ${
            index === 0 ? "md:row-span-2" : ""
          }`}
        >
          {song.thumbnail ? (
            <img
              src={song.thumbnail}
              alt={song.title}
              className={`w-full object-cover ${index === 0 ? "h-[360px]" : "h-[172px]"}`}
            />
          ) : (
            <div className={`${index === 0 ? "h-[360px]" : "h-[172px]"} bg-[#1E293B]`} />
          )}
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#F59E0B]">
              Music video #{index + 1}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{song.title}</p>
            <p className="mt-1 text-sm text-[#9CA3AF]">{song.artist}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SeasonFavorites({
  favorites
}: {
  favorites: Array<{ season: string; song: EnrichedHistoryEntry | null }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {favorites.map(({ season, song }) => (
        <div key={season} className="rounded-[1.7rem] border border-[#1E293B] bg-[#0F172A]/80 p-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#F59E0B]">{season}</p>
          <div className="mt-3 flex items-center gap-4">
            {song?.thumbnail ? (
              <img
                src={song.thumbnail}
                alt={song.title}
                className="h-24 w-24 rounded-[1.2rem] object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-[1.2rem] bg-[#1E293B]" />
            )}
            <div className="min-w-0">
              <p className="font-display truncate text-2xl font-bold text-white">
                {song?.title ?? "No standout track"}
              </p>
              <p className="truncate text-sm text-[#9CA3AF]">{song?.artist ?? "Unknown"}</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                {song ? `${song.playCount} plays` : "Not enough listening data"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecapSoundtrack({
  isAutoplay,
  song,
  accent
}: {
  isAutoplay: boolean;
  song: EnrichedHistoryEntry | null;
  accent: string;
}) {
  if (!song) {
    return null;
  }

  const youtubeMusicUrl = `https://music.youtube.com/watch?v=${song.videoId}`;

  return (
    <div className="flex flex-col gap-3 rounded-[1.7rem] border border-[#1E293B] bg-[#0F172A]/85 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        {song.thumbnail ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-[#1E293B]" />
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#F59E0B]">
            Story soundtrack
          </p>
          <p className="mt-2 truncate text-lg font-semibold text-white">{song.title}</p>
          <p className="truncate text-sm text-[#9CA3AF]">{song.artist}</p>
          <div className="mt-3 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-[#1E293B]">
            <motion.div
              key={`${song.videoId}-${isAutoplay ? "auto" : "manual"}`}
              className="h-full rounded-full"
              initial={{ width: "12%" }}
              animate={{ width: isAutoplay ? "100%" : "42%" }}
              transition={{
                duration: isAutoplay ? 9.5 : 0.45,
                ease: "linear"
              }}
              style={{ background: `linear-gradient(90deg, ${accent} 0%, #F0D080 56%, #C46B7B 100%)` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full border border-[#1E293B] bg-[#111827] px-3 py-2 text-sm text-[#9CA3AF]">
          {song.playCount} plays
        </div>
        <a
          className="rounded-full bg-[#D4A853] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#F0D080]"
          href={youtubeMusicUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open track
        </a>
      </div>
    </div>
  );
}

function EmbeddedTrackPlayer({
  song
}: {
  song: EnrichedHistoryEntry | null;
}) {
  if (!song) {
    return null;
  }

  const embedUrl = `https://www.youtube.com/embed/${song.videoId}?autoplay=1&rel=0`;

  return (
    <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#F59E0B]">
        Embedded player
      </p>
      <div className="mt-3 overflow-hidden rounded-[1.2rem] border border-[#1E293B] bg-black">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={`Play ${song.title}`}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#9CA3AF]">
        Browser autoplay rules may still require one click before audio starts.
      </p>
    </div>
  );
}

function genreBreakdownBars(
  entries: GenreBreakdownEntry[],
  dominantGenre: GenreBreakdownEntry | null,
  stats: StatsPayload
) {
  const fallback = dominantGenre
    ? [dominantGenre]
    : stats.rawEnrichedHistory.length
      ? [{ genre: "Other", count: stats.rawEnrichedHistory.length, percentage: 100 }]
      : [];
  const rows = entries.length ? entries : fallback;
  const max = Math.max(...rows.map((entry) => entry.count), 1);

  return rows.map((entry) => (
    <div key={entry.genre} className="rounded-[1.6rem] border border-[#1E293B] bg-[#0F172A]/80 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-white">{entry.genre}</p>
          <p className="mt-1 text-sm text-[#9CA3AF]">{entry.percentage}% of weighted plays</p>
        </div>
        <p className="text-sm text-[#9CA3AF]">{entry.count} plays</p>
      </div>
      <div className="mt-4 h-3 rounded-full bg-[#1E293B]">
        <div
          className="h-3 rounded-full bg-[linear-gradient(90deg,#D4A853_0%,#F0D080_56%,#C46B7B_100%)]"
          style={{ width: `${(entry.count / max) * 100}%` }}
        />
      </div>
    </div>
  ));
}

function buildPeakListeningSummary(entries: EnrichedHistoryEntry[]) {
  const { matrix } = buildHeatmapData(entries);
  let peak = { day: "Sun", hour: 0, count: 0 };

  matrix.forEach((day) => {
    day.hours.forEach((hourEntry) => {
      if (hourEntry.count > peak.count) {
        peak = { day: day.day, hour: hourEntry.hour, count: hourEntry.count };
      }
    });
  });

  return peak;
}

function buildTrendSeries(
  entries: EnrichedHistoryEntry[],
  variant: "annual" | "monthly" | "seasonal",
  timeframeKey: "all" | "30d" | "90d" | "365d"
) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const label =
        variant === "monthly"
          ? `W${Math.max(1, Math.ceil(date.getDate() / 7))}`
          : timeframeKey === "90d"
            ? date.toLocaleString(undefined, { month: "short" })
            : variant === "seasonal"
              ? getSeason(date)
              : date.toLocaleString(undefined, { month: "short" });
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(0, 6);
}

function buildSeasonalFavorites(
  entries: EnrichedHistoryEntry[],
  variant: "annual" | "monthly" | "seasonal",
  timeframeKey: "all" | "30d" | "90d" | "365d"
) {
  const buckets =
    variant === "monthly"
      ? (["Early", "Mid", "Late"] as const)
      : timeframeKey === "90d"
        ? (["Phase 1", "Phase 2", "Phase 3"] as const)
        : (["Winter", "Spring", "Summer", "Fall"] as const);

  const totals: Record<string, Map<string, number>> = Object.fromEntries(
    buckets.map((bucket) => [bucket, new Map()])
  ) as Record<string, Map<string, number>>;

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const bucket = getTimeBucket(date, variant, timeframeKey);
      totals[bucket].set(entry.videoId, (totals[bucket].get(entry.videoId) ?? 0) + 1);
    });
  });

  return buckets.map((season) => {
    const winner = Array.from(totals[season].entries()).sort((left, right) => right[1] - left[1])[0];
    return {
      season,
      song: winner ? entries.find((entry) => entry.videoId === winner[0]) ?? null : null
    };
  });
}

function getSeason(date: Date) {
  const month = date.getMonth();
  if (month === 11 || month <= 1) {
    return "Winter";
  }
  if (month <= 4) {
    return "Spring";
  }
  if (month <= 7) {
    return "Summer";
  }
  return "Fall";
}

function variantFromTimeframe(timeframeKey: "all" | "30d" | "90d" | "365d"): "annual" | "monthly" | "seasonal" {
  if (timeframeKey === "30d") {
    return "monthly";
  }
  if (timeframeKey === "365d" || timeframeKey === "all") {
    return "annual";
  }
  return "seasonal";
}

function makeThemePalette(themePack: RecapThemePack) {
  if (themePack === "violet-dusk") {
    return [
      "bg-[radial-gradient(circle_at_top_left,rgba(192,132,252,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.16),transparent_28%),linear-gradient(135deg,#0E1024_0%,#2C1456_42%,#4A1D52_100%)]",
      "bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.18),transparent_26%),linear-gradient(135deg,#14112B_0%,#33135D_52%,#5B2050_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_26%),linear-gradient(140deg,#120F22_0%,#341A5C_56%,#1B1A3A_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(192,132,252,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_22%),linear-gradient(140deg,#121629_0%,#3A1A4A_58%,#512544_100%)]",
      "bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.2),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%),linear-gradient(135deg,#151027_0%,#3A195F_55%,#201A3D_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_22%),linear-gradient(135deg,#0F1329_0%,#31184F_58%,#4C1F4B_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.18),transparent_22%),linear-gradient(135deg,#10162A_0%,#30184A_58%,#4F2247_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.16),transparent_22%),linear-gradient(135deg,#0D1122_0%,#2A1649_45%,#4A1F48_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(192,132,252,0.16),transparent_22%),linear-gradient(135deg,#0D1122_0%,#2A1649_45%,#4A1F48_100%)]"
    ] as const;
  }

  if (themePack === "teal-afterglow") {
    return [
      "bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(212,168,83,0.14),transparent_28%),linear-gradient(135deg,#08111A_0%,#123843_42%,#1D2A3D_100%)]",
      "bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,118,110,0.18),transparent_26%),linear-gradient(135deg,#0A1522_0%,#10424A_52%,#20324A_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_26%),linear-gradient(140deg,#09131D_0%,#123A4A_56%,#152536_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(212,168,83,0.1),transparent_22%),linear-gradient(140deg,#0C1623_0%,#143840_58%,#1F3245_100%)]",
      "bg-[radial-gradient(circle_at_bottom_left,rgba(94,234,212,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(212,168,83,0.16),transparent_24%),linear-gradient(135deg,#0A1723_0%,#133F47_55%,#172738_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_22%),linear-gradient(135deg,#0A1620_0%,#11333F_58%,#233046_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(212,168,83,0.16),transparent_22%),linear-gradient(135deg,#0A1520_0%,#10313A_58%,#233046_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(212,168,83,0.14),transparent_22%),linear-gradient(135deg,#08111A_0%,#14313E_45%,#223249_100%)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.16),transparent_22%),linear-gradient(135deg,#08111A_0%,#14313E_45%,#223249_100%)]"
    ] as const;
  }

  return [
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(124,58,90,0.18),transparent_28%),linear-gradient(135deg,#0A0F1E_0%,#231536_42%,#4A2741_100%)]",
    "bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(124,58,90,0.18),transparent_26%),linear-gradient(135deg,#10162A_0%,#2B1B41_52%,#4B263D_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(240,208,128,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(142,94,162,0.18),transparent_26%),linear-gradient(140deg,#120F22_0%,#2A1A41_56%,#121C31_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_22%),linear-gradient(140deg,#0D1327_0%,#29193F_58%,#4A273B_100%)]",
    "bg-[radial-gradient(circle_at_bottom_left,rgba(196,107,123,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(212,168,83,0.18),transparent_24%),linear-gradient(135deg,#151027_0%,#2A1A41_55%,#0F172A_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(196,107,123,0.18),transparent_22%),linear-gradient(135deg,#0B1120_0%,#221739_58%,#4A2741_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(196,107,123,0.18),transparent_22%),linear-gradient(135deg,#0B1120_0%,#221739_58%,#4A2741_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(124,58,90,0.18),transparent_22%),linear-gradient(135deg,#0A0F1E_0%,#221739_45%,#4A2741_100%)]",
    "bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(124,58,90,0.18),transparent_22%),linear-gradient(135deg,#0A0F1E_0%,#221739_45%,#4A2741_100%)]"
  ] as const;
}

function getTimeBucket(
  date: Date,
  variant: "annual" | "monthly" | "seasonal",
  timeframeKey: "all" | "30d" | "90d" | "365d"
) {
  if (variant === "monthly") {
    if (date.getDate() <= 10) {
      return "Early";
    }
    if (date.getDate() <= 20) {
      return "Mid";
    }
    return "Late";
  }

  if (timeframeKey === "90d") {
    const month = date.getMonth();
    return month % 3 === 0 ? "Phase 1" : month % 3 === 1 ? "Phase 2" : "Phase 3";
  }

  return getSeason(date);
}

function getTimeframeKey(label: string): "all" | "30d" | "90d" | "365d" {
  if (label.includes("30")) {
    return "30d";
  }
  if (label.includes("90")) {
    return "90d";
  }
  if (label.includes("year")) {
    return "365d";
  }
  return "all";
}

function getLongestStreakLabel(entries: EnrichedHistoryEntry[]) {
  return `${getLongestListeningStreak(entries)} days`;
}
