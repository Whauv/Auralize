import { motion } from "framer-motion";

import type {
  EnrichedHistoryEntry,
  RecapThemePack,
} from "../../lib/types";
import { buildHeatmapData } from "../../lib/utils";

export const RECAP_THEME_PACKS: Record<
  RecapThemePack,
  {
    accent: string;
    accentSoft: string;
    glowA: string;
    glowB: string;
    glowC: string;
    kicker: string;
  }
> = {
  "gold-noir": {
    accent: "#D4A853",
    accentSoft: "#F0D080",
    glowA: "#D4A853",
    glowB: "#7C3A5A",
    glowC: "#3B1F5E",
    kicker: "Gold noir theme",
  },
  "violet-dusk": {
    accent: "#C084FC",
    accentSoft: "#E9D5FF",
    glowA: "#7C3AED",
    glowB: "#C026D3",
    glowC: "#F59E0B",
    kicker: "Violet dusk theme",
  },
  "teal-afterglow": {
    accent: "#5EEAD4",
    accentSoft: "#CCFBF1",
    glowA: "#14B8A6",
    glowB: "#0F766E",
    glowC: "#D4A853",
    kicker: "Teal afterglow theme",
  },
};

export function buildPeakListeningSummary(entries: EnrichedHistoryEntry[]) {
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

export function RecapSoundtrack({
  isAutoplay,
  song,
  accent,
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
    <div className="flex min-w-0 flex-col gap-3 rounded-[1.7rem] border border-[#1E293B] bg-[#0F172A]/85 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {song.thumbnail ? (
          <img
            alt={song.title}
            className="h-16 w-16 rounded-2xl object-cover"
            src={song.thumbnail}
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
              animate={{ width: isAutoplay ? "100%" : "42%" }}
              className="h-full rounded-full"
              initial={{ width: "12%" }}
              key={`${song.videoId}-${isAutoplay ? "auto" : "manual"}`}
              style={{
                background: `linear-gradient(90deg, ${accent} 0%, #F0D080 56%, #C46B7B 100%)`,
              }}
              transition={{
                duration: isAutoplay ? 9.5 : 0.45,
                ease: "linear",
              }}
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

export function EmbeddedTrackPlayer({
  song,
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
