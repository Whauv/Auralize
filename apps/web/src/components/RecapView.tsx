import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  GenreBreakdownEntry,
  MoodTimelineEntry,
  RecapThemePack,
  RecapVariant,
  StatsPayload
} from "../lib/types";
import type { MusicPassportData } from "./MusicPassportCard";
import { buildRecapSlides } from "./recap/slides";
import {
  buildPeakListeningSummary,
  EmbeddedTrackPlayer,
  RecapSoundtrack,
  RECAP_THEME_PACKS
} from "./recap/shared";


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
  const slides = buildRecapSlides({
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

