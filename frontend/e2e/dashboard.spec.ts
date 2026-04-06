import { expect, test } from "@playwright/test";

const analyzeResponse = {
  entries: [
    {
      videoId: "alpha",
      title: "Night Drive",
      playCount: 3,
      timestamps: ["2026-04-01T03:00:00Z", "2026-04-02T03:20:00Z", "2026-04-03T03:40:00Z"],
    },
    {
      videoId: "beta",
      title: "Solar Bloom",
      playCount: 1,
      timestamps: ["2026-04-02T14:00:00Z"],
    },
  ],
  quality: {
    totalEntries: 4,
    usableEntries: 4,
    searchEntries: 0,
    youtubeMusicEntries: 4,
    warnings: [],
  },
  dashboard: {
    source: "takeout",
    username: null,
    stats: {
      topSongs: [
        {
          videoId: "alpha",
          title: "Night Drive",
          artist: "Artist One",
          thumbnail: null,
          duration: "PT3M10S",
          tags: ["lofi"],
          playCount: 3,
          timestamps: ["2026-04-01T03:00:00Z", "2026-04-02T03:20:00Z", "2026-04-03T03:40:00Z"],
        },
        {
          videoId: "beta",
          title: "Solar Bloom",
          artist: "Artist Two",
          thumbnail: null,
          duration: "PT2M30S",
          tags: ["pop"],
          playCount: 1,
          timestamps: ["2026-04-02T14:00:00Z"],
        },
      ],
      topArtists: [
        { artist: "Artist One", playCount: 3 },
        { artist: "Artist Two", playCount: 1 },
      ],
      totalListeningMinutes: 12,
      rawEnrichedHistory: [
        {
          videoId: "alpha",
          title: "Night Drive",
          artist: "Artist One",
          thumbnail: null,
          duration: "PT3M10S",
          tags: ["lofi"],
          playCount: 3,
          timestamps: ["2026-04-01T03:00:00Z", "2026-04-02T03:20:00Z", "2026-04-03T03:40:00Z"],
        },
        {
          videoId: "beta",
          title: "Solar Bloom",
          artist: "Artist Two",
          thumbnail: null,
          duration: "PT2M30S",
          tags: ["pop"],
          playCount: 1,
          timestamps: ["2026-04-02T14:00:00Z"],
        },
      ],
    },
    genreBreakdown: [
      { genre: "Lo-fi", count: 3, percentage: 75 },
      { genre: "Pop", count: 1, percentage: 25 },
    ],
    moodTimeline: [
      { mood: "Chill/Nocturnal", playCount: 3 },
      { mood: "Focused", playCount: 1 },
    ],
    profileSummary: null,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(analyzeResponse),
    });
  });
});

test("builds a dashboard from an uploaded history file", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Upload your history/i })).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "watch-history.json",
    mimeType: "application/json",
    buffer: Buffer.from("[]"),
  });

  await page.getByRole("button", { name: /Build dashboard or preview/i }).click();

  await expect(page.getByRole("heading", { name: "Your Music Profile" })).toBeVisible();
  await expect(page.getByText("Night Drive").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Export as Image" })).toBeVisible();
});

test("applies dashboard filters to the loaded history", async ({ page }) => {
  await page.goto("/");

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "watch-history.json",
    mimeType: "application/json",
    buffer: Buffer.from("[]"),
  });

  await page.getByRole("button", { name: /Build dashboard or preview/i }).click();
  await expect(page.getByRole("heading", { name: "Search And Filters" })).toBeVisible();

  await page.getByPlaceholder("Song, artist, tag").fill("solar");
  await expect(page.getByText("1 songs in current filtered view")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("2 songs in current filtered view")).toBeVisible();
});
