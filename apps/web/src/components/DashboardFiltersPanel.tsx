import type { ChangeEventHandler } from "react";

import { Section } from "./DashboardBits";

type DashboardFiltersPanelProps = {
  filteredCount: number;
  searchTerm: string;
  selectedGenre: string;
  selectedArtist: string;
  selectedMood: string;
  genreOptions: string[];
  artistOptions: string[];
  moodOptions: string[];
  onSearchTermChange: ChangeEventHandler<HTMLInputElement>;
  onSelectedGenreChange: ChangeEventHandler<HTMLSelectElement>;
  onSelectedArtistChange: ChangeEventHandler<HTMLSelectElement>;
  onSelectedMoodChange: ChangeEventHandler<HTMLSelectElement>;
  onClearFilters: () => void;
};

export function DashboardFiltersPanel({
  filteredCount,
  searchTerm,
  selectedGenre,
  selectedArtist,
  selectedMood,
  genreOptions,
  artistOptions,
  moodOptions,
  onSearchTermChange,
  onSelectedGenreChange,
  onSelectedArtistChange,
  onSelectedMoodChange,
  onClearFilters,
}: DashboardFiltersPanelProps) {
  return (
    <Section
      title="Search And Filters"
      subtitle="Slice the dashboard by song search, artist, genre, or mood and let the rest of the page update with it."
      className="filters-anchored"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Search</span>
          <input
            className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none placeholder:text-[#9CA3AF] focus:border-[#67C3C0]"
            onChange={onSearchTermChange}
            placeholder="Song, artist, tag"
            type="text"
            value={searchTerm}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Genre</span>
          <select
            aria-label="Genre"
            className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
            onChange={onSelectedGenreChange}
            value={selectedGenre}
          >
            <option value="">All genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Artist</span>
          <select
            aria-label="Artist"
            className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
            onChange={onSelectedArtistChange}
            value={selectedArtist}
          >
            <option value="">All artists</option>
            {artistOptions.map((artist) => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.28em] text-[#F59E0B]">Mood</span>
          <select
            aria-label="Mood"
            className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-[#67C3C0]"
            onChange={onSelectedMoodChange}
            value={selectedMood}
          >
            <option value="">All moods</option>
            {moodOptions.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <span className="rounded-full border border-[#1E293B] bg-[#0F172A] px-4 py-2 text-sm text-[#9CA3AF]">
          {filteredCount} songs in current filtered view
        </span>
        <button
          className="rounded-full border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#67C3C0] hover:bg-[#182234]"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      </div>
    </Section>
  );
}
