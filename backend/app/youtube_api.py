from __future__ import annotations

import os
from typing import Any

import requests

YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos"
BATCH_SIZE = 50


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


def enrich_with_youtube_api(video_ids: list[str]) -> dict[str, dict[str, Any]]:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("Missing YOUTUBE_API_KEY in backend/.env.")

    unique_ids = list(dict.fromkeys(video_ids))
    enriched_records: dict[str, dict[str, Any]] = {}

    for batch in chunked(unique_ids, BATCH_SIZE):
        response = requests.get(
            YOUTUBE_VIDEOS_ENDPOINT,
            params={
                "part": "snippet,contentDetails",
                "id": ",".join(batch),
                "key": api_key,
            },
            timeout=30,
        )
        response.raise_for_status()

        payload = response.json()
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

    return enriched_records
