from __future__ import annotations

import threading
import time
import uuid
from typing import Any, Literal

from app.services.analysis import (
    build_dashboard_payload,
    build_takeout_analysis_response,
    load_payload_from_bytes,
    parse_apple_music_upload_content,
    parse_unified_payload_with_enrichment,
    parse_upload_payload,
)
from fastapi import HTTPException

AnalysisJobSource = Literal["takeout", "unified-takeout", "apple-music"]
JOB_RETENTION_SECONDS = 60 * 60
MAX_STORED_JOBS = 500


class AnalysisJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def start(self, source: AnalysisJobSource, raw_content: bytes, content_type: str | None) -> str:
        job_id = uuid.uuid4().hex
        with self._lock:
            self._prune_locked()
            self._jobs[job_id] = {
                "id": job_id,
                "source": source,
                "status": "queued",
                "progress": 0,
                "message": "Queued analysis.",
                "result": None,
                "error": None,
                "createdAt": time.time(),
                "updatedAt": time.time(),
            }

        thread = threading.Thread(
            target=self._run_job,
            args=(job_id, source, raw_content, content_type),
            daemon=True,
        )
        thread.start()
        return job_id

    def get(self, job_id: str) -> dict[str, Any]:
        with self._lock:
            self._prune_locked()
            job = self._jobs.get(job_id)
            if job is None:
                raise HTTPException(status_code=404, detail="Analysis job not found.")
            return dict(job)

    def _set(self, job_id: str, **updates: Any) -> None:
        with self._lock:
            self._prune_locked()
            job = self._jobs.get(job_id)
            if job is None:
                return
            job.update(updates)
            job["updatedAt"] = time.time()

    def _prune_locked(self) -> None:
        now = time.time()
        expired_job_ids = [
            job_id
            for job_id, job in self._jobs.items()
            if str(job.get("status")) in {"complete", "failed"}
            and (now - float(job.get("updatedAt") or now)) > JOB_RETENTION_SECONDS
        ]
        for job_id in expired_job_ids:
            self._jobs.pop(job_id, None)

        if len(self._jobs) <= MAX_STORED_JOBS:
            return

        overflow = len(self._jobs) - MAX_STORED_JOBS
        by_age = sorted(self._jobs.items(), key=lambda item: float(item[1].get("updatedAt") or 0))
        for job_id, _job in by_age[:overflow]:
            self._jobs.pop(job_id, None)

    def _run_job(
        self,
        job_id: str,
        source: AnalysisJobSource,
        raw_content: bytes,
        content_type: str | None,
    ) -> None:
        try:
            self._set(job_id, status="running", progress=12, message="Reading source file.")
            if source == "apple-music":
                self._run_apple_music_job(job_id, raw_content, content_type)
                return

            payload, content_hash = load_payload_from_bytes(raw_content, content_type)
            self._set(job_id, progress=38, message="Parsing listening history.")

            if source == "unified-takeout":
                parsed_history, quality, enriched_history, _content_hash = (
                    parse_unified_payload_with_enrichment(payload, content_hash)
                )
                self._set(job_id, progress=78, message="Filtering non-music YouTube activity.")
                result = {
                    "entries": parsed_history,
                    "quality": quality,
                    "dashboard": build_dashboard_payload(
                        enriched_history,
                        source="unified-takeout",
                    ),
                }
            else:
                parsed_history, quality, _content_hash = parse_upload_payload(payload, content_hash)
                self._set(job_id, progress=78, message="Enriching YouTube Music tracks.")
                result = build_takeout_analysis_response(parsed_history, quality, source="takeout")

            self._set(
                job_id,
                status="complete",
                progress=100,
                message="Analysis complete.",
                result=result,
            )
        except Exception as exc:  # noqa: BLE001 - jobs must surface failures as status payloads.
            self._set(
                job_id,
                status="failed",
                progress=100,
                message="Analysis failed.",
                error=self._safe_error_message(exc),
            )

    def _run_apple_music_job(
        self,
        job_id: str,
        raw_content: bytes,
        content_type: str | None,
    ) -> None:
        self._set(job_id, progress=38, message="Parsing Apple Music play activity.")
        enriched_history, quality, _content_hash = parse_apple_music_upload_content(
            raw_content,
            content_type,
        )
        self._set(job_id, progress=78, message="Building Apple Music dashboard.")
        result = {
            "entries": [
                {
                    "videoId": str(entry["videoId"]),
                    "title": str(entry["title"]),
                    "playCount": int(entry["playCount"]),
                    "timestamps": list(entry.get("timestamps") or []),
                    "source": "Apple Music",
                }
                for entry in enriched_history
            ],
            "quality": quality,
            "dashboard": build_dashboard_payload(enriched_history, source="apple-music"),
        }
        self._set(
            job_id,
            status="complete",
            progress=100,
            message="Analysis complete.",
            result=result,
        )

    @staticmethod
    def _safe_error_message(exc: Exception) -> str:
        if isinstance(exc, HTTPException):
            detail = exc.detail
            if isinstance(detail, str):
                return detail
            return "Request validation failed."
        return "Analysis failed unexpectedly. Please retry."


analysis_jobs = AnalysisJobStore()
