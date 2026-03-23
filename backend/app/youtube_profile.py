from __future__ import annotations

import re
from html import unescape
from urllib.parse import urlparse

import requests


OG_TITLE_PATTERN = re.compile(
    r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
OG_IMAGE_PATTERN = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
TITLE_PATTERN = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def parse_youtube_music_profile_url(url: str) -> dict[str, str]:
    normalized = url.strip()
    if not normalized:
        raise ValueError("Please provide a YouTube Music profile link.")

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Please enter a full YouTube Music URL starting with https://.")
    if parsed.netloc not in {"music.youtube.com", "www.music.youtube.com"}:
        raise ValueError("Please provide a valid music.youtube.com profile link.")

    path = parsed.path.rstrip("/")
    if not path or path == "":
        raise ValueError("Please provide a YouTube Music profile or channel link.")

    path_parts = [part for part in path.split("/") if part]
    first_part = path_parts[0] if path_parts else ""
    if first_part.startswith("@"):
        handle = first_part[1:]
    elif first_part in {"channel", "browse", "playlist"} and len(path_parts) > 1:
        handle = path_parts[1]
    else:
        raise ValueError("Unsupported YouTube Music profile link format.")

    if not handle:
        raise ValueError("Could not read the YouTube Music profile handle from that link.")

    return {
        "url": f"https://music.youtube.com/{'/'.join(path_parts)}",
        "handle": handle,
    }


def extract_profile_metadata(html: str, fallback_handle: str, fallback_url: str) -> dict[str, str | None]:
    title_match = OG_TITLE_PATTERN.search(html) or TITLE_PATTERN.search(html)
    image_match = OG_IMAGE_PATTERN.search(html)

    raw_title = unescape(title_match.group(1).strip()) if title_match else fallback_handle
    title = raw_title.replace(" - YouTube Music", "").replace(" - YouTube", "").strip()

    return {
        "name": title or fallback_handle,
        "handle": fallback_handle,
        "thumbnail": unescape(image_match.group(1).strip()) if image_match else None,
        "url": fallback_url,
    }


def fetch_youtube_music_profile(url: str) -> dict[str, str | None]:
    parsed = parse_youtube_music_profile_url(url)

    response = requests.get(
        parsed["url"],
        timeout=15,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            )
        },
    )
    response.raise_for_status()
    return extract_profile_metadata(response.text, parsed["handle"], parsed["url"])
