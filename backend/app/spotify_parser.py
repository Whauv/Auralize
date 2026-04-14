from __future__ import annotations

from hashlib import md5
from typing import Any


def _normalize_track_id(spotify_track_uri: str | None) -> str | None:
    if not spotify_track_uri:
        return None

    normalized = spotify_track_uri.strip()
    if normalized.startswith("spotify:track:"):
        track_id = normalized.rsplit(":", maxsplit=1)[-1]
        return track_id or None

    if "/track/" in normalized:
        track_id = normalized.rsplit("/track/", maxsplit=1)[-1].split("?", maxsplit=1)[
            0
        ]
        return track_id or None

    return None


def _make_fallback_id(title: str, artist: str) -> str:
    digest = md5(f"{artist}|{title}".encode("utf-8")).hexdigest()[:12]
    return f"spotify-local:{digest}"


def _extract_timestamp(entry: dict[str, Any]) -> str:
    return str(entry.get("ts") or entry.get("endTime") or "")


def _extract_title(entry: dict[str, Any]) -> str:
    return str(
        entry.get("master_metadata_track_name") or entry.get("trackName") or ""
    ).strip()


def _extract_artist(entry: dict[str, Any]) -> str:
    return str(
        entry.get("master_metadata_album_artist_name") or entry.get("artistName") or ""
    ).strip()


def _extract_ms_played(entry: dict[str, Any]) -> int:
    raw_ms_played = entry.get("ms_played", entry.get("msPlayed", 0))
    try:
        return max(0, int(raw_ms_played))
    except (TypeError, ValueError):
        return 0


def _ms_to_iso8601(ms_played: int) -> str:
    total_seconds = max(0, int(round(ms_played / 1000)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    duration = "PT"
    if hours:
        duration += f"{hours}H"
    if minutes:
        duration += f"{minutes}M"
    if seconds or duration == "PT":
        duration += f"{seconds}S"
    return duration


def parse_spotify_history(payload: Any) -> list[dict[str, Any]]:
    entries = (
        payload
        if isinstance(payload, list)
        else payload.get("entries", []) if isinstance(payload, dict) else []
    )
    if not isinstance(entries, list):
        raise ValueError(
            "Expected Spotify export JSON array or an object containing 'entries'."
        )

    aggregated: dict[str, dict[str, Any]] = {}

    for item in entries:
        if not isinstance(item, dict):
            continue

        title = _extract_title(item)
        artist = _extract_artist(item)
        if not title or not artist:
            continue

        timestamp = _extract_timestamp(item)
        if not timestamp:
            continue

        track_id = _normalize_track_id(
            str(item.get("spotify_track_uri") or item.get("spotifyTrackUri") or "")
        )
        canonical_id = track_id or _make_fallback_id(title, artist)
        ms_played = _extract_ms_played(item)

        if canonical_id not in aggregated:
            aggregated[canonical_id] = {
                "videoId": canonical_id,
                "title": title,
                "artist": artist,
                "playCount": 0,
                "timestamps": [],
                "totalMsPlayed": 0,
            }

        aggregated_record = aggregated[canonical_id]
        aggregated_record["playCount"] += 1
        aggregated_record["timestamps"].append(timestamp)
        aggregated_record["totalMsPlayed"] += ms_played

    parsed_history: list[dict[str, Any]] = []
    for record in aggregated.values():
        play_count = max(1, int(record["playCount"]))
        average_ms_played = int(round(record["totalMsPlayed"] / play_count))
        parsed_history.append(
            {
                "videoId": str(record["videoId"]),
                "title": str(record["title"]),
                "artist": str(record["artist"]),
                "duration": _ms_to_iso8601(average_ms_played),
                "playCount": play_count,
                "timestamps": sorted(list(record["timestamps"])),
                "tags": [],
            }
        )

    parsed_history.sort(
        key=lambda entry: (
            -int(entry["playCount"]),
            str(entry["artist"]).lower(),
            str(entry["title"]).lower(),
        )
    )
    return parsed_history
