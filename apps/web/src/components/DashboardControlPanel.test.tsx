import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardControlPanel } from "./DashboardControlPanel";
import type { DashboardResponse, SavedSession } from "../lib/types";

const dashboard: DashboardResponse = {
  source: "takeout",
  username: null,
  stats: {
    topSongs: [],
    topArtists: [],
    totalListeningMinutes: 120,
    rawEnrichedHistory: [],
  },
  genreBreakdown: [],
  moodTimeline: [],
  profileSummary: null,
};

const savedSession: SavedSession = {
  id: "session-1",
  name: "Takeout Snapshot",
  savedAt: "2026-04-05T12:00:00.000Z",
  sourceLabel: "Google Takeout",
  timeframe: "30d",
  dashboard,
};

describe("DashboardControlPanel", () => {
  it("drives dashboard mode, recap, and session actions", async () => {
    const user = userEvent.setup();
    const onDashboardDensityChange = vi.fn();
    const onRecapThemeChange = vi.fn();
    const onOpenRecap = vi.fn();
    const onSaveSession = vi.fn();
    const onRestoreSession = vi.fn();
    const onDeleteSession = vi.fn();
    const onScrollToSection = vi.fn();

    render(
      <DashboardControlPanel
        dashboardDensity="simple"
        isYoutubeProfileMode={false}
        onDashboardDensityChange={onDashboardDensityChange}
        onDeleteSession={onDeleteSession}
        onOpenRecap={onOpenRecap}
        onRecapThemeChange={onRecapThemeChange}
        onRestoreSession={onRestoreSession}
        onSaveSession={onSaveSession}
        onScrollToSection={onScrollToSection}
        recapTheme="gold-noir"
        savedSessions={[savedSession]}
        statsPresent
      />,
    );

    await user.click(screen.getByRole("button", { name: "Full view" }));
    await user.selectOptions(screen.getByLabelText("Theme Pack"), "violet-dusk");
    await user.click(screen.getByRole("button", { name: "Launch recap" }));
    await user.click(screen.getByRole("button", { name: "Save current session" }));
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Overview" }));

    expect(onDashboardDensityChange).toHaveBeenCalledWith("full");
    expect(onRecapThemeChange).toHaveBeenCalledWith("violet-dusk");
    expect(onOpenRecap).toHaveBeenCalledTimes(1);
    expect(onSaveSession).toHaveBeenCalledTimes(1);
    expect(onRestoreSession).toHaveBeenCalledWith(savedSession);
    expect(onDeleteSession).toHaveBeenCalledWith("session-1");
    expect(onScrollToSection).toHaveBeenCalledWith("overview");
  });
});
