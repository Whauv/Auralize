import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGenreBreakdownFromHistory,
  buildMoodTimelineFromHistory,
  buildPassportData,
  buildPlaylistBundles,
  buildStatsPayloadFromHistory,
  filterHistoryByTimeframe,
} from "./analytics";

const baseEntries = [
  {
    videoId: "one",
    title: "Night Drive",
    artist: "Artist One",
    thumbnail: null,
    duration: "PT3M0S",
    tags: ["lofi"],
    playCount: 2,
    timestamps: ["2026-03-30T03:00:00Z", "2026-04-01T04:00:00Z"],
  },
  {
    videoId: "two",
    title: "Day Spark",
    artist: "Artist Two",
    thumbnail: null,
    duration: "PT2M30S",
    tags: ["pop"],
    playCount: 1,
    timestamps: ["2026-04-02T14:00:00Z"],
  },
];

const timeframeEntries = [
  {
    videoId: "recent",
    title: "Recent Pulse",
    artist: "Artist Recent",
    thumbnail: null,
    duration: "PT3M0S",
    tags: ["pop"],
    playCount: 4,
    timestamps: [
      "2026-04-04T03:00:00Z",
      "2026-03-10T04:00:00Z",
      "2026-01-10T14:00:00Z",
      "2025-05-01T08:00:00Z",
    ],
  },
  {
    videoId: "old",
    title: "Old Echo",
    artist: "Artist Old",
    thumbnail: null,
    duration: "PT2M0S",
    tags: ["rock"],
    playCount: 1,
    timestamps: ["2024-01-01T12:00:00Z"],
  },
];

describe("analytics helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds stats payloads from enriched history", () => {
    const stats = buildStatsPayloadFromHistory(baseEntries);

    expect(stats.topSongs).toHaveLength(2);
    expect(stats.topArtists[0]).toEqual({ artist: "Artist One", playCount: 2 });
    expect(stats.totalListeningMinutes).toBe(8.5);
  });

  it("builds aligned genre and mood summaries", () => {
    const genreBreakdown = buildGenreBreakdownFromHistory(baseEntries);
    const moodTimeline = buildMoodTimelineFromHistory(baseEntries);

    expect(genreBreakdown[0].genre).toBe("Lo-fi");
    expect(moodTimeline.reduce((sum, entry) => sum + entry.playCount, 0)).toBe(3);
  });

  it("filters history by timeframe and recomputes play counts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));

    const last30Days = filterHistoryByTimeframe(timeframeEntries, "30d");
    const last90Days = filterHistoryByTimeframe(timeframeEntries, "90d");
    const lastYear = filterHistoryByTimeframe(timeframeEntries, "365d");
    const allTime = filterHistoryByTimeframe(timeframeEntries, "all");

    expect(last30Days).toHaveLength(1);
    expect(last30Days[0].videoId).toBe("recent");
    expect(last30Days[0].playCount).toBe(2);

    expect(last90Days).toHaveLength(1);
    expect(last90Days[0].videoId).toBe("recent");
    expect(last90Days[0].playCount).toBe(3);

    expect(lastYear).toHaveLength(1);
    expect(lastYear[0].videoId).toBe("recent");
    expect(lastYear[0].playCount).toBe(4);

    expect(allTime).toHaveLength(2);
    expect(allTime[0].videoId).toBe("recent");
    expect(allTime[1].videoId).toBe("old");
  });

  it("keeps recap/chart/stat builders aligned for every timeframe window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));

    const windows = ["30d", "90d", "365d", "all"] as const;
    for (const window of windows) {
      const filtered = filterHistoryByTimeframe(timeframeEntries, window);
      const stats = buildStatsPayloadFromHistory(filtered);
      const genre = buildGenreBreakdownFromHistory(filtered);
      const mood = buildMoodTimelineFromHistory(filtered);
      const passport = buildPassportData(stats, genre, mood);

      expect(stats.rawEnrichedHistory).toEqual(filtered);
      expect(stats.topSongs.length).toBeLessThanOrEqual(10);
      expect(genre.length).toBeGreaterThan(0);
      expect(passport.topArtist.name.length).toBeGreaterThan(0);
      if (window === "all") {
        expect(stats.rawEnrichedHistory.some((entry) => entry.videoId === "old")).toBe(true);
      } else {
        expect(stats.rawEnrichedHistory.some((entry) => entry.videoId === "old")).toBe(false);
      }
    }
  });

  it("builds passport and playlist views from shared stats", () => {
    const stats = buildStatsPayloadFromHistory(baseEntries);
    const genreBreakdown = buildGenreBreakdownFromHistory(baseEntries);
    const moodTimeline = buildMoodTimelineFromHistory(baseEntries);
    const passport = buildPassportData(stats, genreBreakdown, moodTimeline);
    const playlists = buildPlaylistBundles(stats.rawEnrichedHistory, moodTimeline);

    expect(passport.topArtist.name).toBe("Artist One");
    expect(passport.topSongs).toHaveLength(2);
    expect(playlists[0].tracks[0].url).toContain("music.youtube.com/watch?v=");
  });
});
