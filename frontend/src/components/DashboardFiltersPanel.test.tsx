import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardFiltersPanel } from "./DashboardFiltersPanel";

describe("DashboardFiltersPanel", () => {
  it("updates filters and clears them through callbacks", async () => {
    const user = userEvent.setup();
    const onSearchTermChange = vi.fn();
    const onSelectedGenreChange = vi.fn();
    const onSelectedArtistChange = vi.fn();
    const onSelectedMoodChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <DashboardFiltersPanel
        artistOptions={["Artist One"]}
        filteredCount={2}
        genreOptions={["Lo-fi"]}
        moodOptions={["Focused"]}
        onClearFilters={onClearFilters}
        onSearchTermChange={onSearchTermChange}
        onSelectedArtistChange={onSelectedArtistChange}
        onSelectedGenreChange={onSelectedGenreChange}
        onSelectedMoodChange={onSelectedMoodChange}
        searchTerm=""
        selectedArtist=""
        selectedGenre=""
        selectedMood=""
      />,
    );

    await user.type(screen.getByPlaceholderText("Song, artist, tag"), "night");
    await user.selectOptions(screen.getByLabelText("Genre"), "Lo-fi");
    await user.selectOptions(screen.getByLabelText("Artist"), "Artist One");
    await user.selectOptions(screen.getByLabelText("Mood"), "Focused");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onSearchTermChange).toHaveBeenCalled();
    expect(onSelectedGenreChange).toHaveBeenCalled();
    expect(onSelectedArtistChange).toHaveBeenCalled();
    expect(onSelectedMoodChange).toHaveBeenCalled();
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
