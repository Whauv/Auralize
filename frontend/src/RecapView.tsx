import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  StatsPayload
} from "./types";
import { HEATMAP_HOURS, buildHeatmapData, formatHours } from "./utils";
import { MusicPassportCard, type MusicPassportData } from "./MusicPassportCard";

type RecapSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  palette: string;
  soundtrack: EnrichedHistoryEntry | null;
  render: () => React.ReactElement;
};

export function RecapView({
  isOpen,
  onClose,
  stats,
  genreBreakdown,
  moodTimeline,
  passportData
}: {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  passportData: MusicPassportData | null;
}) {
  const topSong = stats.topSongs[0] ?? null;
  const topArtist = stats.topArtists[0] ?? null;
  const dominantGenre = genreBreakdown[0] ?? null;
  const dominantMood = moodTimeline[0] ?? null;
  const heatmapSummary = buildPeakListeningSummary(stats.rawEnrichedHistory);
  const slides = buildSlides({
    stats,
    genreBreakdown,
    moodTimeline,
    topSong,
    topArtist,
    dominantGenre,
    dominantMood,
    heatmapSummary,
    passportData
  });

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isAutoplay, setIsAutoplay] = React.useState(true);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCurrentIndex(0);
    setIsAutoplay(true);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !isAutoplay) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1 >= slides.length ? 0 : index + 1));
    }, 4200);

    return () => window.clearInterval(timer);
  }, [isAutoplay, isOpen, slides.length]);

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
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                  Auralize Recap
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                  Your listening story, on demand.
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => setIsAutoplay((value) => !value)}
                  type="button"
                >
                  {isAutoplay ? "Pause autoplay" : "Resume autoplay"}
                </button>
                <button
                  className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
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
                      ? "bg-gradient-to-r from-cyan-300 to-rose-300"
                      : "bg-white/10"
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
              <div className={`relative min-h-[640px] overflow-hidden rounded-[2.25rem] border border-white/10 ${activeSlide.palette} p-6 shadow-[0_35px_140px_rgba(2,6,23,0.42)] md:p-8`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    className="flex h-full flex-col"
                    initial={{ opacity: 0, x: 32, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -32, scale: 0.98 }}
                    transition={{ duration: 0.42, ease: "easeOut" }}
                  >
                    <div className="max-w-3xl">
                      <p className="text-xs uppercase tracking-[0.35em] text-white/65">
                        {activeSlide.eyebrow}
                      </p>
                      <h3 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
                        {activeSlide.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-sm text-white/72 md:text-lg">
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
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,31,0.88),rgba(13,20,38,0.78))] p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                  Slide Index
                </p>
                <div className="mt-4 space-y-3">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        index === currentIndex
                          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                          : "border-white/8 bg-white/5 text-slate-300 hover:bg-white/8"
                      }`}
                      onClick={() => {
                        setIsAutoplay(false);
                        setCurrentIndex(index);
                      }}
                      type="button"
                    >
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                        Slide {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold">{slide.title}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => {
                      setIsAutoplay(false);
                      setCurrentIndex((index) => Math.max(index - 1, 0));
                    }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => {
                      setIsAutoplay(false);
                      setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
                    }}
                    type="button"
                  >
                    Next
                  </button>
                </div>

                <div className="mt-5">
                  <EmbeddedTrackPlayer song={activeSlide.soundtrack} />
                </div>
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
  genreBreakdown,
  moodTimeline,
  topSong,
  topArtist,
  dominantGenre,
  dominantMood,
  heatmapSummary,
  passportData
}: {
  stats: StatsPayload;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  topSong: EnrichedHistoryEntry | null;
  topArtist: StatsPayload["topArtists"][number] | null;
  dominantGenre: GenreBreakdownEntry | null;
  dominantMood: MoodTimelineEntry | null;
  heatmapSummary: { day: string; hour: number; count: number };
  passportData: MusicPassportData | null;
}): RecapSlide[] {
  const totalHours = formatHours(stats.totalListeningMinutes);
  const soundtrackPool = stats.topSongs.length ? stats.topSongs : stats.rawEnrichedHistory.slice(0, 5);

  return [
    {
      id: "intro",
      eyebrow: "Opening Frame",
      title: totalHours,
      subtitle: `Across ${stats.rawEnrichedHistory.length} songs and ${stats.topArtists.length} standout artists, your listening session tells a bigger story than a chart ever could.`,
      soundtrack: soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(251,113,133,0.18),transparent_28%),linear-gradient(135deg,#04111f_0%,#0d1b33_42%,#1f1235_100%)]",
      render: () => (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricPill label="Total Hours" value={totalHours} />
          <MetricPill label="Top Artist" value={topArtist?.artist ?? "Unknown"} />
          <MetricPill label="Top Song" value={topSong?.title ?? "Unknown"} />
        </div>
      )
    },
    {
      id: "song",
      eyebrow: "Most Replayed",
      title: topSong?.title ?? "Your anthem",
      subtitle: `${topSong?.artist ?? "Unknown artist"} became the song you kept coming back to, with ${topSong?.playCount ?? 0} plays anchoring your listening identity.`,
      soundtrack: topSong,
      palette:
        "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.24),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(251,113,133,0.16),transparent_26%),linear-gradient(135deg,#091120_0%,#11233d_52%,#24112b_100%)]",
      render: () => (
        <div className="grid h-full gap-6 md:grid-cols-[0.9fr_1.1fr]">
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
          <div className="flex flex-col justify-center gap-5">
            <MetricPill label="Artist" value={topSong?.artist ?? "Unknown"} />
            <MetricPill label="Play Count" value={`${topSong?.playCount ?? 0} plays`} />
            <MetricPill label="Duration" value={topSong?.duration ?? "PT0S"} />
          </div>
        </div>
      )
    },
    {
      id: "artists",
      eyebrow: "Artist Orbit",
      title: "The names shaping your year",
      subtitle: "These are the artists your listening kept circling back to most often.",
      soundtrack: soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_26%),linear-gradient(140deg,#120d1f_0%,#17243d_56%,#09131d_100%)]",
      render: () => (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.topArtists.slice(0, 6).map((artist, index) => (
            <div
              key={artist.artist}
              className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                Rank #{index + 1}
              </p>
              <p className="mt-2 text-xl font-bold text-white">{artist.artist}</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-rose-300"
                  style={{
                    width: `${(artist.playCount / Math.max(stats.topArtists[0]?.playCount ?? 1, 1)) * 100}%`
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-white/70">{artist.playCount} plays</p>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "genre",
      eyebrow: "Genre DNA",
      title: dominantGenre?.genre ?? "Other",
      subtitle: `Your listening leans most toward ${dominantGenre?.genre ?? "Other"}, with a fingerprint shaped by your top five genre clusters.`,
      soundtrack: soundtrackPool[2] ?? soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_22%),linear-gradient(140deg,#06111f_0%,#102742_58%,#251236_100%)]",
      render: () => (
        <div className="space-y-4">
          {genreBreakdownBars(genreBreakdown.slice(0, 5), dominantGenre, stats)}
        </div>
      )
    },
    {
      id: "mood",
      eyebrow: "Mood Readout",
      title: dominantMood?.mood ?? "Unknown",
      subtitle: `When your timestamps stack up, your strongest listening energy feels most like ${dominantMood?.mood ?? "Unknown"}.`,
      soundtrack: soundtrackPool[3] ?? soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_bottom_left,rgba(251,113,133,0.2),transparent_24%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_24%),linear-gradient(135deg,#151026_0%,#17243f_55%,#09111b_100%)]",
      render: () => (
        <div className="grid gap-4 md:grid-cols-2">
          {moodTimeline.map((entry) => (
            <div
              key={entry.mood}
              className="rounded-[1.7rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm"
            >
              <p className="text-sm uppercase tracking-[0.3em] text-white/45">{entry.mood}</p>
              <p className="mt-3 text-4xl font-black text-white">{entry.playCount}</p>
              <p className="mt-2 text-sm text-white/65">plays landed in this energy zone</p>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "heatmap",
      eyebrow: "Peak Window",
      title: `${heatmapSummary.day} at ${heatmapSummary.hour}:00`,
      subtitle: `That was your hottest listening pocket, with ${heatmapSummary.count} plays clustered into a single hour. Your habits have a shape, and this is where they glow brightest.`,
      soundtrack: soundtrackPool[4] ?? soundtrackPool[1] ?? soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(251,113,133,0.18),transparent_22%),linear-gradient(135deg,#07111f_0%,#111f36_58%,#1f132f_100%)]",
      render: () => <RecapHeatmap entries={stats.rawEnrichedHistory} />
    },
    {
      id: "finale",
      eyebrow: "Final Card",
      title: "This is your music passport.",
      subtitle: "A compact identity snapshot you can export, share, and come back to whenever you want the story in one frame.",
      soundtrack: soundtrackPool[0] ?? null,
      palette:
        "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_22%),linear-gradient(135deg,#08101c_0%,#13253e_45%,#211433_100%)]",
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
    <div className="rounded-[1.6rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white md:text-3xl">{value}</p>
    </div>
  );
}

function RecapSoundtrack({
  isAutoplay,
  song
}: {
  isAutoplay: boolean;
  song: EnrichedHistoryEntry | null;
}) {
  if (!song) {
    return null;
  }

  const youtubeMusicUrl = `https://music.youtube.com/watch?v=${song.videoId}`;

  return (
    <div className="flex flex-col gap-3 rounded-[1.7rem] border border-white/10 bg-black/25 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        {song.thumbnail ? (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-white/10" />
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
            Recap soundtrack
          </p>
          <p className="mt-2 truncate text-lg font-semibold text-white">{song.title}</p>
          <p className="truncate text-sm text-white/65">{song.artist}</p>
          <div className="mt-3 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-white/10">
            <motion.div
              key={`${song.videoId}-${isAutoplay ? "auto" : "manual"}`}
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-rose-300"
              initial={{ width: "12%" }}
              animate={{ width: isAutoplay ? "100%" : "42%" }}
              transition={{
                duration: isAutoplay ? 4 : 0.45,
                ease: "linear"
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
          {song.playCount} plays
        </div>
        <a
          className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
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
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
        Embedded player
      </p>
      <div className="mt-3 overflow-hidden rounded-[1.2rem] border border-white/8 bg-black">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={`Play ${song.title}`}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/55">
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
    <div key={entry.genre} className="rounded-[1.6rem] border border-white/10 bg-black/18 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-white">{entry.genre}</p>
          <p className="mt-1 text-sm text-white/65">{entry.percentage}% of weighted plays</p>
        </div>
        <p className="text-sm text-white/70">{entry.count} plays</p>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/10">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
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

function RecapHeatmap({ entries }: { entries: EnrichedHistoryEntry[] }) {
  const { matrix, maxCount } = buildHeatmapData(entries);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        <div className="mb-3 grid grid-cols-[72px_repeat(24,minmax(0,1fr))] gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
          <div />
          {HEATMAP_HOURS.map((hour) => (
            <div key={hour} className="text-center">
              {hour}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {matrix.map((day) => (
            <div key={day.day} className="grid grid-cols-[72px_repeat(24,minmax(0,1fr))] gap-1.5">
              <div className="flex items-center text-sm font-semibold text-white/75">{day.day}</div>
              {day.hours.map((hourEntry) => {
                const intensity = maxCount === 0 ? 0 : hourEntry.count / maxCount;
                const background =
                  intensity === 0
                    ? "rgba(255,255,255,0.06)"
                    : intensity < 0.25
                      ? "rgba(45,212,191,0.28)"
                      : intensity < 0.5
                        ? "rgba(56,189,248,0.42)"
                        : intensity < 0.75
                          ? "rgba(251,146,60,0.62)"
                          : "rgba(251,113,133,0.9)";

                return (
                  <div
                    key={`${day.day}-${hourEntry.hour}`}
                    className="h-7 rounded-md border border-white/5"
                    style={{ backgroundColor: background }}
                    title={`${day.day} ${hourEntry.hour}:00 - ${hourEntry.count} plays`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
