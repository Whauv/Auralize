from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests

from app.services.lastfm_api import build_lastfm_dashboard
from app.services.parser import parse_unified_watch_history, parse_watch_history
from app.services.stats import (
    build_dashboard_payload,
    build_genre_breakdown,
    build_mood_timeline,
    build_stats_payload,
    merge_history_with_enrichment,
)
from app.services.youtube_profile import fetch_youtube_music_profile
from app.services.youtube_api import enrich_with_youtube_api, is_music_video

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


def build_takeout_analysis_response(
    parsed_history: list[dict[str, Any]],
    quality: dict[str, Any],
    *,
    source: str,
) -> dict[str, Any]:
    enriched_history = load_enriched_history(parsed_history)
    dashboard = build_dashboard_payload(enriched_history, source=source)
    return {
        "entries": parsed_history,
        "quality": quality,
        "dashboard": dashboard,
    }


def build_quality_summary(
    payload: list[dict[str, Any]], parsed_history: list[dict[str, Any]]
) -> dict[str, Any]:
    total_entries = len(payload)
    usable_entries = len(parsed_history)
    search_entries = sum(
        1
        for entry in payload
        if isinstance(entry, dict) and str(entry.get("title") or "").startswith("Searched for ")
    )
    music_headers = sum(
        1
        for entry in payload
        if isinstance(entry, dict) and str(entry.get("header") or "").strip().lower() == "youtube music"
    )
    warnings: list[str] = []

    if total_entries == 0:
        warnings.append("This file is empty, so there is no listening data to analyze.")
    if usable_entries == 0:
        warnings.append(
            "No playable YouTube Music watch entries were found. This export may mostly contain searches or standard YouTube activity."
        )
    elif usable_entries < 10:
        warnings.append(
            "Only a small number of playable music entries were found, so the dashboard may feel sparse."
        )

    if total_entries and search_entries / total_entries >= 0.35:
        warnings.append(
            "A large share of this export looks like search history, which can limit the quality of the music analysis."
        )

    if total_entries and usable_entries / total_entries < 0.15:
        warnings.append(
            "Only a small portion of the export could be used as playable YouTube Music history."
        )

    return {
        "totalEntries": total_entries,
        "usableEntries": usable_entries,
        "searchEntries": search_entries,
        "youtubeMusicEntries": music_headers,
        "warnings": warnings,
    }


def build_unified_quality_summary(
    payload: list[dict[str, Any]],
    candidate_history: list[dict[str, Any]],
    filtered_history: list[dict[str, Any]],
) -> dict[str, Any]:
    summary = build_quality_summary(payload, filtered_history)
    summary["candidateEntries"] = len(candidate_history)
    summary["warnings"] = list(summary["warnings"])

    if candidate_history and len(filtered_history) < len(candidate_history):
        summary["warnings"].append(
            "Regular YouTube watches were checked for music signals, and non-music videos were excluded from this unified view."
        )

    if not filtered_history:
        summary["warnings"].append(
            "No music plays were detected across YouTube Music and standard YouTube watch history."
        )

    return summary


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


async def parse_upload_file(file: UploadFile) -> tuple[list[dict[str, Any]], dict[str, Any]]:
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

    parsed_history = parse_watch_history(payload)
    return parsed_history, build_quality_summary(payload, parsed_history)


async def parse_unified_upload_file(file: UploadFile) -> tuple[list[dict[str, Any]], dict[str, Any]]:
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

    candidate_history = parse_unified_watch_history(payload)
    if not candidate_history:
        return candidate_history, build_unified_quality_summary(payload, candidate_history, [])

    enriched_history = load_enriched_history(candidate_history)
    music_ids = {
        str(entry["videoId"])
        for entry in enriched_history
        if is_music_video(entry)
    }
    filtered_history = [
        entry for entry in candidate_history if str(entry["videoId"]) in music_ids
    ]
    quality = build_unified_quality_summary(payload, candidate_history, filtered_history)
    return filtered_history, quality


async def parse_unified_upload_with_enrichment(
    file: UploadFile,
) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
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

    candidate_history = parse_unified_watch_history(payload)
    if not candidate_history:
        quality = build_unified_quality_summary(payload, candidate_history, [])
        return [], quality, []

    candidate_enriched_history = load_enriched_history(candidate_history)
    filtered_enriched_history = [
        entry for entry in candidate_enriched_history if is_music_video(entry)
    ]
    music_ids = {str(entry["videoId"]) for entry in filtered_enriched_history}
    filtered_history = [
        entry for entry in candidate_history if str(entry["videoId"]) in music_ids
    ]
    quality = build_unified_quality_summary(payload, candidate_history, filtered_history)
    return filtered_history, quality, filtered_enriched_history


@app.post("/api/upload")
async def upload_watch_history(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history, quality = await parse_upload_file(file)
    return {"entries": parsed_history, "quality": quality}


@app.post("/api/upload-unified")
async def upload_unified_watch_history(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history, quality = await parse_unified_upload_file(file)
    return {"entries": parsed_history, "quality": quality}


@app.post("/api/analyze")
async def analyze_watch_history(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history, quality = await parse_upload_file(file)
    return build_takeout_analysis_response(parsed_history, quality, source="takeout")


@app.post("/api/analyze-unified")
async def analyze_unified_watch_history(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history, quality, enriched_history = await parse_unified_upload_with_enrichment(file)
    dashboard = build_dashboard_payload(enriched_history, source="unified-takeout")
    return {
        "entries": parsed_history,
        "quality": quality,
        "dashboard": dashboard,
    }


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
    parsed_history, _quality = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_stats_payload(enriched_history)


@app.post("/api/stats-unified")
async def get_unified_watch_history_stats(file: UploadFile = File(...)) -> dict[str, Any]:
    parsed_history, _quality = await parse_unified_upload_file(file)
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
    parsed_history, _quality = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_genre_breakdown(enriched_history)


@app.post("/api/genre-breakdown-unified")
async def get_unified_genre_breakdown(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    parsed_history, _quality = await parse_unified_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_genre_breakdown(enriched_history)


@app.post("/api/mood-timeline")
async def get_mood_timeline(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    parsed_history, _quality = await parse_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_mood_timeline(enriched_history)


@app.post("/api/mood-timeline-unified")
async def get_unified_mood_timeline(file: UploadFile = File(...)) -> list[dict[str, Any]]:
    parsed_history, _quality = await parse_unified_upload_file(file)
    enriched_history = load_enriched_history(parsed_history)
    return build_mood_timeline(enriched_history)
