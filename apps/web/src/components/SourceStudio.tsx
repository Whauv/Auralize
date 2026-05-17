import type {
  ChangeEventHandler,
  DragEventHandler,
  FormEventHandler,
  ReactNode,
} from "react";

export type SourceMode = "takeout" | "unified-takeout" | "apple-music" | "lastfm";

type SourceStudioProps = {
  sourceMode: SourceMode;
  isDragActive: boolean;
  youtubeMusicProfileUrl: string;
  lastFmUsername: string;
  fileName: string | null;
  isUploading: boolean;
  error: string | null;
  actionMessage: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSourceModeChange: (mode: SourceMode) => void;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onYoutubeMusicProfileUrlChange: ChangeEventHandler<HTMLInputElement>;
  onLastFmUsernameChange: ChangeEventHandler<HTMLInputElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  loadingIndicator: ReactNode;
  uploadJourney?: {
    stage: "ingested" | "parsing" | "enriching" | "ready";
    progress: number;
    etaSeconds: number | null;
  } | null;
};

function SourceModeButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
        isActive
          ? "border border-[#D4A853] bg-[#D4A853] text-slate-950"
          : "border border-[#1E293B] bg-[#111827] text-white hover:border-[#F0D080] hover:bg-[#182234]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function UploadDropShell({
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  isDragActive: boolean;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`upload-drop-shell rounded-[0.65rem] border border-dashed px-6 py-10 transition ${
        isDragActive
          ? "border-[#D4A853] bg-[#D4A853]/10"
          : "border-[#1E293B] bg-[#111827]"
      }`}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}

export function SourceStudio({
  sourceMode,
  isDragActive,
  youtubeMusicProfileUrl,
  lastFmUsername,
  fileName,
  isUploading,
  error,
  actionMessage,
  onSubmit,
  onSourceModeChange,
  onFileChange,
  onYoutubeMusicProfileUrlChange,
  onLastFmUsernameChange,
  onDragOver,
  onDragLeave,
  onDrop,
  loadingIndicator,
  uploadJourney = null,
}: SourceStudioProps) {
  const uploadStages = [
    { id: "ingested", label: "Ingested", threshold: 10 },
    { id: "parsing", label: "Parsing", threshold: 40 },
    { id: "enriching", label: "Enriching", threshold: 75 },
    { id: "ready", label: "Ready", threshold: 100 },
  ] as const;

  return (
    <form className="mt-0 flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-3">
        <SourceModeButton
          isActive={sourceMode === "takeout"}
          label="Google Takeout"
          onClick={() => onSourceModeChange("takeout")}
        />
        <SourceModeButton
          isActive={sourceMode === "unified-takeout"}
          label="YouTube + Music"
          onClick={() => onSourceModeChange("unified-takeout")}
        />
        <SourceModeButton
          isActive={sourceMode === "lastfm"}
          label="Last.fm Live Mode"
          onClick={() => onSourceModeChange("lastfm")}
        />
        <SourceModeButton
          isActive={sourceMode === "apple-music"}
          label="Apple Music"
          onClick={() => onSourceModeChange("apple-music")}
        />
      </div>

      {sourceMode === "takeout" ? (
        <UploadDropShell
          isDragActive={isDragActive}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="mb-4 rounded-full border border-[#1E293B] bg-[#182234] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                  Drag and drop
                </div>
                <p className="text-xl font-semibold text-white">Drop watch-history.json here</p>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  or browse for the export manually. You can also paste a YouTube Music
                  profile link on the right.
                </p>
                <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                  Google Takeout is still the source that unlocks play counts, streaks,
                  timestamps, and heatmaps for YouTube Music.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <label className="cursor-pointer rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-[#F0D080]">
                    Choose file
                    <input
                      accept=".json,.gz,application/json,application/gzip,application/x-gzip"
                      className="sr-only"
                      onChange={onFileChange}
                      type="file"
                    />
                  </label>
                  <button
                    className="rounded-full border border-[#1E293B] bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#F0D080] hover:bg-[#182234]"
                    onClick={() => onSourceModeChange("lastfm")}
                    type="button"
                  >
                    Use Last.fm link instead
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
                <label className="block text-sm font-semibold text-white">
                  YouTube Music Profile Link
                </label>
                <input
                  className="mt-3 w-full rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none transition placeholder:text-[#9CA3AF] focus:border-[#D4A853]"
                  onChange={onYoutubeMusicProfileUrlChange}
                  placeholder="Paste a YouTube Music profile or channel link"
                  type="text"
                  value={youtubeMusicProfileUrl}
                />
                <p className="mt-3 text-sm text-[#9CA3AF]">
                  Paste a public profile link like
                  {" "}
                  <span className="font-mono">
                    https://music.youtube.com/@27_pranavchopdekar68
                  </span>
                  {" "}
                  to build a lightweight public profile preview.
                </p>
                <p className="mt-3 text-xs text-[#9CA3AF]">
                  Full analytics still require
                  {" "}
                  <code>watch-history.json</code>
                  {" "}
                  or Last.fm Live Mode because
                  YouTube Music public profiles do not expose private listening history.
                </p>
              </div>
            </div>
          </div>
        </UploadDropShell>
      ) : sourceMode === "unified-takeout" ? (
        <UploadDropShell
          isDragActive={isDragActive}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 rounded-full border border-[#1E293B] bg-[#182234] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                Unified Music Mode
              </div>
              <p className="text-xl font-semibold text-white">Drop watch-history.json here</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                This mode keeps YouTube Music plays and also pulls in music-like watches from
                the regular YouTube app.
              </p>
              <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                Auralize will filter out searches and non-music YouTube videos so the
                dashboard still stays focused on songs, remixes, lyric videos, and music
                videos.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <label className="cursor-pointer rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-[#F0D080]">
                  Choose file
                  <input
                    accept=".json,.gz,application/json,application/gzip,application/x-gzip"
                    className="sr-only"
                    onChange={onFileChange}
                    type="file"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
              <p className="text-sm font-semibold text-white">What gets included</p>
              <div className="mt-4 grid gap-3 text-sm text-[#9CA3AF]">
                <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                  Plays from YouTube Music
                </div>
                <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                  Music videos, lyric videos, official audios, remixes, and Topic uploads
                  from regular YouTube
                </div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                  Non-music YouTube content is excluded after metadata enrichment
                </div>
              </div>
            </div>
          </div>
        </UploadDropShell>
      ) : sourceMode === "apple-music" ? (
        <UploadDropShell
          isDragActive={isDragActive}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 rounded-full border border-[#1E293B] bg-[#182234] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#F59E0B]">
                Apple Music Mode
              </div>
              <p className="text-xl font-semibold text-white">
                Drop your Apple Music export here
              </p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Upload an Apple Music Play Activity CSV or compatible JSON export to build
                the same dashboard, recap, and passport flow.
              </p>
              <p className="mt-4 max-w-xl text-xs text-[#9CA3AF]">
                Best results come from the Apple Music Play Activity export from
                privacy.apple.com because it includes timestamps and play durations.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <label className="cursor-pointer rounded-full border border-[#D4A853] bg-[#D4A853] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:bg-[#F0D080]">
                  Choose CSV or JSON
                  <input
                    accept=".csv,.json,text/csv,application/json"
                    className="sr-only"
                    onChange={onFileChange}
                    type="file"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#1E293B] bg-[#111827] p-5">
              <p className="text-sm font-semibold text-white">Supported Apple Music exports</p>
              <div className="mt-4 grid gap-3 text-sm text-[#9CA3AF]">
                <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                  Apple Music Play Activity CSV
                </div>
                <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3">
                  compatible JSON exports with song, artist, timestamp, and duration fields
                </div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 px-4 py-3 text-amber-100">
                  Apple exports usually do not include artwork, so this mode uses a cleaner
                  text-first presentation.
                </div>
              </div>
            </div>
          </div>
        </UploadDropShell>
      ) : (
        <div className="rounded-[0.65rem] border border-[#1E293B] bg-[#111827] p-6">
          <label className="block text-sm font-semibold text-white">
            Last.fm Username or Profile URL
          </label>
          <input
            className="mt-3 w-full rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none transition placeholder:text-[#9CA3AF] focus:border-[#D4A853]"
            onChange={onLastFmUsernameChange}
            placeholder="Enter a username or paste https://www.last.fm/user/..."
            type="text"
            value={lastFmUsername}
          />
          <p className="mt-3 text-sm text-[#9CA3AF]">
            Live Mode accepts either a plain username or a full Last.fm profile link, then
            pulls recent tracks, top artists, and top tracks into the same dashboard schema.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          {sourceMode === "takeout" ||
          sourceMode === "unified-takeout" ||
          sourceMode === "apple-music" ? (
            <>
              {fileName ? (
                <p className="text-sm text-[#9CA3AF]">
                  Selected file: <span className="font-medium text-white">{fileName}</span>
                </p>
              ) : (
                <p className="text-sm text-[#9CA3AF]">No file selected yet.</p>
              )}
              {sourceMode === "takeout" && youtubeMusicProfileUrl ? (
                <p className="text-sm text-[#9CA3AF]">
                  Profile link:
                  {" "}
                  <span className="break-all text-white">{youtubeMusicProfileUrl}</span>
                </p>
              ) : null}
              {sourceMode === "takeout" ? (
                <details className="text-xs text-[#9CA3AF] md:block" open>
                  <summary className="cursor-pointer list-none font-medium text-[#aebad0] md:pointer-events-none md:cursor-default">
                    Upload details
                  </summary>
                  <p className="mt-1">
                    Supports
                    {" "}
                    <code>watch-history.json</code>
                    {" "}
                    and
                    {" "}
                    <code>watch-history.json.gz</code>
                    {" "}
                    files. The button uses your file if one is selected. Otherwise, it uses the
                    YouTube Music profile link.
                  </p>
                </details>
              ) : sourceMode === "apple-music" ? (
                <p className="text-xs text-[#9CA3AF]">
                  Apple Music mode builds the dashboard from a CSV or JSON export file.
                </p>
              ) : (
                <p className="text-xs text-[#9CA3AF]">
                  Unified mode uses the same Takeout file, but expands the analysis to music
                  plays from both YouTube Music and the main YouTube app.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#9CA3AF]">
              Last.fm user: <span className="text-white">{lastFmUsername || "not set"}</span>
            </p>
          )}

          {isUploading ? loadingIndicator : null}
          {uploadJourney ? (
            <div className="mt-1 max-w-xl rounded-lg border border-[var(--panel-border,#1E293B)] bg-[var(--panel-alt,#0F172A)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#F0D080]">
                <span>Upload Journey</span>
                <span>{uploadJourney.progress}%</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#111827]">
                <div
                  className="h-full rounded-full bg-[#D4A853] transition-all duration-300"
                  style={{ width: `${uploadJourney.progress}%` }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {uploadStages.map((stage) => {
                  const isActive = uploadJourney.progress >= stage.threshold;
                  return (
                    <div
                      key={stage.id}
                      className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${
                        isActive
                          ? "border-[#D4A853] bg-[#D4A853]/10 text-[#F0D080]"
                          : "border-[#1E293B] bg-[#111827] text-[#8fa0ba]"
                      }`}
                    >
                      {stage.label}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[#9CA3AF]">
                {uploadJourney.etaSeconds === null
                  ? "Finalizing analysis..."
                  : `Estimated time remaining: ${uploadJourney.etaSeconds}s`}
              </p>
            </div>
          ) : null}
          {error ? (
            <p aria-live="assertive" className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          {actionMessage ? (
            <p aria-live="polite" className="text-sm text-[#F0D080]" role="status">
              {actionMessage}
            </p>
          ) : null}
        </div>

        <button
          className="rounded-full border border-[#D4A853] bg-[#D4A853] px-6 py-3 font-semibold text-slate-950 transition hover:bg-[#F0D080] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-300"
          disabled={isUploading}
          type="submit"
        >
          {isUploading
            ? "Loading..."
            : sourceMode === "takeout" ||
                sourceMode === "unified-takeout" ||
                sourceMode === "apple-music"
              ? "Build dashboard or preview"
              : "Start Live Mode"}
        </button>
      </div>
    </form>
  );
}
