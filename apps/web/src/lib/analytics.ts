import type {
  AchievementBadge,
  DashboardResponse,
  EnrichedHistoryEntry,
  GenreBreakdownEntry,
  MemoryLaneEntry,
  MoodTimelineEntry,
  PersonaProfile,
  PlaylistBundle,
  PlaylistTrack,
  SmartInsight,
  StatsPayload,
  TasteEvolutionPoint,
  TimeframeOption,
} from "./types";
import type { MusicPassportData } from "../components/MusicPassportCard";
import { HEATMAP_DAYS, HEATMAP_HOURS } from "./constants";

const ISO_8601_DURATION_PATTERN =
  /^P(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)$/;

const GENRE_KEYWORDS: Record<string, string[]> = {
  Pop: ["pop", "dance pop", "synthpop", "electropop", "teen pop"],
  "Hip-Hop": ["hip hop", "hip-hop", "rap", "trap", "drill", "freestyle"],
  Rock: ["rock", "punk", "metal", "grunge", "alternative rock", "hard rock"],
  "R&B": ["r&b", "randb", "rhythm and blues", "soul", "neo soul", "neo-soul"],
  Electronic: ["electronic", "edm", "house", "techno", "trance", "dubstep", "dnb"],
  Classical: ["classical", "orchestra", "orchestral", "baroque", "piano sonata"],
  Jazz: ["jazz", "bebop", "swing", "fusion", "smooth jazz"],
  "Lo-fi": ["lofi", "lo-fi", "chillhop", "study beats", "sleep beats"],
  Indie: ["indie", "indie pop", "indie rock", "bedroom pop", "shoegaze"],
  "K-Pop": ["k-pop", "kpop", "korean pop", "idol", "girl group", "boy group"],
};

const ARTIST_HEURISTICS: Record<string, string[]> = {
  "K-Pop": ["bts", "blackpink", "twice", "newjeans", "stray kids", "seventeen", "aespa"],
  "Hip-Hop": ["drake", "kendrick", "j cole", "future", "travis scott", "nicki minaj"],
  "R&B": ["sza", "the weeknd", "brent faiyaz", "summer walker", "frank ocean", "kehlani"],
  Pop: ["taylor swift", "ariana grande", "dua lipa", "olivia rodrigo", "selena gomez"],
  Rock: ["foo fighters", "linkin park", "arctic monkeys", "paramore", "queen"],
  Electronic: ["skrillex", "calvin harris", "fred again", "deadmau5", "odesza"],
  Classical: ["mozart", "beethoven", "chopin", "bach", "vivaldi"],
  Jazz: ["miles davis", "john coltrane", "ella fitzgerald", "chet baker", "duke ellington"],
  "Lo-fi": ["jinsang", "nujabes", "tomppabeats", "idealism", "eevee"],
  Indie: ["phoebe bridgers", "clairo", "beabadoobee", "the smiths", "mac demarco"],
};

const MOOD_LABELS = {
  lateNight: "Chill/Nocturnal",
  morning: "Energized",
  afternoon: "Focused",
  evening: "Relaxed",
} as const;

export function buildTakeoutDashboardResponse(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[],
  source: DashboardResponse["source"] = "takeout",
): DashboardResponse {
  return {
    source,
    username: null,
    stats,
    genreBreakdown,
    moodTimeline,
    profileSummary: null,
  };
}

export function filterHistoryBySearchAndFacets(
  entries: EnrichedHistoryEntry[],
  options: { searchTerm: string; genre: string; artist: string; mood: string },
): EnrichedHistoryEntry[] {
  const term = options.searchTerm.trim().toLowerCase();

  return entries.filter((entry) => {
    const genre = classifyGenre(entry.tags, entry.artist);
    const matchesSearch =
      !term ||
      entry.title.toLowerCase().includes(term) ||
      entry.artist.toLowerCase().includes(term) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(term));
    const matchesGenre = !options.genre || genre === options.genre;
    const matchesArtist = !options.artist || entry.artist === options.artist;
    const matchesMood =
      !options.mood ||
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour !== null && classifyMoodFromHour(hour) === options.mood;
      });

    return matchesSearch && matchesGenre && matchesArtist && matchesMood;
  });
}

export function getEntryMoodLabels(entry: EnrichedHistoryEntry): string[] {
  return Array.from(
    new Set(
      entry.timestamps.flatMap((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour === null ? [] : [classifyMoodFromHour(hour)];
      }),
    ),
  );
}

export function buildPlaylistBundles(
  entries: EnrichedHistoryEntry[],
  moodTimeline: MoodTimelineEntry[],
): PlaylistBundle[] {
  const toTrack = (entry: EnrichedHistoryEntry): PlaylistTrack => ({
    videoId: entry.videoId,
    title: entry.title,
    artist: entry.artist,
    thumbnail: entry.thumbnail,
    playCount: entry.playCount,
    url: `https://music.youtube.com/watch?v=${entry.videoId}`,
  });

  const topTracks = [...entries].sort((left, right) => right.playCount - left.playCount).slice(0, 15);
  const lateNightTracks = entries
    .filter((entry) =>
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour !== null && hour <= 5;
      }),
    )
    .sort((left, right) => right.playCount - left.playCount)
    .slice(0, 12);
  const focusTracks = entries
    .filter((entry) =>
      entry.timestamps.some((timestamp) => {
        const hour = parseTimestampHour(timestamp);
        return hour !== null && hour >= 11 && hour <= 16;
      }),
    )
    .sort((left, right) => right.playCount - left.playCount)
    .slice(0, 12);
  const discoveryTracks = [...entries]
    .sort((left, right) => left.playCount - right.playCount || left.title.localeCompare(right.title))
    .slice(0, 12)
    .reverse();
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown mood";

  return [
    {
      id: "top",
      title: "Top Rotation",
      description: "Your most-played tracks, ready to replay in one run.",
      tracks: topTracks.map(toTrack),
    },
    {
      id: "late-night",
      title: "Late Night Loop",
      description: "Built from your after-dark listening habits.",
      tracks: (lateNightTracks.length ? lateNightTracks : topTracks).map(toTrack),
    },
    {
      id: "focus",
      title: "Focus Set",
      description: `Anchored by your ${dominantMood.toLowerCase()} listening patterns.`,
      tracks: (focusTracks.length ? focusTracks : topTracks).map(toTrack),
    },
    {
      id: "discovery",
      title: "Hidden Cuts",
      description: "A lighter rotation of lower-play gems from your archive.",
      tracks: discoveryTracks.map(toTrack),
    },
  ];
}

export function playlistToText(bundle: PlaylistBundle): string {
  return [
    `${bundle.title}`,
    `${bundle.description}`,
    "",
    ...bundle.tracks.map(
      (track, index) => `${index + 1}. ${track.title} - ${track.artist} (${track.url})`,
    ),
  ].join("\n");
}

export function filterHistoryByTimeframe(
  entries: EnrichedHistoryEntry[],
  timeframe: TimeframeOption,
): EnrichedHistoryEntry[] {
  if (timeframe === "all") {
    return entries;
  }

  const now = new Date();
  const days = timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return entries
    .map((entry) => {
      const filteredTimestamps = entry.timestamps.filter((timestamp) => {
        const date = new Date(timestamp);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
      });

      if (!filteredTimestamps.length) {
        return null;
      }

      return { ...entry, playCount: filteredTimestamps.length, timestamps: filteredTimestamps };
    })
    .filter((entry): entry is EnrichedHistoryEntry => entry !== null)
    .sort((left, right) => right.playCount - left.playCount || left.title.localeCompare(right.title));
}

export function buildStatsPayloadFromHistory(entries: EnrichedHistoryEntry[]): StatsPayload {
  const artistTotals: Record<string, number> = {};
  let totalListeningMinutes = 0;

  for (const entry of entries) {
    artistTotals[entry.artist] = (artistTotals[entry.artist] ?? 0) + entry.playCount;
    totalListeningMinutes += durationToMinutes(entry.duration) * entry.playCount;
  }

  return {
    topSongs: [...entries].sort((left, right) => right.playCount - left.playCount).slice(0, 10),
    topArtists: Object.entries(artistTotals)
      .map(([artist, playCount]) => ({ artist, playCount }))
      .sort((left, right) => right.playCount - left.playCount || left.artist.localeCompare(right.artist))
      .slice(0, 10),
    totalListeningMinutes: Number(totalListeningMinutes.toFixed(2)),
    rawEnrichedHistory: entries,
  };
}

export function buildGenreBreakdownFromHistory(
  entries: EnrichedHistoryEntry[],
): GenreBreakdownEntry[] {
  const totals: Record<string, number> = {};

  entries.forEach((entry) => {
    const genre = classifyGenre(entry.tags, entry.artist);
    totals[genre] = (totals[genre] ?? 0) + entry.playCount;
  });

  const totalPlays = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.entries(totals)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: totalPlays ? Number(((count / totalPlays) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.count - left.count || left.genre.localeCompare(right.genre));
}

export function buildMoodTimelineFromHistory(
  entries: EnrichedHistoryEntry[],
): MoodTimelineEntry[] {
  const totals: Record<string, number> = {
    [MOOD_LABELS.lateNight]: 0,
    [MOOD_LABELS.morning]: 0,
    [MOOD_LABELS.afternoon]: 0,
    [MOOD_LABELS.evening]: 0,
  };

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const hour = parseTimestampHour(timestamp);
      if (hour !== null) {
        totals[classifyMoodFromHour(hour)] += 1;
      }
    });
  });

  return Object.entries(totals)
    .filter(([, playCount]) => playCount > 0)
    .map(([mood, playCount]) => ({ mood, playCount }))
    .sort((left, right) => right.playCount - left.playCount);
}

export function getHeatmapIntensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) {
    return "bg-[#111111]";
  }
  const ratio = count / maxCount;
  if (ratio < 0.25) {
    return "bg-[#41586d]";
  }
  if (ratio < 0.5) {
    return "bg-[#56768f]";
  }
  if (ratio < 0.75) {
    return "bg-[#7aa29f]";
  }
  return "bg-[#d2b36c]";
}

export function buildHeatmapData(entries: EnrichedHistoryEntry[]) {
  const matrix = HEATMAP_DAYS.map((day) => ({
    day,
    hours: HEATMAP_HOURS.map((hour) => ({ hour, count: 0 })),
  }));

  for (const entry of entries) {
    for (const timestamp of entry.timestamps) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        matrix[date.getDay()].hours[date.getHours()].count += 1;
      }
    }
  }

  const maxCount = matrix.reduce(
    (max, day) => Math.max(max, ...day.hours.map((hourEntry) => hourEntry.count)),
    0,
  );
  return { matrix, maxCount };
}

export function getLongestListeningStreak(entries: EnrichedHistoryEntry[]): number {
  const uniqueDays = Array.from(
    new Set(
      entries.flatMap((entry) =>
        entry.timestamps
          .map((timestamp) => new Date(timestamp))
          .filter((date) => !Number.isNaN(date.getTime()))
          .map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10)),
      ),
    ),
  ).sort();

  if (uniqueDays.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = new Date(uniqueDays[index - 1]);
    const currentDate = new Date(uniqueDays[index]);
    const differenceInDays = (currentDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function classifyGenre(tags: string[], artist: string): string {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (normalizedTags.some((tag) => keywords.some((keyword) => tag.includes(keyword)))) {
      return genre;
    }
  }

  const normalizedArtist = artist.toLowerCase();
  for (const [genre, artists] of Object.entries(ARTIST_HEURISTICS)) {
    if (artists.some((candidate) => normalizedArtist.includes(candidate))) {
      return genre;
    }
  }

  return "Other";
}

export function buildPassportData(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[],
): MusicPassportData {
  const topArtistName = stats.topArtists[0]?.artist ?? "Unknown artist";
  const topArtistSong = stats.rawEnrichedHistory.find((entry) => entry.artist === topArtistName);

  return {
    topArtist: { name: topArtistName, thumbnail: topArtistSong?.thumbnail ?? null },
    topSongs: stats.topSongs.slice(0, 10).map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
    })),
    totalListeningHours: stats.totalListeningMinutes / 60,
    dominantGenre: genreBreakdown[0]?.genre ?? "Other",
    dominantMood: moodTimeline[0]?.mood ?? "Unknown",
    listeningStreakDays: getLongestListeningStreak(stats.rawEnrichedHistory),
    fingerprint: genreBreakdown.slice(0, 5).map((entry) => ({ genre: entry.genre, count: entry.count })),
  };
}

export function buildTasteEvolution(
  entries: EnrichedHistoryEntry[],
  timeframe: TimeframeOption,
): TasteEvolutionPoint[] {
  const bucketMap = new Map<
    string,
    { label: string; playCount: number; genres: Record<string, number>; artists: Record<string, number> }
  >();

  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const { key, label } = getEvolutionBucket(date, timeframe);
      const current = bucketMap.get(key) ?? { label, playCount: 0, genres: {}, artists: {} };
      current.playCount += 1;
      const genre = classifyGenre(entry.tags, entry.artist);
      current.genres[genre] = (current.genres[genre] ?? 0) + 1;
      current.artists[entry.artist] = (current.artists[entry.artist] ?? 0) + 1;
      bucketMap.set(key, current);
    });
  });

  return Array.from(bucketMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([, bucket]) => ({
      label: bucket.label,
      topGenre: getTopKey(bucket.genres) ?? "Other",
      topArtist: getTopKey(bucket.artists) ?? "Unknown artist",
      playCount: bucket.playCount,
    }));
}

export function buildSmartInsights(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[],
): SmartInsight[] {
  const peak = findPeakListeningWindow(stats.rawEnrichedHistory);
  const longestTrack = [...stats.topSongs].sort((left, right) => right.playCount - left.playCount)[0];
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const diversityScore = genreBreakdown.length;

  return [
    { title: "Peak Listening Window", body: `${peak.day} around ${peak.hour}:00 is when your listening energy spikes the most.` },
    { title: "Core Taste Signal", body: `${dominantGenre} leads your archive, while ${dominantMood.toLowerCase()} listening sets the emotional tone.` },
    { title: "Replay Center", body: `${longestTrack?.title ?? "Your top song"} is the strongest repeat magnet in this snapshot.` },
    {
      title: "Range Check",
      body:
        diversityScore >= 6
          ? "Your listening spreads across a wide genre mix instead of orbiting a single lane."
          : "Your taste is tight and focused, with a few genres doing most of the heavy lifting.",
    },
  ];
}

export function buildPersonaProfile(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[],
): PersonaProfile {
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const peak = findPeakListeningWindow(stats.rawEnrichedHistory);

  const moodTag =
    dominantMood === "Chill/Nocturnal" ? "Midnight" :
    dominantMood === "Energized" ? "Daybreak" :
    dominantMood === "Focused" ? "Signal" : "Velvet";

  const genreTag =
    dominantGenre === "Hip-Hop" ? "Rhythm Pilot" :
    dominantGenre === "Electronic" ? "Circuit Walker" :
    dominantGenre === "Rock" ? "Voltage Driver" :
    dominantGenre === "Lo-fi" ? "Cloud Drifter" :
    dominantGenre === "Indie" ? "Scene Collector" :
    dominantGenre === "Pop" ? "Hook Hunter" :
    `${dominantGenre} Oracle`;

  return {
    title: `${moodTag} ${genreTag}`,
    subtitle: "You listen like someone building atmosphere first and letting songs define the room after that.",
    traits: [`${dominantGenre} dominant`, `${dominantMood} leaning`, `${peak.day} ${peak.hour}:00 peak hour`],
  };
}

export function buildMemoryLane(entries: EnrichedHistoryEntry[]): MemoryLaneEntry[] {
  return entries
    .map((entry) => {
      const sorted = [...entry.timestamps]
        .map((timestamp) => new Date(timestamp))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((left, right) => left.getTime() - right.getTime());
      if (!sorted.length) {
        return null;
      }
      return {
        videoId: entry.videoId,
        title: entry.title,
        artist: entry.artist,
        thumbnail: entry.thumbnail,
        playCount: entry.playCount,
        firstPlayed: sorted[0].toISOString(),
      };
    })
    .filter((entry): entry is MemoryLaneEntry => entry !== null)
    .sort((left, right) => left.firstPlayed.localeCompare(right.firstPlayed))
    .slice(0, 5);
}

export function buildAchievementBadges(
  stats: StatsPayload,
  genreBreakdown: GenreBreakdownEntry[],
  moodTimeline: MoodTimelineEntry[],
): AchievementBadge[] {
  const totalPlays = stats.rawEnrichedHistory.reduce((sum, entry) => sum + entry.playCount, 0);
  const streak = getLongestListeningStreak(stats.rawEnrichedHistory);
  const dominantMood = moodTimeline[0]?.mood ?? "Unknown";
  const dominantGenre = genreBreakdown[0]?.genre ?? "Other";
  const badges: AchievementBadge[] = [];

  if (streak >= 7) {
    badges.push({ title: "Streak Keeper", description: `${streak} straight days of listens kept your momentum alive.`, tone: "gold" });
  }
  if (genreBreakdown.length >= 6) {
    badges.push({ title: "Palette Explorer", description: `You spread your plays across ${genreBreakdown.length} active genres.`, tone: "teal" });
  }
  if (dominantMood === "Chill/Nocturnal") {
    badges.push({ title: "Night Owl", description: "Your strongest listening habits come alive after dark.", tone: "ember" });
  }
  if (stats.topSongs[0]?.playCount >= 20) {
    badges.push({ title: "Replay Royalty", description: `${stats.topSongs[0]?.title ?? "Your top song"} became a serious repeat obsession.`, tone: "gold" });
  }
  if (totalPlays >= 250) {
    badges.push({ title: `${dominantGenre} Loyalist`, description: `You kept returning to ${dominantGenre} as your strongest lane.`, tone: "teal" });
  }

  return badges.slice(0, 5);
}

export function buildArtistClusters(entries: EnrichedHistoryEntry[]) {
  const grouped = new Map<string, { artist: string; playCount: number; thumbnail: string | null; genres: Record<string, number>; songs: string[] }>();

  entries.forEach((entry) => {
    const current = grouped.get(entry.artist) ?? { artist: entry.artist, playCount: 0, thumbnail: entry.thumbnail, genres: {}, songs: [] };
    const genre = classifyGenre(entry.tags, entry.artist);
    current.playCount += entry.playCount;
    current.thumbnail = current.thumbnail ?? entry.thumbnail;
    current.genres[genre] = (current.genres[genre] ?? 0) + entry.playCount;
    current.songs.push(entry.title);
    grouped.set(entry.artist, current);
  });

  const ranked = Array.from(grouped.values())
    .sort((left, right) => right.playCount - left.playCount || left.artist.localeCompare(right.artist))
    .slice(0, 8);
  const totalPlays = ranked.reduce((sum, entry) => sum + entry.playCount, 0) || 1;

  const nodes = ranked.map((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(ranked.length, 1) - Math.PI / 2;
    const radius = index === 0 ? 0 : index % 2 === 0 ? 102 : 132;
    return {
      id: entry.artist,
      artist: entry.artist,
      playCount: entry.playCount,
      thumbnail: entry.thumbnail,
      genre: getTopKey(entry.genres) ?? "Other",
      songs: entry.songs.slice(0, 3),
      size: 56 + (entry.playCount / totalPlays) * 116,
      x: 180 + Math.cos(angle) * radius,
      y: 180 + Math.sin(angle) * radius,
    };
  });

  const hub = nodes[0] ?? null;
  const links = nodes.slice(1).map((node) => ({
    source: hub?.id ?? node.id,
    target: node.id,
    sharedGenre: node.genre === hub?.genre ? node.genre : [hub?.genre, node.genre].filter(Boolean).join(" / "),
  }));

  return { nodes, links };
}

function durationToMinutes(duration: string): number {
  const match = ISO_8601_DURATION_PATTERN.exec(duration);
  if (!match?.groups) {
    return 0;
  }
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);
  const seconds = Number(match.groups.seconds ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) / 60;
}

function parseTimestampHour(timestamp: string): number | null {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.getHours();
}

function classifyMoodFromHour(hour: number): string {
  if (hour <= 5) return MOOD_LABELS.lateNight;
  if (hour <= 10) return MOOD_LABELS.morning;
  if (hour <= 16) return MOOD_LABELS.afternoon;
  return MOOD_LABELS.evening;
}

function getEvolutionBucket(date: Date, timeframe: TimeframeOption): { key: string; label: string } {
  if (timeframe === "30d") {
    const week = Math.max(1, Math.ceil(date.getDate() / 7));
    return { key: `${date.getFullYear()}-${date.getMonth()}-w${week}`, label: `Week ${week}` };
  }
  if (timeframe === "90d") {
    const month = date.toLocaleString(undefined, { month: "short" });
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: month };
  }
  return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleString(undefined, { month: "short" }) };
}

function getTopKey(values: Record<string, number>): string | null {
  const entry = Object.entries(values).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  return entry?.[0] ?? null;
}

function findPeakListeningWindow(entries: EnrichedHistoryEntry[]): { day: string; hour: number } {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    entry.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return;
      const key = `${HEATMAP_DAYS[date.getDay()]}-${date.getHours()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
  const winner = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0];
  if (!winner) {
    return { day: "Sun", hour: 0 };
  }
  const [day, hour] = winner[0].split("-");
  return { day, hour: Number(hour) };
}
