from __future__ import annotations

import csv
import json
from typing import Any

import requests
from app.services.apple_music import parse_apple_music_export
from app.services.parser import parse_unified_watch_history, parse_watch_history
from app.services.response_cache import response_cache, sha256_digest
from app.services.stats import build_dashboard_payload, merge_history_with_enrichment
from app.services.youtube_api import enrich_with_youtube_api, is_music_video
from fastapi import HTTPException, UploadFile

ANALYSIS_CACHE_TTL = 60 * 60 * 12
ENRICHED_HISTORY_CACHE_TTL = 60 * 60 * 6
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


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
    payload: list[dict[str, Any]],
    parsed_history: list[dict[str, Any]],
) -> dict[str, Any]:
    total_entries = len(payload)
    usable_entries = len(parsed_history)
    search_entries = sum(
        1
        for entry in payload
        if isinstance(entry, dict) and str(entry.get("title") or "").startswith("Searched for ")
    )
    youtube_music_entries = sum(
        1
        for entry in payload
        if isinstance(entry, dict)
        and str(entry.get("header") or "").strip().lower() == "youtube music"
    )
    warnings: list[str] = []

    if total_entries == 0:
        warnings.append("This file is empty, so there is no listening data to analyze.")
    if usable_entries == 0:
        warnings.append(
            "No playable YouTube Music watch entries were found. "
            "This export may mostly contain searches or standard YouTube activity."
        )
    elif usable_entries < 10:
        warnings.append(
            "Only a small number of playable music entries were found, "
            "so the dashboard may feel sparse."
        )

    if total_entries and search_entries / total_entries >= 0.35:
        warnings.append(
            "A large share of this export looks like search history, "
            "which can limit the quality of the music analysis."
        )

    if total_entries and usable_entries / total_entries < 0.15:
        warnings.append(
            "Only a small portion of the export could be used as playable YouTube Music history."
        )

    return {
        "totalEntries": total_entries,
        "usableEntries": usable_entries,
        "searchEntries": search_entries,
        "youtubeMusicEntries": youtube_music_entries,
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
            "Regular YouTube watches were checked for music signals, "
            "and non-music videos were excluded from this unified view."
        )

    if not filtered_history:
        summary["warnings"].append(
            "No music plays were detected across YouTube Music and standard YouTube watch history."
        )

    return summary


async def load_upload_payload(file: UploadFile) -> tuple[list[dict[str, Any]], str]:
    if file.content_type not in {"application/json", "text/json", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Please upload a JSON file.")

    try:
        raw_content = await file.read()
        if not raw_content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(raw_content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Uploaded file is too large.")
        payload = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not valid JSON.") from exc

    if not isinstance(payload, list):
        raise HTTPException(
            status_code=400,
            detail="Expected watch-history.json to contain a JSON array of history entries.",
        )

    return payload, sha256_digest(raw_content)


def build_takeout_parse_result(
    payload: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    parsed_history = parse_watch_history(payload)
    return parsed_history, build_quality_summary(payload, parsed_history)


def get_cached_takeout_parse(
    payload: list[dict[str, Any]],
    content_hash: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    cache_key = f"parse:takeout:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached
    return response_cache.set(cache_key, build_takeout_parse_result(payload), ANALYSIS_CACHE_TTL)


def build_unified_parse_result(
    payload: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    candidate_history = parse_unified_watch_history(payload)
    if not candidate_history:
        quality = build_unified_quality_summary(payload, candidate_history, [])
        return candidate_history, quality, []

    enriched_history = load_enriched_history(candidate_history)
    music_ids = {str(entry["videoId"]) for entry in enriched_history if is_music_video(entry)}
    filtered_history = [entry for entry in candidate_history if str(entry["videoId"]) in music_ids]
    filtered_enriched_history = [
        entry for entry in enriched_history if str(entry["videoId"]) in music_ids
    ]
    quality = build_unified_quality_summary(payload, candidate_history, filtered_history)
    return filtered_history, quality, filtered_enriched_history


async def parse_upload_file(file: UploadFile) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    payload, content_hash = await load_upload_payload(file)
    parsed_history, quality = get_cached_takeout_parse(payload, content_hash)
    return parsed_history, quality, content_hash


async def parse_unified_upload_with_enrichment(
    file: UploadFile,
) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]], str]:
    payload, content_hash = await load_upload_payload(file)
    cache_key = f"parse:unified:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        parsed_history, quality, enriched_history = cached
        return parsed_history, quality, enriched_history, content_hash

    parsed_history, quality, enriched_history = build_unified_parse_result(payload)
    response_cache.set(cache_key, (parsed_history, quality, enriched_history), ANALYSIS_CACHE_TTL)
    return parsed_history, quality, enriched_history, content_hash


async def parse_unified_upload_file(
    file: UploadFile,
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    parsed_history, quality, _enriched_history, content_hash = (
        await parse_unified_upload_with_enrichment(file)
    )
    return parsed_history, quality, content_hash


async def parse_apple_music_upload_file(
    file: UploadFile,
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    allowed_types = {
        "application/json",
        "text/json",
        "application/octet-stream",
        "text/csv",
        "application/csv",
        "application/vnd.ms-excel",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload an Apple Music CSV or JSON file.",
        )

    raw_content = await file.read()
    if not raw_content:
        raise HTTPException(status_code=400, detail="Uploaded Apple Music file is empty.")
    if len(raw_content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file is too large.")

    content_hash = sha256_digest(raw_content)
    cache_key = f"parse:apple-music:{content_hash}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached[0], cached[1], content_hash

    try:
        enriched_history, quality = parse_apple_music_export(raw_content)
    except (ValueError, json.JSONDecodeError, csv.Error) as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not parse the Apple Music export. "
                "Use Apple Music Play Activity CSV or a compatible JSON export."
            ),
        ) from exc

    response_cache.set(cache_key, (enriched_history, quality), ANALYSIS_CACHE_TTL)
    return enriched_history, quality, content_hash


def load_enriched_history(parsed_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    content_key = sha256_digest(json.dumps(parsed_history, sort_keys=True))
    cache_key = f"enriched-history:{content_key}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

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
        raise HTTPException(
            status_code=502,
            detail="Could not reach the YouTube Data API.",
        ) from exc

    enriched_history = merge_history_with_enrichment(parsed_history, enriched_lookup)
    return response_cache.set(cache_key, enriched_history, ENRICHED_HISTORY_CACHE_TTL)
