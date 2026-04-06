from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.response_cache import response_cache
from fastapi.testclient import TestClient


class MainIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        response_cache._store.clear()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        response_cache._store.clear()

    def test_healthcheck_returns_ok(self) -> None:
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertEqual(response.headers["referrer-policy"], "no-referrer")
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_analyze_uses_parse_and_builder_contract(self) -> None:
        parse_result = (
            [
                {
                    "videoId": "song-1",
                    "title": "Song",
                    "playCount": 1,
                    "timestamps": ["2026-01-01T00:00:00Z"],
                }
            ],
            {
                "totalEntries": 1,
                "usableEntries": 1,
                "searchEntries": 0,
                "youtubeMusicEntries": 1,
                "warnings": [],
            },
            "hash-123",
        )
        built_response = {
            "entries": parse_result[0],
            "quality": parse_result[1],
            "dashboard": {"source": "takeout"},
        }

        with (
            patch(
                "app.main.parse_upload_file",
                new=AsyncMock(return_value=parse_result),
            ) as parse_mock,
            patch(
                "app.main.build_takeout_analysis_response",
                return_value=built_response,
            ) as build_mock,
        ):
            response = self.client.post(
                "/api/analyze",
                files={"file": ("watch-history.json", "[]", "application/json")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), built_response)
        parse_mock.assert_awaited_once()
        build_mock.assert_called_once_with(parse_result[0], parse_result[1], source="takeout")

    def test_lastfm_rejects_blank_username(self) -> None:
        response = self.client.post("/api/lastfm", json={"username": "   "})

        self.assertEqual(response.status_code, 422)

    def test_lastfm_rejects_invalid_username_format(self) -> None:
        response = self.client.post("/api/lastfm", json={"username": "bad user"})

        self.assertEqual(response.status_code, 422)

    def test_youtube_profile_rejects_blank_url(self) -> None:
        response = self.client.post("/api/youtube-profile", json={"url": "   "})

        self.assertEqual(response.status_code, 422)

    def test_youtube_profile_rejects_non_music_url(self) -> None:
        response = self.client.post("/api/youtube-profile", json={"url": "https://youtube.com/@demo"})

        self.assertEqual(response.status_code, 422)

    def test_upload_rejects_too_large_file(self) -> None:
        response = self.client.post(
            "/api/upload",
            files={
                "file": (
                    "watch-history.json",
                    b"x" * (10 * 1024 * 1024 + 1),
                    "application/json",
                )
            },
        )

        self.assertEqual(response.status_code, 413)

    def test_apple_music_analyze_returns_dashboard_payload(self) -> None:
        enriched_history = [
            {
                "videoId": "apple-1",
                "title": "Track One",
                "artist": "Artist One",
                "thumbnail": None,
                "duration": "PT3M0S",
                "tags": [],
                "playCount": 2,
                "timestamps": ["2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"],
            }
        ]
        quality = {
            "totalEntries": 2,
            "usableEntries": 2,
            "searchEntries": 0,
            "youtubeMusicEntries": 0,
            "warnings": [],
        }
        dashboard = {
            "source": "apple-music",
            "username": None,
            "stats": {
                "topSongs": [],
                "topArtists": [],
                "totalListeningMinutes": 0,
                "rawEnrichedHistory": [],
            },
            "genreBreakdown": [],
            "moodTimeline": [],
        }

        with (
            patch(
                "app.main.parse_apple_music_upload_file",
                new=AsyncMock(return_value=(enriched_history, quality, "apple-hash")),
            ) as parse_mock,
            patch("app.main.build_dashboard_payload", return_value=dashboard) as dashboard_mock,
        ):
            response = self.client.post(
                "/api/apple-music/analyze",
                files={"file": ("apple.csv", "song,artist\n", "text/csv")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["quality"], quality)
        self.assertEqual(body["dashboard"], dashboard)
        self.assertEqual(body["entries"][0]["videoId"], "apple-1")
        parse_mock.assert_awaited_once()
        dashboard_mock.assert_called_once_with(enriched_history, source="apple-music")


if __name__ == "__main__":
    unittest.main()
