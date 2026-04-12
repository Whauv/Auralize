import type { DashboardResponse, DashboardUploadResponse } from "./types";
import {
  buildFileAnalysisCacheKey,
  buildJsonAnalysisCacheKey,
  getCachedAnalysis,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  postFile,
  postJson,
  setCachedAnalysis,
} from "./utils";

export async function analyzeYoutubeProfile(
  rawUrl: string,
): Promise<{ payload: DashboardResponse; message?: string }> {
  const normalizedProfileUrl = parseYoutubeMusicProfileUrl(rawUrl);
  if (!normalizedProfileUrl) {
    throw new Error(
      "Enter a valid YouTube Music profile link like https://music.youtube.com/@yourhandle.",
    );
  }

  const cacheKey = buildJsonAnalysisCacheKey("youtube-profile", normalizedProfileUrl);
  const cachedPayload = getCachedAnalysis<DashboardResponse>(cacheKey);
  if (cachedPayload) {
    return {
      payload: cachedPayload,
      message: "Loaded cached public profile preview.",
    };
  }

  const payload = await postJson<DashboardResponse>("/youtube-profile", {
    url: normalizedProfileUrl,
  });
  setCachedAnalysis(cacheKey, "youtube-profile-request", payload);
  return { payload };
}

export async function analyzeTakeout(
  file: File | null,
): Promise<{ payload: DashboardUploadResponse; message?: string }> {
  if (!file) {
    throw new Error("Choose a watch-history.json file first.");
  }

  const cacheKey = buildFileAnalysisCacheKey("takeout", file);
  const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
  if (cachedPayload) {
    return {
      payload: cachedPayload,
      message: "Loaded cached dashboard for this file.",
    };
  }

  const payload = await postFile<DashboardUploadResponse>("/analyze", file);
  setCachedAnalysis(cacheKey, "takeout", payload);
  return { payload };
}

export async function analyzeUnifiedTakeout(
  file: File | null,
): Promise<{ payload: DashboardUploadResponse; message?: string }> {
  if (!file) {
    throw new Error("Choose a watch-history.json file first.");
  }

  const cacheKey = buildFileAnalysisCacheKey("unified-takeout", file);
  const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
  if (cachedPayload) {
    return {
      payload: cachedPayload,
      message: "Loaded cached unified dashboard for this file.",
    };
  }

  const payload = await postFile<DashboardUploadResponse>("/analyze-unified", file);
  setCachedAnalysis(cacheKey, "unified-takeout", payload);
  return { payload };
}

export async function analyzeAppleMusic(
  file: File | null,
): Promise<{ payload: DashboardUploadResponse; message?: string }> {
  if (!file) {
    throw new Error("Choose an Apple Music CSV or JSON export first.");
  }

  const cacheKey = buildFileAnalysisCacheKey("apple-music", file);
  const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
  if (cachedPayload) {
    return {
      payload: cachedPayload,
      message: "Loaded cached Apple Music dashboard for this file.",
    };
  }

  const payload = await postFile<DashboardUploadResponse>("/apple-music/analyze", file);
  setCachedAnalysis(cacheKey, "apple-music", payload);
  return { payload };
}

export async function analyzeLastFm(
  rawUsername: string,
): Promise<{ payload: DashboardResponse; message?: string }> {
  const username = parseLastFmUsername(rawUsername);
  if (!username) {
    throw new Error("Enter a Last.fm username or paste a Last.fm profile URL to use Live Mode.");
  }

  const cacheKey = buildJsonAnalysisCacheKey("lastfm", username);
  const cachedPayload = getCachedAnalysis<DashboardResponse>(cacheKey);
  if (cachedPayload) {
    return {
      payload: cachedPayload,
      message: "Loaded cached Last.fm snapshot.",
    };
  }

  const payload = await postJson<DashboardResponse>("/lastfm", { username });
  setCachedAnalysis(cacheKey, "lastfm", payload);
  return { payload };
}
