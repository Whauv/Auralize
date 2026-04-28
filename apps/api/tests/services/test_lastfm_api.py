from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.lastfm_api import LASTFM_API_ENDPOINT, build_lastfm_dashboard


class LastFmApiTests(unittest.TestCase):
    def test_lastfm_endpoint_uses_https(self) -> None:
        self.assertTrue(LASTFM_API_ENDPOINT.startswith("https://"))

    def test_invalid_recent_track_timestamp_is_ignored(self) -> None:
        recent_payload = {
            "recenttracks": {
                "track": [
                    {
                        "name": "Song",
                        "artist": {"#text": "Artist"},
                        "date": {"uts": "not-a-number"},
                        "image": [],
                    }
                ]
            }
        }
        top_tracks_payload = {
            "toptracks": {
                "track": [
                    {
                        "name": "Song",
                        "artist": {"name": "Artist"},
                        "playcount": "2",
                        "image": [],
                    }
                ]
            }
        }
        top_artists_payload = {"topartists": {"artist": [{"name": "Artist", "playcount": "2"}]}}

        with patch(
            "app.services.lastfm_api.call_lastfm",
            side_effect=[recent_payload, top_tracks_payload, top_artists_payload],
        ):
            result = build_lastfm_dashboard("demo-user")

        self.assertEqual(result["username"], "demo-user")
        self.assertEqual(len(result["rawEnrichedHistory"]), 1)
        self.assertEqual(result["rawEnrichedHistory"][0]["timestamps"], [])


if __name__ == "__main__":
    unittest.main()
