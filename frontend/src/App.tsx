import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  Suspense,
  lazy,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import html2canvas from "html2canvas";
import { MusicPassportCard, type MusicPassportData } from "./components/MusicPassportCard";
import {
  ChartSkeleton,
  LoadingSpinner,
  Section
} from "./components/DashboardBits";
import type {
  AchievementBadge,
  DashboardUploadResponse,
  DashboardResponse,
  MemoryLaneEntry,
  PlaylistBundle,
  PlaylistMode,
  PersonaProfile,
  ParsedHistoryEntry,
  PublicProfileSharePayload,
  RecapThemePack,
  RecapVariant,
  SavedSession,
  SmartInsight,
  TasteEvolutionPoint,
  TimeframeOption,
  UploadQualitySummary,
} from "./lib/types";
import {
  PROFILE_SHARE_PARAM,
  SHARE_PARAM,
  buildAchievementBadges,
  buildMemoryLane,
  buildPassportData,
  buildPlaylistBundles,
  buildPublicProfileSharePayload,
  buildGenreBreakdownFromHistory,
  buildMoodTimelineFromHistory,
  buildPersonaProfile,
  buildSmartInsights,
  buildStatsPayloadFromHistory,
  buildTasteEvolution,
  copyText,
  decodePublicProfilePayload,
  decodeSharePayload,
  downloadTextFile,
  filterHistoryByTimeframe,
  filterHistoryBySearchAndFacets,
  formatHours,
  getPublicProfileUrl,
  getShareUrl,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  playlistToText,
  postFile,
  postJson,
  RECAP_VARIANT_LABELS,
  TIMEFRAME_COMPARE_OPTIONS,
  TIMEFRAME_LABELS,
  buildSavedSession
} from "./lib/utils";

type SourceMode = "takeout" | "unified-takeout" | "lastfm";
type DashboardDensity = "simple" | "full";
const RecapView = lazy(() =>
  import("./components/RecapView").then((module) => ({ default: module.RecapView }))
);
const DashboardAdvancedSections = lazy(() =>
  import("./components/DashboardAdvancedSections").then((module) => ({
    default: module.DashboardAdvancedSections
  }))
);
const DashboardOverviewSections = lazy(() =>
  import("./components/DashboardOverviewSections").then((module) => ({
    default: module.DashboardOverviewSections
  }))
);

const DASHBOARD_THEME_PACKS: Record<
  RecapThemePack,
  {
    pageBg: string;
    panelBg: string;
    panelAlt: string;
    panelMuted: string;
    panelBorder: string;
    heading: string;
    subtext: string;
    accent: string;
    accentSoft: string;
    heroGradient: string;
    heroGlow: string;
    chartPrimary: string;
    chartSecondary: string;
    chartTertiary: string;
    pieColors: string[];
  }
> = {
  "gold-noir": {
    pageBg: "#0A0F1E",
    panelBg: "#111827",
    panelAlt: "#0F172A",
    panelMuted: "#1F2937",
    panelBorder: "#1E293B",
    heading: "#FFFFFF",
    subtext: "#9CA3AF",
    accent: "#D4A853",
    accentSoft: "#F0D080",
    heroGradient: "linear-gradient(135deg,#0E1626 0%,#2A1B32 52%,#6B4331 100%)",
    heroGlow: "radial-gradient(circle_at_top_left,rgba(212,168,83,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(124,58,90,0.14),transparent_28%)",
    chartPrimary: "#D4A853",
    chartSecondary: "#C46B7B",
    chartTertiary: "#8C6CD8",
    pieColors: ["#D4A853", "#C46B7B", "#8C6CD8", "#F0D080", "#6B8A87", "#B97D3C"]
  },
  "violet-dusk": {
    pageBg: "#090B18",
    panelBg: "#14132A",
    panelAlt: "#1B1837",
    panelMuted: "#28224A",
    panelBorder: "#312A59",
    heading: "#FFFFFF",
    subtext: "#B2AED1",
    accent: "#C084FC",
    accentSoft: "#E9D5FF",
    heroGradient: "linear-gradient(135deg,#17152F 0%,#39205A 48%,#6A2A5C 100%)",
    heroGlow: "radial-gradient(circle_at_top_left,rgba(192,132,252,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.16),transparent_28%)",
    chartPrimary: "#C084FC",
    chartSecondary: "#F472B6",
    chartTertiary: "#F59E0B",
    pieColors: ["#C084FC", "#F472B6", "#F59E0B", "#E9D5FF", "#A78BFA", "#FB7185"]
  },
  "teal-afterglow": {
    pageBg: "#07121A",
    panelBg: "#0F1F28",
    panelAlt: "#122B36",
    panelMuted: "#1C3A47",
    panelBorder: "#224454",
    heading: "#F8FAFC",
    subtext: "#9FB7BE",
    accent: "#5EEAD4",
    accentSoft: "#CCFBF1",
    heroGradient: "linear-gradient(135deg,#0B1822 0%,#123944 48%,#29515A 100%)",
    heroGlow: "radial-gradient(circle_at_top_left,rgba(94,234,212,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(212,168,83,0.14),transparent_28%)",
    chartPrimary: "#5EEAD4",
    chartSecondary: "#2DD4BF",
    chartTertiary: "#D4A853",
    pieColors: ["#5EEAD4", "#2DD4BF", "#D4A853", "#CCFBF1", "#14B8A6", "#7DD3FC"]
  }
};
const PREFERENCES_STORAGE_KEY = "auralize-dashboard-preferences";
const SAVED_SESSIONS_STORAGE_KEY = "auralize-saved-sessions";

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
  const prefersReducedMotion = useReducedMotion();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [sourceMode, setSourceMode] = useState<SourceMode>("takeout");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeMusicProfileUrl, setYoutubeMusicProfileUrl] = useState("");
  const [lastFmUsername, setLastFmUsername] = useState("");
  const [parsedHistory, setParsedHistory] = useState<ParsedHistoryEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sharedPassport, setSharedPassport] = useState<MusicPassportData | null>(null);
  const [sharedProfile, setSharedProfile] = useState<PublicProfileSharePayload | null>(null);
  const [uploadQuality, setUploadQuality] = useState<UploadQualitySummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all");
  const [recapTheme, setRecapTheme] = useState<RecapThemePack>("gold-noir");
  const [recapVariant, setRecapVariant] = useState<RecapVariant>("auto");
  const [dashboardDensity, setDashboardDensity] = useState<DashboardDensity>("simple");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPlaylistId] = useState<PlaylistMode>("top");
  const [compareTimeframe, setCompareTimeframe] = useState<TimeframeOption>("90d");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const passportRef = useRef<HTMLDivElement | null>(null);
  const passportExportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    const publicProfileEncoded = new URLSearchParams(window.location.search).get(PROFILE_SHARE_PARAM);
    if (publicProfileEncoded) {
      try {
        setSharedProfile(decodePublicProfilePayload(publicProfileEncoded));
        setSharedPassport(null);
        setError(null);
      } catch {
        setError("The shared public profile link is invalid or corrupted.");
      }
      return;
    }

    const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!encoded) {
      return;
    }

    try {
      setSharedPassport(decodeSharePayload(encoded));
      setSharedProfile(null);
      setError(null);
    } catch {
      setError("The shared music passport link is invalid or corrupted.");
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw) as Partial<{
        timeframe: TimeframeOption;
        recapTheme: RecapThemePack;
        recapVariant: RecapVariant;
        dashboardDensity: DashboardDensity;
      }>;

      if (saved.timeframe) {
        setTimeframe(saved.timeframe);
      }
      if (saved.recapTheme) {
        setRecapTheme(saved.recapTheme);
      }
      if (saved.recapVariant) {
        setRecapVariant(saved.recapVariant);
      }
      if (saved.dashboardDensity) {
        setDashboardDensity(saved.dashboardDensity);
      }
    } catch {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      setSavedSessions(JSON.parse(raw) as SavedSession[]);
    } catch {
      window.localStorage.removeItem(SAVED_SESSIONS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        timeframe,
        recapTheme,
        recapVariant,
        dashboardDensity
      })
    );
  }, [timeframe, recapTheme, recapVariant, dashboardDensity]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_SESSIONS_STORAGE_KEY, JSON.stringify(savedSessions));
  }, [savedSessions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowIntro(false);
    }, prefersReducedMotion ? 150 : 2100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  const isYoutubeProfileMode = dashboard?.source === "youtube-profile";
  const timeframeEntries = useMemo(() => {
    if (!dashboard?.stats?.rawEnrichedHistory || isYoutubeProfileMode) {
      return [];
    }

    return filterHistoryByTimeframe(dashboard.stats.rawEnrichedHistory, timeframe);
  }, [dashboard?.stats?.rawEnrichedHistory, isYoutubeProfileMode, timeframe]);
  const filteredEntries = useMemo(() => {
    if (!timeframeEntries.length) {
      return [];
    }

    return filterHistoryBySearchAndFacets(timeframeEntries, {
      searchTerm: deferredSearchTerm,
      genre: selectedGenre,
      artist: selectedArtist,
      mood: selectedMood
    });
  }, [timeframeEntries, deferredSearchTerm, selectedGenre, selectedArtist, selectedMood]);

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
  const tasteEvolution = useMemo<TasteEvolutionPoint[]>(() => {
    if (!stats || isYoutubeProfileMode) {
      return [];
    }

    return buildTasteEvolution(stats.rawEnrichedHistory, timeframe);
  }, [stats, isYoutubeProfileMode, timeframe]);
  const smartInsights = useMemo<SmartInsight[]>(() => {
    if (!stats || isYoutubeProfileMode) {
      return [];
    }

    return buildSmartInsights(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode]);
  const personaProfile = useMemo<PersonaProfile | null>(() => {
    if (!stats || isYoutubeProfileMode) {
      return null;
    }

    return buildPersonaProfile(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode]);
  const memoryLane = useMemo<MemoryLaneEntry[]>(() => {
    if (!stats || isYoutubeProfileMode) {
      return [];
    }

    return buildMemoryLane(stats.rawEnrichedHistory);
  }, [stats, isYoutubeProfileMode]);
  const achievementBadges = useMemo<AchievementBadge[]>(() => {
    if (!stats || isYoutubeProfileMode) {
      return [];
    }

    return buildAchievementBadges(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode]);
  const artistOptions = useMemo(
    () => Array.from(new Set(timeframeEntries.map((entry) => entry.artist))).sort((a, b) => a.localeCompare(b)),
    [timeframeEntries]
  );
  const genreOptions = useMemo(
    () =>
      Array.from(new Set(timeframeEntries.map((entry) => buildGenreBreakdownFromHistory([entry])[0]?.genre ?? "Other"))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [timeframeEntries]
  );
  const moodOptions = useMemo(
    () => buildMoodTimelineFromHistory(timeframeEntries).map((entry) => entry.mood),
    [timeframeEntries]
  );
  const playlistBundles = useMemo<PlaylistBundle[]>(() => {
    if (!stats || isYoutubeProfileMode) {
      return [];
    }

    return buildPlaylistBundles(stats.rawEnrichedHistory, moodTimeline);
  }, [stats, moodTimeline, isYoutubeProfileMode]);
  const selectedPlaylist = useMemo(
    () => playlistBundles.find((bundle) => bundle.id === selectedPlaylistId) ?? playlistBundles[0] ?? null,
    [playlistBundles, selectedPlaylistId]
  );
  const sourceLabel = useMemo(() => {
    if (dashboard?.source === "lastfm") {
      return "Last.fm Live Mode";
    }
    if (dashboard?.source === "unified-takeout") {
      return "YouTube Music + YouTube Music Plays";
    }
    if (dashboard?.source === "youtube-profile") {
      return "YouTube Music Public Profile";
    }
    return "Google Takeout";
  }, [dashboard?.source]);
  const dashboardTheme = useMemo(() => DASHBOARD_THEME_PACKS[recapTheme], [recapTheme]);
  const isSimpleDashboard = dashboardDensity === "simple";
  const shouldShowAdvancedInsights = stats && !isYoutubeProfileMode && dashboardDensity === "full";
  const publicProfilePayload = useMemo(() => {
    if (!stats || !passportData) {
      return null;
    }

    return buildPublicProfileSharePayload({
      stats,
      genreBreakdown,
      moodTimeline,
      passportData,
      persona: personaProfile,
      timeframeLabel: TIMEFRAME_LABELS[timeframe],
      sourceLabel
    });
  }, [stats, passportData, genreBreakdown, moodTimeline, personaProfile, timeframe, sourceLabel]);
  const comparisonEntries = useMemo(() => {
    if (!dashboard?.stats?.rawEnrichedHistory || isYoutubeProfileMode) {
      return [];
    }

    return filterHistoryByTimeframe(dashboard.stats.rawEnrichedHistory, compareTimeframe);
  }, [dashboard?.stats?.rawEnrichedHistory, compareTimeframe, isYoutubeProfileMode]);
  const comparisonStats = useMemo(() => {
    if (!comparisonEntries.length || isYoutubeProfileMode) {
      return null;
    }
    return buildStatsPayloadFromHistory(comparisonEntries);
  }, [comparisonEntries, isYoutubeProfileMode]);
  const comparisonGenreBreakdown = useMemo(() => {
    if (!comparisonEntries.length || isYoutubeProfileMode) {
      return [];
    }
    return buildGenreBreakdownFromHistory(comparisonEntries);
  }, [comparisonEntries, isYoutubeProfileMode]);

  function scrollToSection(sectionId: string) {
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function handleSaveSession() {
    if (!dashboard) {
      return;
    }

    const session = buildSavedSession({
      dashboard,
      timeframe,
      sourceLabel
    });

    setSavedSessions((current) => [session, ...current].slice(0, 8));
    setActionMessage(`Saved session: ${session.name}`);
  }

  function handleRestoreSession(session: SavedSession) {
    setDashboard(session.dashboard);
    setTimeframe(session.timeframe);
    setParsedHistory([]);
    setUploadQuality(null);
    setIsRecapOpen(false);
    setActionMessage(`Restored session: ${session.name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteSession(sessionId: string) {
    setSavedSessions((current) => current.filter((session) => session.id !== sessionId));
  }

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

  async function handleCopyPublicProfileLink(payload: PublicProfileSharePayload) {
    await copyText(getPublicProfileUrl(payload));
    setActionMessage("Public profile link copied to clipboard.");
  }

  function handleExportDashboardJson(payload: PublicProfileSharePayload) {
    downloadTextFile(
      "auralize-dashboard-summary.json",
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    setActionMessage("Dashboard summary exported as JSON.");
  }

  function handleExportPlaylist(bundle: PlaylistBundle) {
    downloadTextFile(
      `${bundle.id}-playlist.txt`,
      playlistToText(bundle)
    );
    setActionMessage(`${bundle.title} exported as a playlist text file.`);
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
      setUploadQuality(null);
      setIsRecapOpen(false);
      setTimeframe("all");
      return;
    }

    const selectedFile = file;
    if (!selectedFile) {
      setError("Choose a watch-history.json file or paste a YouTube Music profile link first.");
      return;
    }

    const analysisPayload = await postFile<DashboardUploadResponse>("/analyze", selectedFile);
    setParsedHistory(analysisPayload.entries);
    setUploadQuality(analysisPayload.quality);
    setDashboard(analysisPayload.dashboard);
    setIsRecapOpen(false);
    setTimeframe("all");
  }

  async function handleUnifiedTakeoutSubmit() {
    if (!file) {
      setError("Choose a watch-history.json file first.");
      return;
    }

    const selectedFile = file;
    const analysisPayload = await postFile<DashboardUploadResponse>("/analyze-unified", selectedFile);
    setParsedHistory(analysisPayload.entries);
    setUploadQuality(analysisPayload.quality);
    setDashboard(analysisPayload.dashboard);
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
    setUploadQuality(null);
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
      } else if (sourceMode === "unified-takeout") {
        await handleUnifiedTakeoutSubmit();
      } else {
        await handleLastFmSubmit();
      }

      setSharedPassport(null);
      setSharedProfile(null);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Request failed.");
      setParsedHistory([]);
      setDashboard(null);
      setUploadQuality(null);
    } finally {
      setIsUploading(false);
    }
  }

  if (sharedProfile) {
    return (
      <main className="relative isolate min-h-screen px-4 py-8 text-slate-100 md:px-6">
        <motion.div className="scroll-glow" style={{ scaleX: progressScale }} />
        <AmbientMusicScene />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
          <motion.section
            className="rounded-[2rem] border border-[#1E293B] bg-[#111827] p-6 md:p-8 backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-sm uppercase tracking-[0.35em] text-[#F59E0B]">
              Public Listening Profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {sharedProfile.timeframeLabel} listening snapshot
            </h1>
            <p className="mt-3 max-w-2xl text-[#9CA3AF]">
              Shared from Auralize as a read-only profile page for {sharedProfile.sourceLabel}.
            </p>
          </motion.section>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Section
              title="Profile Summary"
              subtitle="A quick read on the listening identity inside this shared snapshot."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Top Artist</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {sharedProfile.passport.topArtist.name}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Listening Time</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {sharedProfile.passport.totalListeningHours.toFixed(1)} hrs
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Dominant Genre</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {sharedProfile.passport.dominantGenre}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Dominant Mood</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {sharedProfile.passport.dominantMood}
                  </p>
                </div>
              </div>
              {sharedProfile.persona ? (
                <div className="mt-5 rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Persona</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {sharedProfile.persona.title}
                  </p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">
                    {sharedProfile.persona.subtitle}
                  </p>
                </div>
              ) : null}
            </Section>

            <Section
              title="Top Songs"
              subtitle="The tracks that define this shared listening profile."
            >
              <div className="grid gap-3">
                {sharedProfile.stats.topSongs.slice(0, 6).map((song) => (
                  <article
                    key={song.videoId}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-4"
                  >
                    {song.thumbnail ? (
                      <img src={song.thumbnail} alt={song.title} className="h-16 w-16 rounded-2xl object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-[#D4A853]/10" />
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white">{song.title}</h3>
                      <p className="truncate text-sm text-[#9CA3AF]">{song.artist}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </main>
    );
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
    <main
      className="relative isolate min-h-screen px-4 py-6 text-slate-100 md:px-6 lg:px-8"
      style={
        {
          backgroundColor: dashboardTheme.pageBg,
          ["--panel-bg" as string]: dashboardTheme.panelBg,
          ["--panel-alt" as string]: dashboardTheme.panelAlt,
          ["--panel-muted" as string]: dashboardTheme.panelMuted,
          ["--panel-border" as string]: dashboardTheme.panelBorder,
          ["--heading" as string]: dashboardTheme.heading,
          ["--subtext" as string]: dashboardTheme.subtext,
          ["--accent" as string]: dashboardTheme.accent,
          ["--accent-soft" as string]: dashboardTheme.accentSoft
        } as Record<string, string>
      }
    >
      <motion.div className="scroll-glow" style={{ scaleX: progressScale }} />
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro-splash"
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#060812]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] } }}
          >
            <motion.div
              className="intro-splash-card"
              initial={{ opacity: 0, scale: 0.96, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.02, y: -12, filter: "blur(8px)" }}
              transition={{ duration: 1.25, ease: [0.19, 1, 0.22, 1] }}
            >
              <motion.div
                className="intro-splash-ring"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
              />
              <motion.p
                className="intro-splash-kicker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.16, ease: [0.19, 1, 0.22, 1] }}
              >
                Auralize
              </motion.p>
              <motion.h1
                className="intro-splash-title"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.05, delay: 0.28, ease: [0.19, 1, 0.22, 1] }}
              >
                Your listening world, coming into focus.
              </motion.h1>
              <motion.p
                className="intro-splash-copy"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.95, delay: 0.48, ease: [0.19, 1, 0.22, 1] }}
              >
                Loading your dashboard, recap, and music passport.
              </motion.p>
              <motion.div
                className="intro-splash-progress"
                initial={{ scaleX: 0, opacity: 0.6 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0.01 : 1.7,
                  delay: 0.42,
                  ease: [0.19, 1, 0.22, 1]
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AmbientMusicScene />
      {passportData ? (
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
          <div ref={passportExportRef} className="w-fit bg-[#06070b]">
            <MusicPassportCard data={passportData} />
          </div>
        </div>
      ) : null}
      {stats && !isYoutubeProfileMode ? (
        <Suspense fallback={null}>
          <RecapView
            isOpen={isRecapOpen}
            onClose={() => setIsRecapOpen(false)}
            stats={stats}
            genreBreakdown={genreBreakdown}
            moodTimeline={moodTimeline}
            passportData={passportData}
            timeframeLabel={TIMEFRAME_LABELS[timeframe]}
            themePack={recapTheme}
            variant={recapVariant}
          />
        </Suspense>
      ) : null}
      <motion.div
        className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 md:gap-8"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12, filter: "blur(8px)" }}
        animate={
          prefersReducedMotion
            ? { opacity: 1, y: 0, filter: "blur(0px)" }
            : { opacity: showIntro ? 0.22 : 1, y: showIntro ? 12 : 0, filter: showIntro ? "blur(8px)" : "blur(0px)" }
        }
        transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
      >
        <motion.section
          className="relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur md:p-8"
          style={{
            borderColor: dashboardTheme.panelBorder,
            background: dashboardTheme.heroGradient
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0" style={{ backgroundImage: dashboardTheme.heroGlow }} />
          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: dashboardTheme.accent }}>
                  Your Music DNA
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
                  Upload your history, paste a profile, or switch to live scrobbles.
                </h1>
                <p className="mt-4 max-w-3xl text-sm text-[#9CA3AF] md:text-lg">
                  Use Google Takeout for YouTube Music-only analytics, switch to the unified YouTube tab to include music plays from the main YouTube app too, paste a YouTube Music profile link for a lightweight public preview, or use Last.fm Live Mode for a fresh snapshot of your listening identity.
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
                    sourceMode === "unified-takeout"
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setSourceMode("unified-takeout")}
                  type="button"
                >
                  YouTube + Music
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
              ) : sourceMode === "unified-takeout" ? (
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
                  <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                      <div className="mb-4 rounded-full border border-[#1E293B] bg-[#182234] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                        Unified Music Mode
                      </div>
                      <p className="text-xl font-semibold text-white">
                        Drop watch-history.json here
                      </p>
                      <p className="mt-2 text-sm text-[#9CA3AF]">
                        This mode keeps YouTube Music plays and also pulls in music-like watches from the regular YouTube app.
                      </p>
                      <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                        Auralize will filter out searches and non-music YouTube videos so the dashboard still stays focused on songs, remixes, lyric videos, and music videos.
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
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                      <p className="text-sm font-semibold text-white">What gets included</p>
                      <div className="mt-4 grid gap-3 text-sm text-[#9CA3AF]">
                        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                          Plays from YouTube Music
                        </div>
                        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                          Music videos, lyric videos, official audios, remixes, and Topic uploads from regular YouTube
                        </div>
                        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                          Non-music YouTube content is excluded after metadata enrichment
                        </div>
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
                  {sourceMode === "takeout" || sourceMode === "unified-takeout" ? (
                    <>
                      {file ? (
                        <p className="text-sm text-[#9CA3AF]">
                          Selected file: <span className="font-medium text-white">{file.name}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-[#9CA3AF]">No file selected yet.</p>
                      )}
                      {sourceMode === "takeout" && youtubeMusicProfileUrl ? (
                        <p className="text-sm text-[#9CA3AF]">
                          Profile link: <span className="break-all text-white">{youtubeMusicProfileUrl}</span>
                        </p>
                      ) : null}
                      {sourceMode === "takeout" ? (
                        <p className="text-xs text-[#9CA3AF]">
                          The button uses your file if one is selected. Otherwise, it uses the YouTube Music profile link.
                        </p>
                      ) : (
                        <p className="text-xs text-[#9CA3AF]">
                          Unified mode uses the same Takeout file, but expands the analysis to music plays from both YouTube Music and the main YouTube app.
                        </p>
                      )}
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
                    : sourceMode === "takeout" || sourceMode === "unified-takeout"
                      ? "Build dashboard or preview"
                      : "Start Live Mode"}
                </button>
              </div>
            </form>
          </div>
        </motion.section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-bg,#111827)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Unique Songs</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--heading,#FFFFFF)]">{uniqueSongs}</p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-bg,#111827)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Total Plays</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--heading,#FFFFFF)]">{totalPlays}</p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-bg,#111827)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
              {dashboard?.source === "lastfm"
                ? "Live User"
                : isYoutubeProfileMode
                  ? "Profile Handle"
                  : "Parsed Tracks"}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--heading,#FFFFFF)]">
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

        {uploadQuality?.warnings.length ? (
          <Section
            title="Data Quality"
            subtitle="Auralize detected a few signals worth keeping in mind while reading this dashboard."
          >
            <div className="grid gap-3">
              {uploadQuality.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-[1.4rem] border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100"
                >
                  {warning}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Dashboard Mode"
            subtitle="Keep the page focused with the core story, or open the full analytics stack when you want the deeper read."
          >
            <div className="flex flex-wrap gap-3">
              {(["simple", "full"] as DashboardDensity[]).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    dashboardDensity === mode
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setDashboardDensity(mode)}
                  type="button"
                >
                  {mode === "simple" ? "Simple view" : "Full view"}
                </button>
              ))}
              <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                {dashboardDensity === "simple"
                  ? "Core story only"
                  : "Deeper analytics unlocked"}
              </span>
            </div>
          </Section>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Search And Filters"
            subtitle="Slice the dashboard by song search, artist, genre, or mood and let the rest of the page update with it."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Search</span>
                <input
                  className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none placeholder:text-[#9CA3AF] focus:border-[#67C3C0]"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Song, artist, tag"
                  type="text"
                  value={searchTerm}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Genre</span>
                <select
                  className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
                  onChange={(event) => setSelectedGenre(event.target.value)}
                  value={selectedGenre}
                >
                  <option value="">All genres</option>
                  {genreOptions.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Artist</span>
                <select
                  className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
                  onChange={(event) => setSelectedArtist(event.target.value)}
                  value={selectedArtist}
                >
                  <option value="">All artists</option>
                  {artistOptions.map((artist) => (
                    <option key={artist} value={artist}>
                      {artist}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Mood</span>
                <select
                  className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
                  onChange={(event) => setSelectedMood(event.target.value)}
                  value={selectedMood}
                >
                  <option value="">All moods</option>
                  {moodOptions.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#1E293B] bg-[#0F172A] px-4 py-2 text-sm text-[#9CA3AF]">
                {filteredEntries.length} songs in current filtered view
              </span>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGenre("");
                  setSelectedArtist("");
                  setSelectedMood("");
                }}
                type="button"
              >
                Clear filters
              </button>
            </div>
          </Section>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Compare View"
            subtitle="Compare the current dashboard window against another timeframe from the same listening archive."
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                    Comparison timeframe
                  </span>
                  <select
                    className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                    onChange={(event) => setCompareTimeframe(event.target.value as TimeframeOption)}
                    value={compareTimeframe}
                  >
                    {TIMEFRAME_COMPARE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {TIMEFRAME_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Current window</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{TIMEFRAME_LABELS[timeframe]}</p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">
                    {stats.rawEnrichedHistory.length} songs, {formatHours(stats.totalListeningMinutes)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Listening time</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {comparisonStats ? formatHours(comparisonStats.totalListeningMinutes) : "0.0 hrs"}
                  </p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">
                    {comparisonStats
                      ? `${Math.round(stats.totalListeningMinutes - comparisonStats.totalListeningMinutes)} min delta vs current`
                      : "No comparable data yet"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Top artist</p>
                  <p className="mt-3 text-xl font-semibold text-white">
                    {comparisonStats?.topArtists[0]?.artist ?? "No data"}
                  </p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">
                    Current: {topArtists[0]?.artist ?? "No data"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Top genre</p>
                  <p className="mt-3 text-xl font-semibold text-white">
                    {comparisonGenreBreakdown[0]?.genre ?? "Other"}
                  </p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">
                    Current: {genreBreakdown[0]?.genre ?? "Other"}
                  </p>
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        {stats ? (
          <Section
            title="Saved Sessions"
            subtitle="Save snapshots of your current dashboard and restore them later without re-uploading."
          >
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                onClick={handleSaveSession}
                type="button"
              >
                Save current session
              </button>
              <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                {savedSessions.length} saved locally
              </span>
            </div>
            {savedSessions.length ? (
              <div className="mt-5 grid gap-3">
                {savedSessions.map((session) => (
                  <article
                    key={session.id}
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-white">{session.name}</h3>
                      <p className="mt-1 text-sm text-[#9CA3AF]">
                        {session.sourceLabel} · {TIMEFRAME_LABELS[session.timeframe]} · {new Date(session.savedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                        onClick={() => handleRestoreSession(session)}
                        type="button"
                      >
                        Restore
                      </button>
                      <button
                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        onClick={() => handleDeleteSession(session.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#9CA3AF]">
                No saved sessions yet. Save one after generating a dashboard to build your own listening archive.
              </p>
            )}
          </Section>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <div
            className="sticky top-4 z-20 rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] p-3 backdrop-blur-xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--panel-bg,#111827) 92%, transparent)" }}
          >
            <div className="flex flex-wrap gap-3">
              {[
                ["overview", "Overview"],
                ["habits", "Habits"],
                ["share", "Share"],
                ...(dashboardDensity === "full" ? [["deep-dive", "Deep Dive"]] : [])
              ].map(([sectionId, label]) => (
                <button
                  key={sectionId}
                  className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                  onClick={() => scrollToSection(sectionId)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stats && !isYoutubeProfileMode ? (
          <Section
            title="Instant Recap"
            subtitle="Turn this listening profile into a cinematic, story-style recap whenever you want."
          >
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <p className="max-w-2xl text-base text-[#9CA3AF]">
                  Launch a full-screen recap built from your total listening time, top song, artist orbit, genre DNA, mood signature, peak listening window, and passport finale.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                      Recap Variant
                    </span>
                    <select
                      className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                      onChange={(event) => setRecapVariant(event.target.value as RecapVariant)}
                      value={recapVariant}
                    >
                      {(Object.keys(RECAP_VARIANT_LABELS) as RecapVariant[]).map((variant) => (
                        <option key={variant} value={variant}>
                          {RECAP_VARIANT_LABELS[variant]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                      Theme Pack
                    </span>
                    <select
                      className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                      onChange={(event) => setRecapTheme(event.target.value as RecapThemePack)}
                      value={recapTheme}
                    >
                      <option value="gold-noir">Gold Noir</option>
                      <option value="violet-dusk">Violet Dusk</option>
                      <option value="teal-afterglow">Teal Afterglow</option>
                    </select>
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                    onClick={() => setIsRecapOpen(true)}
                    type="button"
                  >
                    Launch recap
                  </button>
                  <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                    variant-aware chapters
                  </span>
                  <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                    embedded audio mode
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
                  <p className="mt-2 text-sm font-semibold text-white">Artist web and taste arcs</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Finale</p>
                  <p className="mt-2 text-sm font-semibold text-white">Passport and finale card</p>
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        <div ref={(node) => { sectionRefs.current.share = node; }} className="flex flex-col gap-6">
          {stats && !isYoutubeProfileMode ? (
            <Section
                title="Export Studio"
                subtitle="Package the current view as a profile link, PNG, or structured file."
              >
                <div className="grid gap-3">
                  <button
                    className="rounded-[1.4rem] border border-[#E4A94B] bg-[#E4A94B] px-5 py-4 text-left font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                    onClick={() => void handleExportAsImage()}
                    type="button"
                  >
                    Export passport PNG
                  </button>
                  <button
                    className="rounded-[1.4rem] border border-[#1E293B] bg-[#111827] px-5 py-4 text-left font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
                    onClick={() => passportData && void handleCopyShareableLink(passportData)}
                    type="button"
                  >
                    Copy passport card link
                  </button>
                  <button
                    className="rounded-[1.4rem] border border-[#1E293B] bg-[#111827] px-5 py-4 text-left font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
                    onClick={() => publicProfilePayload && void handleCopyPublicProfileLink(publicProfilePayload)}
                    type="button"
                  >
                    Copy public profile link
                  </button>
                  <button
                    className="rounded-[1.4rem] border border-[#1E293B] bg-[#111827] px-5 py-4 text-left font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
                    onClick={() => publicProfilePayload && handleExportDashboardJson(publicProfilePayload)}
                    type="button"
                  >
                    Export dashboard summary JSON
                  </button>
                  {actionMessage ? (
                    <p className="pt-2 text-sm text-[#9CA3AF]">{actionMessage}</p>
                  ) : null}
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
                  className="w-fit bg-[#06070b]"
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
        </div>

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
            <div ref={(node) => { sectionRefs.current.overview = node; }}>
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
            </div>

            <div ref={(node) => { sectionRefs.current.habits = node; }} className="flex flex-col gap-6">
              <Suspense
                fallback={
                  <>
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
                      <Section title="Listening Habits" subtitle="Mapping your strongest patterns.">
                        <ChartSkeleton />
                      </Section>
                    </div>
                  </>
                }
              >
                <DashboardOverviewSections
                  topSongs={topSongs}
                  topArtists={topArtists}
                  genreBreakdown={genreBreakdown}
                  moodTimeline={moodTimeline}
                  heatmapEntries={heatmapEntries}
                  statsEntries={stats.rawEnrichedHistory}
                  isSimpleDashboard={isSimpleDashboard}
                  dashboardTheme={dashboardTheme}
                />
              </Suspense>
            </div>

            {shouldShowAdvancedInsights ? (
              <div ref={(node) => { sectionRefs.current["deep-dive"] = node; }}>
                <Suspense
                  fallback={
                    <Section title="Loading Insights" subtitle="Preparing the advanced dashboard layer.">
                      <ChartSkeleton heightClass="h-[260px]" />
                    </Section>
                  }
                >
                  <DashboardAdvancedSections
                    selectedPlaylist={selectedPlaylist}
                    onExportPlaylist={handleExportPlaylist}
                    onActionMessage={setActionMessage}
                    personaProfile={personaProfile}
                    smartInsights={smartInsights}
                    tasteEvolution={tasteEvolution}
                    memoryLane={memoryLane}
                    achievementBadges={achievementBadges}
                    recentHistory={stats.rawEnrichedHistory}
                  />
                </Suspense>
              </div>
            ) : null}
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
      </motion.div>
    </main>
  );
}
