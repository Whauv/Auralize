import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShareStudio } from "./ShareStudio";
import type { DashboardResponse, PublicProfileSharePayload } from "../lib/types";
import type { MusicPassportData, MusicPassportTheme } from "./MusicPassportCard";

const passportTheme: MusicPassportTheme = {
  shellBg: "#111827",
  shellOverlay: "none",
  ringTint: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.12)",
  surface: "#1f2937",
  surfaceStrong: "#111827",
  chipBg: "rgba(255,255,255,0.08)",
  chipText: "#ffffff",
  accentChipBg: "rgba(212,168,83,0.18)",
  accentChipText: "#fff7ed",
  title: "#ffffff",
  subtext: "rgba(255,255,255,0.7)",
  fingerprintTrack: "rgba(255,255,255,0.1)",
  fingerprintGradient: "linear-gradient(90deg,#d4a853,#c46b7b)",
  displayFont: "Arial, sans-serif",
  bodyFont: "Arial, sans-serif",
};

const passportData: MusicPassportData = {
  topArtist: { name: "Artist One", thumbnail: null },
  topSongs: [
    { videoId: "one", title: "Song One", artist: "Artist One", thumbnail: null },
  ],
  totalListeningHours: 12.5,
  dominantGenre: "Lo-fi",
  dominantMood: "Focused",
  listeningStreakDays: 9,
  fingerprint: [{ genre: "Lo-fi", count: 5 }],
};

const publicProfilePayload: PublicProfileSharePayload = {
  sourceLabel: "Google Takeout",
  timeframeLabel: "Last 30 days",
  generatedAt: "2026-04-05T12:00:00.000Z",
  stats: {
    topSongs: [],
    topArtists: [],
    totalListeningMinutes: 750,
  },
  genreBreakdown: [],
  moodTimeline: [],
  passport: {
    topArtist: { name: "Artist One", thumbnail: null },
    totalListeningHours: 12.5,
    dominantGenre: "Lo-fi",
    dominantMood: "Focused",
    listeningStreakDays: 9,
  },
  persona: null,
};

const dashboard: DashboardResponse = {
  source: "takeout",
  username: null,
  stats: {
    topSongs: [],
    topArtists: [],
    totalListeningMinutes: 750,
    rawEnrichedHistory: [],
  },
  genreBreakdown: [],
  moodTimeline: [],
  profileSummary: null,
};

describe("ShareStudio", () => {
  it("fires export, share, and theme selection handlers", async () => {
    const user = userEvent.setup();
    const onExportThemeChange = vi.fn();
    const onExportAsImage = vi.fn();
    const onCopyShareableLink = vi.fn();
    const onShareToInstagram = vi.fn();
    const onExportInstagramStory = vi.fn();
    const onCopyPublicProfileLink = vi.fn();
    const onExportDashboardJson = vi.fn();

    render(
      <ShareStudio
        actionMessage="Ready to share"
        dashboard={dashboard}
        exportTheme={{ label: "Aurora Noir", passportTheme }}
        exportThemeId="aurora-noir"
        exportThemeOptions={[
          ["aurora-noir", { label: "Aurora Noir", passportTheme }],
          ["anime-pop", { label: "Anime Pop", passportTheme }],
        ]}
        isYoutubeProfileMode={false}
        onCopyPublicProfileLink={onCopyPublicProfileLink}
        onCopyShareableLink={onCopyShareableLink}
        onExportAsImage={onExportAsImage}
        onExportDashboardJson={onExportDashboardJson}
        onExportInstagramStory={onExportInstagramStory}
        onExportThemeChange={onExportThemeChange}
        onShareToInstagram={onShareToInstagram}
        passportData={passportData}
        passportRef={vi.fn()}
        publicProfilePayload={publicProfilePayload}
        statsPresent
        youtubeMusicProfileUrl=""
      />,
    );

    await user.selectOptions(screen.getByDisplayValue("Aurora Noir"), "anime-pop");
    await user.click(screen.getByRole("button", { name: "Export as Image" }));
    await user.click(screen.getByRole("button", { name: "Copy Shareable Link" }));
    await user.click(screen.getByRole("button", { name: "Share to Instagram" }));
    await user.click(screen.getByRole("button", { name: "Export Instagram Story" }));
    await user.click(screen.getByRole("button", { name: "Copy public profile link" }));
    await user.click(screen.getByRole("button", { name: "Export dashboard summary JSON" }));

    expect(onExportThemeChange).toHaveBeenCalledWith("anime-pop");
    expect(onExportAsImage).toHaveBeenCalledTimes(1);
    expect(onCopyShareableLink).toHaveBeenCalledWith(passportData);
    expect(onShareToInstagram).toHaveBeenCalledTimes(1);
    expect(onExportInstagramStory).toHaveBeenCalledTimes(1);
    expect(onCopyPublicProfileLink).toHaveBeenCalledWith(publicProfilePayload);
    expect(onExportDashboardJson).toHaveBeenCalledWith(publicProfilePayload);
  });
});
