from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs, urlparse


def is_youtube_music_entry(entry: dict[str, Any]) -> bool:
    title_url = str(entry.get("titleUrl") or "")
    if "music.youtube.com" in title_url:
        return True

    subtitles = entry.get("subtitles") or []
    for subtitle in subtitles:
        if "YouTube Music" in str(subtitle.get("name") or ""):
            return True

    return False


def extract_video_id(url: str) -> str | None:
    if not url:
        return None

    parsed = urlparse(url)
    host = parsed.netloc.lower()

    if "youtu.be" in host:
        return parsed.path.lstrip("/") or None

    query_video_id = parse_qs(parsed.query).get("v", [None])[0]
    if query_video_id:
        return query_video_id

    if parsed.path.startswith("/watch/"):
        return parsed.path.rsplit("/", maxsplit=1)[-1] or None

    return None


def normalize_title(raw_title: str) -> str:
    prefixes = ("Watched ", "Listened to ", "Viewed ")
    for prefix in prefixes:
        if raw_title.startswith(prefix):
            return raw_title[len(prefix) :].strip()
    return raw_title.strip()


def parse_watch_history(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    aggregated: dict[str, dict[str, Any]] = {}

    for entry in entries:
        if not isinstance(entry, dict) or not is_youtube_music_entry(entry):
            continue

        title_url = str(entry.get("titleUrl") or "")
        video_id = extract_video_id(title_url)
        if not video_id:
            continue

        raw_title = str(entry.get("title") or "Unknown title")
        title = normalize_title(raw_title) or "Unknown title"
        timestamp = str(entry.get("time") or "")
        if not timestamp:
            continue

        if video_id not in aggregated:
            aggregated[video_id] = {
                "videoId": video_id,
                "title": title,
                "playCount": 0,
                "timestamps": [],
            }
        elif aggregated[video_id]["title"] == "Unknown title" and title != "Unknown title":
            aggregated[video_id]["title"] = title

        aggregated[video_id]["playCount"] += 1
        aggregated[video_id]["timestamps"].append(timestamp)

    results = list(aggregated.values())
    results.sort(key=lambda item: (-item["playCount"], item["title"].lower(), item["videoId"]))
    return results
