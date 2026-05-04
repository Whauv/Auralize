import { useState } from "react";
import { Section } from "./DashboardBits";
import type {
  DashboardResponse,
  RecapThemePack,
  SavedSession,
} from "../lib/types";
import { TIMEFRAME_LABELS } from "../lib/utils";

type DashboardDensity = "simple" | "full";

type DashboardControlPanelProps = {
  statsPresent: boolean;
  isYoutubeProfileMode: boolean;
  dashboardDensity: DashboardDensity;
  onDashboardDensityChange: (mode: DashboardDensity) => void;
  savedSessions: SavedSession[];
  onSaveSession: () => void;
  onRestoreSession: (session: SavedSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onScrollToSection: (sectionId: string) => void;
  recapTheme: RecapThemePack;
  onRecapThemeChange: (theme: RecapThemePack) => void;
  onOpenRecap: () => void;
  currentDashboard: DashboardResponse | null;
  currentTimeframe: import("../lib/types").TimeframeOption;
};

export function DashboardControlPanel({
  statsPresent,
  isYoutubeProfileMode,
  dashboardDensity,
  onDashboardDensityChange,
  savedSessions,
  onSaveSession,
  onRestoreSession,
  onDeleteSession,
  onScrollToSection,
  recapTheme,
  onRecapThemeChange,
  onOpenRecap,
  currentDashboard,
  currentTimeframe,
}: DashboardControlPanelProps) {
  if (!statsPresent) {
    return null;
  }

  return (
    <>
      {!isYoutubeProfileMode ? (
        <Section
          title="Dashboard Mode"
          subtitle="Keep the page focused with the core story, or open the full analytics stack when you want the deeper read."
          className="mode-anchored insight-box"
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
                onClick={() => onDashboardDensityChange(mode)}
                type="button"
              >
                {mode === "simple" ? "Simple view" : "Full view"}
              </button>
            ))}
            <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
              {dashboardDensity === "simple" ? "Core story only" : "Deeper analytics unlocked"}
            </span>
          </div>
        </Section>
      ) : null}

      <Section
        title="Saved Sessions"
        subtitle="Save snapshots of your current dashboard and restore them later without re-uploading."
        className="sessions-anchored insight-box insight-box-soft"
      >
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
            onClick={onSaveSession}
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
                    {session.sourceLabel} · {TIMEFRAME_LABELS[session.timeframe]} ·{" "}
                    {new Date(session.savedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => onRestoreSession(session)}
                    type="button"
                  >
                    Restore
                  </button>
                  <button
                    className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                    onClick={() => onDeleteSession(session.id)}
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
            No saved sessions yet. Save one after generating a dashboard to build your own
            listening archive.
          </p>
        )}
      </Section>

      <Section
        title="Compare Sessions"
        subtitle="Pair the current dashboard window against a saved snapshot to see listening deltas."
        className="insight-box"
      >
        <SessionComparePanel
          currentDashboard={currentDashboard}
          currentTimeframe={currentTimeframe}
          savedSessions={savedSessions}
        />
      </Section>

      {!isYoutubeProfileMode ? (
        <div
          className="sticky top-4 z-20 border-y border-[var(--panel-border,#1E293B)] py-3 backdrop-blur-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--panel-bg,#111827) 92%, transparent)",
          }}
        >
          <div className="flex flex-wrap gap-3">
            {[
              ["overview", "Overview"],
              ["habits", "Habits"],
              ["share", "Share"],
              ...(dashboardDensity === "full" ? [["deep-dive", "Deep Dive"]] : []),
            ].map(([sectionId, label]) => (
              <button
                key={sectionId}
                className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => onScrollToSection(sectionId)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isYoutubeProfileMode ? (
        <Section
          title="Instant Recap"
          subtitle="Turn this listening profile into a cinematic, story-style recap whenever you want."
          className="recap-anchored insight-box"
        >
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="max-w-2xl text-base text-[#9CA3AF]">
                Launch a full-screen recap built from your total listening time, top song,
                artist orbit, genre DNA, mood signature, peak listening window, and passport
                finale.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                    Theme Pack
                  </span>
                  <select
                    className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                    onChange={(event) =>
                      onRecapThemeChange(event.target.value as RecapThemePack)
                    }
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
                  onClick={onOpenRecap}
                  type="button"
                >
                  Launch recap
                </button>
                <span className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-3 text-sm text-[#9CA3AF]">
                  timeframe-aware chapters
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
                <p className="mt-2 text-sm font-semibold text-white">
                  Artist web and taste arcs
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Finale</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Passport and finale card
                </p>
              </div>
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}

function SessionComparePanel({
  currentDashboard,
  currentTimeframe,
  savedSessions,
}: {
  currentDashboard: DashboardResponse | null;
  currentTimeframe: import("../lib/types").TimeframeOption;
  savedSessions: SavedSession[];
}) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const selectedSession = savedSessions.find((session) => session.id === selectedSessionId) ?? null;

  if (!currentDashboard) {
    return <p className="text-sm text-[#9CA3AF]">Load dashboard data to enable session compare.</p>;
  }

  const currentMinutes = currentDashboard.stats.totalListeningMinutes;
  const baselineMinutes = selectedSession?.dashboard.stats.totalListeningMinutes ?? 0;
  const deltaMinutes = currentMinutes - baselineMinutes;
  const currentTopArtist = currentDashboard.stats.topArtists[0]?.artist ?? "Unknown";
  const baselineTopArtist = selectedSession?.dashboard.stats.topArtists[0]?.artist ?? "Unknown";
  const currentTopGenre = currentDashboard.genreBreakdown[0]?.genre ?? "Other";
  const baselineTopGenre = selectedSession?.dashboard.genreBreakdown[0]?.genre ?? "Other";

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Saved session baseline</span>
        <select
          className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
          onChange={(event) => setSelectedSessionId(event.target.value)}
          value={selectedSessionId}
        >
          <option value="">Select a saved session</option>
          {savedSessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name} · {TIMEFRAME_LABELS[session.timeframe]}
            </option>
          ))}
        </select>
      </label>

      {selectedSession ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1rem] border border-[#1E293B] bg-[#0F172A] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Listening time delta</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {deltaMinutes >= 0 ? "+" : ""}
              {Math.round(deltaMinutes)}
              {" "}min
            </p>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {TIMEFRAME_LABELS[currentTimeframe]} vs {TIMEFRAME_LABELS[selectedSession.timeframe]}
            </p>
          </div>
          <div className="rounded-[1rem] border border-[#1E293B] bg-[#0F172A] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Top artist shift</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {baselineTopArtist} → {currentTopArtist}
            </p>
          </div>
          <div className="rounded-[1rem] border border-[#1E293B] bg-[#0F172A] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">Top genre shift</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {baselineTopGenre} → {currentTopGenre}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#9CA3AF]">
          Choose any saved session to compare deltas against the current dashboard.
        </p>
      )}
    </div>
  );
}
