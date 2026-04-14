from __future__ import annotations

import os
from typing import Any

import requests

SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token"
SPOTIFY_TRACKS_ENDPOINT = "https://api.spotify.com/v1/tracks"
SPOTIFY_ARTISTS_ENDPOINT = "https://api.spotify.com/v1/artists"
BATCH_SIZE = 50


def _chunked(items: list[str], size: int) -> list[list[str]]:
    if size <= 0:
        raise ValueError("Chunk size must be positive.")
    return [items[index : index + size] for index in range(0, len(items), size)]


def _ms_to_iso8601(duration_ms: int) -> str:
    total_seconds = max(0, int(round(duration_ms / 1000)))
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


def _get_spotify_access_token() -> str:
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError(
            "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in backend/.env."
        )

    response = requests.post(
        SPOTIFY_TOKEN_ENDPOINT,
        data={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()

    token = str(payload.get("access_token") or "")
    if not token:
        raise ValueError("Spotify token response did not include access_token.")
    return token


def enrich_with_spotify_api(track_ids: list[str]) -> dict[str, dict[str, Any]]:
    filtered_ids = [
        track_id
        for track_id in track_ids
        if track_id and not track_id.startswith("spotify-local:")
    ]
    unique_track_ids = list(dict.fromkeys(filtered_ids))
    if not unique_track_ids:
        return {}

    access_token = _get_spotify_access_token()
    headers = {"Authorization": f"Bearer {access_token}"}

    track_lookup: dict[str, dict[str, Any]] = {}
    track_artist_ids: dict[str, list[str]] = {}
    artist_ids: list[str] = []

    for batch in _chunked(unique_track_ids, BATCH_SIZE):
        response = requests.get(
            SPOTIFY_TRACKS_ENDPOINT,
            params={"ids": ",".join(batch)},
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()

        for track in response.json().get("tracks", []):
            if not isinstance(track, dict):
                continue

            track_id = str(track.get("id") or "")
            if not track_id:
                continue

            artists = [
                str(artist.get("name") or "")
                for artist in track.get("artists", [])
                if isinstance(artist, dict)
            ]
            artist = ", ".join([name for name in artists if name]) or "Unknown artist"
            current_track_artist_ids = [
                str(artist_obj.get("id") or "")
                for artist_obj in track.get("artists", [])
                if isinstance(artist_obj, dict) and artist_obj.get("id")
            ]
            artist_ids.extend(current_track_artist_ids)
            track_artist_ids[track_id] = current_track_artist_ids

            album = (
                track.get("album", {})
                if isinstance(track.get("album", {}), dict)
                else {}
            )
            images = (
                album.get("images", [])
                if isinstance(album.get("images", []), list)
                else []
            )
            thumbnail = None
            if images and isinstance(images[0], dict):
                thumbnail = images[0].get("url")

            track_lookup[track_id] = {
                "videoId": track_id,
                "title": str(track.get("name") or "Unknown title"),
                "artist": artist,
                "thumbnail": str(thumbnail) if thumbnail else None,
                "duration": _ms_to_iso8601(int(track.get("duration_ms") or 0)),
                "tags": [],
            }

    unique_artist_ids = list(
        dict.fromkeys([artist_id for artist_id in artist_ids if artist_id])
    )
    artist_genres: dict[str, list[str]] = {}

    for batch in _chunked(unique_artist_ids, BATCH_SIZE):
        response = requests.get(
            SPOTIFY_ARTISTS_ENDPOINT,
            params={"ids": ",".join(batch)},
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()

        for artist in response.json().get("artists", []):
            if not isinstance(artist, dict):
                continue
            artist_id = str(artist.get("id") or "")
            if not artist_id:
                continue
            artist_genres[artist_id] = [
                str(genre)
                for genre in artist.get("genres", [])
                if isinstance(genre, str)
            ]

    for track_id in track_lookup:
        tags: set[str] = set()
        for artist_id in track_artist_ids.get(track_id, []):
            for genre in artist_genres.get(artist_id, []):
                tags.add(genre)
        track_lookup[track_id]["tags"] = sorted(tags)

    return track_lookup
