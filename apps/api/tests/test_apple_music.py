from __future__ import annotations

import unittest

from app.services.apple_music import parse_apple_music_export


class AppleMusicParserTests(unittest.TestCase):
    def test_parse_csv_export_aggregates_song_plays(self) -> None:
        raw_csv = (
            b"Song Name,Artist Name,Event Start Timestamp,Play Duration Milliseconds\n"
            b"Track One,Artist One,2026-01-01T12:00:00Z,180000\n"
            b"Track One,Artist One,2026-01-02T12:00:00Z,180000\n"
        )

        enriched_history, quality = parse_apple_music_export(raw_csv)

        self.assertEqual(len(enriched_history), 1)
        self.assertEqual(enriched_history[0]["videoId"], "apple-artist-one-track-one")
        self.assertEqual(enriched_history[0]["playCount"], 2)
        self.assertEqual(quality["usableEntries"], 1)


if __name__ == "__main__":
    unittest.main()
