import { ReactNode, useMemo } from "react";
import { motion } from "framer-motion";
import type { EnrichedHistoryEntry } from "./types";
import {
  HEATMAP_HOURS,
  buildHeatmapData,
  getHeatmapIntensityClass,
  truncateLabel
} from "./utils";

export function Section({
  title,
  subtitle,
  children,
  className = ""
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={`rounded-[2rem] border border-[#1E293B] bg-[#111827] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.35em] text-[#F59E0B]">
          Insight
        </p>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-[#9CA3AF]">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#D4A853]/25 border-t-[#D4A853]" />
      Building your music profile...
    </div>
  );
}

export function ChartSkeleton({
  heightClass = "h-[320px]"
}: {
  heightClass?: string;
}) {
  return (
    <div className={`w-full animate-pulse rounded-[1.5rem] border border-[#1E293B] bg-[#0f1724] p-4 ${heightClass}`}>
      <div className="mb-4 h-4 w-40 rounded-full bg-[#1f2937]" />
      <div className="space-y-3">
        <div className="h-10 rounded-2xl bg-[#1f2937]" />
        <div className="h-10 rounded-2xl bg-[#1f2937]" />
        <div className="h-10 rounded-2xl bg-[#1f2937]" />
        <div className="h-10 rounded-2xl bg-[#1f2937]" />
      </div>
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value;
  return (
      <div className="rounded-2xl border border-[#1E293B] bg-[#111827]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/30">
      {label ? <p className="font-medium text-white">{label}</p> : null}
      <p className="mt-1 text-[#D4A853]">{value} plays</p>
    </div>
  );
}

export function SongTick({
  x = 0,
  y = 0,
  payload,
  songs
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  songs: EnrichedHistoryEntry[];
}) {
  const song = songs.find((entry) => entry.title === payload?.value);
  const title = truncateLabel(payload?.value ?? "", 18);

  return (
    <g transform={`translate(${x},${y})`}>
      {song?.thumbnail ? (
        <image
          href={song.thumbnail}
          x={-162}
          y={-16}
          width={28}
          height={28}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <rect x={-162} y={-16} width={28} height={28} rx={8} fill="#203244" />
      )}
      <text x={-124} y={5} fill="#f8fafc" fontSize={12}>
        {title}
      </text>
    </g>
  );
}

export function ListeningHeatmap({
  entries
}: {
  entries: EnrichedHistoryEntry[];
}) {
  const { matrix, maxCount } = useMemo(() => buildHeatmapData(entries), [entries]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] md:min-w-[760px]">
        <div className="mb-3 grid grid-cols-[80px_repeat(24,minmax(0,1fr))] gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <div />
          {HEATMAP_HOURS.map((hour) => (
            <div key={hour} className="text-center">
              {hour}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {matrix.map((day) => (
            <div
              key={day.day}
              className="grid grid-cols-[80px_repeat(24,minmax(0,1fr))] gap-2"
            >
              <div className="flex items-center text-sm font-medium text-slate-300">
                {day.day}
              </div>
              {day.hours.map((hourEntry) => (
                <div
                  key={`${day.day}-${hourEntry.hour}`}
                  className={`h-7 rounded-lg border border-[#1E293B] transition hover:scale-105 ${getHeatmapIntensityClass(
                    hourEntry.count,
                    maxCount
                  )}`}
                  title={`${day.day} ${hourEntry.hour}:00 - ${hourEntry.count} plays`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 text-xs text-[#9CA3AF]">
          <span>Low</span>
          <div className="h-3 w-8 rounded-full bg-[#161616]" />
          <div className="h-3 w-8 rounded-full bg-[#4b3c1f]" />
          <div className="h-3 w-8 rounded-full bg-[#7c6331]" />
          <div className="h-3 w-8 rounded-full bg-[#a07f3f]" />
          <div className="h-3 w-8 rounded-full bg-[#d2b36c]" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
