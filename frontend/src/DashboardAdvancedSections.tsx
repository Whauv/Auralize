import { useState } from "react";
import { Section } from "./DashboardBits";
import type {
  AchievementBadge,
  EnrichedHistoryEntry,
  MemoryLaneEntry,
  PersonaProfile,
  PlaylistBundle,
  SmartInsight,
  TasteEvolutionPoint
} from "./types";
import { copyText, formatTimestamp } from "./utils";

export function DashboardAdvancedSections({
  selectedPlaylist,
  onExportPlaylist,
  onActionMessage,
  personaProfile,
  smartInsights,
  tasteEvolution,
  memoryLane,
  achievementBadges,
  recentHistory
}: {
  selectedPlaylist: PlaylistBundle | null;
  onExportPlaylist: (bundle: PlaylistBundle) => void;
  onActionMessage: (message: string) => void;
  personaProfile: PersonaProfile | null;
  smartInsights: SmartInsight[];
  tasteEvolution: TasteEvolutionPoint[];
  memoryLane: MemoryLaneEntry[];
  achievementBadges: AchievementBadge[];
  recentHistory: EnrichedHistoryEntry[];
}) {
  const [activeTab, setActiveTab] = useState<"taste" | "archive" | "create">("taste");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="pr-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#F59E0B]">
          Deep Dive
        </p>
        {([
          ["taste", "Taste"],
          ["archive", "Archive"],
          ["create", "Create"]
        ] as const).map(([tabId, label]) => (
          <button
            key={tabId}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tabId
                ? "border border-[var(--accent,#D4A853)] bg-[var(--accent,#D4A853)] text-slate-950"
                : "border border-[var(--panel-border,#1E293B)] bg-transparent text-[var(--heading,#FFFFFF)] hover:border-[var(--accent,#D4A853)] hover:bg-[#182234]"
            }`}
            onClick={() => setActiveTab(tabId)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "create" && selectedPlaylist ? (
        <Section
          title="Playlist Generator"
          subtitle="Turn the current filtered snapshot into reusable listening sets without crowding the main dashboard."
        >
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-5">
              <h3 className="text-2xl font-semibold text-[var(--heading,#FFFFFF)]">
                {selectedPlaylist.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--subtext,#9CA3AF)]">
                {selectedPlaylist.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-[var(--accent,#D4A853)] bg-[var(--accent,#D4A853)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-soft,#F0D080)]"
                  onClick={() => onExportPlaylist(selectedPlaylist)}
                  type="button"
                >
                  Export playlist
                </button>
                <button
                  className="rounded-full border border-[var(--panel-border,#1E293B)] bg-[var(--panel-bg,#111827)] px-4 py-2 text-sm font-semibold text-[var(--heading,#FFFFFF)] transition hover:border-[var(--accent,#D4A853)] hover:bg-[#182234]"
                  onClick={() =>
                    void copyText(selectedPlaylist.tracks.map((track) => track.url).join("\n")).then(() =>
                      onActionMessage(`${selectedPlaylist.title} links copied.`)
                    )
                  }
                  type="button"
                >
                  Copy track links
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {selectedPlaylist.tracks.slice(0, 6).map((track, index) => (
                <article
                  key={track.videoId}
                  className="flex items-center gap-4 rounded-[1.4rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-[var(--accent-soft,#F0D080)]"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent,#D4A853) 12%, transparent)" }}
                  >
                    {index + 1}
                  </div>
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-[var(--panel-muted,#1F2937)]" />
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-[var(--heading,#FFFFFF)]">
                      {track.title}
                    </h3>
                    <p className="truncate text-sm text-[var(--subtext,#9CA3AF)]">
                      {track.artist}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {activeTab === "taste" ? (
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Section
          title="Persona And Signals"
          subtitle="Your listening identity and the strongest quick-take observations, combined into one cleaner read."
        >
          <div className="grid gap-4">
            {personaProfile ? (
              <div className="rounded-[1.75rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                  Listening Persona
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-[var(--heading,#FFFFFF)]">
                  {personaProfile.title}
                </h3>
                <p className="mt-3 text-sm text-[var(--subtext,#9CA3AF)]">
                  {personaProfile.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {personaProfile.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border px-4 py-2 text-sm"
                      style={{
                        borderColor: "color-mix(in srgb, var(--accent,#D4A853) 20%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--accent,#D4A853) 10%, transparent)",
                        color: "var(--accent-soft,#F0D080)"
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {smartInsights.map((insight) => (
                <article
                  key={insight.title}
                  className="rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4"
                >
                  <h3 className="text-lg font-semibold text-[var(--heading,#FFFFFF)]">
                    {insight.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--subtext,#9CA3AF)]">{insight.body}</p>
                </article>
              ))}
            </div>
          </div>
        </Section>

        <Section
          title="Taste Evolution"
          subtitle="How your dominant sound shifted across recent windows in the current timeframe."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {tasteEvolution.map((point) => (
              <article
                key={`${point.label}-${point.topArtist}`}
                className="rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">{point.label}</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--heading,#FFFFFF)]">
                  {point.topGenre}
                </p>
                <p className="mt-2 text-sm text-[var(--subtext,#9CA3AF)]">
                  {point.topArtist} led this phase.
                </p>
                <p className="mt-4 text-sm" style={{ color: "var(--accent,#D4A853)" }}>
                  {point.playCount} plays in this window
                </p>
              </article>
            ))}
          </div>
        </Section>
      </div>
      ) : null}

      {activeTab === "archive" ? (
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Section
          title="Memory Lane"
          subtitle="Songs that have been with you the longest in the current snapshot."
        >
          <div className="grid gap-3">
            {memoryLane.map((entry) => (
              <article
                key={`${entry.videoId}-${entry.firstPlayed}`}
                className="flex items-center gap-4 rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4"
              >
                {entry.thumbnail ? (
                  <img
                    src={entry.thumbnail}
                    alt={entry.title}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-[var(--panel-muted,#1F2937)]" />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-[var(--heading,#FFFFFF)]">
                    {entry.title}
                  </h3>
                  <p className="truncate text-sm text-[var(--subtext,#9CA3AF)]">{entry.artist}</p>
                  <p className="mt-2 text-xs text-[var(--accent-soft,#F0D080)]">
                    First heard {formatTimestamp(entry.firstPlayed)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section
          title="Achievement Badges"
          subtitle="Milestones and listening tendencies earned from your archive."
        >
          <div className="grid gap-3">
            {achievementBadges.map((badge) => {
              const tone =
                badge.tone === "teal"
                  ? {
                      border: "rgba(94,234,212,0.2)",
                      bg: "rgba(94,234,212,0.1)",
                      text: "#99F6E4"
                    }
                  : badge.tone === "ember"
                    ? {
                        border: "rgba(217,119,87,0.2)",
                        bg: "rgba(217,119,87,0.1)",
                        text: "#F5B39A"
                      }
                    : {
                        border: "rgba(212,168,83,0.2)",
                        bg: "rgba(212,168,83,0.1)",
                        text: "var(--accent-soft,#F0D080)"
                      };

              return (
                <article
                  key={badge.title}
                  className="rounded-[1.5rem] border p-4"
                  style={{ borderColor: tone.border, backgroundColor: tone.bg, color: tone.text }}
                >
                  <h3 className="text-lg font-semibold">{badge.title}</h3>
                  <p className="mt-2 text-sm text-[#E5E7EB]">{badge.description}</p>
                </article>
              );
            })}
          </div>
        </Section>
      </div>
      ) : null}

      {activeTab === "archive" ? (
      <Section
        title="Recent Parsed History"
        subtitle="A compact view of the enriched records powering this dashboard."
      >
        <div className="grid gap-3">
          {recentHistory.slice(0, 8).map((entry) => (
            <article
              key={entry.videoId}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-4">
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt={entry.title} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-[var(--panel-muted,#1F2937)]" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-[var(--heading,#FFFFFF)]">{entry.title}</h3>
                  <p className="text-sm text-[var(--subtext,#9CA3AF)]">{entry.artist}</p>
                  <p className="mt-1 text-xs text-[var(--subtext,#9CA3AF)]">
                    {entry.tags.slice(0, 3).join(" | ") || "No tags"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent,#D4A853) 10%, transparent)",
                    color: "var(--accent-soft,#F0D080)"
                  }}
                >
                  {entry.playCount} plays
                </span>
                <span className="rounded-full bg-[var(--panel-bg,#111827)] px-3 py-1 text-xs text-[var(--subtext,#9CA3AF)]">
                  {entry.duration}
                </span>
                {entry.timestamps[0] ? (
                  <span className="rounded-full bg-[var(--panel-bg,#111827)] px-3 py-1 text-xs text-[var(--subtext,#9CA3AF)]">
                    {formatTimestamp(entry.timestamps[0])}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Section>
      ) : null}
    </>
  );
}
