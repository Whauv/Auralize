type FingerprintEntry = {
  genre: string;
  count: number;
};

export type MusicPassportTheme = {
  shellBg: string;
  shellOverlay: string;
  ringTint: string;
  border: string;
  surface: string;
  surfaceStrong: string;
  chipBg: string;
  chipText: string;
  accentChipBg: string;
  accentChipText: string;
  title: string;
  subtext: string;
  fingerprintTrack: string;
  fingerprintGradient: string;
  displayFont: string;
  bodyFont: string;
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

export const DEFAULT_MUSIC_PASSPORT_THEME: MusicPassportTheme = {
  shellBg:
    "linear-gradient(155deg,#090c13 0%,#0f121d 32%,#19131b 68%,#24181a 100%)",
  shellOverlay:
    "radial-gradient(circle at top left,rgba(212,168,83,0.16),transparent 28%),radial-gradient(circle at 85% 14%,rgba(255,255,255,0.05),transparent 20%),radial-gradient(circle at bottom right,rgba(196,107,123,0.12),transparent 24%)",
  ringTint: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.12)",
  surface: "linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.18))",
  surfaceStrong: "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))",
  chipBg: "rgba(255,255,255,0.08)",
  chipText: "#ffffff",
  accentChipBg: "rgba(252,211,77,0.12)",
  accentChipText: "#fff7ed",
  title: "#ffffff",
  subtext: "rgba(255,255,255,0.62)",
  fingerprintTrack: "rgba(255,255,255,0.1)",
  fingerprintGradient: "linear-gradient(90deg,#d4a853 0%,#d9b56a 55%,#c46b7b 100%)",
  displayFont: "\"Archivo Black\", \"Space Grotesk\", sans-serif",
  bodyFont: "\"Instrument Sans\", \"Space Grotesk\", sans-serif"
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
  data,
  theme = DEFAULT_MUSIC_PASSPORT_THEME
}: {
  data: MusicPassportData;
  theme?: MusicPassportTheme;
}) {
  const maxFingerprintCount = Math.max(
    ...data.fingerprint.map((entry) => entry.count),
    0
  );

  return (
    <div
      className="relative w-[840px] overflow-hidden p-8 text-white shadow-[0_34px_160px_rgba(3,7,18,0.48)]"
      style={{
        background: theme.shellBg,
        border: `1px solid ${theme.border}`,
        color: theme.title,
        fontFamily: theme.bodyFont
      }}
    >
      <div className="absolute inset-0" style={{ background: theme.shellOverlay }} />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div
        className="absolute -right-10 top-12 h-44 w-44 rounded-full shadow-[inset_0_0_0_18px_rgba(212,168,83,0.05)]"
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.ringTint
        }}
      />

      <div className="relative z-10 flex flex-col gap-7">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-[420px]">
            <p className="text-xs uppercase tracking-[0.42em]" style={{ color: theme.subtext }}>
              Music Passport
            </p>
            <h2
              className="mt-3 text-[4.2rem] font-black leading-[0.95]"
              style={{ fontFamily: theme.displayFont, color: theme.title }}
            >
              Your sonic identity, distilled.
            </h2>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span
                className="rounded-full px-4 py-2"
                style={{
                  border: `1px solid ${theme.border}`,
                  background: theme.chipBg,
                  color: theme.chipText
                }}
              >
                {data.dominantGenre}
              </span>
              <span
                className="rounded-full px-4 py-2"
                style={{
                  border: `1px solid ${theme.border}`,
                  background: theme.chipBg,
                  color: theme.chipText
                }}
              >
                {data.dominantMood}
              </span>
              <span
                className="rounded-full px-4 py-2"
                style={{
                  border: `1px solid ${theme.border}`,
                  background: theme.accentChipBg,
                  color: theme.accentChipText
                }}
              >
                {data.listeningStreakDays} day streak
              </span>
            </div>
          </div>

          <div
            className="w-[270px] rounded-[1.8rem] p-5 backdrop-blur-sm"
            style={{ border: `1px solid ${theme.border}`, background: theme.surfaceStrong }}
          >
            <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: theme.subtext }}>
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
                <p
                  className="text-2xl font-bold leading-[1.08]"
                  style={{ fontFamily: theme.displayFont, color: theme.title }}
                >
                  {data.topArtist.name}
                </p>
                <p className="mt-2 text-sm leading-5" style={{ color: theme.subtext }}>
                  the artist defining your profile
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1.12fr 0.88fr" }}>
          <div
            className="rounded-[1.9rem] p-6 backdrop-blur-sm"
            style={{ border: `1px solid ${theme.border}`, background: theme.surface }}
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: theme.subtext }}>
                  Total Listening
                </p>
                <p
                  className="mt-3 text-[4.5rem] leading-[0.96]"
                  style={{ fontFamily: theme.displayFont, color: theme.title }}
                >
                  {formatHours(data.totalListeningHours)}
                </p>
              </div>

              <div
                className="rounded-[1.5rem] px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                style={{ border: `1px solid ${theme.border}`, background: theme.chipBg }}
              >
                <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: theme.subtext }}>
                  Mood
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: theme.title }}>
                  {data.dominantMood}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: theme.subtext }}>
                  Top 10 Songs
                </p>
                <p className="text-sm" style={{ color: theme.subtext }}>your defining run</p>
              </div>

              <div className="mt-4 grid gap-3">
                {data.topSongs.map((song, index) => (
                  <div
                    key={`${song.title}-${song.artist}`}
                    className="grid min-h-[82px] grid-cols-[46px_52px_minmax(0,1fr)] items-start gap-4 rounded-[1.3rem] px-4 py-4"
                    style={{ border: `1px solid ${theme.border}`, background: theme.surfaceStrong }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold"
                      style={{ background: theme.chipBg, color: theme.title }}
                    >
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
                      <p className="truncate text-[1.02rem] font-semibold leading-[1.15]" style={{ color: theme.title }}>
                        {song.title}
                      </p>
                      <p className="truncate pt-1 text-sm leading-5" style={{ color: theme.subtext }}>
                        {song.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div
              className="rounded-[1.9rem] p-6 backdrop-blur-sm"
              style={{ border: `1px solid ${theme.border}`, background: theme.surfaceStrong }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: theme.subtext }}>
                    Music Fingerprint
                  </p>
                  <p className="mt-2 text-lg" style={{ color: theme.subtext }}>Top 5 genres</p>
                </div>
                <div
                  className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ border: `1px solid ${theme.border}`, background: theme.chipBg, color: theme.title }}
                >
                  {data.dominantGenre}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {data.fingerprint.map((entry, index) => (
                  <div key={entry.genre}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold" style={{ color: theme.title }}>{entry.genre}</span>
                      <span style={{ color: theme.subtext }}>{entry.count}</span>
                    </div>
                    <div className="h-3 rounded-full" style={{ background: theme.fingerprintTrack }}>
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: getFingerprintWidth(entry.count, maxFingerprintCount),
                          opacity: 1 - index * 0.11,
                          background: theme.fingerprintGradient
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[1.9rem] p-6"
              style={{ border: `1px solid ${theme.border}`, background: theme.surface }}
            >
              <p className="text-[10px] uppercase tracking-[0.34em]" style={{ color: theme.subtext }}>
                Listening Streak
              </p>
              <p
                className="mt-3 text-[3.5rem] leading-[0.96]"
                style={{ fontFamily: theme.displayFont, color: theme.title }}
              >
                {data.listeningStreakDays}
              </p>
              <p className="mt-3 text-sm leading-6" style={{ color: theme.subtext }}>
                longest consecutive days with listens across your current profile snapshot
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em]" style={{ color: theme.subtext }}>
          <span>Auralize</span>
          <span>Share-ready passport</span>
        </div>
      </div>
    </div>
  );
}
