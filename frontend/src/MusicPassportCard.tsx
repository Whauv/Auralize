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
    title: string;
    artist: string;
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

  return `${Math.max((count / maxCount) * 100, 16)}%`;
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
    <div className="relative h-[400px] w-[600px] overflow-hidden rounded-[2.2rem] border border-white/12 bg-[linear-gradient(140deg,#04111f_0%,#0b1b35_38%,#152b47_64%,#251236_100%)] p-6 text-white shadow-[0_32px_140px_rgba(3,7,18,0.48)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(251,113,133,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_24%)]" />
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
              Music Passport
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight">
              Your sonic identity, distilled.
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-white/10 bg-white/12 px-3 py-1">
                {data.dominantGenre}
              </span>
              <span className="rounded-full border border-cyan-200/12 bg-cyan-300/10 px-3 py-1 text-cyan-50">
                {data.dominantMood}
              </span>
              <span className="rounded-full border border-amber-200/12 bg-amber-300/12 px-3 py-1 text-amber-50">
                {data.listeningStreakDays} day streak
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
            {data.topArtist.thumbnail ? (
              <img
                src={data.topArtist.thumbnail}
                alt={data.topArtist.name}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/10" />
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/65">
                #1 Artist
              </p>
              <p className="mt-1 max-w-[150px] text-lg font-bold leading-tight">
                {data.topArtist.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 py-5" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
          <div className="rounded-[1.6rem] border border-white/8 bg-black/20 p-4 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/65">
                  Total Listening
                </p>
                <p className="mt-2 text-4xl font-black">
                  {formatHours(data.totalListeningHours)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                  Mood
                </p>
                <p className="mt-1 text-sm font-semibold">{data.dominantMood}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/65">
                Top 3 Songs
              </p>
              <div className="mt-3 space-y-3">
                {data.topSongs.map((song, index) => (
                  <div
                    key={`${song.title}-${song.artist}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/8 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/35 to-rose-300/25 text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="max-w-[210px] truncate text-sm font-semibold">
                          {song.title}
                        </p>
                        <p className="text-xs text-white/60">{song.artist}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/8 bg-black/25 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/65">
                  Music Fingerprint
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Top 5 genres
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                {data.dominantGenre}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {data.fingerprint.map((entry, index) => (
                <div key={entry.genre}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold">{entry.genre}</span>
                    <span className="text-white/60">{entry.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
                      style={{
                        width: getFingerprintWidth(entry.count, maxFingerprintCount),
                        opacity: 1 - index * 0.12
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                Listening Streak
              </p>
              <p className="mt-2 text-3xl font-black">
                {data.listeningStreakDays}
              </p>
              <p className="text-sm text-white/65">
                longest consecutive days with listens
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/50">
          <span>Auralize</span>
          <span>Share-ready card</span>
        </div>
      </div>
    </div>
  );
}
