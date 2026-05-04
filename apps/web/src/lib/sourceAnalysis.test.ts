import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzeAppleMusic,
  analyzeLastFm,
  analyzeTakeout,
  analyzeUnifiedTakeout,
  analyzeYoutubeProfile,
} from "./sourceAnalysis";
import type { DashboardResponse, DashboardUploadResponse } from "./types";

const utilsMocks = vi.hoisted(() => ({
  getCachedAnalysis: vi.fn(),
  setCachedAnalysis: vi.fn(),
  getJson: vi.fn(),
  postFile: vi.fn(),
  postChunk: vi.fn(),
  postJson: vi.fn(),
  buildFileAnalysisCacheKey: vi.fn((_source: string, _file: File) => "file-cache-key"),
  buildJsonAnalysisCacheKey: vi.fn((_source: string, _value: string) => "json-cache-key"),
  parseYoutubeMusicProfileUrl: vi.fn((value: string) => value.trim() || null),
  parseLastFmUsername: vi.fn((value: string) => value.trim() || null),
}));

vi.mock("./utils", () => ({
  buildFileAnalysisCacheKey: utilsMocks.buildFileAnalysisCacheKey,
  buildJsonAnalysisCacheKey: utilsMocks.buildJsonAnalysisCacheKey,
  getCachedAnalysis: utilsMocks.getCachedAnalysis,
  getJson: utilsMocks.getJson,
  parseLastFmUsername: utilsMocks.parseLastFmUsername,
  parseYoutubeMusicProfileUrl: utilsMocks.parseYoutubeMusicProfileUrl,
  postFile: utilsMocks.postFile,
  postChunk: utilsMocks.postChunk,
  postJson: utilsMocks.postJson,
  setCachedAnalysis: utilsMocks.setCachedAnalysis,
}));

describe("source analysis helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    utilsMocks.getCachedAnalysis.mockReturnValue(null);
    utilsMocks.postChunk.mockResolvedValue({ status: "ok" });
  });

  it("returns cached YouTube profile analysis when available", async () => {
    const payload: DashboardResponse = {
      source: "youtube-profile",
      username: "handle",
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
    utilsMocks.getCachedAnalysis.mockReturnValue(payload);

    const result = await analyzeYoutubeProfile("https://music.youtube.com/@handle");

    expect(result).toEqual({
      payload,
      message: "Loaded cached public profile preview.",
    });
    expect(utilsMocks.postJson).not.toHaveBeenCalled();
  });

  it("posts a takeout file when no cached result exists", async () => {
    const payload: DashboardUploadResponse = {
      entries: [],
      quality: {
        totalEntries: 1,
        usableEntries: 1,
        searchEntries: 0,
        youtubeMusicEntries: 1,
        warnings: [],
      },
      dashboard: {
        source: "takeout",
        username: null,
        stats: {
          topSongs: [],
          topArtists: [],
          totalListeningMinutes: 0,
          rawEnrichedHistory: [],
        },
        genreBreakdown: [],
        moodTimeline: [],
        profileSummary: null,
      },
    };
    const file = new File(["[]"], "watch-history.json", { type: "application/json" });
    utilsMocks.postFile.mockResolvedValue({ jobId: "job-takeout" });
    utilsMocks.getJson.mockResolvedValue({
      id: "job-takeout",
      source: "takeout",
      status: "complete",
      progress: 100,
      message: "Complete",
      result: payload,
      error: null,
    });

    const result = await analyzeTakeout(file);

    expect(result).toEqual({ payload });
    expect(utilsMocks.postFile).toHaveBeenCalledWith("/jobs/analyze?source=takeout", file);
    expect(utilsMocks.getJson).toHaveBeenCalledWith("/jobs/job-takeout");
    expect(utilsMocks.setCachedAnalysis).toHaveBeenCalledWith(
      "file-cache-key",
      "takeout",
      payload,
    );
  });

  it("supports unified, Apple Music, and Last.fm analysis flows", async () => {
    const uploadPayload = {
      entries: [],
      quality: {
        totalEntries: 2,
        usableEntries: 2,
        searchEntries: 0,
        youtubeMusicEntries: 0,
        warnings: [],
      },
      dashboard: {
        source: "apple-music",
        username: null,
        stats: {
          topSongs: [],
          topArtists: [],
          totalListeningMinutes: 0,
          rawEnrichedHistory: [],
        },
        genreBreakdown: [],
        moodTimeline: [],
        profileSummary: null,
      },
    } satisfies DashboardUploadResponse;
    const livePayload = {
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
    } satisfies DashboardResponse;
    utilsMocks.postFile
      .mockResolvedValueOnce({ jobId: "job-unified" })
      .mockResolvedValueOnce({ jobId: "job-apple" });
    utilsMocks.getJson
      .mockResolvedValueOnce({
        id: "job-unified",
        source: "unified-takeout",
        status: "complete",
        progress: 100,
        message: "Complete",
        result: uploadPayload,
        error: null,
      })
      .mockResolvedValueOnce({
        id: "job-apple",
        source: "apple-music",
        status: "complete",
        progress: 100,
        message: "Complete",
        result: uploadPayload,
        error: null,
      });
    utilsMocks.postJson.mockResolvedValue(livePayload);
    const file = new File(["artist,title"], "apple.csv", { type: "text/csv" });

    await expect(analyzeUnifiedTakeout(file)).resolves.toEqual({ payload: uploadPayload });
    await expect(analyzeAppleMusic(file)).resolves.toEqual({ payload: uploadPayload });
    await expect(analyzeLastFm("prana")).resolves.toEqual({ payload: livePayload });

    expect(utilsMocks.postFile).toHaveBeenCalledWith("/jobs/analyze?source=unified-takeout", file);
    expect(utilsMocks.postFile).toHaveBeenCalledWith("/jobs/analyze?source=apple-music", file);
    expect(utilsMocks.getJson).toHaveBeenCalledWith("/jobs/job-unified");
    expect(utilsMocks.getJson).toHaveBeenCalledWith("/jobs/job-apple");
    expect(utilsMocks.postJson).toHaveBeenCalledWith("/lastfm", { username: "prana" });
  });

  it("rejects oversized files before uploading", async () => {
    const oversizedFile = { size: 60 * 1024 * 1024 } as File;

    await expect(analyzeTakeout(oversizedFile)).rejects.toThrow("Max supported in this deployment");
    expect(utilsMocks.postFile).not.toHaveBeenCalled();
  });

  it("uses chunked upload flow for large files before starting job", async () => {
    const payload: DashboardUploadResponse = {
      entries: [],
      quality: {
        totalEntries: 1,
        usableEntries: 1,
        searchEntries: 0,
        youtubeMusicEntries: 1,
        warnings: [],
      },
      dashboard: {
        source: "takeout",
        username: null,
        stats: {
          topSongs: [],
          topArtists: [],
          totalListeningMinutes: 0,
          rawEnrichedHistory: [],
        },
        genreBreakdown: [],
        moodTimeline: [],
        profileSummary: null,
      },
    };

    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "watch-history.json", {
      type: "application/json",
    });

    utilsMocks.postJson
      .mockResolvedValueOnce({ uploadId: "upload-123" })
      .mockResolvedValueOnce({ jobId: "job-large" });
    utilsMocks.getJson.mockResolvedValue({
      id: "job-large",
      source: "takeout",
      status: "complete",
      progress: 100,
      message: "Complete",
      result: payload,
      error: null,
    });

    await expect(analyzeTakeout(largeFile)).resolves.toEqual({ payload });
    expect(utilsMocks.postChunk).toHaveBeenCalled();
    expect(utilsMocks.postFile).not.toHaveBeenCalled();
  });

  it("retries polling on transient failures", async () => {
    const payload: DashboardUploadResponse = {
      entries: [],
      quality: {
        totalEntries: 1,
        usableEntries: 1,
        searchEntries: 0,
        youtubeMusicEntries: 1,
        warnings: [],
      },
      dashboard: {
        source: "takeout",
        username: null,
        stats: {
          topSongs: [],
          topArtists: [],
          totalListeningMinutes: 0,
          rawEnrichedHistory: [],
        },
        genreBreakdown: [],
        moodTimeline: [],
        profileSummary: null,
      },
    };
    const file = new File(["[]"], "watch-history.json", { type: "application/json" });
    utilsMocks.postFile.mockResolvedValue({ jobId: "job-retry" });
    utilsMocks.getJson
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValueOnce({
        id: "job-retry",
        source: "takeout",
        status: "complete",
        progress: 100,
        message: "Complete",
        result: payload,
        error: null,
      });

    await expect(analyzeTakeout(file)).resolves.toEqual({ payload });
    expect(utilsMocks.getJson).toHaveBeenCalledTimes(2);
  });

  it("throws helpful validation errors for missing inputs", async () => {
    utilsMocks.parseYoutubeMusicProfileUrl.mockReturnValue(null);
    utilsMocks.parseLastFmUsername.mockReturnValue(null);

    await expect(analyzeYoutubeProfile("")).rejects.toThrow(
      "Enter a valid YouTube Music profile link like https://music.youtube.com/@yourhandle.",
    );
    await expect(analyzeTakeout(null)).rejects.toThrow("Choose a watch-history.json file first.");
    await expect(analyzeUnifiedTakeout(null)).rejects.toThrow(
      "Choose a watch-history.json file first.",
    );
    await expect(analyzeAppleMusic(null)).rejects.toThrow(
      "Choose an Apple Music CSV or JSON export first.",
    );
    await expect(analyzeLastFm("")).rejects.toThrow(
      "Enter a Last.fm username or paste a Last.fm profile URL to use Live Mode.",
    );
  });
});
