from __future__ import annotations

import unittest

from app.services.stats import build_genre_breakdown, build_mood_timeline, build_stats_payload


class StatsTests(unittest.TestCase):
    def test_build_stats_payload_calculates_top_artists_and_minutes(self) -> None:
        enriched_history = [
            {
                "videoId": "one",
                "title": "Night Drive",
                "artist": "Artist One",
                "thumbnail": None,
                "duration": "PT3M0S",
                "tags": ["lofi"],
                "playCount": 2,
                "timestamps": ["2026-01-01T03:00:00Z", "2026-01-01T04:00:00Z"],
            },
            {
                "videoId": "two",
                "title": "Morning Spark",
                "artist": "Artist Two",
                "thumbnail": None,
                "duration": "PT2M30S",
                "tags": ["pop"],
                "playCount": 1,
                "timestamps": ["2026-01-01T14:00:00Z"],
            },
        ]

        stats_payload = build_stats_payload(enriched_history)
        genre_breakdown = build_genre_breakdown(enriched_history)
        mood_timeline = build_mood_timeline(enriched_history)

        self.assertEqual(stats_payload["topArtists"][0]["artist"], "Artist One")
        self.assertAlmostEqual(stats_payload["totalListeningMinutes"], 8.5)
        self.assertEqual(genre_breakdown[0]["genre"], "Lo-fi")
        self.assertEqual(sum(item["playCount"] for item in mood_timeline), 3)


if __name__ == "__main__":
    unittest.main()
