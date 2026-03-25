type FingerprintEntry = {
  genre: string;
  count: number;
};

export type MusicPassportData = {
  topArtist: {
    name: string;
    thumbnail: string | null;
  };
  topSongs: Array<{
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string | null;
  }>;
  totalListeningHours: number;
  dominantGenre: string;
  dominantMood: string;
  listeningStreakDays: number;
  fingerprint: FingerprintEntry[];
};

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

function getFingerprintWidth(count: number, maxCount: number): string {
  if (maxCount === 0) {
    return "0%";
  }

  return `${Math.max((count / maxCount) * 100, 14)}%`;
}

export function MusicPassportCard({
  data
}: {
  data: MusicPassportData;
}) {
  const maxFingerprintCount = Math.max(
    ...data.fingerprint.map((entry) => entry.count),
    0
  );

  return (
    <div className="relative w-[840px] overflow-hidden rounded-[2.5rem] border border-white/12 bg-[linear-gradient(160deg,#04111f_0%,#0e213c_38%,#1b2d4f_62%,#251236_100%)] p-8 text-white shadow-[0_34px_160px_rgba(3,7,18,0.48)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_85%_14%,rgba(251,113,133,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_24%)]" />

      <div className="relative z-10 flex flex-col gap-7">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[420px]">
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-100/70">
              Music Passport
            </p>
            <h2 className="font-display mt-3 text-[4.2rem] font-black leading-[0.9] tracking-[-0.03em]">
              Your sonic identity, distilled.
            </h2>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full border border-white/10 bg-white/12 px-4 py-2">
                {data.dominantGenre}
              </span>
              <span className="rounded-full border border-cyan-200/12 bg-cyan-300/10 px-4 py-2 text-cyan-50">
                {data.dominantMood}
              </span>
              <span className="rounded-full border border-amber-200/12 bg-amber-300/12 px-4 py-2 text-amber-50">
                {data.listeningStreakDays} day streak
              </span>
            </div>
          </div>

          <div className="w-[270px] rounded-[1.8rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/65">
              #1 Artist
            </p>
            <div className="mt-4 flex items-center gap-4">
              {data.topArtist.thumbnail ? (
                <img
                  src={data.topArtist.thumbnail}
                  alt={data.topArtist.name}
                  className="h-20 w-20 rounded-[1.4rem] object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-[1.4rem] bg-white/10" />
              )}
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-tight text-white">
                  {data.topArtist.name}
                </p>
                <p className="mt-2 text-sm text-white/60">
                  the artist defining your profile
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1.12fr 0.88fr" }}>
          <div className="rounded-[1.9rem] border border-white/10 bg-black/18 p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/65">
                  Total Listening
                </p>
                <p className="mt-3 text-[4.5rem] font-black leading-[0.88]">
                  {formatHours(data.totalListeningHours)}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 text-right">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">
                  Mood
                </p>
                <p className="mt-2 text-2xl font-bold text-white">{data.dominantMood}</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/65">
                  Top 10 Songs
                </p>
                <p className="text-sm text-white/55">your defining run</p>
              </div>

              <div className="mt-4 grid gap-3">
                {data.topSongs.map((song, index) => (
                  <div
                    key={`${song.title}-${song.artist}`}
                    className="grid grid-cols-[46px_52px_minmax(0,1fr)] items-center gap-4 rounded-[1.3rem] border border-white/8 bg-white/7 px-4 py-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/35 via-sky-300/25 to-rose-300/25 text-lg font-bold text-white">
                      {index + 1}
                    </div>
                    {song.thumbnail ? (
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="h-[52px] w-[52px] rounded-[1rem] object-cover"
                      />
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[1rem] bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[1.02rem] font-semibold text-white">
                        {song.title}
                      </p>
                      <p className="truncate text-sm text-white/60">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[1.9rem] border border-white/10 bg-black/22 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-100/65">
                    Music Fingerprint
                  </p>
                  <p className="mt-2 text-lg text-white/72">Top 5 genres</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {data.dominantGenre}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {data.fingerprint.map((entry, index) => (
                  <div key={entry.genre}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{entry.genre}</span>
                      <span className="text-white/60">{entry.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
                        style={{
                          width: getFingerprintWidth(entry.count, maxFingerprintCount),
                          opacity: 1 - index * 0.11
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-white/10 bg-white/6 p-6">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/58">
                Listening Streak
              </p>
              <p className="mt-3 text-[3.5rem] font-black leading-none text-white">
                {data.listeningStreakDays}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                longest consecutive days with listens across your current profile snapshot
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em] text-white/45">
          <span>Auralize</span>
          <span>Share-ready passport</span>
        </div>
      </div>
    </div>
  );
}
