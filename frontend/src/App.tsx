import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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
import { RecapView } from "./RecapView";
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
  StatsPayload,
  TimeframeOption
} from "./types";
import {
  CHART_ACCENT,
  CHART_ACCENT_SECONDARY,
  CHART_ACCENT_TERTIARY,
  PIE_COLORS,
  SHARE_PARAM,
  buildPassportData,
  buildGenreBreakdownFromHistory,
  buildMoodTimelineFromHistory,
  buildStatsPayloadFromHistory,
  buildTakeoutDashboardResponse,
  copyText,
  decodeSharePayload,
  filterHistoryByTimeframe,
  formatHours,
  formatTimestamp,
  getShareUrl,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  postFile,
  postJson,
  TIMEFRAME_LABELS,
  truncateLabel
} from "./utils";

type SourceMode = "takeout" | "lastfm";

function AmbientMusicScene() {
  return (
    <div aria-hidden="true" className="ambient-stage">
      <span className="ambient-note left-[6%] top-[10%] text-[2.6rem] [animation-delay:-2s]">
        ♪
      </span>
      <span className="ambient-note right-[12%] top-[16%] text-[3.2rem] [animation-delay:-7s]">
        ♫
      </span>
      <span className="ambient-note left-[11%] bottom-[18%] text-[2.8rem] [animation-delay:-4s]">
        ♬
      </span>
      <span className="ambient-note right-[8%] bottom-[12%] text-[2.4rem] [animation-delay:-10s]">
        ♩
      </span>
      <span className="ambient-vinyl left-[-1.5rem] top-[24%]" />
      <span className="ambient-vinyl right-[-1rem] bottom-[22%] h-[132px] w-[132px] [animation-delay:-11s]" />
      <span className="ambient-ring left-[20%] top-[66%] [animation-delay:-8s]" />
      <span className="ambient-ring right-[22%] top-[34%] h-[170px] w-[170px] [animation-delay:-5s]" />
      <span className="ambient-staff left-[-2rem] top-[50%]" />
      <span className="ambient-note left-[28%] top-[42%] text-[2rem] [animation-delay:-6s]">
        ♫
      </span>
      <span className="ambient-note right-[18%] top-[58%] text-[2.2rem] [animation-delay:-12s]">
        ♪
      </span>
      <span className="ambient-note left-[18%] top-[78%] text-[2.5rem] [animation-delay:-9s]">
        ♬
      </span>
      <span className="ambient-note right-[9%] top-[84%] text-[2.1rem] [animation-delay:-3s]">
        ♩
      </span>
      <span className="ambient-staff right-[4%] top-[72%] [animation-delay:-9s]" />
    </div>
  );
}

export default function App() {
  const { scrollYProgress } = useScroll();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
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
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all");
  const passportRef = useRef<HTMLDivElement | null>(null);
  const passportExportRef = useRef<HTMLDivElement | null>(null);

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

  const isYoutubeProfileMode = dashboard?.source === "youtube-profile";
  const filteredEntries = useMemo(() => {
    if (!dashboard?.stats?.rawEnrichedHistory || isYoutubeProfileMode) {
      return [];
    }

    return filterHistoryByTimeframe(dashboard.stats.rawEnrichedHistory, timeframe);
  }, [dashboard?.stats?.rawEnrichedHistory, isYoutubeProfileMode, timeframe]);

  const stats = useMemo(() => {
    if (isYoutubeProfileMode) {
      return dashboard?.stats ?? null;
    }

    return dashboard?.stats ? buildStatsPayloadFromHistory(filteredEntries) : null;
  }, [dashboard?.stats, filteredEntries, isYoutubeProfileMode]);

  const genreBreakdown = useMemo(() => {
    if (isYoutubeProfileMode) {
      return dashboard?.genreBreakdown ?? [];
    }

    return buildGenreBreakdownFromHistory(filteredEntries);
  }, [dashboard?.genreBreakdown, filteredEntries, isYoutubeProfileMode]);

  const moodTimeline = useMemo(() => {
    if (isYoutubeProfileMode) {
      return dashboard?.moodTimeline ?? [];
    }

    return buildMoodTimelineFromHistory(filteredEntries);
  }, [dashboard?.moodTimeline, filteredEntries, isYoutubeProfileMode]);
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
    const exportNode = passportExportRef.current ?? passportRef.current;
    if (!exportNode) {
      return;
    }

    await document.fonts.ready;

    const images = Array.from(exportNode.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
      )
    );

    const canvas = await html2canvas(exportNode, {
      backgroundColor: "#040b17",
      scale: 2.5,
      useCORS: true,
      logging: false,
      width: exportNode.scrollWidth,
      height: exportNode.scrollHeight,
      windowWidth: exportNode.scrollWidth,
      windowHeight: exportNode.scrollHeight,
      scrollX: 0,
      scrollY: 0
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
      setIsRecapOpen(false);
      setTimeframe("all");
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
    setIsRecapOpen(false);
    setTimeframe("all");
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
    setIsRecapOpen(false);
    setTimeframe("all");
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
      <main className="relative isolate min-h-screen px-4 py-8 text-slate-100 md:px-6">
        <motion.div className="scroll-glow" style={{ scaleX: progressScale }} />
        <AmbientMusicScene />
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
          <div ref={passportExportRef} className="w-fit bg-[#040b17] p-8">
            <MusicPassportCard data={sharedPassport} />
          </div>
        </div>
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8">
          <motion.section
            className="rounded-[2rem] border border-[#1E293B] bg-[#111827] p-6 md:p-8 backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-sm uppercase tracking-[0.35em] text-[#F59E0B]">
              Shared Passport
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              View-only music passport
            </h1>
            <p className="mt-3 max-w-2xl text-[#9CA3AF]">
              This shared link opens a read-only version of the music passport card.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                onClick={() => void handleExportAsImage()}
                type="button"
              >
                Export as Image
              </button>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void handleCopyShareableLink(sharedPassport)}
                type="button"
              >
                Copy Shareable Link
              </button>
            </div>

            {actionMessage ? (
              <p className="mt-4 text-sm text-[#F0D080]">{actionMessage}</p>
            ) : null}
          </motion.section>

          <Section
            title="Music Passport"
            subtitle="A compact card you can export or share directly."
          >
            <div className="overflow-x-auto">
              <div
                ref={passportRef}
                className="mx-auto w-fit rounded-[2.5rem] bg-[#09131d] p-5"
              >
                <MusicPassportCard data={sharedPassport} />
              </div>
            </div>
          </Section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen px-4 py-6 text-slate-100 md:px-6 lg:px-8">
      <motion.div className="scroll-glow" style={{ scaleX: progressScale }} />
      <AmbientMusicScene />
      {passportData ? (
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
          <div ref={passportExportRef} className="w-fit bg-[#040b17] p-8">
            <MusicPassportCard data={passportData} />
          </div>
        </div>
      ) : null}
      {stats && !isYoutubeProfileMode ? (
        <RecapView
          isOpen={isRecapOpen}
          onClose={() => setIsRecapOpen(false)}
          stats={stats}
          genreBreakdown={genreBreakdown}
          moodTimeline={moodTimeline}
          passportData={passportData}
          timeframeLabel={TIMEFRAME_LABELS[timeframe]}
        />
      ) : null}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
        <motion.section
          className="relative overflow-hidden rounded-[2rem] border border-[#19313D] bg-[linear-gradient(135deg,#0E1B26_0%,#14313C_52%,#6D4632_100%)] p-6 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur md:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,195,192,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(228,169,75,0.14),transparent_28%)]" />
          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.35em] text-[#67C3C0]">
                  Your Music DNA
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
                  Upload your history, paste a profile, or switch to live scrobbles.
                </h1>
                <p className="mt-4 max-w-3xl text-sm text-[#9CA3AF] md:text-lg">
                  Use Google Takeout for deep playback analytics, paste a YouTube Music profile link for a lightweight public preview, or use Last.fm Live Mode for a fresh snapshot of your listening identity.
                </p>
              </div>

              {dashboard?.source === "lastfm" ? (
                <span className="w-fit rounded-full border border-[#67C3C0]/25 bg-[#0d1f28]/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#67C3C0]">
                  Live Mode
                </span>
              ) : isYoutubeProfileMode ? (
                <span className="w-fit rounded-full border border-[#67C3C0]/25 bg-[#0d1f28]/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#67C3C0]">
                  Public Profile Preview
                </span>
              ) : null}
            </div>

            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-wrap gap-3">
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    sourceMode === "takeout"
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setSourceMode("takeout")}
                  type="button"
                >
                  Google Takeout
                </button>
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    sourceMode === "lastfm"
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
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
                      ? "border-[#D4A853] bg-[#D4A853]/10"
                      : "border-[#1E293B] bg-[#111827]"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto flex max-w-3xl flex-col gap-8">
                    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
                      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                        <div className="mb-4 rounded-full border border-[#1E293B] bg-[#182234] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                          Drag and drop
                        </div>
                        <p className="text-xl font-semibold text-white">
                          Drop watch-history.json here
                        </p>
                        <p className="mt-2 text-sm text-[#9CA3AF]">
                          or browse for the export manually. You can also paste a YouTube Music profile link on the right.
                        </p>
                        <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                          Google Takeout is still the source that unlocks play counts, streaks, timestamps, and heatmaps for YouTube Music.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                          <label className="cursor-pointer rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-[#F0D080]">
                            Choose file
                            <input
                              className="sr-only"
                              type="file"
                              accept=".json,application/json"
                              onChange={handleFileChange}
                            />
                          </label>
                          <button
                            className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                            onClick={() => setSourceMode("lastfm")}
                            type="button"
                          >
                            Use Last.fm link instead
                          </button>
                        </div>
                      </div>

                        <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                        <label className="block text-sm font-semibold text-white">
                          YouTube Music Profile Link
                        </label>
                        <input
                          className="mt-3 w-full rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none transition placeholder:text-[#9CA3AF] focus:border-[#D4A853]"
                          onChange={handleYoutubeMusicProfileUrlChange}
                          placeholder="Paste a YouTube Music profile or channel link"
                          type="text"
                          value={youtubeMusicProfileUrl}
                        />
                        <p className="mt-3 text-sm text-[#9CA3AF]">
                          Paste a public profile link like `https://music.youtube.com/@27_pranavchopdekar68` to build a lightweight public profile preview.
                        </p>
                        <p className="mt-3 text-xs text-[#9CA3AF]">
                          Full analytics still require `watch-history.json` or Last.fm Live Mode because YouTube Music public profiles do not expose private listening history.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-6">
                  <label className="block text-sm font-semibold text-white">
                    Last.fm Username or Profile URL
                  </label>
                  <input
                    className="mt-3 w-full rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none transition placeholder:text-[#9CA3AF] focus:border-[#D4A853]"
                    onChange={(event) => setLastFmUsername(event.target.value)}
                    placeholder="Enter a username or paste https://www.last.fm/user/..."
                    type="text"
                    value={lastFmUsername}
                  />
                  <p className="mt-3 text-sm text-[#9CA3AF]">
                    Live Mode accepts either a plain username or a full Last.fm profile link, then pulls recent tracks, top artists, and top tracks into the same dashboard schema.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                  {sourceMode === "takeout" ? (
                    <>
                      {file ? (
                        <p className="text-sm text-[#9CA3AF]">
                          Selected file: <span className="font-medium text-white">{file.name}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-[#9CA3AF]">No file selected yet.</p>
                      )}
                      {youtubeMusicProfileUrl ? (
                        <p className="text-sm text-[#9CA3AF]">
                          Profile link: <span className="break-all text-white">{youtubeMusicProfileUrl}</span>
                        </p>
                      ) : null}
                      <p className="text-xs text-[#9CA3AF]">
                        The button uses your file if one is selected. Otherwise, it uses the YouTube Music profile link.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">
                      Last.fm user: <span className="text-white">{lastFmUsername || "not set"}</span>
                    </p>
                  )}

                  {isUploading ? <LoadingSpinner /> : null}
                  {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                  {actionMessage ? (
                    <p className="text-sm text-[#F0D080]">{actionMessage}</p>
                  ) : null}
                </div>

                <button
                  className="rounded-full border border-[#D4A853] bg-[#D4A853] px-6 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-300"
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
          <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Unique Songs</p>
            <p className="mt-3 text-3xl font-semibold text-white">{uniqueSongs}</p>
          </div>
          <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Total Plays</p>
            <p className="mt-3 text-3xl font-semibold text-white">{totalPlays}</p>
          </div>
          <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
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

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Timeframe"
            subtitle="Choose the listening window you want this dashboard and recap to analyze."
          >
            <div className="flex flex-wrap gap-3">
              {(Object.keys(TIMEFRAME_LABELS) as TimeframeOption[]).map((option) => (
                <button
                  key={option}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    timeframe === option
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setTimeframe(option)}
                  type="button"
                >
                  {TIMEFRAME_LABELS[option]}
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Instant Recap"
            subtitle="Turn this listening profile into a cinematic, story-style recap whenever you want."
          >
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="max-w-2xl text-base text-[#9CA3AF]">
                  Launch a full-screen recap built from your total listening time, top song, artist orbit, genre DNA, mood signature, peak listening window, and passport finale.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                    onClick={() => setIsRecapOpen(true)}
                    type="button"
                  >
                    Launch recap
                  </button>
                  <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                    7 slides
                  </span>
                  <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                    autoplay on
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Open</p>
                  <p className="mt-2 text-sm font-semibold text-white">Listening scale</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Middle</p>
                  <p className="mt-2 text-sm font-semibold text-white">Genre and mood</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Finale</p>
                  <p className="mt-2 text-sm font-semibold text-white">Passport card</p>
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        {passportData ? (
          <Section
            title="Music Passport"
            subtitle="A shareable summary card you can export as a PNG or copy as a read-only link."
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="overflow-x-auto">
                <div
                  ref={passportRef}
                  className="w-fit rounded-[2.5rem] bg-[#09131d] p-5"
                >
                  <MusicPassportCard data={passportData} />
                </div>
              </div>

              <div className="flex w-full max-w-sm flex-col gap-3 xl:pt-3">
                <button
                  className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                  onClick={() => void handleExportAsImage()}
                  type="button"
                >
                  Export as Image
                </button>
                <button
                  className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                  onClick={() => void handleCopyShareableLink(passportData)}
                  type="button"
                >
                  Copy Shareable Link
                </button>
                <p className="text-sm text-[#9CA3AF]">
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
              <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-6">
                <div className="flex items-center gap-4">
                  {dashboard?.profileSummary?.thumbnail ? (
                    <img
                      src={dashboard.profileSummary.thumbnail}
                      alt={dashboard.profileSummary.name}
                      className="h-20 w-20 rounded-3xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-3xl bg-[#D4A853]/10" />
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                      YouTube Music
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {dashboard?.profileSummary?.name ?? "Unknown profile"}
                    </h2>
                    <p className="mt-1 text-sm text-[#9CA3AF]">
                      @{dashboard?.profileSummary?.handle ?? dashboard?.username ?? "unknown"}
                    </p>
                  </div>
                </div>

                <a
                  className="mt-6 inline-flex rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                  href={dashboard?.profileSummary?.url ?? youtubeMusicProfileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open profile
                </a>
              </div>

              <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-[#F59E0B]">
                  What this can show
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[#9CA3AF]">
                  <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                    Public profile identity like handle, page title, and artwork when available
                  </div>
                  <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                    A quick preview path when you only have a `music.youtube.com/@...` link
                  </div>
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                    Not available from a public profile link: private play counts, top songs, listening streaks, timestamps, and heatmaps
                  </div>
                </div>

                <p className="mt-5 text-sm text-[#9CA3AF]">
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
                    <p className="text-sm uppercase tracking-[0.3em] text-[#F59E0B]">
                      Total listening time
                    </p>
                    {dashboard?.source === "lastfm" ? (
                      <span className="rounded-full border border-[#D4A853]/20 bg-[#D4A853]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F0D080]">
                        Live Mode
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-4xl font-semibold text-white md:text-6xl">
                    {heroHours}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm text-[#9CA3AF] md:text-base">
                    Based on source data currently loaded into the dashboard.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                    <p className="text-sm text-[#9CA3AF]">Top song</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {topSongs[0]?.title ?? "No data yet"}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                    <p className="text-sm text-[#9CA3AF]">Top artist</p>
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
                    <XAxis type="number" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
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
                      stroke="#9CA3AF"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
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
                      <div key={entry.genre} className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            <span className="font-medium text-white">{entry.genre}</span>
                          </div>
                          <span className="text-sm text-[#9CA3AF]">{entry.percentage}%</span>
                        </div>
                        <p className="mt-2 text-sm text-[#9CA3AF]">{entry.count} plays</p>
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
                      <XAxis dataKey="mood" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
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
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt={entry.title} className="h-16 w-16 rounded-2xl object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-[#D4A853]/10" />
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-white">{entry.title}</h3>
                        <p className="text-sm text-[#9CA3AF]">{entry.artist}</p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">{entry.tags.slice(0, 3).join(" | ") || "No tags"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#D4A853]/10 px-3 py-1 text-xs text-[#F0D080]">{entry.playCount} plays</span>
                      <span className="rounded-full bg-[#111827] px-3 py-1 text-xs text-[#9CA3AF]">{entry.duration}</span>
                      {entry.timestamps[0] ? <span className="rounded-full bg-[#111827] px-3 py-1 text-xs text-[#9CA3AF]">{formatTimestamp(entry.timestamps[0])}</span> : null}
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
            <div className="rounded-[1.75rem] border border-dashed border-[#1E293B] bg-[#111827] px-6 py-16 text-center text-[#9CA3AF]">
              Your dashboard and shareable passport will appear here after data loads successfully.
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}
