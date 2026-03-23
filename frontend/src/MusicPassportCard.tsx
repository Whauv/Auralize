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
    <div className="h-[400px] w-[600px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#8b5cf6_0%,#1d4ed8_45%,#020617_100%)] p-6 text-white shadow-[0_30px_120px_rgba(76,29,149,0.45)]">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-100/70">
              Music Passport
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight">
              Your sonic identity, distilled.
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {data.dominantGenre}
              </span>
              <span className="rounded-full bg-black/20 px-3 py-1">
                {data.dominantMood}
              </span>
              <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-cyan-100">
                {data.listeningStreakDays} day streak
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[1.5rem] bg-black/20 px-4 py-3">
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
              <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/60">
                #1 Artist
              </p>
              <p className="mt-1 max-w-[150px] text-lg font-bold leading-tight">
                {data.topArtist.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 py-5" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
          <div className="rounded-[1.6rem] bg-black/20 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/60">
                  Total Listening
                </p>
                <p className="mt-2 text-4xl font-black">
                  {formatHours(data.totalListeningHours)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                  Mood
                </p>
                <p className="mt-1 text-sm font-semibold">{data.dominantMood}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/60">
                Top 3 Songs
              </p>
              <div className="mt-3 space-y-3">
                {data.topSongs.map((song, index) => (
                  <div
                    key={`${song.title}-${song.artist}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-sm font-bold">
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

          <div className="rounded-[1.6rem] bg-black/25 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/60">
                  Music Fingerprint
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Top 5 genres
                </p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
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
                      className="h-2 rounded-full bg-gradient-to-r from-fuchsia-300 via-pink-400 to-cyan-300"
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
          <span>YouTube Music Profile Visualizer</span>
          <span>Share-ready card</span>
        </div>
      </div>
    </div>
  );
}
