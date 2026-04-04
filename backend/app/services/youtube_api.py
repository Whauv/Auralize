from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import requests

YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos"
BATCH_SIZE = 50
MAX_RETRIES = 3
CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "youtube_cache.json"
MUSIC_TITLE_KEYWORDS = (
    "official audio",
    "official video",
    "music video",
    "lyric video",
    "lyrics",
    "visualizer",
    "album",
    "remix",
    "cover",
    "soundtrack",
    "prod.",
    "feat.",
    "ft.",
    "topic",
    "live session",
)
MUSIC_TAG_KEYWORDS = (
    "music",
    "song",
    "audio",
    "video",
    "album",
    "single",
    "lyrics",
    "remix",
    "soundtrack",
    "pop",
    "hip hop",
    "rap",
    "rock",
    "r&b",
    "indie",
    "electronic",
    "jazz",
    "classical",
    "lofi",
    "k-pop",
)
NON_MUSIC_KEYWORDS = (
    "podcast",
    "interview",
    "reaction",
    "trailer",
    "gameplay",
    "walkthrough",
    "stream",
    "vlog",
    "episode",
    "news",
    "highlights",
    "shorts",
)


def chunked(items: list[str], size: int) -> list[list[str]]:
    if size <= 0:
        raise ValueError("Chunk size must be positive.")
    return [items[index : index + size] for index in range(0, len(items), size)]


def pick_thumbnail(thumbnails: dict[str, Any]) -> str | None:
    for key in ("maxres", "standard", "high", "medium", "default"):
        candidate = thumbnails.get(key)
        if candidate and candidate.get("url"):
            return str(candidate["url"])
    return None


def load_cache() -> dict[str, dict[str, Any]]:
    if not CACHE_PATH.exists():
        return {}

    try:
        payload = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    if not isinstance(payload, dict):
        return {}

    return {
        str(video_id): record
        for video_id, record in payload.items()
        if isinstance(video_id, str) and isinstance(record, dict)
    }


def save_cache(cache: dict[str, dict[str, Any]]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def request_video_batch(batch: list[str], api_key: str) -> dict[str, Any]:
    last_error: requests.RequestException | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(
                YOUTUBE_VIDEOS_ENDPOINT,
                params={
                    "part": "snippet,contentDetails",
                    "id": ",".join(batch),
                    "key": api_key,
                },
                timeout=30,
            )
            if response.status_code >= 500 and attempt < MAX_RETRIES:
                time.sleep(0.5 * attempt)
                continue

            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            last_error = exc
            if attempt >= MAX_RETRIES:
                break
            time.sleep(0.5 * attempt)

    if last_error is not None:
        raise last_error

    return {"items": []}


def enrich_with_youtube_api(video_ids: list[str]) -> dict[str, dict[str, Any]]:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("Missing YOUTUBE_API_KEY in backend/.env.")

    unique_ids = list(dict.fromkeys(video_ids))
    cached_records = load_cache()
    enriched_records: dict[str, dict[str, Any]] = {
        video_id: cached_records[video_id] for video_id in unique_ids if video_id in cached_records
    }
    uncached_ids = [video_id for video_id in unique_ids if video_id not in enriched_records]

    for batch in chunked(uncached_ids, BATCH_SIZE):
        payload = request_video_batch(batch, api_key)
        for item in payload.get("items", []):
            snippet = item.get("snippet", {})
            content_details = item.get("contentDetails", {})
            video_id = str(item.get("id") or "")
            if not video_id:
                continue

            enriched_records[video_id] = {
                "videoId": video_id,
                "title": str(snippet.get("title") or ""),
                "artist": str(snippet.get("channelTitle") or "Unknown artist"),
                "thumbnail": pick_thumbnail(snippet.get("thumbnails", {})),
                "duration": str(content_details.get("duration") or "PT0S"),
                "tags": [str(tag) for tag in snippet.get("tags", []) if isinstance(tag, str)],
            }
            cached_records[video_id] = enriched_records[video_id]

    if uncached_ids:
        save_cache(cached_records)

    return enriched_records


def is_music_video(enriched_record: dict[str, Any]) -> bool:
    title = str(enriched_record.get("title") or "").lower()
    artist = str(enriched_record.get("artist") or "").lower()
    tags = [str(tag).lower() for tag in enriched_record.get("tags") or []]

    positive_title = any(keyword in title for keyword in MUSIC_TITLE_KEYWORDS)
    positive_tags = any(keyword in tag for tag in tags for keyword in MUSIC_TAG_KEYWORDS)
    positive_artist = (
        artist.endswith("- topic") or "vevo" in artist or "records" in artist or "music" in artist
    )
    negative_signal = any(keyword in title for keyword in NON_MUSIC_KEYWORDS)

    if positive_artist or positive_title or positive_tags:
        return True

    if negative_signal:
        return False

    return False
