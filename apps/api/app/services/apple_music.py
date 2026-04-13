from __future__ import annotations

import csv
import io
import json
import re
from typing import Any


def parse_apple_music_export(raw_content: bytes) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    text = decode_upload_text(raw_content)
    stripped = text.lstrip()

    if stripped.startswith("[") or stripped.startswith("{"):
        payload = json.loads(text)
        if not isinstance(payload, list):
            raise ValueError("Expected the Apple Music JSON export to contain a list of records.")
        records = [record for record in payload if isinstance(record, dict)]
    else:
        reader = csv.DictReader(io.StringIO(text))
        records = [record for record in reader if isinstance(record, dict)]

    enriched_history = build_apple_music_history(records)
    quality = build_apple_music_quality_summary(records, enriched_history)
    return enriched_history, quality


def decode_upload_text(raw_content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "latin-1"):
        try:
            return raw_content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_content.decode("utf-8", errors="replace")


def build_apple_music_history(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    aggregated: dict[str, dict[str, Any]] = {}

    for record in records:
        title = pick_first_value(
            record,
            (
                "Song Name",
                "Track Name",
                "Track Description",
                "Title",
                "Name",
                "Item Description",
            ),
        )
        artist = pick_first_value(
            record,
            (
                "Artist Name",
                "Artist",
                "Album Artist Name",
                "Container Artist Name",
            ),
        )
        if not title or not artist:
            continue

        timestamp = pick_first_value(
            record,
            (
                "Event Start Timestamp",
                "Play Date",
                "Playback Start Date",
                "Date Played",
                "Event Received Timestamp",
            ),
        )
        normalized_timestamp = normalize_timestamp(timestamp)
        if not normalized_timestamp:
            continue

        duration_ms = pick_duration_ms(record)
        track_id = build_track_id(title, artist)

        current = aggregated.get(track_id)
        if current is None:
            current = {
                "videoId": track_id,
                "title": title,
                "artist": artist,
                "thumbnail": None,
                "duration": milliseconds_to_iso8601(duration_ms),
                "tags": [],
                "playCount": 0,
                "timestamps": [],
                "source": "Apple Music",
            }
            aggregated[track_id] = current

        current["playCount"] += 1
        current["timestamps"].append(normalized_timestamp)

    enriched_history = list(aggregated.values())
    enriched_history.sort(
        key=lambda item: (
            -int(item["playCount"]),
            str(item["artist"]).lower(),
            str(item["title"]).lower(),
        )
    )
    return enriched_history


def build_apple_music_quality_summary(
    records: list[dict[str, Any]], enriched_history: list[dict[str, Any]]
) -> dict[str, Any]:
    total_entries = len(records)
    usable_entries = len(enriched_history)
    warnings: list[str] = []

    if total_entries == 0:
        warnings.append(
            "This Apple Music export is empty, so there is no listening data to analyze."
        )
    if usable_entries == 0:
        warnings.append(
            "No playable Apple Music activity rows were found. "
            "Try the Apple Music Play Activity export from privacy.apple.com."
        )
    elif usable_entries < 10:
        warnings.append(
            "Only a small number of playable Apple Music entries were found, "
            "so the dashboard may feel sparse."
        )

    return {
        "totalEntries": total_entries,
        "usableEntries": usable_entries,
        "searchEntries": 0,
        "youtubeMusicEntries": 0,
        "sourceBreakdown": {"Apple Music": sum(int(entry["playCount"]) for entry in enriched_history)},
        "warnings": warnings,
    }


def pick_first_value(record: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        value = str(record.get(key) or "").strip()
        if value:
            return value
    return ""


def normalize_timestamp(value: str) -> str | None:
    raw_value = value.strip()
    if not raw_value:
        return None

    normalized = raw_value.replace(" UTC", "Z").replace(" ", "T", 1)
    if normalized.endswith("Z"):
        return normalized
    if re.search(r"[+-]\d{2}:\d{2}$", normalized):
        return normalized
    if "T" in normalized:
        return f"{normalized}Z"
    return None


def pick_duration_ms(record: dict[str, Any]) -> int:
    for key in (
        "Play Duration Milliseconds",
        "Media Duration In Milliseconds",
        "Media duration in milliseconds",
        "Track Duration Milliseconds",
    ):
        raw_value = str(record.get(key) or "").strip()
        if not raw_value:
            continue
        try:
            return max(int(float(raw_value)), 0)
        except ValueError:
            continue
    return 0


def milliseconds_to_iso8601(duration_ms: int) -> str:
    total_seconds = max(duration_ms // 1000, 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    parts: list[str] = ["PT"]
    if hours:
        parts.append(f"{hours}H")
    if minutes:
        parts.append(f"{minutes}M")
    if seconds or len(parts) == 1:
        parts.append(f"{seconds}S")
    return "".join(parts)


def build_track_id(title: str, artist: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", f"{artist}-{title}".lower()).strip("-")
    return f"apple-{slug or 'track'}"
