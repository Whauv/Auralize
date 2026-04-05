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
import type { MusicPassportData, MusicPassportTheme } from "./components/MusicPassportCard";
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
  buildFileAnalysisCacheKey,
  buildJsonAnalysisCacheKey,
  buildSmartInsights,
  buildStatsPayloadFromHistory,
  buildTasteEvolution,
  classifyGenre,
  copyText,
  decodePublicProfilePayload,
  decodeSharePayload,
  downloadTextFile,
  filterHistoryByTimeframe,
  formatHours,
  getCachedAnalysis,
  getEntryMoodLabels,
  getPublicProfileUrl,
  getShareUrl,
  parseLastFmUsername,
  parseYoutubeMusicProfileUrl,
  playlistToText,
  postFile,
  postJson,
  RECAP_VARIANT_LABELS,
  setCachedAnalysis,
  TIMEFRAME_COMPARE_OPTIONS,
  TIMEFRAME_LABELS,
  buildSavedSession
} from "./lib/utils";

type SourceMode = "takeout" | "unified-takeout" | "apple-music" | "lastfm";
type DashboardDensity = "simple" | "full";
type ExportThemeId =
  | "aurora-noir"
  | "anime-pop"
  | "retro-sunset"
  | "cyber-mint"
  | "sakura-night"
  | "velvet-gold"
  | "ocean-dream"
  | "mono-luxe"
  | "arcade-pulse"
  | "ember-dusk";
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
const MusicPassportCard = lazy(() =>
  import("./components/MusicPassportCard").then((module) => ({
    default: module.MusicPassportCard
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

type ExportThemeDefinition = {
  label: string;
  storyBackground: string;
  storyPanelFill: string;
  storyPanelBorder: string;
  noteColor: string;
  labelColor: string;
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  accentSoft: string;
  rankBackground: string;
  dividerColor: string;
  auroraBands: string[];
  displayFont: string;
  bodyFont: string;
  displayFontLoad: string;
  bodyFontLoad: string;
  passportTheme: MusicPassportTheme;
};

const EXPORT_THEME_OPTIONS: Record<ExportThemeId, ExportThemeDefinition> = {
  "aurora-noir": {
    label: "Aurora Noir",
    storyBackground: "#090d17",
    storyPanelFill: "rgba(34,36,48,0.58)",
    storyPanelBorder: "rgba(255,255,255,0.16)",
    noteColor: "rgba(110,133,255,0.16)",
    labelColor: "rgba(232,236,248,0.82)",
    titleColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.68)",
    accentColor: "#d9b56a",
    accentSoft: "rgba(217,181,106,0.18)",
    rankBackground: "rgba(212,168,83,0.18)",
    dividerColor: "rgba(255,255,255,0.12)",
    auroraBands: [
      "rgba(32,214,196,0.28)",
      "rgba(62,87,255,0.22)",
      "rgba(170,39,112,0.18)",
      "rgba(35,186,164,0.22)",
      "rgba(78,44,190,0.18)",
      "rgba(142,24,86,0.16)"
    ],
    displayFont: "\"Archivo Black\", Arial",
    bodyFont: "\"Instrument Sans\", Arial",
    displayFontLoad: "900 94px Archivo Black",
    bodyFontLoad: "600 24px Instrument Sans",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#090c13 0%,#0f121d 32%,#19131b 68%,#24181a 100%)",
      shellOverlay:
        "radial-gradient(circle at top left,rgba(212,168,83,0.16),transparent 28%),radial-gradient(circle at 85% 14%,rgba(255,255,255,0.05),transparent 20%),radial-gradient(circle at bottom right,rgba(196,107,123,0.12),transparent 24%)",
      ringTint: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.18))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))",
      chipBg: "rgba(255,255,255,0.08)",
      chipText: "#ffffff",
      accentChipBg: "rgba(252,211,77,0.12)",
      accentChipText: "#fff7ed",
      title: "#ffffff",
      subtext: "rgba(255,255,255,0.62)",
      fingerprintTrack: "rgba(255,255,255,0.1)",
      fingerprintGradient: "linear-gradient(90deg,#d4a853 0%,#d9b56a 55%,#c46b7b 100%)",
      displayFont: "\"Archivo Black\", \"Space Grotesk\", sans-serif",
      bodyFont: "\"Instrument Sans\", \"Space Grotesk\", sans-serif"
    }
  },
  "anime-pop": {
    label: "Anime Pop",
    storyBackground: "#11111d",
    storyPanelFill: "rgba(39,28,53,0.55)",
    storyPanelBorder: "rgba(255,215,238,0.16)",
    noteColor: "rgba(255,117,196,0.18)",
    labelColor: "rgba(255,220,240,0.82)",
    titleColor: "#fff8fc",
    subtitleColor: "rgba(255,232,243,0.72)",
    accentColor: "#ff8cc6",
    accentSoft: "rgba(255,140,198,0.18)",
    rankBackground: "rgba(255,140,198,0.2)",
    dividerColor: "rgba(255,200,226,0.12)",
    auroraBands: [
      "rgba(255,120,198,0.28)",
      "rgba(255,196,92,0.16)",
      "rgba(148,111,255,0.22)",
      "rgba(110,227,255,0.18)",
      "rgba(255,84,157,0.16)",
      "rgba(242,163,74,0.14)"
    ],
    displayFont: "\"Bricolage Grotesque\", Arial",
    bodyFont: "\"Manrope\", Arial",
    displayFontLoad: "800 94px Bricolage Grotesque",
    bodyFontLoad: "600 24px Manrope",
    passportTheme: {
      shellBg:
        "linear-gradient(150deg,#140f1f 0%,#2b1438 38%,#4a1e41 72%,#2d1b33 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(255,140,198,0.2),transparent 26%),radial-gradient(circle at 84% 22%,rgba(110,227,255,0.14),transparent 22%),radial-gradient(circle at 72% 86%,rgba(255,196,92,0.14),transparent 24%)",
      ringTint: "rgba(255,255,255,0.05)",
      border: "rgba(255,214,236,0.16)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.08),rgba(27,17,40,0.42))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.1),rgba(35,18,52,0.5))",
      chipBg: "rgba(255,255,255,0.1)",
      chipText: "#fff8fc",
      accentChipBg: "rgba(255,140,198,0.22)",
      accentChipText: "#fff5fb",
      title: "#fff8fc",
      subtext: "rgba(255,232,243,0.72)",
      fingerprintTrack: "rgba(255,255,255,0.12)",
      fingerprintGradient: "linear-gradient(90deg,#ff8cc6 0%,#ffd36e 55%,#6ee3ff 100%)",
      displayFont: "\"Bricolage Grotesque\", \"Space Grotesk\", sans-serif",
      bodyFont: "\"Manrope\", \"Instrument Sans\", sans-serif"
    }
  },
  "retro-sunset": {
    label: "Retro Sunset",
    storyBackground: "#161118",
    storyPanelFill: "rgba(43,31,34,0.56)",
    storyPanelBorder: "rgba(255,210,166,0.16)",
    noteColor: "rgba(255,167,87,0.18)",
    labelColor: "rgba(255,229,199,0.82)",
    titleColor: "#fff8ef",
    subtitleColor: "rgba(255,232,213,0.72)",
    accentColor: "#ffb562",
    accentSoft: "rgba(255,181,98,0.18)",
    rankBackground: "rgba(255,181,98,0.2)",
    dividerColor: "rgba(255,216,182,0.12)",
    auroraBands: [
      "rgba(255,171,77,0.24)",
      "rgba(255,99,132,0.18)",
      "rgba(125,90,255,0.15)",
      "rgba(255,211,128,0.14)",
      "rgba(214,90,130,0.16)",
      "rgba(255,129,95,0.15)"
    ],
    displayFont: "\"Bebas Neue\", Arial",
    bodyFont: "\"Instrument Sans\", Arial",
    displayFontLoad: "400 94px Bebas Neue",
    bodyFontLoad: "600 24px Instrument Sans",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#171117 0%,#2c171b 34%,#4b2228 66%,#2b1515 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(255,181,98,0.18),transparent 26%),radial-gradient(circle at 84% 18%,rgba(255,114,143,0.14),transparent 22%),radial-gradient(circle at 66% 80%,rgba(124,88,255,0.12),transparent 24%)",
      ringTint: "rgba(255,255,255,0.04)",
      border: "rgba(255,218,189,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(44,23,27,0.44))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.07),rgba(63,29,30,0.5))",
      chipBg: "rgba(255,255,255,0.08)",
      chipText: "#fff8ef",
      accentChipBg: "rgba(255,181,98,0.2)",
      accentChipText: "#fff7ed",
      title: "#fff8ef",
      subtext: "rgba(255,232,213,0.7)",
      fingerprintTrack: "rgba(255,255,255,0.1)",
      fingerprintGradient: "linear-gradient(90deg,#ffb562 0%,#ff7c87 52%,#8a74ff 100%)",
      displayFont: "\"Bebas Neue\", \"Archivo Black\", sans-serif",
      bodyFont: "\"Instrument Sans\", sans-serif"
    }
  },
  "cyber-mint": {
    label: "Cyber Mint",
    storyBackground: "#081117",
    storyPanelFill: "rgba(18,34,39,0.56)",
    storyPanelBorder: "rgba(136,255,220,0.16)",
    noteColor: "rgba(95,255,228,0.18)",
    labelColor: "rgba(207,255,245,0.84)",
    titleColor: "#ecfffb",
    subtitleColor: "rgba(206,255,245,0.72)",
    accentColor: "#61f0d0",
    accentSoft: "rgba(97,240,208,0.18)",
    rankBackground: "rgba(97,240,208,0.2)",
    dividerColor: "rgba(174,255,239,0.12)",
    auroraBands: [
      "rgba(95,255,228,0.25)",
      "rgba(54,139,255,0.18)",
      "rgba(0,255,163,0.14)",
      "rgba(135,255,240,0.16)",
      "rgba(75,196,255,0.16)",
      "rgba(39,255,200,0.12)"
    ],
    displayFont: "\"Orbitron\", Arial",
    bodyFont: "\"Manrope\", Arial",
    displayFontLoad: "800 80px Orbitron",
    bodyFontLoad: "600 24px Manrope",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#071017 0%,#092027 36%,#12333a 68%,#07181d 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(95,255,228,0.16),transparent 26%),radial-gradient(circle at 82% 18%,rgba(84,161,255,0.13),transparent 22%),radial-gradient(circle at 70% 82%,rgba(0,255,163,0.1),transparent 24%)",
      ringTint: "rgba(255,255,255,0.03)",
      border: "rgba(136,255,220,0.15)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(8,24,28,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(12,34,39,0.54))",
      chipBg: "rgba(255,255,255,0.07)",
      chipText: "#ecfffb",
      accentChipBg: "rgba(97,240,208,0.18)",
      accentChipText: "#ecfffb",
      title: "#ecfffb",
      subtext: "rgba(206,255,245,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#61f0d0 0%,#65caff 50%,#8dffcb 100%)",
      displayFont: "\"Orbitron\", \"Space Grotesk\", sans-serif",
      bodyFont: "\"Manrope\", \"Instrument Sans\", sans-serif"
    }
  },
  "sakura-night": {
    label: "Sakura Night",
    storyBackground: "#14101a",
    storyPanelFill: "rgba(39,29,40,0.58)",
    storyPanelBorder: "rgba(255,206,220,0.15)",
    noteColor: "rgba(255,164,192,0.18)",
    labelColor: "rgba(255,229,239,0.82)",
    titleColor: "#fff8fb",
    subtitleColor: "rgba(255,228,239,0.72)",
    accentColor: "#f4a6c1",
    accentSoft: "rgba(244,166,193,0.18)",
    rankBackground: "rgba(244,166,193,0.2)",
    dividerColor: "rgba(255,210,228,0.12)",
    auroraBands: [
      "rgba(244,166,193,0.24)",
      "rgba(163,124,255,0.18)",
      "rgba(255,204,224,0.14)",
      "rgba(123,111,247,0.14)",
      "rgba(255,146,193,0.14)",
      "rgba(220,190,255,0.12)"
    ],
    displayFont: "\"Cormorant Garamond\", serif",
    bodyFont: "\"Instrument Sans\", Arial",
    displayFontLoad: "700 96px Cormorant Garamond",
    bodyFontLoad: "600 24px Instrument Sans",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#120f17 0%,#221828 34%,#3a2538 68%,#1f1824 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(244,166,193,0.16),transparent 26%),radial-gradient(circle at 82% 20%,rgba(164,127,255,0.13),transparent 22%),radial-gradient(circle at 66% 82%,rgba(255,220,234,0.12),transparent 24%)",
      ringTint: "rgba(255,255,255,0.04)",
      border: "rgba(255,220,234,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(31,24,36,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(48,31,49,0.54))",
      chipBg: "rgba(255,255,255,0.08)",
      chipText: "#fff8fb",
      accentChipBg: "rgba(244,166,193,0.18)",
      accentChipText: "#fff8fb",
      title: "#fff8fb",
      subtext: "rgba(255,228,239,0.7)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#f4a6c1 0%,#d6bbff 52%,#ffd0dd 100%)",
      displayFont: "\"Cormorant Garamond\", serif",
      bodyFont: "\"Instrument Sans\", sans-serif"
    }
  },
  "velvet-gold": {
    label: "Velvet Gold",
    storyBackground: "#14100c",
    storyPanelFill: "rgba(42,31,24,0.56)",
    storyPanelBorder: "rgba(235,201,137,0.16)",
    noteColor: "rgba(235,201,137,0.18)",
    labelColor: "rgba(245,228,193,0.82)",
    titleColor: "#fff8ec",
    subtitleColor: "rgba(245,228,193,0.72)",
    accentColor: "#e6bf73",
    accentSoft: "rgba(230,191,115,0.18)",
    rankBackground: "rgba(230,191,115,0.2)",
    dividerColor: "rgba(245,228,193,0.12)",
    auroraBands: [
      "rgba(230,191,115,0.22)",
      "rgba(153,75,43,0.16)",
      "rgba(255,230,170,0.14)",
      "rgba(164,96,61,0.16)",
      "rgba(221,184,120,0.14)",
      "rgba(111,71,38,0.12)"
    ],
    displayFont: "\"Bebas Neue\", Arial",
    bodyFont: "\"Manrope\", Arial",
    displayFontLoad: "400 94px Bebas Neue",
    bodyFontLoad: "600 24px Manrope",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#120e0b 0%,#241912 34%,#3a261a 68%,#1a1310 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(230,191,115,0.18),transparent 26%),radial-gradient(circle at 82% 18%,rgba(169,105,63,0.12),transparent 22%),radial-gradient(circle at 66% 82%,rgba(255,240,202,0.1),transparent 24%)",
      ringTint: "rgba(255,255,255,0.03)",
      border: "rgba(245,228,193,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(29,21,16,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(42,31,24,0.56))",
      chipBg: "rgba(255,255,255,0.07)",
      chipText: "#fff8ec",
      accentChipBg: "rgba(230,191,115,0.18)",
      accentChipText: "#fff8ec",
      title: "#fff8ec",
      subtext: "rgba(245,228,193,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#e6bf73 0%,#f2df9e 52%,#d58656 100%)",
      displayFont: "\"Bebas Neue\", \"Archivo Black\", sans-serif",
      bodyFont: "\"Manrope\", \"Instrument Sans\", sans-serif"
    }
  },
  "ocean-dream": {
    label: "Ocean Dream",
    storyBackground: "#0b1220",
    storyPanelFill: "rgba(26,37,58,0.56)",
    storyPanelBorder: "rgba(162,223,255,0.16)",
    noteColor: "rgba(117,214,255,0.18)",
    labelColor: "rgba(220,244,255,0.82)",
    titleColor: "#f3fbff",
    subtitleColor: "rgba(220,244,255,0.72)",
    accentColor: "#7dd8ff",
    accentSoft: "rgba(125,216,255,0.18)",
    rankBackground: "rgba(125,216,255,0.2)",
    dividerColor: "rgba(220,244,255,0.12)",
    auroraBands: [
      "rgba(117,214,255,0.24)",
      "rgba(62,122,255,0.18)",
      "rgba(71,255,230,0.14)",
      "rgba(141,191,255,0.16)",
      "rgba(44,171,255,0.14)",
      "rgba(85,255,214,0.12)"
    ],
    displayFont: "\"Space Grotesk\", Arial",
    bodyFont: "\"Manrope\", Arial",
    displayFontLoad: "700 88px Space Grotesk",
    bodyFontLoad: "600 24px Manrope",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#09111c 0%,#102034 34%,#17314f 68%,#0b1827 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(117,214,255,0.16),transparent 26%),radial-gradient(circle at 82% 18%,rgba(80,138,255,0.13),transparent 22%),radial-gradient(circle at 66% 82%,rgba(71,255,230,0.1),transparent 24%)",
      ringTint: "rgba(255,255,255,0.03)",
      border: "rgba(220,244,255,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(10,24,39,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(17,38,64,0.54))",
      chipBg: "rgba(255,255,255,0.07)",
      chipText: "#f3fbff",
      accentChipBg: "rgba(125,216,255,0.16)",
      accentChipText: "#f3fbff",
      title: "#f3fbff",
      subtext: "rgba(220,244,255,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#7dd8ff 0%,#72b1ff 52%,#71ffe6 100%)",
      displayFont: "\"Space Grotesk\", sans-serif",
      bodyFont: "\"Manrope\", sans-serif"
    }
  },
  "mono-luxe": {
    label: "Mono Luxe",
    storyBackground: "#111111",
    storyPanelFill: "rgba(28,28,28,0.58)",
    storyPanelBorder: "rgba(245,245,245,0.14)",
    noteColor: "rgba(255,255,255,0.12)",
    labelColor: "rgba(235,235,235,0.78)",
    titleColor: "#ffffff",
    subtitleColor: "rgba(235,235,235,0.68)",
    accentColor: "#d4d4d4",
    accentSoft: "rgba(212,212,212,0.18)",
    rankBackground: "rgba(212,212,212,0.18)",
    dividerColor: "rgba(255,255,255,0.1)",
    auroraBands: [
      "rgba(255,255,255,0.12)",
      "rgba(180,180,180,0.08)",
      "rgba(235,235,235,0.06)",
      "rgba(130,130,130,0.08)",
      "rgba(220,220,220,0.06)",
      "rgba(90,90,90,0.08)"
    ],
    displayFont: "\"Cormorant Garamond\", serif",
    bodyFont: "\"Manrope\", Arial",
    displayFontLoad: "700 96px Cormorant Garamond",
    bodyFontLoad: "600 24px Manrope",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#111111 0%,#1b1b1b 34%,#2a2a2a 68%,#171717 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(255,255,255,0.08),transparent 26%),radial-gradient(circle at 82% 18%,rgba(210,210,210,0.08),transparent 22%),radial-gradient(circle at 66% 82%,rgba(255,255,255,0.06),transparent 24%)",
      ringTint: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.12)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(12,12,12,0.42))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(20,20,20,0.48))",
      chipBg: "rgba(255,255,255,0.06)",
      chipText: "#ffffff",
      accentChipBg: "rgba(212,212,212,0.16)",
      accentChipText: "#ffffff",
      title: "#ffffff",
      subtext: "rgba(235,235,235,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#f3f3f3 0%,#bdbdbd 52%,#7f7f7f 100%)",
      displayFont: "\"Cormorant Garamond\", serif",
      bodyFont: "\"Manrope\", sans-serif"
    }
  },
  "arcade-pulse": {
    label: "Arcade Pulse",
    storyBackground: "#100b19",
    storyPanelFill: "rgba(31,21,47,0.58)",
    storyPanelBorder: "rgba(205,118,255,0.16)",
    noteColor: "rgba(205,118,255,0.18)",
    labelColor: "rgba(238,214,255,0.82)",
    titleColor: "#fff7ff",
    subtitleColor: "rgba(238,214,255,0.72)",
    accentColor: "#cc76ff",
    accentSoft: "rgba(204,118,255,0.18)",
    rankBackground: "rgba(204,118,255,0.2)",
    dividerColor: "rgba(238,214,255,0.12)",
    auroraBands: [
      "rgba(204,118,255,0.24)",
      "rgba(77,103,255,0.18)",
      "rgba(255,78,172,0.15)",
      "rgba(69,232,255,0.15)",
      "rgba(160,94,255,0.14)",
      "rgba(255,154,87,0.12)"
    ],
    displayFont: "\"Orbitron\", Arial",
    bodyFont: "\"Instrument Sans\", Arial",
    displayFontLoad: "800 80px Orbitron",
    bodyFontLoad: "600 24px Instrument Sans",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#100b19 0%,#1a1130 34%,#2b1652 68%,#140d26 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(204,118,255,0.18),transparent 26%),radial-gradient(circle at 82% 18%,rgba(77,103,255,0.13),transparent 22%),radial-gradient(circle at 66% 82%,rgba(69,232,255,0.12),transparent 24%)",
      ringTint: "rgba(255,255,255,0.04)",
      border: "rgba(238,214,255,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(17,11,28,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(31,21,47,0.54))",
      chipBg: "rgba(255,255,255,0.07)",
      chipText: "#fff7ff",
      accentChipBg: "rgba(204,118,255,0.18)",
      accentChipText: "#fff7ff",
      title: "#fff7ff",
      subtext: "rgba(238,214,255,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#cc76ff 0%,#6d8cff 52%,#48e8ff 100%)",
      displayFont: "\"Orbitron\", sans-serif",
      bodyFont: "\"Instrument Sans\", sans-serif"
    }
  },
  "ember-dusk": {
    label: "Ember Dusk",
    storyBackground: "#130f14",
    storyPanelFill: "rgba(40,27,31,0.58)",
    storyPanelBorder: "rgba(255,151,120,0.16)",
    noteColor: "rgba(255,151,120,0.18)",
    labelColor: "rgba(255,225,214,0.82)",
    titleColor: "#fff9f7",
    subtitleColor: "rgba(255,225,214,0.72)",
    accentColor: "#ff9778",
    accentSoft: "rgba(255,151,120,0.18)",
    rankBackground: "rgba(255,151,120,0.2)",
    dividerColor: "rgba(255,225,214,0.12)",
    auroraBands: [
      "rgba(255,151,120,0.24)",
      "rgba(255,98,112,0.16)",
      "rgba(214,168,83,0.14)",
      "rgba(255,183,122,0.14)",
      "rgba(186,79,113,0.14)",
      "rgba(255,123,97,0.12)"
    ],
    displayFont: "\"Bricolage Grotesque\", Arial",
    bodyFont: "\"Instrument Sans\", Arial",
    displayFontLoad: "800 94px Bricolage Grotesque",
    bodyFontLoad: "600 24px Instrument Sans",
    passportTheme: {
      shellBg:
        "linear-gradient(155deg,#120f14 0%,#251821 34%,#3f222b 68%,#1c1218 100%)",
      shellOverlay:
        "radial-gradient(circle at 18% 14%,rgba(255,151,120,0.18),transparent 26%),radial-gradient(circle at 82% 18%,rgba(255,98,112,0.13),transparent 22%),radial-gradient(circle at 66% 82%,rgba(214,168,83,0.12),transparent 24%)",
      ringTint: "rgba(255,255,255,0.04)",
      border: "rgba(255,225,214,0.14)",
      surface: "linear-gradient(180deg,rgba(255,255,255,0.05),rgba(24,16,22,0.46))",
      surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(40,27,31,0.54))",
      chipBg: "rgba(255,255,255,0.07)",
      chipText: "#fff9f7",
      accentChipBg: "rgba(255,151,120,0.18)",
      accentChipText: "#fff9f7",
      title: "#fff9f7",
      subtext: "rgba(255,225,214,0.68)",
      fingerprintTrack: "rgba(255,255,255,0.08)",
      fingerprintGradient: "linear-gradient(90deg,#ff9778 0%,#ff6983 52%,#d7aa63 100%)",
      displayFont: "\"Bricolage Grotesque\", sans-serif",
      bodyFont: "\"Instrument Sans\", sans-serif"
    }
  }
};

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

function HeroAlbumStack({
  songs,
  accent
}: {
  songs: Array<{ title: string; artist: string; thumbnail: string | null }>;
  accent: string;
}) {
  const fallbackCards = [
    { title: "Signal Bloom", artist: "Auralize Mix", thumbnail: null },
    { title: "Nocturne Replay", artist: "Night Rotation", thumbnail: null },
    { title: "Golden Static", artist: "Mood Capsule", thumbnail: null }
  ];
  const cards = (songs.length ? songs.slice(0, 3) : fallbackCards).map((song, index) => ({
    ...song,
    rotation: index === 0 ? -9 : index === 1 ? 8 : -3,
    top: index === 0 ? 92 : index === 1 ? 24 : 174,
    left: index === 0 ? 10 : index === 1 ? 158 : 188
  }));

  return (
    <div className="album-stack hidden xl:block">
      {cards.map((song, index) => (
        <motion.div
          key={`${song.title}-${song.artist}-${index}`}
          className="album-card"
          initial={{ opacity: 0, y: 18, rotate: song.rotation - 3 }}
          animate={{ opacity: 1, y: 0, rotate: song.rotation }}
          transition={{ duration: 0.8, delay: 0.12 * index, ease: [0.22, 1, 0.36, 1] }}
          style={{ top: `${song.top}px`, left: `${song.left}px` }}
        >
          {song.thumbnail ? (
            <img className="album-card-cover" src={song.thumbnail} alt={song.title} />
          ) : (
            <div
              className="album-card-cover"
              style={{
                background: `linear-gradient(145deg, ${accent}55 0%, rgba(15,23,42,0.9) 55%, rgba(196,107,123,0.4) 100%)`
              }}
            />
          )}
          <div className="album-card-copy">
            <p className="album-card-kicker">{index === 0 ? "Top Song" : "In Rotation"}</p>
            <p className="album-card-title">{song.title}</p>
            <p className="album-card-meta">{song.artist}</p>
          </div>
        </motion.div>
      ))}
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
  const [exportThemeId, setExportThemeId] = useState<ExportThemeId>("aurora-noir");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPlaylistId] = useState<PlaylistMode>("top");
  const [compareTimeframe, setCompareTimeframe] = useState<TimeframeOption>("90d");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const passportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deferredSearchTerm = useDeferredValue(debouncedSearchTerm);

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
        exportThemeId: ExportThemeId;
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
      if (saved.exportThemeId) {
        setExportThemeId(saved.exportThemeId);
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
        dashboardDensity,
        exportThemeId
      })
    );
  }, [timeframe, recapTheme, recapVariant, dashboardDensity, exportThemeId]);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const isYoutubeProfileMode = dashboard?.source === "youtube-profile";
  const timeframeEntries = useMemo(() => {
    if (!dashboard?.stats?.rawEnrichedHistory || isYoutubeProfileMode) {
      return [];
    }

    return filterHistoryByTimeframe(dashboard.stats.rawEnrichedHistory, timeframe);
  }, [dashboard?.stats?.rawEnrichedHistory, isYoutubeProfileMode, timeframe]);
  const indexedTimeframeEntries = useMemo(
    () =>
      timeframeEntries.map((entry) => ({
        entry,
        genre: classifyGenre(entry.tags, entry.artist),
        moods: getEntryMoodLabels(entry),
        searchText: `${entry.title} ${entry.artist} ${entry.tags.join(" ")}`.toLowerCase()
      })),
    [timeframeEntries]
  );
  const filteredEntries = useMemo(() => {
    if (!indexedTimeframeEntries.length) {
      return [];
    }

    const term = deferredSearchTerm.trim().toLowerCase();
    return indexedTimeframeEntries
      .filter(({ entry, genre, moods, searchText }) => {
        const matchesSearch = !term || searchText.includes(term);
        const matchesGenre = !selectedGenre || genre === selectedGenre;
        const matchesArtist = !selectedArtist || entry.artist === selectedArtist;
        const matchesMood = !selectedMood || moods.includes(selectedMood);
        return matchesSearch && matchesGenre && matchesArtist && matchesMood;
      })
      .map(({ entry }) => entry);
  }, [
    indexedTimeframeEntries,
    deferredSearchTerm,
    selectedGenre,
    selectedArtist,
    selectedMood
  ]);

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
  const activePassport = sharedPassport ?? passportData ?? null;
  const exportTheme = EXPORT_THEME_OPTIONS[exportThemeId];
  const tasteEvolution = useMemo<TasteEvolutionPoint[]>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return [];
    }

    return buildTasteEvolution(stats.rawEnrichedHistory, timeframe);
  }, [stats, isYoutubeProfileMode, timeframe, dashboardDensity]);
  const smartInsights = useMemo<SmartInsight[]>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return [];
    }

    return buildSmartInsights(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode, dashboardDensity]);
  const personaProfile = useMemo<PersonaProfile | null>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return null;
    }

    return buildPersonaProfile(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode, dashboardDensity]);
  const memoryLane = useMemo<MemoryLaneEntry[]>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return [];
    }

    return buildMemoryLane(stats.rawEnrichedHistory);
  }, [stats, isYoutubeProfileMode, dashboardDensity]);
  const achievementBadges = useMemo<AchievementBadge[]>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return [];
    }

    return buildAchievementBadges(stats, genreBreakdown, moodTimeline);
  }, [stats, genreBreakdown, moodTimeline, isYoutubeProfileMode, dashboardDensity]);
  const artistOptions = useMemo(
    () =>
      Array.from(new Set(indexedTimeframeEntries.map(({ entry }) => entry.artist))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [indexedTimeframeEntries]
  );
  const genreOptions = useMemo(
    () =>
      Array.from(new Set(indexedTimeframeEntries.map(({ genre }) => genre))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [indexedTimeframeEntries]
  );
  const moodOptions = useMemo(
    () =>
      Array.from(new Set(indexedTimeframeEntries.flatMap(({ moods }) => moods))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [indexedTimeframeEntries]
  );
  const playlistBundles = useMemo<PlaylistBundle[]>(() => {
    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      return [];
    }

    return buildPlaylistBundles(stats.rawEnrichedHistory, moodTimeline);
  }, [stats, moodTimeline, isYoutubeProfileMode, dashboardDensity]);
  const selectedPlaylist = useMemo(
    () => playlistBundles.find((bundle) => bundle.id === selectedPlaylistId) ?? playlistBundles[0] ?? null,
    [playlistBundles, selectedPlaylistId]
  );
  const sourceLabel = useMemo(() => {
    if (dashboard?.source === "lastfm") {
      return "Last.fm Live Mode";
    }
    if (dashboard?.source === "apple-music") {
      return "Apple Music Export";
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

  async function waitForExportAssets(node: HTMLElement) {
    await document.fonts.ready;

    const images = Array.from(node.querySelectorAll("img"));
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
  }

  async function ensureExportFontsLoaded(theme: ExportThemeDefinition) {
    if (!("fonts" in document)) {
      return;
    }

    await Promise.all([
      document.fonts.load(theme.displayFontLoad),
      document.fonts.load(theme.bodyFontLoad),
      document.fonts.load("900 64px Archivo Black"),
      document.fonts.load("700 24px Space Grotesk"),
      document.fonts.load("600 20px Instrument Sans")
    ]);
  }

  async function renderNodeToCanvas(node: HTMLElement, backgroundColor: string | null) {
    await waitForExportAssets(node);
    const rect = node.getBoundingClientRect();

    return html2canvas(node, {
      backgroundColor,
      scale: 2.5,
      useCORS: true,
      foreignObjectRendering: false,
      imageTimeout: 15000,
      logging: false,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      windowWidth: Math.ceil(rect.width),
      windowHeight: Math.ceil(rect.height),
      scrollX: 0,
      scrollY: 0
    });
  }

  async function renderPassportCanvas() {
    if (!passportRef.current) {
      return null;
    }

    await ensureExportFontsLoaded(exportTheme);
    return renderNodeToCanvas(passportRef.current, "#06070b");
  }

  function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  }

  async function loadCanvasImage(src: string | null) {
    if (!src) {
      return null;
    }

    return new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function drawRoundedImageCover(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, width, height);

    const sourceWidth = image.naturalWidth || width;
    const sourceHeight = image.naturalHeight || height;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  async function buildInstagramStoryCanvas() {
    if (!activePassport) {
      return null;
    }

    await ensureExportFontsLoaded(exportTheme);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const displayFont = exportTheme.displayFont;
    const bodyFont = exportTheme.bodyFont;

    ctx.fillStyle = exportTheme.storyBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const auroraBands = [
      { color: exportTheme.auroraBands[0], x: -120, y: -140, width: 240, height: 2320, angle: -0.18 },
      { color: exportTheme.auroraBands[1], x: 90, y: -160, width: 220, height: 2360, angle: 0.14 },
      { color: exportTheme.auroraBands[2], x: 300, y: -180, width: 210, height: 2340, angle: -0.12 },
      { color: exportTheme.auroraBands[3], x: 520, y: -150, width: 260, height: 2380, angle: 0.16 },
      { color: exportTheme.auroraBands[4], x: 760, y: -170, width: 230, height: 2380, angle: -0.14 },
      { color: exportTheme.auroraBands[5], x: 930, y: -140, width: 210, height: 2320, angle: 0.12 }
    ];

    auroraBands.forEach((band) => {
      ctx.save();
      ctx.translate(band.x, band.y);
      ctx.rotate(band.angle);
      const bandGradient = ctx.createLinearGradient(0, 0, band.width, 0);
      bandGradient.addColorStop(0, "rgba(255,255,255,0)");
      bandGradient.addColorStop(0.5, band.color);
      bandGradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bandGradient;
      ctx.fillRect(0, 0, band.width, band.height);
      ctx.restore();
    });

    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = exportTheme.dividerColor;
    for (let x = 0; x < canvas.width; x += 108) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 108) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();

    const floatingShapes = [
      { text: "♪", x: 106, y: 190, size: 92, color: "rgba(75, 113, 255, 0.14)" },
      { text: "♬", x: 902, y: 212, size: 76, color: "rgba(58, 198, 184, 0.16)" },
      { text: "♫", x: 874, y: 1570, size: 108, color: "rgba(223, 104, 153, 0.14)" },
      { text: "♩", x: 120, y: 1708, size: 82, color: "rgba(104, 89, 239, 0.12)" }
    ];

    floatingShapes.forEach((shape) => {
      ctx.fillStyle = shape.color;
      ctx.font = `700 ${shape.size}px ${bodyFont}`;
      ctx.fillText(shape.text, shape.x, shape.y);
    });

    ctx.fillStyle = exportTheme.labelColor;
    ctx.font = `600 26px ${bodyFont}`;
    ctx.fillText("AURALIZE", 86, 112);

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `900 94px ${displayFont}`;
    ctx.fillText("Music", 82, 214);
    ctx.fillText("Passport", 82, 312);

    const storyPanelX = 60;
    const storyPanelY = 400;
    const storyPanelWidth = 960;
    const storyPanelHeight = 1320;

    ctx.save();
    ctx.fillStyle = exportTheme.storyPanelFill;
    ctx.strokeStyle = exportTheme.storyPanelBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(storyPanelX, storyPanelY, storyPanelWidth, storyPanelHeight, 44);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const topArtistImage = await loadCanvasImage(activePassport.topArtist.thumbnail);
    if (topArtistImage) {
      drawRoundedImageCover(ctx, topArtistImage, 92, 438, 128, 128, 30);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.roundRect(92, 438, 128, 128, 30);
      ctx.fill();
    }

    ctx.fillStyle = exportTheme.labelColor;
    ctx.font = `600 20px ${bodyFont}`;
    ctx.fillText("#1 ARTIST", 252, 478);

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `800 48px ${displayFont}`;
    ctx.fillText(activePassport.topArtist.name, 252, 534, 720);

    ctx.fillStyle = exportTheme.subtitleColor;
    ctx.font = `500 24px ${bodyFont}`;
    ctx.fillText("leads this snapshot", 252, 572);

    const statCardY = 618;
    const statCardWidth = 286;
    const statGap = 24;
    const statCards = [
      { label: "Listening", value: `${activePassport.totalListeningHours.toFixed(1)} hrs` },
      { label: "Mood", value: activePassport.dominantMood },
      { label: "Genre", value: activePassport.dominantGenre }
    ];

    statCards.forEach((card, index) => {
      const x = 92 + index * (statCardWidth + statGap);
      ctx.fillStyle = exportTheme.labelColor;
      ctx.font = `600 18px ${bodyFont}`;
      ctx.fillText(card.label.toUpperCase(), x, statCardY + 20);

      ctx.fillStyle = exportTheme.titleColor;
      ctx.font = `800 34px ${displayFont}`;
      ctx.fillText(card.value, x, statCardY + 66, statCardWidth - 8);
    });

    ctx.fillStyle = exportTheme.labelColor;
    ctx.font = `600 22px ${bodyFont}`;
    ctx.fillText("Top 10 songs in this frame", 92, 772);

    const songs = activePassport.topSongs.slice(0, 10);
    const songThumbs = await Promise.all(songs.map((song) => loadCanvasImage(song.thumbnail)));

    songs.forEach((song, index) => {
      const y = 800 + index * 66;

      ctx.fillStyle = exportTheme.rankBackground;
      ctx.beginPath();
      ctx.roundRect(112, y + 8, 40, 40, 14);
      ctx.fill();

      ctx.fillStyle = exportTheme.titleColor;
      ctx.font = `700 22px ${displayFont}`;
      ctx.fillText(String(index + 1), 124, y + 33);

      const thumb = songThumbs[index];
      if (thumb) {
        drawRoundedImageCover(ctx, thumb, 174, y + 6, 44, 44, 14);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.roundRect(174, y + 6, 44, 44, 14);
        ctx.fill();
      }

      ctx.fillStyle = exportTheme.titleColor;
      ctx.font = `700 20px ${displayFont}`;
      ctx.fillText(song.title, 242, y + 26, 700);

      ctx.fillStyle = exportTheme.subtitleColor;
      ctx.font = `500 18px ${bodyFont}`;
      ctx.fillText(song.artist, 242, y + 46, 700);
    });

    const streakCardY = 1488;

    ctx.fillStyle = exportTheme.labelColor;
    ctx.font = `600 20px ${bodyFont}`;
    ctx.fillText("LISTENING STREAK", 92, streakCardY + 24);

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `800 44px ${displayFont}`;
    ctx.fillText(`${activePassport.listeningStreakDays} days`, 92, streakCardY + 72);
    return canvas;
  }

  async function handleExportAsImage() {
    const canvas = await renderPassportCanvas();
    if (!canvas) {
      return;
    }

    downloadCanvas(canvas, "my-music-passport.png");
    setActionMessage("Passport exported as PNG.");
  }

  async function handleExportInstagramStory() {
    const canvas = await buildInstagramStoryCanvas();
    if (!canvas) {
      return;
    }

    downloadCanvas(canvas, "my-music-passport-instagram-story.png");
    setActionMessage("Instagram story image exported as PNG.");
  }

  async function handleShareToInstagram() {
    const canvas = await buildInstagramStoryCanvas();
    if (!canvas) {
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/png");
    });
    if (!blob) {
      setActionMessage("Could not prepare the Instagram image.");
      return;
    }

    const file = new File([blob], "auralize-instagram-story.png", { type: "image/png" });
    const shareUrl =
      publicProfilePayload != null
        ? getPublicProfileUrl(publicProfilePayload)
        : activePassport != null
          ? getShareUrl(activePassport)
          : null;
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: "My Auralize Music Passport",
          text: shareUrl ? `Shared from Auralize\n${shareUrl}` : "Shared from Auralize",
          url: shareUrl ?? undefined
        });
        setActionMessage("Share sheet opened. Choose Instagram if it appears on your device.");
        return;
      }

      if (navigator.share && shareUrl) {
        await navigator.share({
          title: "My Auralize Music Passport",
          text: "Shared from Auralize",
          url: shareUrl
        });
        setActionMessage("Share sheet opened with your passport link. Choose Instagram if it appears on your device.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setActionMessage("Instagram sharing was canceled.");
        return;
      }
    }

    if (shareUrl) {
      await copyText(shareUrl);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      downloadCanvas(canvas, "auralize-instagram-story.png");
      setActionMessage(
        "Instagram opened in a new tab, your shareable link was copied, and the story image was downloaded for manual posting."
      );
      return;
    }

    downloadCanvas(canvas, "auralize-instagram-story.png");
    setActionMessage(
      "Direct Instagram sharing is not available here, so a story-ready PNG was downloaded instead."
    );
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

  function applyDashboardUploadResponse(payload: DashboardUploadResponse) {
    setParsedHistory(payload.entries);
    setUploadQuality(payload.quality);
    setDashboard(payload.dashboard);
    setIsRecapOpen(false);
    setTimeframe("all");
  }

  function applyDashboardResponse(payload: DashboardResponse) {
    setDashboard(payload);
    setParsedHistory([]);
    setUploadQuality(null);
    setIsRecapOpen(false);
    setTimeframe("all");
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

      const cacheKey = buildJsonAnalysisCacheKey("youtube-profile", normalizedProfileUrl);
      const cachedPayload = getCachedAnalysis<DashboardResponse>(cacheKey);
      if (cachedPayload) {
        applyDashboardResponse(cachedPayload);
        setActionMessage("Loaded cached public profile preview.");
        return;
      }

      const payload = await postJson<DashboardResponse>("/youtube-profile", {
        url: normalizedProfileUrl
      });
      setCachedAnalysis(cacheKey, "youtube-profile-request", payload);
      applyDashboardResponse(payload);
      return;
    }

    const selectedFile = file;
    if (!selectedFile) {
      setError("Choose a watch-history.json file or paste a YouTube Music profile link first.");
      return;
    }

    const cacheKey = buildFileAnalysisCacheKey("takeout", selectedFile);
    const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
    if (cachedPayload) {
      applyDashboardUploadResponse(cachedPayload);
      setActionMessage("Loaded cached dashboard for this file.");
      return;
    }

    const analysisPayload = await postFile<DashboardUploadResponse>("/analyze", selectedFile);
    setCachedAnalysis(cacheKey, "takeout", analysisPayload);
    applyDashboardUploadResponse(analysisPayload);
  }

  async function handleUnifiedTakeoutSubmit() {
    if (!file) {
      setError("Choose a watch-history.json file first.");
      return;
    }

    const selectedFile = file;
    const cacheKey = buildFileAnalysisCacheKey("unified-takeout", selectedFile);
    const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
    if (cachedPayload) {
      applyDashboardUploadResponse(cachedPayload);
      setActionMessage("Loaded cached unified dashboard for this file.");
      return;
    }

    const analysisPayload = await postFile<DashboardUploadResponse>("/analyze-unified", selectedFile);
    setCachedAnalysis(cacheKey, "unified-takeout", analysisPayload);
    applyDashboardUploadResponse(analysisPayload);
  }

  async function handleAppleMusicSubmit() {
    if (!file) {
      setError("Choose an Apple Music CSV or JSON export first.");
      return;
    }

    const selectedFile = file;
    const cacheKey = buildFileAnalysisCacheKey("apple-music", selectedFile);
    const cachedPayload = getCachedAnalysis<DashboardUploadResponse>(cacheKey);
    if (cachedPayload) {
      applyDashboardUploadResponse(cachedPayload);
      setActionMessage("Loaded cached Apple Music dashboard for this file.");
      return;
    }

    const analysisPayload = await postFile<DashboardUploadResponse>("/apple-music/analyze", selectedFile);
    setCachedAnalysis(cacheKey, "apple-music", analysisPayload);
    applyDashboardUploadResponse(analysisPayload);
  }

  async function handleLastFmSubmit() {
    const username = parseLastFmUsername(lastFmUsername);
    if (!username) {
      setError("Enter a Last.fm username or paste a Last.fm profile URL to use Live Mode.");
      return;
    }

    const cacheKey = buildJsonAnalysisCacheKey("lastfm", username);
    const cachedPayload = getCachedAnalysis<DashboardResponse>(cacheKey);
    if (cachedPayload) {
      applyDashboardResponse(cachedPayload);
      setActionMessage("Loaded cached Last.fm snapshot.");
      return;
    }

    const payload = await postJson<DashboardResponse>("/lastfm", { username });
    setCachedAnalysis(cacheKey, "lastfm", payload);
    applyDashboardResponse(payload);
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
      } else if (sourceMode === "apple-music") {
        await handleAppleMusicSubmit();
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
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void handleShareToInstagram()}
                type="button"
              >
                Share to Instagram
              </button>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void handleExportInstagramStory()}
                type="button"
              >
                Export Instagram Story
              </button>
            </div>

            <div className="mt-6 max-w-sm">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                  Export Theme
                </span>
                <select
                  className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                  onChange={(event) => setExportThemeId(event.target.value as ExportThemeId)}
                  value={exportThemeId}
                >
                  {(Object.entries(EXPORT_THEME_OPTIONS) as Array<[ExportThemeId, ExportThemeDefinition]>).map(
                    ([themeId, theme]) => (
                      <option key={themeId} value={themeId}>
                        {theme.label}
                      </option>
                    )
                  )}
                </select>
              </label>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Theme styling and font pairing apply to both the PNG passport and Instagram story export.
              </p>
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
                className="mx-auto w-fit rounded-[2.5rem] p-5"
                style={{ background: exportTheme.passportTheme.shellBg }}
              >
                <Suspense fallback={<ChartSkeleton heightClass="h-[520px]" />}>
                  <MusicPassportCard data={sharedPassport} theme={exportTheme.passportTheme} />
                </Suspense>
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
          className="hero-shell relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur md:p-8"
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
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_360px] xl:items-start">
              <div>
                <p className="mb-3 text-sm uppercase tracking-[0.35em]" style={{ color: dashboardTheme.accent }}>
                  Your Music DNA
                </p>
                <h1 className="font-display max-w-4xl text-[2.85rem] leading-[0.94] text-white md:text-[4.35rem] lg:text-[5.25rem]">
                  Upload your history, paste a profile, or switch to live scrobbles.
                </h1>
                <p className="font-body mt-5 max-w-3xl text-sm leading-7 text-[#c0cad6] md:text-[1.08rem]">
                  Use Google Takeout for YouTube Music-only analytics, switch to the unified YouTube tab to include music plays from the main YouTube app too, upload Apple Music activity exports, paste a YouTube Music profile link for a lightweight public preview, or use Last.fm Live Mode for a fresh snapshot of your listening identity.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="hero-chip rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Recap-ready
                  </div>
                  <div className="hero-chip rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Music passport
                  </div>
                  <div className="hero-chip rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Unified YouTube mode
                  </div>
                  <div className="hero-chip rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Apple Music import
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 xl:items-end">
                {dashboard?.source === "lastfm" ? (
                  <span className="hero-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#67C3C0]">
                    Live Mode
                  </span>
                ) : isYoutubeProfileMode ? (
                  <span className="hero-chip w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#67C3C0]">
                    Public Profile Preview
                  </span>
                ) : null}
                <HeroAlbumStack songs={topSongs} accent={dashboardTheme.accent} />
              </div>
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
                <button
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    sourceMode === "apple-music"
                      ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
                      : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                  }`}
                  onClick={() => setSourceMode("apple-music")}
                  type="button"
                >
                  Apple Music
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
              ) : sourceMode === "apple-music" ? (
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
                        Apple Music Mode
                      </div>
                      <p className="text-xl font-semibold text-white">
                        Drop your Apple Music export here
                      </p>
                      <p className="mt-2 text-sm text-[#9CA3AF]">
                        Upload an Apple Music Play Activity CSV or compatible JSON export to build the same dashboard, recap, and passport flow.
                      </p>
                      <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                        Best results come from the Apple Music Play Activity export from privacy.apple.com because it includes timestamps and play durations.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                        <label className="cursor-pointer rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-[#F0D080]">
                          Choose CSV or JSON
                          <input
                            className="sr-only"
                            type="file"
                            accept=".csv,.json,text/csv,application/json"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                      <p className="text-sm font-semibold text-white">Supported Apple Music exports</p>
                      <div className="mt-4 grid gap-3 text-sm text-[#9CA3AF]">
                        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                          Apple Music Play Activity CSV
                        </div>
                        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                          compatible JSON exports with song, artist, timestamp, and duration fields
                        </div>
                        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                          Apple exports usually do not include artwork, so this mode uses a cleaner text-first presentation.
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
                  {sourceMode === "takeout" || sourceMode === "unified-takeout" || sourceMode === "apple-music" ? (
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
                      ) : sourceMode === "apple-music" ? (
                        <p className="text-xs text-[#9CA3AF]">
                          Apple Music mode builds the dashboard from a CSV or JSON export file.
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
                    : sourceMode === "takeout" || sourceMode === "unified-takeout" || sourceMode === "apple-music"
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
                  className="w-fit"
                  style={{ background: exportTheme.passportTheme.shellBg }}
                >
                  <Suspense fallback={<ChartSkeleton heightClass="h-[520px]" />}>
                    <MusicPassportCard data={passportData} theme={exportTheme.passportTheme} />
                  </Suspense>
                </div>
                </div>

                <div className="flex w-full max-w-sm flex-col gap-3 xl:pt-3">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                      Export Theme
                    </span>
                    <select
                      className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                      onChange={(event) => setExportThemeId(event.target.value as ExportThemeId)}
                      value={exportThemeId}
                    >
                      {(Object.entries(EXPORT_THEME_OPTIONS) as Array<[ExportThemeId, ExportThemeDefinition]>).map(
                        ([themeId, theme]) => (
                          <option key={themeId} value={themeId}>
                            {theme.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <p className="text-sm text-[#9CA3AF]">
                    Pick from 10 export themes. The preview updates before you download or share.
                  </p>
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
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => void handleShareToInstagram()}
                    type="button"
                  >
                    Share to Instagram
                  </button>
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => void handleExportInstagramStory()}
                    type="button"
                  >
                    Export Instagram Story
                  </button>
                  <p className="text-sm text-[#9CA3AF]">
                    Instagram sharing uses your device share sheet when supported. Otherwise, Auralize downloads a story-ready PNG you can upload manually.
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
