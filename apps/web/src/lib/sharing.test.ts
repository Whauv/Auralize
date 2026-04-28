import { describe, expect, it } from "vitest";

import { parseLastFmUsername, parseYoutubeMusicProfileUrl } from "./identity";
import { buildSavedSession, decodeSharePayload, encodeSharePayload } from "./sharing";
import type { MusicPassportData } from "../components/MusicPassportCard";
import type { DashboardResponse } from "./types";

describe("identity and sharing helpers", () => {
  it("normalizes Last.fm usernames and YouTube Music profile URLs", () => {
    expect(parseLastFmUsername("https://www.last.fm/user/prana")).toBe("prana");
    expect(parseYoutubeMusicProfileUrl("https://music.youtube.com/@handle")).toBe(
      "https://music.youtube.com/@handle",
    );
  });

  it("encodes and decodes passport payloads without loss", () => {
    const passport: MusicPassportData = {
      topArtist: { name: "Artist One", thumbnail: null },
      topSongs: [],
      totalListeningHours: 12.5,
      dominantGenre: "Lo-fi",
      dominantMood: "Focused",
      listeningStreakDays: 8,
      fingerprint: [{ genre: "Lo-fi", count: 10 }],
    };

    expect(decodeSharePayload(encodeSharePayload(passport))).toEqual(passport);
  });

  it("rejects oversized shared payloads", () => {
    expect(() => decodeSharePayload("a".repeat(400_001))).toThrow("Shared payload is too large.");
  });

  it("builds stable saved session metadata", () => {
    const dashboard: DashboardResponse = {
      source: "lastfm",
      username: "prana",
      stats: {
        topSongs: [],
        topArtists: [],
        totalListeningMinutes: 0,
        rawEnrichedHistory: [],
      },
      genreBreakdown: [],
      moodTimeline: [],
      profileSummary: null,
    };

    const session = buildSavedSession({
      dashboard,
      timeframe: "90d",
      sourceLabel: "Last.fm Live Mode",
    });

    expect(session.name).toContain("prana");
    expect(session.sourceLabel).toBe("Last.fm Live Mode");
  });
});
