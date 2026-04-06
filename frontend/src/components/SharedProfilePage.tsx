import { motion, type MotionValue } from "framer-motion";

import { Section } from "./DashboardBits";
import type { PublicProfileSharePayload } from "../lib/types";

type SharedProfilePageProps = {
  payload: PublicProfileSharePayload;
  progressScale: MotionValue<number> | number | string;
};

export function SharedProfilePage({ payload, progressScale }: SharedProfilePageProps) {
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
            {payload.timeframeLabel} listening snapshot
          </h1>
          <p className="mt-3 max-w-2xl text-[#9CA3AF]">
            Shared from Auralize as a read-only profile page for {payload.sourceLabel}.
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
                  {payload.passport.topArtist.name}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Listening Time</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {payload.passport.totalListeningHours.toFixed(1)} hrs
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Dominant Genre</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {payload.passport.dominantGenre}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Dominant Mood</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {payload.passport.dominantMood}
                </p>
              </div>
            </div>
            {payload.persona ? (
              <div className="mt-5 rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Persona</p>
                <p className="mt-3 text-2xl font-semibold text-white">{payload.persona.title}</p>
                <p className="mt-2 text-sm text-[#9CA3AF]">{payload.persona.subtitle}</p>
              </div>
            ) : null}
          </Section>

          <Section
            title="Top Songs"
            subtitle="The tracks that define this shared listening profile."
          >
            <div className="grid gap-3">
              {payload.stats.topSongs.slice(0, 6).map((song) => (
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

function AmbientMusicScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ambient-noise absolute inset-0" />
    </div>
  );
}
