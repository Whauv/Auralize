import { Section } from "./DashboardBits";
import type {
  RecapThemePack,
  RecapVariant,
  SavedSession,
  TimeframeOption,
} from "../lib/types";
import { RECAP_VARIANT_LABELS, TIMEFRAME_COMPARE_OPTIONS, TIMEFRAME_LABELS } from "../lib/utils";

type DashboardDensity = "simple" | "full";

type DashboardControlPanelProps = {
  statsPresent: boolean;
  isYoutubeProfileMode: boolean;
  dashboardDensity: DashboardDensity;
  onDashboardDensityChange: (mode: DashboardDensity) => void;
  compareTimeframe: TimeframeOption;
  onCompareTimeframeChange: (timeframe: TimeframeOption) => void;
  timeframe: TimeframeOption;
  currentStatsLabel: string;
  comparisonHoursLabel: string;
  comparisonMinutesDeltaLabel: string;
  comparisonTopArtist: string;
  currentTopArtist: string;
  comparisonTopGenre: string;
  currentTopGenre: string;
  savedSessions: SavedSession[];
  onSaveSession: () => void;
  onRestoreSession: (session: SavedSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onScrollToSection: (sectionId: string) => void;
  recapVariant: RecapVariant;
  onRecapVariantChange: (variant: RecapVariant) => void;
  recapTheme: RecapThemePack;
  onRecapThemeChange: (theme: RecapThemePack) => void;
  onOpenRecap: () => void;
};

export function DashboardControlPanel({
  statsPresent,
  isYoutubeProfileMode,
  dashboardDensity,
  onDashboardDensityChange,
  compareTimeframe,
  onCompareTimeframeChange,
  timeframe,
  currentStatsLabel,
  comparisonHoursLabel,
  comparisonMinutesDeltaLabel,
  comparisonTopArtist,
  currentTopArtist,
  comparisonTopGenre,
  currentTopGenre,
  savedSessions,
  onSaveSession,
  onRestoreSession,
  onDeleteSession,
  onScrollToSection,
  recapVariant,
  onRecapVariantChange,
  recapTheme,
  onRecapThemeChange,
  onOpenRecap,
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

      {!isYoutubeProfileMode ? (
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
                  onChange={(event) =>
                    onCompareTimeframeChange(event.target.value as TimeframeOption)
                  }
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
                <p className="mt-3 text-2xl font-semibold text-white">
                  {TIMEFRAME_LABELS[timeframe]}
                </p>
                <p className="mt-2 text-sm text-[#9CA3AF]">{currentStatsLabel}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Listening time</p>
                <p className="mt-3 text-2xl font-semibold text-white">{comparisonHoursLabel}</p>
                <p className="mt-2 text-sm text-[#9CA3AF]">{comparisonMinutesDeltaLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Top artist</p>
                <p className="mt-3 text-xl font-semibold text-white">{comparisonTopArtist}</p>
                <p className="mt-2 text-sm text-[#9CA3AF]">Current: {currentTopArtist}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Top genre</p>
                <p className="mt-3 text-xl font-semibold text-white">{comparisonTopGenre}</p>
                <p className="mt-2 text-sm text-[#9CA3AF]">Current: {currentTopGenre}</p>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <Section
        title="Saved Sessions"
        subtitle="Save snapshots of your current dashboard and restore them later without re-uploading."
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

      {!isYoutubeProfileMode ? (
        <div
          className="sticky top-4 z-20 rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] p-3 backdrop-blur-xl"
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
                    Recap Variant
                  </span>
                  <select
                    className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#D4A853]"
                    onChange={(event) => onRecapVariantChange(event.target.value as RecapVariant)}
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
