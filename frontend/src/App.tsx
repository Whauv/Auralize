import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { MusicPassportCard, type MusicPassportData } from "./MusicPassportCard";
import {
  ChartSkeleton,
  ChartTooltip,
  ListeningHeatmap,
  LoadingSpinner,
  Section,
  SongTick
} from "./DashboardBits";
import type {
  DashboardResponse,
  GenreBreakdownEntry,
  MoodTimelineEntry,
  ParsedHistoryEntry,
  StatsPayload
} from "./types";
import {
  CHART_ACCENT,
  CHART_ACCENT_SECONDARY,
  CHART_ACCENT_TERTIARY,
  PIE_COLORS,
  SHARE_PARAM,
  buildPassportData,
  buildTakeoutDashboardResponse,
  copyText,
  decodeSharePayload,
  formatHours,
  formatTimestamp,
  getShareUrl,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  postFile,
  postJson,
  truncateLabel
} from "./utils";

type SourceMode = "takeout" | "lastfm";

export default function App() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("takeout");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeMusicProfileUrl, setYoutubeMusicProfileUrl] = useState("");
  const [lastFmUsername, setLastFmUsername] = useState("");
  const [parsedHistory, setParsedHistory] = useState<ParsedHistoryEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sharedPassport, setSharedPassport] = useState<MusicPassportData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const passportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!encoded) {
      return;
    }

    try {
      setSharedPassport(decodeSharePayload(encoded));
      setError(null);
    } catch {
      setError("The shared music passport link is invalid or corrupted.");
    }
  }, []);

  const stats = dashboard?.stats ?? null;
  const genreBreakdown = dashboard?.genreBreakdown ?? [];
  const moodTimeline = dashboard?.moodTimeline ?? [];
  const isYoutubeProfileMode = dashboard?.source === "youtube-profile";
  const totalPlays = useMemo(() => {
    return stats?.rawEnrichedHistory.reduce((sum, entry) => sum + entry.playCount, 0) ?? 0;
  }, [stats]);
  const uniqueSongs = useMemo(() => stats?.rawEnrichedHistory.length ?? 0, [stats]);
  const heroHours = useMemo(() => {
    return stats ? formatHours(stats.totalListeningMinutes) : "0.0 hrs";
  }, [stats]);
  const topSongs = useMemo(() => stats?.topSongs ?? [], [stats]);
  const topArtists = useMemo(() => stats?.topArtists ?? [], [stats]);
  const heatmapEntries = useMemo(() => stats?.rawEnrichedHistory ?? [], [stats]);
  const passportData = useMemo(() => {
    if (!stats || dashboard?.source === "youtube-profile") {
      return null;
    }

    return buildPassportData(stats, genreBreakdown, moodTimeline);
  }, [dashboard?.source, stats, genreBreakdown, moodTimeline]);

  async function handleExportAsImage() {
    if (!passportRef.current) {
      return;
    }

    const canvas = await html2canvas(passportRef.current, {
      backgroundColor: null,
      scale: 2
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "my-music-passport.png";
    link.click();
    setActionMessage("Passport exported as PNG.");
  }

  async function handleCopyShareableLink(payload: MusicPassportData) {
    await copyText(getShareUrl(payload));
    setActionMessage("Shareable passport link copied to clipboard.");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  function handleYoutubeMusicProfileUrlChange(event: ChangeEvent<HTMLInputElement>) {
    setYoutubeMusicProfileUrl(event.target.value);
    setError(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  }

  async function handleTakeoutSubmit() {
    if (!file && !youtubeMusicProfileUrl.trim()) {
      setError("Choose a watch-history.json file or paste a YouTube Music profile link first.");
      return;
    }

    if (!file && youtubeMusicProfileUrl.trim()) {
      const normalizedProfileUrl = parseYoutubeMusicProfileUrl(youtubeMusicProfileUrl);
      if (!normalizedProfileUrl) {
        setError("Enter a valid YouTube Music profile link like https://music.youtube.com/@yourhandle.");
        return;
      }

      const payload = await postJson<DashboardResponse>("/youtube-profile", {
        url: normalizedProfileUrl
      });
      setDashboard(payload);
      setParsedHistory([]);
      return;
    }

    const selectedFile = file;
    if (!selectedFile) {
      setError("Choose a watch-history.json file or paste a YouTube Music profile link first.");
      return;
    }

    const uploadPayload = await postFile<ParsedHistoryEntry[]>("/upload", selectedFile);
    setParsedHistory(uploadPayload);

    const [statsPayload, genrePayload, moodPayload] = await Promise.all([
      postFile<StatsPayload>("/stats", selectedFile),
      postFile<GenreBreakdownEntry[]>("/genre-breakdown", selectedFile),
      postFile<MoodTimelineEntry[]>("/mood-timeline", selectedFile)
    ]);

    setDashboard(
      buildTakeoutDashboardResponse(statsPayload, genrePayload, moodPayload)
    );
  }

  async function handleLastFmSubmit() {
    const username = parseLastFmUsername(lastFmUsername);
    if (!username) {
      setError("Enter a Last.fm username or paste a Last.fm profile URL to use Live Mode.");
      return;
    }

    const payload = await postJson<DashboardResponse>("/lastfm", { username });
    setDashboard(payload);
    setParsedHistory([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setError(null);
    setActionMessage(null);

    try {
      if (sourceMode === "takeout") {
        await handleTakeoutSubmit();
      } else {
        await handleLastFmSubmit();
      }

      setSharedPassport(null);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Request failed.");
      setParsedHistory([]);
      setDashboard(null);
    } finally {
      setIsUploading(false);
    }
  }

  if (sharedPassport) {
    return (
      <main className="min-h-screen px-4 py-8 text-slate-100 md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <motion.section
            className="rounded-[2rem] border border-fuchsia-400/20 bg-slate-950/50 p-6 md:p-8 backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">
              Shared Passport
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              View-only music passport
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              This shared link opens a read-only version of the music passport card.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-fuchsia-100"
                onClick={() => void handleExportAsImage()}
                type="button"
              >
                Export as Image
              </button>
              <button
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                onClick={() => void handleCopyShareableLink(sharedPassport)}
                type="button"
              >
                Copy Shareable Link
              </button>
            </div>

            {actionMessage ? (
              <p className="mt-4 text-sm text-fuchsia-200">{actionMessage}</p>
            ) : null}
          </motion.section>

          <Section
            title="Music Passport"
            subtitle="A compact card you can export or share directly."
          >
            <div className="overflow-x-auto">
              <div ref={passportRef} className="mx-auto w-fit">
                <MusicPassportCard data={sharedPassport} />
              </div>
            </div>
          </Section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
        <motion.section
          className="relative overflow-hidden rounded-[2rem] border border-fuchsia-400/20 bg-slate-950/55 p-6 shadow-[0_30px_100px_rgba(168,85,247,0.2)] backdrop-blur md:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.15),transparent_28%)]" />
          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.35em] text-fuchsia-300">
                  Your Music DNA
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
                  Upload your history, paste a profile, or switch to live scrobbles.
                </h1>
                <p className="mt-4 max-w-3xl text-sm text-slate-300 md:text-lg">
                  Use Google Takeout for deep playback analytics, paste a YouTube Music profile link for a lightweight public preview, or use Last.fm Live Mode for a fresh snapshot of your listening identity.
                </p>
              </div>

              {dashboard?.source === "lastfm" ? (
                <span className="w-fit rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                  Live Mode
                </span>
              ) : isYoutubeProfileMode ? (
                <span className="w-fit rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100">
                  Public Profile Preview
                </span>
              ) : null}
            </div>

            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-wrap gap-3">
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    sourceMode === "takeout"
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setSourceMode("takeout")}
                  type="button"
                >
                  Google Takeout
                </button>
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    sourceMode === "lastfm"
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setSourceMode("lastfm")}
                  type="button"
                >
                  Last.fm Live Mode
                </button>
              </div>

              {sourceMode === "takeout" ? (
                <div
                  className={`rounded-[1.75rem] border border-dashed px-6 py-10 transition ${
                    isDragActive
                      ? "border-fuchsia-300 bg-fuchsia-500/10"
                      : "border-fuchsia-400/20 bg-slate-900/60"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto flex max-w-3xl flex-col gap-8">
                    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
                      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                        <div className="mb-4 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                          Drag and drop
                        </div>
                        <p className="text-xl font-semibold text-white">
                          Drop watch-history.json here
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          or browse for the export manually. You can also paste a YouTube Music profile link on the right.
                        </p>
                        <p className="mt-4 max-w-xl text-xs text-slate-500">
                          Google Takeout is still the source that unlocks play counts, streaks, timestamps, and heatmaps for YouTube Music.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                          <label className="cursor-pointer rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:scale-[1.02]">
                            Choose file
                            <input
                              className="sr-only"
                              type="file"
                              accept=".json,application/json"
                              onChange={handleFileChange}
                            />
                          </label>
                          <button
                            className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            onClick={() => setSourceMode("lastfm")}
                            type="button"
                          >
                            Use Last.fm link instead
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                        <label className="block text-sm font-semibold text-white">
                          YouTube Music Profile Link
                        </label>
                        <input
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/50"
                          onChange={handleYoutubeMusicProfileUrlChange}
                          placeholder="Paste a YouTube Music profile or channel link"
                          type="text"
                          value={youtubeMusicProfileUrl}
                        />
                        <p className="mt-3 text-sm text-slate-400">
                          Paste a public profile link like `https://music.youtube.com/@27_pranavchopdekar68` to build a lightweight public profile preview.
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                          Full analytics still require `watch-history.json` or Last.fm Live Mode because YouTube Music public profiles do not expose private listening history.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-fuchsia-400/20 bg-slate-900/60 p-6">
                  <label className="block text-sm font-semibold text-white">
                    Last.fm Username or Profile URL
                  </label>
                  <input
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/50"
                    onChange={(event) => setLastFmUsername(event.target.value)}
                    placeholder="Enter a username or paste https://www.last.fm/user/..."
                    type="text"
                    value={lastFmUsername}
                  />
                  <p className="mt-3 text-sm text-slate-400">
                    Live Mode accepts either a plain username or a full Last.fm profile link, then pulls recent tracks, top artists, and top tracks into the same dashboard schema.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                  {sourceMode === "takeout" ? (
                    <>
                      {file ? (
                        <p className="text-sm text-slate-300">
                          Selected file: <span className="font-medium text-white">{file.name}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">No file selected yet.</p>
                      )}
                      {youtubeMusicProfileUrl ? (
                        <p className="text-sm text-slate-400">
                          Profile link: <span className="break-all text-white">{youtubeMusicProfileUrl}</span>
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-500">
                        The button uses your file if one is selected. Otherwise, it uses the YouTube Music profile link.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Last.fm user: <span className="text-white">{lastFmUsername || "not set"}</span>
                    </p>
                  )}

                  {isUploading ? <LoadingSpinner /> : null}
                  {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                  {actionMessage ? (
                    <p className="text-sm text-fuchsia-200">{actionMessage}</p>
                  ) : null}
                </div>

                <button
                  className="rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  disabled={isUploading}
                  type="submit"
                >
                  {isUploading
                    ? "Loading..."
                    : sourceMode === "takeout"
                      ? "Build dashboard or preview"
                      : "Start Live Mode"}
                </button>
              </div>
            </form>
          </div>
        </motion.section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Unique Songs</p>
            <p className="mt-3 text-3xl font-semibold text-white">{uniqueSongs}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total Plays</p>
            <p className="mt-3 text-3xl font-semibold text-white">{totalPlays}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {dashboard?.source === "lastfm"
                ? "Live User"
                : isYoutubeProfileMode
                  ? "Profile Handle"
                  : "Parsed Tracks"}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {dashboard?.source === "lastfm"
                ? dashboard.username ?? "-"
                : isYoutubeProfileMode
                  ? `@${dashboard?.username ?? "-"}`
                  : parsedHistory.length}
            </p>
          </div>
        </div>

        {passportData ? (
          <Section
            title="Music Passport"
            subtitle="A shareable summary card you can export as a PNG or copy as a read-only link."
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="overflow-x-auto">
                <div ref={passportRef} className="w-fit">
                  <MusicPassportCard data={passportData} />
                </div>
              </div>

              <div className="flex w-full max-w-sm flex-col gap-3 xl:pt-3">
                <button
                  className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-fuchsia-100"
                  onClick={() => void handleExportAsImage()}
                  type="button"
                >
                  Export as Image
                </button>
                <button
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                  onClick={() => void handleCopyShareableLink(passportData)}
                  type="button"
                >
                  Copy Shareable Link
                </button>
                <p className="text-sm text-slate-400">
                  Shared links open a read-only passport card, so anyone with the URL sees the compact snapshot instead of the full dashboard.
                </p>
              </div>
            </div>
          </Section>
        ) : null}

        {isYoutubeProfileMode ? (
          <Section
            title="Public Profile Preview"
            subtitle="This view comes from a public YouTube Music profile link, so it can only show public metadata rather than private listening history."
          >
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.75rem] border border-cyan-400/15 bg-white/5 p-6">
                <div className="flex items-center gap-4">
                  {dashboard?.profileSummary?.thumbnail ? (
                    <img
                      src={dashboard.profileSummary.thumbnail}
                      alt={dashboard.profileSummary.name}
                      className="h-20 w-20 rounded-3xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-3xl bg-cyan-400/10" />
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                      YouTube Music
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {dashboard?.profileSummary?.name ?? "Unknown profile"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      @{dashboard?.profileSummary?.handle ?? dashboard?.username ?? "unknown"}
                    </p>
                  </div>
                </div>

                <a
                  className="mt-6 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  href={dashboard?.profileSummary?.url ?? youtubeMusicProfileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open profile
                </a>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  What this can show
                </p>
                <div className="mt-4 grid gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                    Public profile identity like handle, page title, and artwork when available
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                    A quick preview path when you only have a `music.youtube.com/@...` link
                  </div>
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                    Not available from a public profile link: private play counts, top songs, listening streaks, timestamps, and heatmaps
                  </div>
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  For the full dashboard and passport, upload `watch-history.json` or switch to Last.fm Live Mode.
                </p>
              </div>
            </div>
          </Section>
        ) : null}

        {isUploading ? (
          <>
            <Section title="Your Music Profile" subtitle="Crunching your listening summary.">
              <ChartSkeleton heightClass="h-[220px]" />
            </Section>
            <Section title="Top Songs" subtitle="Preparing your top tracks.">
              <ChartSkeleton heightClass="h-[420px]" />
            </Section>
            <Section title="Top Artists" subtitle="Preparing your artist rankings.">
              <ChartSkeleton heightClass="h-[340px]" />
            </Section>
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Genre DNA" subtitle="Classifying genres.">
                <ChartSkeleton />
              </Section>
              <Section title="Mood Timeline" subtitle="Mapping moods by time of day.">
                <ChartSkeleton />
              </Section>
            </div>
            <Section title="Listening Heatmap" subtitle="Building a weekly heatmap.">
              <ChartSkeleton heightClass="h-[280px]" />
            </Section>
          </>
        ) : stats && !isYoutubeProfileMode ? (
          <>
            <Section
              title="Your Music Profile"
              subtitle="A snapshot of how much time you have spent inside your listening archive."
            >
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300/70">
                      Total listening time
                    </p>
                    {dashboard?.source === "lastfm" ? (
                      <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                        Live Mode
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-4xl font-semibold text-white md:text-6xl">
                    {heroHours}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm text-slate-400 md:text-base">
                    Based on source data currently loaded into the dashboard.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1.5rem] border border-fuchsia-400/10 bg-white/5 p-5">
                    <p className="text-sm text-slate-400">Top song</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {topSongs[0]?.title ?? "No data yet"}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-fuchsia-400/10 bg-white/5 p-5">
                    <p className="text-sm text-slate-400">Top artist</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {topArtists[0]?.artist ?? "No data yet"}
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="Top Songs"
              subtitle="Your 10 most-played songs with cover art embedded into the chart labels."
            >
              <div className="h-[380px] md:h-[460px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSongs}
                    layout="vertical"
                    margin={{
                      top: 10,
                      right: 10,
                      left: window.innerWidth < 768 ? 135 : 170,
                      bottom: 0
                    }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" stroke="#a78bfa" tick={{ fill: "#c4b5fd", fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="title"
                      width={window.innerWidth < 768 ? 145 : 180}
                      tick={(props) => <SongTick {...props} songs={topSongs} />}
                      stroke="transparent"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="playCount" radius={[0, 12, 12, 0]} fill={CHART_ACCENT} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section
              title="Top Artists"
              subtitle="Artists sorted by total play count across your listening history."
            >
              <div className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topArtists.map((entry) => ({
                      ...entry,
                      artist: truncateLabel(entry.artist, 18)
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 50 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="artist"
                      angle={-18}
                      textAnchor="end"
                      interval={0}
                      height={70}
                      stroke="#a78bfa"
                      tick={{ fill: "#ddd6fe", fontSize: 12 }}
                    />
                    <YAxis stroke="#a78bfa" tick={{ fill: "#ddd6fe", fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="playCount" radius={[12, 12, 0, 0]} fill={CHART_ACCENT_SECONDARY} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Section
                title="Genre DNA"
                subtitle="Keyword-led genre classification with artist-name fallback when tags are missing."
              >
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="h-[280px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreBreakdown}
                          dataKey="count"
                          nameKey="genre"
                          innerRadius={50}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {genreBreakdown.map((entry, index) => (
                            <Cell key={entry.genre} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {genreBreakdown.map((entry, index) => (
                      <div key={entry.genre} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            <span className="font-medium text-white">{entry.genre}</span>
                          </div>
                          <span className="text-sm text-slate-300">{entry.percentage}%</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{entry.count} plays</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section
                title="Mood Timeline"
                subtitle="Time-of-day buckets that hint at how your listening shifts through the day."
              >
                <div className="h-[280px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moodTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="mood" stroke="#f5d0fe" tick={{ fill: "#f5d0fe", fontSize: 12 }} />
                      <YAxis stroke="#f5d0fe" tick={{ fill: "#f5d0fe", fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="playCount" radius={[12, 12, 0, 0]} fill={CHART_ACCENT_TERTIARY} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            <Section
              title="Listening Heatmap"
              subtitle="A 7x24 weekly matrix showing when your plays cluster by day and hour."
            >
              <ListeningHeatmap entries={heatmapEntries} />
            </Section>

            <Section
              title="Recent Parsed History"
              subtitle="A compact view of the parsed and enriched records powering the dashboard."
            >
              <div className="grid gap-3">
                {stats.rawEnrichedHistory.slice(0, 8).map((entry) => (
                  <article
                    key={entry.videoId}
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt={entry.title} className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-fuchsia-500/20" />
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-white">{entry.title}</h3>
                        <p className="text-sm text-slate-400">{entry.artist}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.tags.slice(0, 3).join(" | ") || "No tags"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs text-fuchsia-200">{entry.playCount} plays</span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{entry.duration}</span>
                      {entry.timestamps[0] ? <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{formatTimestamp(entry.timestamps[0])}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          </>
        ) : (
          <Section
            title="Dashboard Preview"
            subtitle="Upload a file or enter a Last.fm username to unlock your dashboard and passport."
          >
            <div className="rounded-[1.75rem] border border-dashed border-fuchsia-400/15 bg-white/5 px-6 py-16 text-center text-slate-400">
              Your dashboard and shareable passport will appear here after data loads successfully.
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}
