import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type {
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MoodTimelineEntry
} from "../lib/types";
import { truncateLabel } from "../lib/utils";
import {
  ArtistClusterWeb,
  ChartTooltip,
  ListeningHeatmap,
  Section,
  SongTick
} from "./DashboardBits";

type DashboardTheme = {
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  pieColors: string[];
};

type DashboardOverviewSectionsProps = {
  topSongs: EnrichedHistoryEntry[];
  topArtists: Array<{ artist: string; playCount: number }>;
  genreBreakdown: GenreBreakdownEntry[];
  moodTimeline: MoodTimelineEntry[];
  heatmapEntries: EnrichedHistoryEntry[];
  statsEntries: EnrichedHistoryEntry[];
  isSimpleDashboard: boolean;
  dashboardTheme: DashboardTheme;
};

export function DashboardOverviewSections({
  topSongs,
  topArtists,
  genreBreakdown,
  moodTimeline,
  heatmapEntries,
  statsEntries,
  isSimpleDashboard,
  dashboardTheme
}: DashboardOverviewSectionsProps) {
  return (
    <>
      <Section
        title="Top Songs"
        subtitle="Your 10 most-played songs with cover art embedded into the chart labels."
      >
        <div className="h-[380px] md:h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topSongs}
              layout="vertical"
              margin={{
                top: 10,
                right: 10,
                left: typeof window !== "undefined" && window.innerWidth < 768 ? 135 : 170,
                bottom: 0
              }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="title"
                width={typeof window !== "undefined" && window.innerWidth < 768 ? 145 : 180}
                tick={(props) => <SongTick {...props} songs={topSongs} />}
                stroke="transparent"
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="playCount" radius={[0, 12, 12, 0]} fill={dashboardTheme.chartPrimary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        title="Top Artists"
        subtitle="Artists sorted by total play count across your listening history."
      >
        <div className="h-[320px] md:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topArtists.map((entry) => ({
                ...entry,
                artist: truncateLabel(entry.artist, 18)
              }))}
              margin={{ top: 10, right: 20, left: 0, bottom: 50 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="artist"
                angle={-18}
                textAnchor="end"
                interval={0}
                height={70}
                stroke="#9CA3AF"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="playCount" radius={[12, 12, 0, 0]} fill={dashboardTheme.chartSecondary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {!isSimpleDashboard ? (
        <Section
          title="Artist Web"
          subtitle="A living constellation of the artists shaping this listening window."
        >
          <ArtistClusterWeb entries={statsEntries} />
        </Section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Genre DNA"
          subtitle="Keyword-led genre classification with artist-name fallback when tags are missing."
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[280px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreBreakdown}
                    dataKey="count"
                    nameKey="genre"
                    innerRadius={50}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {genreBreakdown.map((entry, index) => (
                      <Cell
                        key={entry.genre}
                        fill={dashboardTheme.pieColors[index % dashboardTheme.pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {genreBreakdown.map((entry, index) => (
                <div key={entry.genre} className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            dashboardTheme.pieColors[index % dashboardTheme.pieColors.length]
                        }}
                      />
                      <span className="font-medium text-white">{entry.genre}</span>
                    </div>
                    <span className="text-sm text-[#9CA3AF]">{entry.percentage}%</span>
                  </div>
                  <p className="mt-2 text-sm text-[#9CA3AF]">{entry.count} plays</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {!isSimpleDashboard ? (
          <Section
            title="Mood Timeline"
            subtitle="Time-of-day buckets that hint at how your listening shifts through the day."
          >
            <div className="h-[280px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moodTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="mood" stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="playCount" radius={[12, 12, 0, 0]} fill={dashboardTheme.chartTertiary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        ) : (
          <Section
            title="Listening Habits"
            subtitle="Your strongest listening mood and the time of day where it shows up most."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {moodTimeline.slice(0, 2).map((entry, index) => (
                <div
                  key={entry.mood}
                  className="rounded-[1.5rem] border border-[#1E293B] bg-[#0F172A] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">
                    {index === 0 ? "Dominant mood" : "Runner-up mood"}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{entry.mood}</p>
                  <p className="mt-2 text-sm text-[#9CA3AF]">{entry.playCount} plays</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <Section
        title="Listening Heatmap"
        subtitle="A 7x24 weekly matrix showing when your plays cluster by day and hour."
      >
        <ListeningHeatmap entries={heatmapEntries} />
      </Section>
    </>
  );
}
