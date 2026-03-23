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
      className={`rounded-[2rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,15,31,0.88),rgba(13,20,38,0.78))] p-6 shadow-[0_24px_90px_rgba(8,145,178,0.12)] backdrop-blur ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
          Insight
        </p>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-300">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-sm text-cyan-100">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
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
    <div className={`w-full animate-pulse rounded-[1.5rem] border border-white/6 bg-white/4 p-4 ${heightClass}`}>
      <div className="mb-4 h-4 w-40 rounded-full bg-white/12" />
      <div className="space-y-3">
        <div className="h-10 rounded-2xl bg-white/10" />
        <div className="h-10 rounded-2xl bg-white/10" />
        <div className="h-10 rounded-2xl bg-white/10" />
        <div className="h-10 rounded-2xl bg-white/10" />
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
    <div className="rounded-2xl border border-cyan-300/20 bg-[#07111f]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-cyan-950/30">
      {label ? <p className="font-medium text-white">{label}</p> : null}
      <p className="mt-1 text-cyan-200">{value} plays</p>
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
        <rect x={-162} y={-16} width={28} height={28} rx={8} fill="#123247" />
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
                  className={`h-7 rounded-lg border border-white/5 transition hover:scale-105 ${getHeatmapIntensityClass(
                    hourEntry.count,
                    maxCount
                  )}`}
                  title={`${day.day} ${hourEntry.hour}:00 - ${hourEntry.count} plays`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
          <span>Low</span>
          <div className="h-3 w-8 rounded-full bg-white/5" />
          <div className="h-3 w-8 rounded-full bg-cyan-500/25" />
          <div className="h-3 w-8 rounded-full bg-cyan-400/45" />
          <div className="h-3 w-8 rounded-full bg-orange-400/65" />
          <div className="h-3 w-8 rounded-full bg-rose-400/90" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
