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

    const filtered = filterHistoryByTimeframe(baseEntries, "30d");
    expect(filtered).toHaveLength(2);
    expect(filtered[0].playCount).toBeGreaterThanOrEqual(1);
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
