import { Suspense, lazy } from "react";
import { motion, type MotionValue } from "framer-motion";

import { ChartSkeleton, Section } from "./DashboardBits";
import type { MusicPassportData } from "./MusicPassportCard";
import type { ExportThemeDefinition } from "../lib/exportShare";

const MusicPassportCard = lazy(() =>
  import("./MusicPassportCard").then((module) => ({
    default: module.MusicPassportCard,
  })),
);

type SharedPassportPageProps = {
  passport: MusicPassportData;
  actionMessage: string | null;
  exportThemeId: string;
  exportTheme: ExportThemeDefinition;
  exportThemeOptions: Array<[string, ExportThemeDefinition]>;
  passportRef: (node: HTMLDivElement | null) => void;
  progressScale: MotionValue<number> | number | string;
  onExportAsImage: () => void | Promise<void>;
  onCopyShareableLink: () => void | Promise<void>;
  onShareToInstagram: () => void | Promise<void>;
  onExportInstagramStory: () => void | Promise<void>;
  onExportThemeChange: (themeId: string) => void;
};

export function SharedPassportPage({
  passport,
  actionMessage,
  exportThemeId,
  exportTheme,
  exportThemeOptions,
  passportRef,
  progressScale,
  onExportAsImage,
  onCopyShareableLink,
  onShareToInstagram,
  onExportInstagramStory,
  onExportThemeChange,
}: SharedPassportPageProps) {
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
          <p className="text-sm uppercase tracking-[0.35em] text-[#F59E0B]">Shared Passport</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            View-only music passport
          </h1>
          <p className="mt-3 max-w-2xl text-[#9CA3AF]">
            This shared link opens a read-only version of the music passport card.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080]"
              onClick={() => void onExportAsImage()}
              type="button"
            >
              Export as Image
            </button>
            <button
              className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
              onClick={() => void onCopyShareableLink()}
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
          </div>

          <div className="mt-6 max-w-sm">
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
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Theme styling and font pairing apply to both the PNG passport and Instagram story export.
            </p>
          </div>

          {actionMessage ? <p className="mt-4 text-sm text-[#F0D080]">{actionMessage}</p> : null}
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
                <MusicPassportCard data={passport} theme={exportTheme.passportTheme} />
              </Suspense>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}

function AmbientMusicScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ambient-noise absolute inset-0" />
    </div>
  );
}
