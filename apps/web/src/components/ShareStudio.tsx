import { Suspense } from "react";

import { ChartSkeleton, Section } from "./DashboardBits";
import type {
  DashboardResponse,
  PublicProfileSharePayload,
} from "../lib/types";
import {
  MusicPassportCard,
  type MusicPassportData,
  type MusicPassportTheme,
} from "./MusicPassportCard";

type ExportThemeDefinition = {
  label: string;
  passportTheme: MusicPassportTheme;
};

type ShareStudioProps = {
  statsPresent: boolean;
  isYoutubeProfileMode: boolean;
  actionMessage: string | null;
  passportData: MusicPassportData | null;
  exportThemeId: string;
  exportTheme: ExportThemeDefinition;
  exportThemeOptions: Array<[string, ExportThemeDefinition]>;
  onExportThemeChange: (themeId: string) => void;
  onExportAsImage: () => void | Promise<void>;
  onCopyShareableLink: (passport: MusicPassportData) => void | Promise<void>;
  onShareToInstagram: () => void | Promise<void>;
  onExportInstagramStory: () => void | Promise<void>;
  onCopyPublicProfileLink: (payload: PublicProfileSharePayload) => void | Promise<void>;
  onExportDashboardJson: (payload: PublicProfileSharePayload) => void;
  publicProfilePayload: PublicProfileSharePayload | null;
  dashboard: DashboardResponse | null;
  youtubeMusicProfileUrl: string;
  passportRef: (node: HTMLDivElement | null) => void;
};

export function ShareStudio({
  statsPresent,
  isYoutubeProfileMode,
  actionMessage,
  passportData,
  exportThemeId,
  exportTheme,
  exportThemeOptions,
  onExportThemeChange,
  onExportAsImage,
  onCopyShareableLink,
  onShareToInstagram,
  onExportInstagramStory,
  onCopyPublicProfileLink,
  onExportDashboardJson,
  publicProfilePayload,
  dashboard,
  youtubeMusicProfileUrl,
  passportRef,
}: ShareStudioProps) {
  return (
    <div className="flex flex-col gap-6">
      {statsPresent && !isYoutubeProfileMode ? (
        <Section
          title="Export Studio"
          subtitle="Package the current view as a profile link, PNG, or structured file."
          className="export-anchored"
        >
          <div className="grid gap-3">
            <button
              className="rounded-[1.4rem] border border-[#E4A94B] bg-[#E4A94B] px-5 py-4 text-left font-semibold text-slate-950 transition hover:bg-[#F0D080]"
              onClick={() => void onExportAsImage()}
              type="button"
            >
              Export passport PNG
            </button>
            <button
              className="rounded-[1.4rem] border border-[#1E293B] bg-[#111827] px-5 py-4 text-left font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
              onClick={() => publicProfilePayload && void onCopyPublicProfileLink(publicProfilePayload)}
              type="button"
            >
              Copy public profile link
            </button>
            <button
              className="rounded-[1.4rem] border border-[#1E293B] bg-[#111827] px-5 py-4 text-left font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
              onClick={() => publicProfilePayload && onExportDashboardJson(publicProfilePayload)}
              type="button"
            >
              Export dashboard summary JSON
            </button>
            {actionMessage ? <p className="pt-2 text-sm text-[#9CA3AF]">{actionMessage}</p> : null}
          </div>
        </Section>
      ) : null}

      {passportData ? (
        <Section
          title="Music Passport"
          subtitle="A shareable summary card you can export as a PNG or copy as a read-only link."
          className="passport-anchored"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="overflow-x-auto">
              <div
                ref={passportRef}
                className="w-fit"
                style={{ background: exportTheme.passportTheme.shellBg }}
              >
                <Suspense fallback={<ChartSkeleton heightClass="h-[520px]" />}>
                  <MusicPassportCard
                    data={passportData}
                    theme={exportTheme.passportTheme}
                  />
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
                  onChange={(event) => onExportThemeChange(event.target.value)}
                  value={exportThemeId}
                >
                  {exportThemeOptions.map(([themeId, theme]) => (
                    <option key={themeId} value={themeId}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-[#9CA3AF]">
                Pick from 10 export themes. The preview updates before you download or share.
              </p>
              <button
                className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
                onClick={() => void onExportAsImage()}
                type="button"
              >
                Export as Image
              </button>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void onCopyShareableLink(passportData)}
                type="button"
              >
                Copy Shareable Link
              </button>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void onShareToInstagram()}
                type="button"
              >
                Share to Instagram
              </button>
              <button
                className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                onClick={() => void onExportInstagramStory()}
                type="button"
              >
                Export Instagram Story
              </button>
              <p className="text-sm text-[#9CA3AF]">
                Instagram sharing uses your device share sheet when supported. Otherwise,
                Auralize downloads a story-ready PNG you can upload manually.
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {isYoutubeProfileMode ? (
        <Section
          title="Public Profile Preview"
          subtitle="This view comes from a public YouTube Music profile link, so it can only show public metadata rather than private listening history."
          className="profile-anchored"
        >
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-[#1E293B] bg-[#111827] p-6">
              <div className="flex items-center gap-4">
                {dashboard?.profileSummary?.thumbnail ? (
                  <img
                    alt={dashboard.profileSummary.name}
                    className="h-20 w-20 rounded-3xl object-cover"
                    src={dashboard.profileSummary.thumbnail}
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
                  A quick preview path when you only have a
                  {" "}
                  <code>music.youtube.com/@...</code>
                  {" "}
                  link
                </div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                  Not available from a public profile link: private play counts, top songs,
                  listening streaks, timestamps, and heatmaps
                </div>
              </div>

              <p className="mt-5 text-sm text-[#9CA3AF]">
                For the full dashboard and passport, upload
                {" "}
                <code>watch-history.json</code>
                {" "}
                or switch to Last.fm Live Mode.
              </p>
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
