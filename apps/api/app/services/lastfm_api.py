from __future__ import annotations

import os
import re
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import requests

LASTFM_API_ENDPOINT = "https://ws.audioscrobbler.com/2.0/"
LASTFM_TIMEOUT_SECONDS = 20


def require_lastfm_api_key() -> str:
    api_key = os.getenv("LASTFM_API_KEY")
    if not api_key:
        raise ValueError("Missing LASTFM_API_KEY in apps/api/.env.")
    return api_key


def call_lastfm(method: str, username: str, limit: int) -> dict[str, Any]:
    response = requests.get(
        LASTFM_API_ENDPOINT,
        params={
            "method": method,
            "user": username,
            "api_key": require_lastfm_api_key(),
            "format": "json",
            "limit": limit,
        },
        timeout=LASTFM_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise ValueError(str(payload.get("message") or "Last.fm API returned an error."))
    return payload


def pick_lastfm_image(images: list[dict[str, Any]]) -> str | None:
    for image in reversed(images):
        url = str(image.get("#text") or "").strip()
        if url:
            return url
    return None


def slugify_lastfm_track_id(artist: str, title: str) -> str:
    base = f"{artist}-{title}".lower()
    return "lastfm-" + re.sub(r"[^a-z0-9]+", "-", base).strip("-")


def build_lastfm_dashboard(username: str) -> dict[str, Any]:
    recent_payload = call_lastfm("user.getrecenttracks", username, limit=200)
    top_tracks_payload = call_lastfm("user.gettoptracks", username, limit=50)
    top_artists_payload = call_lastfm("user.gettopartists", username, limit=20)

    recent_tracks = recent_payload.get("recenttracks", {}).get("track", [])
    top_tracks = top_tracks_payload.get("toptracks", {}).get("track", [])
    top_artists = top_artists_payload.get("topartists", {}).get("artist", [])

    recent_timestamps: dict[str, list[str]] = defaultdict(list)
    recent_images: dict[str, str | None] = {}
    recent_track_meta: dict[str, dict[str, str]] = {}

    for track in recent_tracks:
        if not isinstance(track, dict):
            continue

        title = str(track.get("name") or "").strip()
        artist = str(track.get("artist", {}).get("#text") or "").strip()
        if not title or not artist:
            continue

        track_id = slugify_lastfm_track_id(artist, title)
        recent_track_meta[track_id] = {"title": title, "artist": artist}
        date_info = track.get("date") or {}
        unix_timestamp = str(date_info.get("uts") or "").strip()
        if unix_timestamp:
            try:
                timestamp = datetime.fromtimestamp(int(unix_timestamp), tz=UTC)
            except (TypeError, ValueError, OSError):
                continue
            recent_timestamps[track_id].append(timestamp.isoformat().replace("+00:00", "Z"))
        recent_images[track_id] = pick_lastfm_image(track.get("image") or [])

    enriched_history: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for track in top_tracks:
        if not isinstance(track, dict):
            continue

        title = str(track.get("name") or "").strip()
        artist = str(track.get("artist", {}).get("name") or "").strip()
        if not title or not artist:
            continue

        track_id = slugify_lastfm_track_id(artist, title)
        seen_ids.add(track_id)
        thumbnail = pick_lastfm_image(track.get("image") or []) or recent_images.get(track_id)
        enriched_history.append(
            {
                "videoId": track_id,
                "title": title,
                "artist": artist,
                "thumbnail": thumbnail,
                "duration": "PT0S",
                "tags": [],
                "playCount": int(track.get("playcount") or 0),
                "timestamps": sorted(recent_timestamps.get(track_id, [])),
                "source": "Last.fm",
            }
        )

    for track_id, timestamps in recent_timestamps.items():
        if track_id in seen_ids:
            continue
        metadata = recent_track_meta.get(track_id, {})
        enriched_history.append(
            {
                "videoId": track_id,
                "title": metadata.get("title", "Unknown title"),
                "artist": metadata.get("artist", "Unknown artist"),
                "thumbnail": recent_images.get(track_id),
                "duration": "PT0S",
                "tags": [],
                "playCount": len(timestamps),
                "timestamps": sorted(timestamps),
                "source": "Last.fm",
            }
        )

    enriched_history.sort(
        key=lambda item: (
            -int(item["playCount"]),
            str(item["artist"]).lower(),
            str(item["title"]).lower(),
        )
    )

    normalized_top_artists = [
        {
            "artist": str(artist.get("name") or "Unknown artist"),
            "playCount": int(artist.get("playcount") or 0),
        }
        for artist in top_artists
        if isinstance(artist, dict)
    ]

    return {
        "username": username,
        "rawEnrichedHistory": enriched_history,
        "topArtistsOverride": normalized_top_artists,
    }
