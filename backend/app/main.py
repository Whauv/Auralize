from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests

from app.lastfm_api import build_lastfm_dashboard
from app.parser import parse_watch_history
from app.stats import (
    build_dashboard_payload,
    build_genre_breakdown,
    build_mood_timeline,
    build_stats_payload,
    merge_history_with_enrichment,
)
from app.youtube_profile import fetch_youtube_music_profile
from app.youtube_api import enrich_with_youtube_api

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Auralize API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LastFmRequest(BaseModel):
    username: str


class YouTubeProfileRequest(BaseModel):
    url: str


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


async def parse_upload_file(file: UploadFile) -> list[dict[str, Any]]:
    if file.content_type not in {"application/json", "text/json", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Please upload a JSON file.")

    try:
        raw_content = await file.read()
        payload = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not valid JSON.") from exc

    if not isinstance(payload, list):
        raise HTTPException(
            status_code=400,
            detail="Expected watch-history.json to contain a JSON array of history entries.",
        )

    return parse_watch_history(payload)


@app.post("/api/upload")
async def upload_watch_history(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    return await parse_upload_file(file)


def load_enriched_history(parsed_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    video_ids = [str(entry["videoId"]) for entry in parsed_history]

    try:
        enriched_lookup = enrich_with_youtube_api(video_ids)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        response = exc.response
        detail = "YouTube API request failed."
        if response is not None:
            detail = f"YouTube API request failed with status {response.status_code}."
        raise HTTPException(status_code=502, detail=detail) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Could not reach the YouTube Data API.") from exc

    return merge_history_with_enrichment(parsed_history, enriched_lookup)


@app.post("/api/stats")
async def get_watch_history_stats(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_stats_payload(enriched_history)


@app.post("/api/lastfm")
async def get_lastfm_dashboard(payload: LastFmRequest) -> dict[str, Any]:
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Please provide a Last.fm username.")

    try:
        lastfm_dashboard = build_lastfm_dashboard(username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        response = exc.response
        detail = "Last.fm API request failed."
        if response is not None:
            detail = f"Last.fm API request failed with status {response.status_code}."
        raise HTTPException(status_code=502, detail=detail) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Could not reach the Last.fm API.") from exc

    return build_dashboard_payload(
        lastfm_dashboard["rawEnrichedHistory"],
        source="lastfm",
        username=lastfm_dashboard["username"],
        top_artists_override=lastfm_dashboard["topArtistsOverride"],
    )


@app.post("/api/youtube-profile")
async def get_youtube_profile_dashboard(payload: YouTubeProfileRequest) -> dict[str, Any]:
    profile_url = payload.url.strip()
    if not profile_url:
        raise HTTPException(status_code=400, detail="Please provide a YouTube Music profile link.")

    try:
        profile = fetch_youtube_music_profile(profile_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        response = exc.response
        detail = "YouTube Music profile request failed."
        if response is not None:
            detail = f"YouTube Music profile request failed with status {response.status_code}."
        raise HTTPException(status_code=502, detail=detail) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Could not reach YouTube Music.") from exc

    payload = build_dashboard_payload(
        [],
        source="youtube-profile",
        username=str(profile["handle"]),
        top_artists_override=[
            {
                "artist": str(profile["name"]),
                "playCount": 0,
            }
        ],
    )
    payload["profileSummary"] = profile
    return payload


@app.post("/api/genre-breakdown")
async def get_genre_breakdown(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    parsed_history = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_genre_breakdown(enriched_history)


@app.post("/api/mood-timeline")
async def get_mood_timeline(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    parsed_history = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_mood_timeline(enriched_history)
