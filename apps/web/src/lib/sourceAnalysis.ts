import type { AnalysisJobStatus, DashboardResponse, DashboardUploadResponse } from "./types";
import {
  buildFileAnalysisCacheKey,
  buildJsonAnalysisCacheKey,
  getJson,
  getCachedAnalysis,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  postFile,
  postJson,
  setCachedAnalysis,
} from "./utils";

type FileAnalysisSource = "takeout" | "unified-takeout" | "apple-music";
type AnalysisProgressHandler = (job: AnalysisJobStatus) => void;

const JOB_POLL_INTERVAL_MS = 650;
const JOB_TIMEOUT_MS = 120_000;

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
  onProgress?: AnalysisProgressHandler,
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

  const payload = await analyzeFileViaJob("takeout", file, onProgress);
  setCachedAnalysis(cacheKey, "takeout", payload);
  return { payload };
}

export async function analyzeUnifiedTakeout(
  file: File | null,
  onProgress?: AnalysisProgressHandler,
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

  const payload = await analyzeFileViaJob("unified-takeout", file, onProgress);
  setCachedAnalysis(cacheKey, "unified-takeout", payload);
  return { payload };
}

export async function analyzeAppleMusic(
  file: File | null,
  onProgress?: AnalysisProgressHandler,
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

  const payload = await analyzeFileViaJob("apple-music", file, onProgress);
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

async function analyzeFileViaJob(
  source: FileAnalysisSource,
  file: File,
  onProgress?: AnalysisProgressHandler,
): Promise<DashboardUploadResponse> {
  const { jobId } = await postFile<{ jobId: string }>(
    `/jobs/analyze?source=${encodeURIComponent(source)}`,
    file,
  );
  const startedAt = Date.now();

  while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
    await wait(JOB_POLL_INTERVAL_MS);
    const job = await getJson<AnalysisJobStatus>(`/jobs/${jobId}`);
    onProgress?.(job);
    if (job.status === "complete" && job.result) {
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Analysis job failed.");
    }
  }

  throw new Error("Analysis is taking longer than expected. Try again with a smaller export.");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
