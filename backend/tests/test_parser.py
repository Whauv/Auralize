from __future__ import annotations

import unittest

from app.services.parser import parse_unified_watch_history, parse_watch_history


class ParserTests(unittest.TestCase):
    def test_parse_watch_history_keeps_only_youtube_music_entries(self) -> None:
        payload = [
            {
                "header": "YouTube Music",
                "title": "Watched Song Alpha",
                "titleUrl": "https://music.youtube.com/watch?v=alpha123",
                "subtitles": [{"name": "YouTube Music"}],
                "time": "2026-01-01T04:30:00Z",
            },
            {
                "header": "YouTube",
                "title": "Watched Not Music",
                "titleUrl": "https://www.youtube.com/watch?v=video999",
                "time": "2026-01-01T05:30:00Z",
            },
        ]

        parsed = parse_watch_history(payload)

        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["videoId"], "alpha123")
        self.assertEqual(parsed[0]["playCount"], 1)

    def test_parse_unified_watch_history_tracks_source_and_aggregates(self) -> None:
        payload = [
            {
                "header": "YouTube",
                "title": "Watched Song Alpha",
                "titleUrl": "https://www.youtube.com/watch?v=alpha123",
                "time": "2026-01-01T05:30:00Z",
            },
            {
                "header": "YouTube Music",
                "title": "Watched Song Alpha",
                "titleUrl": "https://music.youtube.com/watch?v=alpha123",
                "subtitles": [{"name": "YouTube Music"}],
                "time": "2026-01-02T05:30:00Z",
            },
        ]

        parsed = parse_unified_watch_history(payload)

        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["playCount"], 2)
        self.assertEqual(parsed[0]["source"], "youtube-music")


if __name__ == "__main__":
    unittest.main()
