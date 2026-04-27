from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional at runtime
    def load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
        return False

from app.services.analysis import (
    ANALYSIS_CACHE_TTL,
    MAX_DECOMPRESSED_UPLOAD_BYTES,
    MAX_UPLOAD_BYTES,
    build_takeout_analysis_response,
    load_enriched_history,
    parse_apple_music_upload_file,
    parse_unified_upload_file,
    parse_unified_upload_with_enrichment,
    parse_upload_file,
)
from app.services.jobs import analysis_jobs
from app.services.lastfm_api import build_lastfm_dashboard
from app.services.response_cache import response_cache
from app.services.stats import (
    build_dashboard_payload,
    build_genre_breakdown,
    build_mood_timeline,
    build_stats_payload,
)
from app.services.youtube_profile import fetch_youtube_music_profile

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

UPLOAD_FILE = File(...)
REQUEST_CACHE_TTL = 60 * 30
LOGGER = logging.getLogger("auralize.api")


def build_allowed_origins() -> list[str]:
    configured = os.getenv("AURALIZE_CORS_ORIGINS", "").strip()
    if not configured:
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
        ]
    return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]


def _parse_positive_int(value: str | None) -> int | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    try:
        parsed = int(normalized)
    except ValueError:
        return None
    if parsed <= 0:
        return None
    return parsed


def build_runtime_config_report() -> dict[str, Any]:
    allowed_origins = build_allowed_origins()
    origin_regex = os.getenv("AURALIZE_CORS_ORIGIN_REGEX") or None
    youtube_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    lastfm_key = os.getenv("LASTFM_API_KEY", "").strip()
    configured_upload_limit = _parse_positive_int(os.getenv("AURALIZE_MAX_UPLOAD_BYTES"))
    configured_decompressed_limit = _parse_positive_int(
        os.getenv("AURALIZE_MAX_DECOMPRESSED_UPLOAD_BYTES")
    )
    env_issues: list[str] = []

    if not allowed_origins and not origin_regex:
        env_issues.append("CORS is not configured.")
    if not youtube_key:
        env_issues.append("YOUTUBE_API_KEY is missing.")
    if not lastfm_key:
        env_issues.append("LASTFM_API_KEY is missing.")
    if os.getenv("AURALIZE_MAX_UPLOAD_BYTES") is not None and configured_upload_limit is None:
        env_issues.append("AURALIZE_MAX_UPLOAD_BYTES is invalid.")
    if (
        os.getenv("AURALIZE_MAX_DECOMPRESSED_UPLOAD_BYTES") is not None
        and configured_decompressed_limit is None
    ):
        env_issues.append("AURALIZE_MAX_DECOMPRESSED_UPLOAD_BYTES is invalid.")

    return {
        "cors": {
            "allowedOrigins": allowed_origins,
            "originRegex": origin_regex,
        },
        "upload": {
            "maxUploadBytes": MAX_UPLOAD_BYTES,
            "maxDecompressedUploadBytes": MAX_DECOMPRESSED_UPLOAD_BYTES,
        },
        "integrations": {
            "youtubeApiConfigured": bool(youtube_key),
            "lastfmApiConfigured": bool(lastfm_key),
        },
        "envIssues": env_issues,
    }

app = FastAPI(title="Auralize API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=build_allowed_origins(),
    allow_origin_regex=os.getenv("AURALIZE_CORS_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def set_security_headers(request: Any, call_next: Any) -> Any:
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


class LastFmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Please provide a Last.fm username.")
        return normalized


class YouTubeProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str = Field(min_length=1, max_length=300)

    @field_validator("url")
    @classmethod
    def normalize_url(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Please provide a YouTube Music profile link.")
        if not normalized.startswith(
            ("https://music.youtube.com/", "http://music.youtube.com/")
        ):
            raise ValueError("Please provide a valid YouTube Music profile link.")
        return normalized


class AnalysisJobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: Literal["takeout", "unified-takeout", "apple-music"] = "takeout"


@app.on_event("startup")
def log_runtime_config() -> None:
    report = build_runtime_config_report()
    if report["envIssues"]:
        LOGGER.warning("Runtime config issues: %s", ", ".join(report["envIssues"]))
    else:
        LOGGER.info("Runtime config looks healthy.")


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config-check")
def config_check() -> dict[str, Any]:
    return build_runtime_config_report()


@app.post("/api/upload")
async def upload_watch_history(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, quality, _content_hash = await parse_upload_file(file)
    return {"entries": parsed_history, "quality": quality}


@app.post("/api/upload-unified")
async def upload_unified_watch_history(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, quality, _content_hash = await parse_unified_upload_file(file)
    return {"entries": parsed_history, "quality": quality}


@app.post("/api/analyze")
async def analyze_watch_history(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, quality, content_hash = await parse_upload_file(file)
    cache_key = f"response:analyze:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    response = build_takeout_analysis_response(parsed_history, quality, source="takeout")
    return response_cache.set(cache_key, response, ANALYSIS_CACHE_TTL)


@app.post("/api/jobs/analyze")
async def start_analysis_job(
    source: Literal["takeout", "unified-takeout", "apple-music"] = "takeout",
    file: UploadFile = UPLOAD_FILE,
) -> dict[str, str]:
    raw_content = await file.read()
    job_id = analysis_jobs.start(source, raw_content, file.content_type)
    return {"jobId": job_id}


@app.get("/api/jobs/{job_id}")
def get_analysis_job(job_id: str) -> dict[str, Any]:
    return analysis_jobs.get(job_id)


@app.post("/api/analyze-unified")
async def analyze_unified_watch_history(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, quality, enriched_history, content_hash = (
        await parse_unified_upload_with_enrichment(file)
    )
    cache_key = f"response:analyze-unified:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    response = {
        "entries": parsed_history,
        "quality": quality,
        "dashboard": build_dashboard_payload(enriched_history, source="unified-takeout"),
    }
    return response_cache.set(cache_key, response, ANALYSIS_CACHE_TTL)


@app.post("/api/apple-music/analyze")
async def analyze_apple_music_history(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    enriched_history, quality, content_hash = await parse_apple_music_upload_file(file)
    cache_key = f"response:apple-music-analyze:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    response = {
        "entries": [
            {
                "videoId": str(entry["videoId"]),
                "title": str(entry["title"]),
                "playCount": int(entry["playCount"]),
                "timestamps": list(entry.get("timestamps") or []),
            }
            for entry in enriched_history
        ],
        "quality": quality,
        "dashboard": build_dashboard_payload(enriched_history, source="apple-music"),
    }
    return response_cache.set(cache_key, response, ANALYSIS_CACHE_TTL)


@app.post("/api/stats")
async def get_watch_history_stats(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, _quality, content_hash = await parse_upload_file(file)
    cache_key = f"response:stats:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    return response_cache.set(cache_key, build_stats_payload(enriched_history), ANALYSIS_CACHE_TTL)


@app.post("/api/stats-unified")
async def get_unified_watch_history_stats(file: UploadFile = UPLOAD_FILE) -> dict[str, Any]:
    parsed_history, _quality, content_hash = await parse_unified_upload_file(file)
    cache_key = f"response:stats-unified:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    return response_cache.set(cache_key, build_stats_payload(enriched_history), ANALYSIS_CACHE_TTL)


@app.post("/api/genre-breakdown")
async def get_genre_breakdown(file: UploadFile = UPLOAD_FILE) -> list[dict[str, Any]]:
    parsed_history, _quality, content_hash = await parse_upload_file(file)
    cache_key = f"response:genre:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    breakdown = build_genre_breakdown(enriched_history)
    return response_cache.set(cache_key, breakdown, ANALYSIS_CACHE_TTL)


@app.post("/api/genre-breakdown-unified")
async def get_unified_genre_breakdown(file: UploadFile = UPLOAD_FILE) -> list[dict[str, Any]]:
    parsed_history, _quality, content_hash = await parse_unified_upload_file(file)
    cache_key = f"response:genre-unified:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    breakdown = build_genre_breakdown(enriched_history)
    return response_cache.set(cache_key, breakdown, ANALYSIS_CACHE_TTL)


@app.post("/api/mood-timeline")
async def get_mood_timeline(file: UploadFile = UPLOAD_FILE) -> list[dict[str, Any]]:
    parsed_history, _quality, content_hash = await parse_upload_file(file)
    cache_key = f"response:mood:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    return response_cache.set(cache_key, build_mood_timeline(enriched_history), ANALYSIS_CACHE_TTL)


@app.post("/api/mood-timeline-unified")
async def get_unified_mood_timeline(file: UploadFile = UPLOAD_FILE) -> list[dict[str, Any]]:
    parsed_history, _quality, content_hash = await parse_unified_upload_file(file)
    cache_key = f"response:mood-unified:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    enriched_history = load_enriched_history(parsed_history)
    return response_cache.set(cache_key, build_mood_timeline(enriched_history), ANALYSIS_CACHE_TTL)


@app.post("/api/lastfm")
async def get_lastfm_dashboard(payload: LastFmRequest) -> dict[str, Any]:
    import requests

    username = payload.username

    cache_key = f"response:lastfm:{username.lower()}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

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

    response = build_dashboard_payload(
        lastfm_dashboard["rawEnrichedHistory"],
        source="lastfm",
        username=lastfm_dashboard["username"],
        top_artists_override=lastfm_dashboard["topArtistsOverride"],
    )
    return response_cache.set(cache_key, response, REQUEST_CACHE_TTL)


@app.post("/api/youtube-profile")
async def get_youtube_profile_dashboard(payload: YouTubeProfileRequest) -> dict[str, Any]:
    import requests

    profile_url = payload.url

    cache_key = f"response:youtube-profile:{profile_url.lower()}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

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

    response = build_dashboard_payload(
        [],
        source="youtube-profile",
        username=str(profile["handle"]),
        top_artists_override=[{"artist": str(profile["name"]), "playCount": 0}],
    )
    response["profileSummary"] = profile
    return response_cache.set(cache_key, response, REQUEST_CACHE_TTL)
