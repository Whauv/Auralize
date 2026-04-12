import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MusicPassportData, MusicPassportTheme } from "../components/MusicPassportCard";
import type { PublicProfileSharePayload } from "./types";
import {
  buildInstagramStoryCanvas,
  copyPassportShareLink,
  copyPublicShareLink,
  exportInstagramStory,
  exportPassportImage,
  type ExportThemeDefinition,
  renderPassportCanvas,
  shareToInstagram,
} from "./exportShare";

const exportShareMocks = vi.hoisted(() => ({
  copyText: vi.fn().mockResolvedValue(undefined),
  downloadCanvas: vi.fn(),
  drawRoundedImageCover: vi.fn(),
  ensureExportFontsLoaded: vi.fn().mockResolvedValue(undefined),
  loadCanvasImage: vi.fn().mockResolvedValue(null),
  renderNodeToCanvas: vi.fn().mockResolvedValue(document.createElement("canvas")),
  getPublicProfileUrl: vi.fn(() => "https://example.com/profile"),
  getShareUrl: vi.fn(() => "https://example.com/passport"),
}));

vi.mock("./browser", () => ({
  copyText: exportShareMocks.copyText,
}));

vi.mock("./exportCanvas", () => ({
  downloadCanvas: exportShareMocks.downloadCanvas,
  drawRoundedImageCover: exportShareMocks.drawRoundedImageCover,
  ensureExportFontsLoaded: exportShareMocks.ensureExportFontsLoaded,
  loadCanvasImage: exportShareMocks.loadCanvasImage,
  renderNodeToCanvas: exportShareMocks.renderNodeToCanvas,
}));

vi.mock("./sharing", () => ({
  getPublicProfileUrl: exportShareMocks.getPublicProfileUrl,
  getShareUrl: exportShareMocks.getShareUrl,
}));

const passportTheme: MusicPassportTheme = {
  shellBg: "#000",
  shellOverlay: "none",
  ringTint: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.2)",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.08)",
  chipBg: "rgba(255,255,255,0.08)",
  chipText: "#fff",
  accentChipBg: "rgba(255,255,255,0.14)",
  accentChipText: "#fff",
  title: "#fff",
  subtext: "rgba(255,255,255,0.7)",
  fingerprintTrack: "rgba(255,255,255,0.12)",
  fingerprintGradient: "linear-gradient(90deg,#fff,#999)",
  displayFont: "Arial",
  bodyFont: "Arial",
};

const exportTheme: ExportThemeDefinition = {
  label: "Test Theme",
  storyBackground: "#101010",
  storyPanelFill: "rgba(20,20,20,0.8)",
  storyPanelBorder: "rgba(255,255,255,0.2)",
  noteColor: "rgba(255,255,255,0.1)",
  labelColor: "#ccc",
  titleColor: "#fff",
  subtitleColor: "#ddd",
  accentColor: "#f0d080",
  accentSoft: "rgba(240,208,128,0.2)",
  rankBackground: "rgba(240,208,128,0.2)",
  dividerColor: "rgba(255,255,255,0.1)",
  auroraBands: ["#111", "#222", "#333", "#444", "#555", "#666"],
  displayFont: "Arial",
  bodyFont: "Arial",
  displayFontLoad: "900 94px Arial",
  bodyFontLoad: "400 24px Arial",
  passportTheme,
};

const passport: MusicPassportData = {
  topArtist: { name: "Artist One", thumbnail: null },
  topSongs: Array.from({ length: 10 }, (_, index) => ({
    videoId: `song-${index + 1}`,
    title: `Song ${index + 1}`,
    artist: `Artist ${index + 1}`,
    thumbnail: null,
  })),
  totalListeningHours: 12.5,
  dominantGenre: "Lo-fi",
  dominantMood: "Focused",
  listeningStreakDays: 8,
  fingerprint: [{ genre: "Lo-fi", count: 10 }],
};

const publicProfilePayload: PublicProfileSharePayload = {
  sourceLabel: "Takeout",
  timeframeLabel: "Last 30 days",
  generatedAt: "2026-04-05T00:00:00.000Z",
  stats: { topSongs: [], topArtists: [], totalListeningMinutes: 0 },
  genreBreakdown: [],
  moodTimeline: [],
  passport: {
    topArtist: passport.topArtist,
    totalListeningHours: passport.totalListeningHours,
    dominantGenre: passport.dominantGenre,
    dominantMood: passport.dominantMood,
    listeningStreakDays: passport.listeningStreakDays,
  },
  persona: null,
};

describe("export/share helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      globalAlpha: 1,
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      font: "",
    } as unknown as CanvasRenderingContext2D);
  });

  it("renders and exports passport images", async () => {
    const node = document.createElement("div");
    const canvas = document.createElement("canvas");
    exportShareMocks.renderNodeToCanvas.mockResolvedValue(canvas);

    expect(await renderPassportCanvas(node, exportTheme)).toBe(canvas);
    expect(await exportPassportImage(node, exportTheme)).toBe("Passport exported as PNG.");
    expect(exportShareMocks.downloadCanvas).toHaveBeenCalledWith(
      canvas,
      "my-music-passport.png",
    );
  });

  it("builds and exports instagram stories", async () => {
    const canvas = await buildInstagramStoryCanvas(passport, exportTheme);

    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(exportShareMocks.ensureExportFontsLoaded).toHaveBeenCalledWith(exportTheme);

    await exportInstagramStory(passport, exportTheme);
    expect(exportShareMocks.downloadCanvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      "my-music-passport-instagram-story.png",
    );
  });

  it("copies generated share links", async () => {
    expect(await copyPassportShareLink(passport)).toContain("copied");
    expect(await copyPublicShareLink(publicProfilePayload)).toContain("copied");
    expect(exportShareMocks.copyText).toHaveBeenCalledTimes(2);
  });

  it("shares through the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      canShare: vi.fn(() => true),
      share,
    });
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback?.(new Blob(["image"], { type: "image/png" }));
    });

    const result = await shareToInstagram({
      activePassport: passport,
      publicProfilePayload,
      exportTheme,
    });

    expect(result).toContain("Share sheet opened");
    expect(share).toHaveBeenCalled();
    toBlob.mockRestore();
  });
});
