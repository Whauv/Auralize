from __future__ import annotations

from datetime import datetime
import re
from typing import Any


ISO_8601_DURATION_PATTERN = re.compile(
    r"^P(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)$"
)

GENRE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Pop": ("pop", "dance pop", "synthpop", "electropop", "teen pop"),
    "Hip-Hop": ("hip hop", "hip-hop", "rap", "trap", "drill", "freestyle"),
    "Rock": ("rock", "punk", "metal", "grunge", "alternative rock", "hard rock"),
    "R&B": ("r&b", "randb", "rhythm and blues", "soul", "neo soul", "neo-soul"),
    "Electronic": ("electronic", "edm", "house", "techno", "trance", "dubstep", "dnb"),
    "Classical": ("classical", "orchestra", "orchestral", "baroque", "piano sonata"),
    "Jazz": ("jazz", "bebop", "swing", "fusion", "smooth jazz"),
    "Lo-fi": ("lofi", "lo-fi", "chillhop", "study beats", "sleep beats"),
    "Indie": ("indie", "indie pop", "indie rock", "bedroom pop", "shoegaze"),
    "K-Pop": ("k-pop", "kpop", "korean pop", "idol", "girl group", "boy group"),
}

ARTIST_HEURISTICS: dict[str, tuple[str, ...]] = {
    "K-Pop": ("bts", "blackpink", "twice", "newjeans", "stray kids", "seventeen", "aespa"),
    "Hip-Hop": ("drake", "kendrick", "j cole", "future", "travis scott", "nicki minaj"),
    "R&B": ("sza", "the weeknd", "brent faiyaz", "summer walker", "frank ocean", "kehlani"),
    "Pop": ("taylor swift", "ariana grande", "dua lipa", "olivia rodrigo", "selena gomez"),
    "Rock": ("foo fighters", "linkin park", "arctic monkeys", "paramore", "queen"),
    "Electronic": ("skrillex", "calvin harris", "fred again", "deadmau5", "odesza"),
    "Classical": ("mozart", "beethoven", "chopin", "bach", "vivaldi"),
    "Jazz": ("miles davis", "john coltrane", "ella fitzgerald", "chet baker", "duke ellington"),
    "Lo-fi": ("jinsang", "nujabes", "tomppabeats", "idealism", "eevee"),
    "Indie": ("phoebe bridgers", "clairo", "beabadoobee", "the smiths", "mac demarco"),
}

MOOD_LABELS = {
    "late_night": "Chill/Nocturnal",
    "morning": "Energized",
    "afternoon": "Focused",
    "evening": "Relaxed",
}


def duration_to_minutes(duration: str) -> float:
    match = ISO_8601_DURATION_PATTERN.match(duration)
    if not match:
        return 0.0

    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)
    total_seconds = (hours * 3600) + (minutes * 60) + seconds
    return total_seconds / 60


def merge_history_with_enrichment(
    history: list[dict[str, Any]], enriched_lookup: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    enriched_history: list[dict[str, Any]] = []

    for entry in history:
        video_id = str(entry["videoId"])
        enrichment = enriched_lookup.get(video_id, {})
        enriched_history.append(
            {
                "videoId": video_id,
                "title": str(enrichment.get("title") or entry["title"]),
                "artist": str(enrichment.get("artist") or "Unknown artist"),
                "thumbnail": enrichment.get("thumbnail"),
                "duration": str(enrichment.get("duration") or "PT0S"),
                "tags": list(enrichment.get("tags") or []),
                "playCount": int(entry["playCount"]),
                "timestamps": list(entry.get("timestamps") or []),
            }
        )

    enriched_history.sort(
        key=lambda item: (-item["playCount"], item["artist"].lower(), item["title"].lower())
    )
    return enriched_history


def classify_genre(tags: list[str], artist: str) -> str:
    normalized_tags = [tag.lower() for tag in tags]
    for genre, keywords in GENRE_KEYWORDS.items():
        if any(keyword in tag for tag in normalized_tags for keyword in keywords):
            return genre

    normalized_artist = artist.lower()
    for genre, artists in ARTIST_HEURISTICS.items():
        if any(candidate in normalized_artist for candidate in artists):
            return genre

    return "Other"


def build_genre_breakdown(enriched_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    genre_totals: dict[str, int] = {genre: 0 for genre in [*GENRE_KEYWORDS.keys(), "Other"]}

    for entry in enriched_history:
        genre = classify_genre(list(entry.get("tags") or []), str(entry.get("artist") or ""))
        genre_totals[genre] = genre_totals.get(genre, 0) + int(entry["playCount"])

    total_plays = sum(genre_totals.values())
    breakdown = [
        {
            "genre": genre,
            "count": count,
            "percentage": round((count / total_plays) * 100, 2) if total_plays else 0.0,
        }
        for genre, count in genre_totals.items()
        if count > 0
    ]
    breakdown.sort(key=lambda item: (-item["count"], item["genre"]))
    return breakdown


def classify_mood_from_hour(hour: int) -> str:
    if 0 <= hour <= 5:
        return MOOD_LABELS["late_night"]
    if 6 <= hour <= 10:
        return MOOD_LABELS["morning"]
    if 11 <= hour <= 16:
        return MOOD_LABELS["afternoon"]
    return MOOD_LABELS["evening"]


def parse_timestamp_hour(timestamp: str) -> int | None:
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone().hour if parsed.tzinfo is not None else parsed.hour


def build_mood_timeline(enriched_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    mood_totals = {label: 0 for label in MOOD_LABELS.values()}

    for entry in enriched_history:
        for timestamp in entry.get("timestamps", []):
            hour = parse_timestamp_hour(str(timestamp))
            if hour is None:
                continue
            mood = classify_mood_from_hour(hour)
            mood_totals[mood] += 1

    timeline = [
        {"mood": mood, "playCount": play_count}
        for mood, play_count in mood_totals.items()
        if play_count > 0
    ]
    timeline.sort(key=lambda item: (-item["playCount"], item["mood"]))
    return timeline


def build_stats_payload(enriched_history: list[dict[str, Any]]) -> dict[str, Any]:
    artist_totals: dict[str, int] = {}
    total_listening_minutes = 0.0

    for entry in enriched_history:
        artist = str(entry["artist"])
        play_count = int(entry["playCount"])
        artist_totals[artist] = artist_totals.get(artist, 0) + play_count
        total_listening_minutes += duration_to_minutes(str(entry["duration"])) * play_count

    top_artists = [
        {"artist": artist, "playCount": play_count}
        for artist, play_count in sorted(
            artist_totals.items(), key=lambda item: (-item[1], item[0].lower())
        )[:10]
    ]

    return {
        "topSongs": enriched_history[:10],
        "topArtists": top_artists,
        "totalListeningMinutes": round(total_listening_minutes, 2),
        "rawEnrichedHistory": enriched_history,
    }


def build_dashboard_payload(
    enriched_history: list[dict[str, Any]],
    *,
    source: str,
    username: str | None = None,
    top_artists_override: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    stats_payload = build_stats_payload(enriched_history)
    if top_artists_override is not None:
        stats_payload["topArtists"] = top_artists_override[:10]

    return {
        "source": source,
        "username": username,
        "stats": stats_payload,
        "genreBreakdown": build_genre_breakdown(enriched_history),
        "moodTimeline": build_mood_timeline(enriched_history),
    }
