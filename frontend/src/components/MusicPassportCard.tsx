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
    <div className="relative w-[840px] overflow-hidden border border-white/12 bg-[linear-gradient(155deg,#090c13_0%,#0f121d_32%,#19131b_68%,#24181a_100%)] p-8 text-white shadow-[0_34px_160px_rgba(3,7,18,0.48)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.16),transparent_28%),radial-gradient(circle_at_85%_14%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(196,107,123,0.12),transparent_24%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="absolute -right-10 top-12 h-44 w-44 rounded-full border border-white/8 bg-white/4 shadow-[inset_0_0_0_18px_rgba(212,168,83,0.05)]" />

      <div className="relative z-10 flex flex-col gap-7">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[420px]">
            <p className="text-xs uppercase tracking-[0.42em] text-white/55">
              Music Passport
            </p>
            <h2 className="font-display mt-3 text-[4.2rem] font-black leading-[0.95]">
              Your sonic identity, distilled.
            </h2>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full border border-white/10 bg-white/12 px-4 py-2">
                {data.dominantGenre}
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-white">
                {data.dominantMood}
              </span>
              <span className="rounded-full border border-amber-200/12 bg-amber-300/12 px-4 py-2 text-amber-50">
                {data.listeningStreakDays} day streak
              </span>
            </div>
          </div>

          <div className="w-[270px] rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">
              #1 Artist
            </p>
            <div className="mt-4 flex items-center gap-4">
              {data.topArtist.thumbnail ? (
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] bg-white/[0.06]">
                  <img
                    src={data.topArtist.thumbnail}
                    alt={data.topArtist.name}
                    className="h-full w-full rounded-[1.4rem] object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-[1.4rem] bg-white/10" />
              )}
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-[1.08] text-white">
                  {data.topArtist.name}
                </p>
                <p className="mt-2 leading-5 text-sm text-white/60">
                  the artist defining your profile
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1.12fr 0.88fr" }}>
          <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.18))] p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">
                  Total Listening
                </p>
                <p className="font-display mt-3 text-[4.5rem] leading-[0.96]">
                  {formatHours(data.totalListeningHours)}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
                    className="grid min-h-[82px] grid-cols-[46px_52px_minmax(0,1fr)] items-start gap-4 rounded-[1.3rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-4 py-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-white/16 via-white/8 to-amber-300/18 text-lg font-bold text-white">
                      {index + 1}
                    </div>
                    {song.thumbnail ? (
                      <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[1rem] bg-white/[0.06]">
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="h-full w-full rounded-[1rem] object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[1rem] bg-white/10" />
                    )}
                    <div className="min-w-0 self-center pt-0.5">
                      <p className="truncate text-[1.02rem] font-semibold leading-[1.15] text-white">
                        {song.title}
                      </p>
                      <p className="truncate pt-1 text-sm leading-5 text-white/60">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))] p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">
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
                        className="h-3 rounded-full bg-gradient-to-r from-[#d4a853] via-[#d9b56a] to-[#c46b7b]"
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

            <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/58">
                Listening Streak
              </p>
              <p className="font-display mt-3 text-[3.5rem] leading-[0.96] text-white">
                {data.listeningStreakDays}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/65">
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
