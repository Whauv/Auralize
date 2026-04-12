import { ReactNode, useMemo } from "react";
import { motion } from "framer-motion";
import type { EnrichedHistoryEntry } from "../lib/types";
import {
  HEATMAP_HOURS,
  buildArtistClusters,
  buildHeatmapData,
  getHeatmapIntensityClass,
  truncateLabel
} from "../lib/utils";

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
      className={`section-panel rounded-[2rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-bg,#111827)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.35em] text-[#F59E0B]">
          Insight
        </p>
        <h2 className="font-display text-[1.9rem] leading-[0.96] text-[var(--heading,#FFFFFF)]">{title}</h2>
        <p className="font-body text-sm leading-6 text-[var(--subtext,#9CA3AF)]">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--subtext,#9CA3AF)]">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2"
        style={{
          borderColor: "color-mix(in srgb, var(--accent,#D4A853) 25%, transparent)",
          borderTopColor: "var(--accent,#D4A853)"
        }}
      />
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
    <div className={`w-full animate-pulse rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4 ${heightClass}`}>
      <div className="mb-4 h-4 w-40 rounded-full bg-[var(--panel-muted,#1f2937)]" />
      <div className="space-y-3">
        <div className="h-10 rounded-2xl bg-[var(--panel-muted,#1f2937)]" />
        <div className="h-10 rounded-2xl bg-[var(--panel-muted,#1f2937)]" />
        <div className="h-10 rounded-2xl bg-[var(--panel-muted,#1f2937)]" />
        <div className="h-10 rounded-2xl bg-[var(--panel-muted,#1f2937)]" />
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
    <div
      className="rounded-2xl border border-[var(--panel-border,#1E293B)] px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-black/30"
      style={{ backgroundColor: "color-mix(in srgb, var(--panel-bg,#111827) 95%, transparent)" }}
    >
      {label ? <p className="font-medium text-[var(--heading,#FFFFFF)]">{label}</p> : null}
      <p className="mt-1 text-[var(--accent,#D4A853)]">{value} plays</p>
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
            <div key={hour} className="text-center text-[var(--subtext,#9CA3AF)]">
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
              <div className="flex items-center text-sm font-medium text-[var(--heading,#FFFFFF)]">
                {day.day}
              </div>
              {day.hours.map((hourEntry) => (
                <div
                  key={`${day.day}-${hourEntry.hour}`}
                  className={`h-7 rounded-lg border border-[var(--panel-border,#1E293B)] transition hover:scale-105 ${getHeatmapIntensityClass(
                    hourEntry.count,
                    maxCount
                  )}`}
                  title={`${day.day} ${hourEntry.hour}:00 - ${hourEntry.count} plays`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 text-xs text-[var(--subtext,#9CA3AF)]">
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

export function ArtistClusterWeb({
  entries
}: {
  entries: EnrichedHistoryEntry[];
}) {
  const cluster = useMemo(() => buildArtistClusters(entries), [entries]);

  if (!cluster.nodes.length) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-6 text-sm text-[var(--subtext,#9CA3AF)]">
        Not enough artist data yet to build the listening constellation.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr] xl:items-center">
      <div className="mx-auto w-full max-w-[420px] rounded-[1.8rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4">
        <svg viewBox="0 0 360 360" className="w-full">
          <defs>
            <radialGradient id="artistWebGlow" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="var(--accent,#D4A853)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--panel-alt,#0F172A)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="180" cy="180" r="148" fill="url(#artistWebGlow)" />
          {cluster.links.map((link) => {
            const source = cluster.nodes.find((node) => node.id === link.source);
            const target = cluster.nodes.find((node) => node.id === link.target);
            if (!source || !target) {
              return null;
            }

            return (
              <line
                key={`${link.source}-${link.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--accent,#D4A853)"
                strokeOpacity="0.26"
                strokeWidth="1.6"
              />
            );
          })}
          {cluster.nodes.map((node, index) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r={Math.max(18, node.size / 4.2)}
                fill={index === 0 ? "var(--accent,#D4A853)" : "var(--panel-muted,#1F2937)"}
                fillOpacity={index === 0 ? "0.22" : "0.9"}
                stroke={index === 0 ? "var(--accent-soft,#F0D080)" : "var(--panel-border,#334155)"}
                strokeWidth="2"
              />
              {node.thumbnail ? (
                <image
                  href={node.thumbnail}
                  x={-(Math.max(18, node.size / 4.8))}
                  y={-(Math.max(18, node.size / 4.8))}
                  width={Math.max(36, node.size / 2.4)}
                  height={Math.max(36, node.size / 2.4)}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath="circle(50%)"
                />
              ) : null}
              <text
                x="0"
                y={Math.max(26, node.size / 3.6)}
                textAnchor="middle"
                fill="var(--heading,#FFFFFF)"
                fontSize="10"
                fontWeight="700"
              >
                {truncateLabel(node.artist, 16)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="grid gap-3">
        {cluster.nodes.slice(0, 5).map((node, index) => (
          <article
            key={node.id}
            className="rounded-[1.5rem] border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#F59E0B]">
                  Cluster {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--heading,#FFFFFF)]">{node.artist}</h3>
              </div>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-soft,#F0D080)]" style={{ borderColor: "color-mix(in srgb, var(--accent,#D4A853) 24%, transparent)", backgroundColor: "color-mix(in srgb, var(--accent,#D4A853) 10%, transparent)" }}>
                {node.genre}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--subtext,#9CA3AF)]">{node.playCount} weighted plays</p>
            <p className="mt-2 text-sm text-[var(--subtext,#9CA3AF)]">
              Anchored by {node.songs.map((song) => truncateLabel(song, 18)).join(", ")}.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
