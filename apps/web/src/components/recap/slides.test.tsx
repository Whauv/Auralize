import { describe, expect, it } from "vitest";

import { buildRecapSlides } from "./slides";
import type { EnrichedHistoryEntry, StatsPayload } from "../../lib/types";

const recapHistory: EnrichedHistoryEntry[] = [
  {
    videoId: "track-1",
    title: "Skyline",
    artist: "Artist One",
    thumbnail: null,
    duration: "PT3M0S",
    tags: ["pop"],
    playCount: 4,
    timestamps: [
      "2026-04-03T10:00:00Z",
      "2026-03-12T12:00:00Z",
      "2026-02-14T14:00:00Z",
      "2025-08-10T16:00:00Z",
    ],
    source: "YouTube Music",
  },
  {
    videoId: "track-2",
    title: "Afterglow",
    artist: "Artist Two",
    thumbnail: null,
    duration: "PT2M30S",
    tags: ["indie"],
    playCount: 2,
    timestamps: ["2026-04-01T09:00:00Z", "2026-01-18T13:00:00Z"],
    source: "YouTube Music",
  },
];

const stats: StatsPayload = {
  topSongs: recapHistory,
  topArtists: [
    { artist: "Artist One", playCount: 4 },
    { artist: "Artist Two", playCount: 2 },
  ],
  totalListeningMinutes: 22.5,
  rawEnrichedHistory: recapHistory,
};

describe("recap slides timeframe mapping", () => {
  it.each([
    {
      label: "Last 30 days",
      expectedTrendNav: "Weekly Trend",
      expectedSeasonalNav: "Moments",
      expectedTrendTitle: "Your month moved in scenes",
    },
    {
      label: "Last 90 days",
      expectedTrendNav: "Quarterly Trend",
      expectedSeasonalNav: "Phases",
      expectedTrendTitle: "Your season had a pulse",
    },
    {
      label: "Last year",
      expectedTrendNav: "Trend",
      expectedSeasonalNav: "Seasons",
      expectedTrendTitle: "Your listening had a shape",
    },
    {
      label: "All time",
      expectedTrendNav: "Trend",
      expectedSeasonalNav: "Seasons",
      expectedTrendTitle: "Your listening had a shape",
    },
  ])(
    "builds timeframe-aware recap chapters for $label",
    ({ label, expectedTrendNav, expectedSeasonalNav, expectedTrendTitle }) => {
      const slides = buildRecapSlides({
        stats,
        timeframeLabel: label,
        themePack: "gold-noir",
        variant: "auto",
        genreBreakdown: [{ genre: "Pop", count: 4, percentage: 66.67 }],
        topSong: recapHistory[0],
        topArtist: stats.topArtists[0],
        topArtistSong: recapHistory[0],
        dominantGenre: { genre: "Pop", count: 4, percentage: 66.67 },
        dominantMood: { mood: "Focused", playCount: 3 },
        heatmapSummary: { day: "Mon", hour: 10, count: 2 },
        passportData: null,
      });

      const intro = slides.find((slide) => slide.id === "intro");
      const trend = slides.find((slide) => slide.id === "trend");
      const seasonal = slides.find((slide) => slide.id === "seasonal");

      expect(intro?.title).toBe(`${label} recap`);
      expect(trend?.navLabel).toBe(expectedTrendNav);
      expect(trend?.title).toBe(expectedTrendTitle);
      expect(seasonal?.navLabel).toBe(expectedSeasonalNav);
    },
  );
});
