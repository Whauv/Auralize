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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MusicPassportData } from "./components/MusicPassportCard";
import { LoadingSpinner } from "./components/DashboardBits";
import { DashboardWorkspace } from "./components/DashboardWorkspace";
import { SourceStudio, type SourceMode } from "./components/SourceStudio";
import { ShareStudio } from "./components/ShareStudio";
import type {
  AnalysisJobStatus,
  DashboardUploadResponse,
  DashboardResponse,
  PlaylistBundle,
  PlaylistMode,
  ParsedHistoryEntry,
  PublicProfileSharePayload,
  RecapThemePack,
  SavedSession,
  TimeframeOption,
  UploadQualitySummary,
} from "./lib/types";
import {
  PROFILE_SHARE_PARAM,
  SHARE_PARAM,
  buildPassportData,
  buildPublicProfileSharePayload,
  buildGenreBreakdownFromHistory,
  buildMoodTimelineFromHistory,
  buildStatsPayloadFromHistory,
  classifyGenre,
  decodePublicProfilePayload,
  decodeSharePayload,
  downloadTextFile,
  filterHistoryByTimeframe,
  formatHours,
  getEntryMoodLabels,
  playlistToText,
  TIMEFRAME_LABELS,
  buildSavedSession
} from "./lib/utils";
import {
  copyPassportShareLink,
  copyPublicShareLink,
  exportInstagramStory,
  exportPassportImage,
  type ExportThemeDefinition,
  shareToInstagram,
} from "./lib/exportShare";
import {
  loadDashboardPreferences,
  loadSavedSessions,
  saveDashboardPreferences,
  saveSavedSessions,
} from "./lib/preferences";
import {
  analyzeAppleMusic,
  analyzeLastFm,
  analyzeTakeout,
  analyzeUnifiedTakeout,
  analyzeYoutubeProfile,
} from "./lib/sourceAnalysis";
import {
  buildAdvancedAnalytics,
  type AdvancedAnalyticsResult,
} from "./lib/advancedAnalytics";
import type { AdvancedAnalyticsWorkerResponse } from "./lib/advancedAnalytics.worker";
import { SharedPassportPage } from "./components/SharedPassportPage";
import { SharedProfilePage } from "./components/SharedProfilePage";
type DashboardDensity = "simple" | "full";
type PerformanceMode = "smooth" | "cinematic";
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
        <div
          key={`${song.title}-${song.artist}-${index}`}
          className="album-card"
          style={{ top: `${song.top}px`, left: `${song.left}px`, transform: `rotate(${song.rotation}deg)` }}
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
        </div>
      ))}
    </div>
  );
}

function AmbientListeningTrails({ performanceMode }: { performanceMode: PerformanceMode }) {
  return (
    <div
      aria-hidden="true"
      className={`ambient-stage ${
        performanceMode === "smooth" ? "ambient-stage--smooth" : "ambient-stage--cinematic"
      }`}
    >
      <div className="ambient-atmosphere" />
      <svg
        className="ambient-trails"
        viewBox="0 0 1440 960"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <path
          className="ambient-trail ambient-trail-strong"
          d="M-44 188 C 134 122, 300 286, 486 228 C 690 164, 852 326, 1038 272 C 1198 225, 1348 322, 1496 284"
        />
        <path
          className="ambient-trail ambient-trail-soft"
          d="M-68 348 C 120 288, 304 420, 520 364 C 742 308, 894 462, 1082 420 C 1256 382, 1380 474, 1528 446"
        />
        <path
          className="ambient-trail ambient-trail-strong"
          d="M-78 548 C 140 482, 312 616, 530 556 C 740 498, 934 644, 1148 586 C 1288 548, 1410 640, 1538 612"
        />
        <path
          className="ambient-trail ambient-trail-soft"
          d="M-96 756 C 170 682, 346 828, 586 756 C 818 686, 994 824, 1212 770 C 1340 736, 1452 810, 1580 784"
        />
        <circle className="ambient-node ambient-node-gold ambient-node-pulse" cx="486" cy="228" r="3.2" />
        <circle className="ambient-node ambient-node-blue" cx="1038" cy="272" r="2.6" />
        <circle className="ambient-node ambient-node-gold ambient-node-pulse" cx="520" cy="364" r="3" />
        <circle className="ambient-node ambient-node-blue" cx="1082" cy="420" r="2.5" />
        <circle className="ambient-node ambient-node-gold ambient-node-pulse" cx="530" cy="556" r="3.3" />
        <circle className="ambient-node ambient-node-blue" cx="1148" cy="586" r="2.5" />
        <circle className="ambient-node ambient-node-gold ambient-node-pulse" cx="586" cy="756" r="3.1" />
        <circle className="ambient-node ambient-node-blue" cx="1212" cy="770" r="2.4" />
      </svg>
    </div>
  );
}

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const progressScale = 1;
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
  const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisJobStatus | null>(null);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all");
  const [recapTheme, setRecapTheme] = useState<RecapThemePack>("gold-noir");
  const [dashboardDensity, setDashboardDensity] = useState<DashboardDensity>("simple");
  const [exportThemeId, setExportThemeId] = useState<ExportThemeId>("aurora-noir");
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("smooth");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedPlaylistId] = useState<PlaylistMode>("top");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [advancedAnalytics, setAdvancedAnalytics] = useState<AdvancedAnalyticsResult | null>(null);
  const [isAdvancedAnalyticsLoading, setIsAdvancedAnalyticsLoading] = useState(false);
  const passportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const advancedAnalyticsRequestId = useRef(0);
  const advancedAnalyticsWorker = useRef<Worker | null>(null);
  const deferredSearchTerm = useDeferredValue(debouncedSearchTerm);
  const uploadJourney = useMemo(() => {
    if (!analysisProgress || uploadStartedAt === null) {
      return null;
    }
    const progress = Math.max(0, Math.min(100, analysisProgress.progress ?? 0));
    let stage: "ingested" | "parsing" | "enriching" | "ready" = "ingested";
    if (progress >= 100 || analysisProgress.status === "complete") {
      stage = "ready";
    } else if (progress >= 70) {
      stage = "enriching";
    } else if (progress >= 30) {
      stage = "parsing";
    }

    const elapsedMs = Date.now() - uploadStartedAt;
    const etaSeconds =
      progress > 3 && progress < 100
        ? Math.max(1, Math.round(((100 - progress) / progress) * (elapsedMs / 1000)))
        : null;
    return { stage, progress, etaSeconds };
  }, [analysisProgress, uploadStartedAt]);

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
    const saved = loadDashboardPreferences();
    if (!saved) {
      return;
    }

    if (saved.timeframe) {
      setTimeframe(saved.timeframe);
    }
    if (saved.recapTheme) {
      setRecapTheme(saved.recapTheme);
    }
    if (saved.dashboardDensity) {
      setDashboardDensity(saved.dashboardDensity);
    }
    if (saved.exportThemeId) {
      setExportThemeId(saved.exportThemeId as ExportThemeId);
    }
    if (saved.performanceMode) {
      setPerformanceMode(saved.performanceMode);
    }
  }, []);

  useEffect(() => {
    setSavedSessions(loadSavedSessions());
  }, []);

  useEffect(() => {
    saveDashboardPreferences({
      timeframe,
      recapTheme,
      dashboardDensity,
      exportThemeId,
      performanceMode
    });
  }, [timeframe, recapTheme, dashboardDensity, exportThemeId, performanceMode]);

  useEffect(() => {
    saveSavedSessions(savedSessions);
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
  useEffect(() => {
    if (advancedAnalyticsWorker.current) {
      advancedAnalyticsWorker.current.terminate();
      advancedAnalyticsWorker.current = null;
    }

    if (!stats || isYoutubeProfileMode || dashboardDensity !== "full") {
      advancedAnalyticsRequestId.current += 1;
      setAdvancedAnalytics(null);
      setIsAdvancedAnalyticsLoading(false);
      return;
    }

    const requestId = advancedAnalyticsRequestId.current + 1;
    advancedAnalyticsRequestId.current = requestId;
    const input = { stats, genreBreakdown, moodTimeline, timeframe };
    setAdvancedAnalytics(null);
    setIsAdvancedAnalyticsLoading(true);

    if (typeof Worker === "undefined") {
      setAdvancedAnalytics(buildAdvancedAnalytics(input));
      setIsAdvancedAnalyticsLoading(false);
      return;
    }

    const worker = new Worker(
      new URL("./lib/advancedAnalytics.worker.ts", import.meta.url),
      { type: "module" },
    );
    advancedAnalyticsWorker.current = worker;

    worker.onmessage = (event: MessageEvent<AdvancedAnalyticsWorkerResponse>) => {
      if (advancedAnalyticsRequestId.current !== event.data.id) {
        return;
      }

      if (event.data.type === "complete") {
        setAdvancedAnalytics(event.data.result);
      } else {
        setAdvancedAnalytics(buildAdvancedAnalytics(input));
      }

      setIsAdvancedAnalyticsLoading(false);
      worker.terminate();
      if (advancedAnalyticsWorker.current === worker) {
        advancedAnalyticsWorker.current = null;
      }
    };

    worker.onerror = () => {
      if (advancedAnalyticsRequestId.current === requestId) {
        setAdvancedAnalytics(buildAdvancedAnalytics(input));
        setIsAdvancedAnalyticsLoading(false);
      }
      worker.terminate();
      if (advancedAnalyticsWorker.current === worker) {
        advancedAnalyticsWorker.current = null;
      }
    };

    worker.postMessage({ id: requestId, input });

    return () => {
      worker.terminate();
      if (advancedAnalyticsWorker.current === worker) {
        advancedAnalyticsWorker.current = null;
      }
    };
  }, [stats, genreBreakdown, moodTimeline, timeframe, isYoutubeProfileMode, dashboardDensity]);

  const tasteEvolution = advancedAnalytics?.tasteEvolution ?? [];
  const smartInsights = advancedAnalytics?.smartInsights ?? [];
  const personaProfile = advancedAnalytics?.personaProfile ?? null;
  const memoryLane = advancedAnalytics?.memoryLane ?? [];
  const achievementBadges = advancedAnalytics?.achievementBadges ?? [];
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
  const playlistBundles = advancedAnalytics?.playlistBundles ?? [];
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
    const message = await exportPassportImage(passportRef.current, exportTheme);
    if (!message) {
      return;
    }
    setActionMessage(message);
  }

  async function handleExportInstagramStory() {
    const message = await exportInstagramStory(activePassport, exportTheme);
    if (!message) {
      return;
    }
    setActionMessage(message);
  }

  async function handleShareToInstagram() {
    const message = await shareToInstagram({
      activePassport,
      publicProfilePayload,
      exportTheme
    });
    if (!message) {
      return;
    }
    setActionMessage(message);
  }

  async function handleCopyShareableLink(payload: MusicPassportData) {
    setActionMessage(await copyPassportShareLink(payload));
  }

  async function handleCopyPublicProfileLink(payload: PublicProfileSharePayload) {
    setActionMessage(await copyPublicShareLink(payload));
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
      const { payload, message } = await analyzeYoutubeProfile(youtubeMusicProfileUrl);
      applyDashboardResponse(payload);
      if (message) {
        setActionMessage(message);
      }
      return;
    }

    const { payload, message } = await analyzeTakeout(file, setAnalysisProgress);
    applyDashboardUploadResponse(payload);
    if (message) {
      setActionMessage(message);
    }
  }

  async function handleUnifiedTakeoutSubmit() {
    const { payload, message } = await analyzeUnifiedTakeout(file, setAnalysisProgress);
    applyDashboardUploadResponse(payload);
    if (message) {
      setActionMessage(message);
    }
  }

  async function handleAppleMusicSubmit() {
    const { payload, message } = await analyzeAppleMusic(file, setAnalysisProgress);
    applyDashboardUploadResponse(payload);
    if (message) {
      setActionMessage(message);
    }
  }

  async function handleLastFmSubmit() {
    const { payload, message } = await analyzeLastFm(lastFmUsername);
    applyDashboardResponse(payload);
    if (message) {
      setActionMessage(message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setUploadStartedAt(Date.now());
    setError(null);
    setActionMessage(null);
    setAnalysisProgress(null);

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
      setError(toUserFacingError(uploadError));
      setParsedHistory([]);
      setDashboard(null);
      setUploadQuality(null);
    } finally {
      setIsUploading(false);
      setAnalysisProgress(null);
      setUploadStartedAt(null);
    }
  }

  if (sharedProfile) {
    return <SharedProfilePage payload={sharedProfile} progressScale={progressScale} />;
  }

  if (sharedPassport) {
    return (
      <SharedPassportPage
        actionMessage={actionMessage}
        exportTheme={exportTheme}
        exportThemeId={exportThemeId}
        exportThemeOptions={Object.entries(EXPORT_THEME_OPTIONS) as Array<[string, ExportThemeDefinition]>}
        onCopyShareableLink={() => handleCopyShareableLink(sharedPassport)}
        onExportAsImage={handleExportAsImage}
        onExportInstagramStory={handleExportInstagramStory}
        onExportThemeChange={(themeId) => setExportThemeId(themeId as ExportThemeId)}
        onShareToInstagram={handleShareToInstagram}
        passport={sharedPassport}
        passportRef={(node) => {
          passportRef.current = node;
        }}
        progressScale={progressScale}
      />
    );
  }

  return (
    <main
      className={`relative isolate min-h-screen px-4 py-6 text-slate-100 md:px-6 lg:px-8 ${
        performanceMode === "smooth" ? "app-smooth" : "app-cinematic"
      }`}
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
        {showIntro && performanceMode === "cinematic" ? (
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
      <AmbientListeningTrails performanceMode={performanceMode} />
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
            variant="auto"
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
          className="hero-shell editorial-hero relative overflow-hidden border shadow-[0_34px_120px_rgba(0,0,0,0.45)]"
          style={{
            borderColor: dashboardTheme.panelBorder,
            background: dashboardTheme.heroGradient
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0" style={{ backgroundImage: dashboardTheme.heroGlow }} />
          <div className="relative p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border,#1E293B)] pb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#F59E0B]">Theme</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["gold-noir", "Gold Noir"],
                    ["violet-dusk", "Violet Dusk"],
                    ["teal-afterglow", "Teal Afterglow"]
                  ] as const).map(([themeId, label]) => (
                    <button
                      key={themeId}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        recapTheme === themeId
                          ? "border-[#D4A853] bg-[#D4A853] text-slate-950"
                          : "border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
                      }`}
                      onClick={() => setRecapTheme(themeId)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ml-0 flex gap-2 md:ml-2">
                  {([
                    ["smooth", "Smooth"],
                    ["cinematic", "Cinematic"]
                  ] as const).map(([modeId, label]) => (
                    <button
                      key={modeId}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                        performanceMode === modeId
                          ? "border-[#67C3C0] bg-[#67C3C0] text-slate-950"
                          : "border-[#1E293B] bg-[#111827] text-white hover:border-[#67C3C0] hover:bg-[#182234]"
                      }`}
                      onClick={() => setPerformanceMode(modeId)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.02fr)_370px] xl:items-start">
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
              <div className="hero-rail-shell">
                <div className="hero-rail-grid">
                  <div className="hero-rail-cell">
                    <p className="hero-rail-kicker">Open</p>
                    <p className="hero-rail-label">Listening scale</p>
                  </div>
                  <div className="hero-rail-cell">
                    <p className="hero-rail-kicker">Middle</p>
                    <p className="hero-rail-label">Artist web and taste arcs</p>
                  </div>
                  <div className="hero-rail-cell">
                    <p className="hero-rail-kicker">Finale</p>
                    <p className="hero-rail-label">Passport and finale card</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 xl:items-end">
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
            </div>

            <div className="source-studio-shell">
              <SourceStudio
                actionMessage={
                  analysisProgress
                    ? `${analysisProgress.message} ${analysisProgress.progress}%`
                    : actionMessage
                }
                error={error}
                fileName={file?.name ?? null}
                isDragActive={isDragActive}
                isUploading={isUploading}
                lastFmUsername={lastFmUsername}
                loadingIndicator={
                  analysisProgress ? (
                    <div className="max-w-md">
                      <LoadingSpinner />
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0F172A]">
                        <div
                          className="h-full rounded-full bg-[#D4A853] transition-all"
                          style={{ width: `${analysisProgress.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <LoadingSpinner />
                  )
                }
                uploadJourney={uploadJourney}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onFileChange={handleFileChange}
                onLastFmUsernameChange={(event) => setLastFmUsername(event.target.value)}
                onSourceModeChange={setSourceMode}
                onSubmit={handleSubmit}
                onYoutubeMusicProfileUrlChange={handleYoutubeMusicProfileUrlChange}
                sourceMode={sourceMode}
                youtubeMusicProfileUrl={youtubeMusicProfileUrl}
              />
            </div>
          </div>
        </motion.section>

        <DashboardWorkspace
          achievementBadges={achievementBadges}
          artistOptions={artistOptions}
          dashboard={dashboard}
          dashboardDensity={dashboardDensity}
          dashboardTheme={dashboardTheme}
          filteredEntries={filteredEntries}
          genreBreakdown={genreBreakdown}
          genreOptions={genreOptions}
          handleDeleteSession={handleDeleteSession}
          handleExportPlaylist={handleExportPlaylist}
          handleRestoreSession={handleRestoreSession}
          handleSaveSession={handleSaveSession}
          heatmapEntries={heatmapEntries}
          heroHours={heroHours}
          isSimpleDashboard={isSimpleDashboard}
          isUploading={isUploading}
          isAdvancedAnalyticsLoading={isAdvancedAnalyticsLoading}
          isYoutubeProfileMode={isYoutubeProfileMode}
          memoryLane={memoryLane}
          moodOptions={moodOptions}
          moodTimeline={moodTimeline}
          parsedHistoryLength={parsedHistory.length}
          personaProfile={personaProfile}
          recapTheme={recapTheme}
          savedSessions={savedSessions}
          scrollToSection={scrollToSection}
          searchTerm={searchTerm}
          sectionRefs={sectionRefs}
          selectedArtist={selectedArtist}
          selectedGenre={selectedGenre}
          selectedMood={selectedMood}
          selectedPlaylist={selectedPlaylist}
          setActionMessage={setActionMessage}
          setDashboardDensity={setDashboardDensity}
          setIsRecapOpen={setIsRecapOpen}
          setRecapTheme={setRecapTheme}
          setSearchTerm={setSearchTerm}
          setSelectedArtist={setSelectedArtist}
          setSelectedGenre={setSelectedGenre}
          setSelectedMood={setSelectedMood}
          setTimeframe={setTimeframe}
          shouldShowAdvancedInsights={Boolean(shouldShowAdvancedInsights)}
          smartInsights={smartInsights}
          stats={stats}
          tasteEvolution={tasteEvolution}
          timeframe={timeframe}
          topArtists={topArtists}
          topSongs={topSongs}
          totalPlays={totalPlays}
          uniqueSongs={uniqueSongs}
          uploadQuality={uploadQuality}
        />


        <div ref={(node) => { sectionRefs.current.share = node; }}>
          <ShareStudio
            actionMessage={actionMessage}
            dashboard={dashboard}
            exportTheme={exportTheme}
            exportThemeId={exportThemeId}
            exportThemeOptions={
              Object.entries(EXPORT_THEME_OPTIONS) as Array<[string, ExportThemeDefinition]>
            }
            isYoutubeProfileMode={isYoutubeProfileMode}
            onCopyPublicProfileLink={handleCopyPublicProfileLink}
            onCopyShareableLink={handleCopyShareableLink}
            onExportAsImage={handleExportAsImage}
            onExportDashboardJson={handleExportDashboardJson}
            onExportInstagramStory={handleExportInstagramStory}
            onExportThemeChange={(themeId) => setExportThemeId(themeId as ExportThemeId)}
            onShareToInstagram={handleShareToInstagram}
            passportData={passportData}
            passportRef={(node) => {
              passportRef.current = node;
            }}
            publicProfilePayload={publicProfilePayload}
            statsPresent={Boolean(stats)}
            youtubeMusicProfileUrl={youtubeMusicProfileUrl}
          />
        </div>

      </motion.div>
    </main>
  );
}

function toUserFacingError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Request failed.";
  }

  const message = error.message.trim();
  if (!message) {
    return "Request failed.";
  }

  if (message.toLowerCase() === "failed to fetch") {
    return "Could not reach the API. Verify VITE_API_BASE_URL, backend health, and CORS origin settings.";
  }

  return message;
}
