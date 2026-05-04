from __future__ import annotations

import shutil
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException

UPLOAD_RETENTION_SECONDS = 60 * 60
MAX_STORED_UPLOADS = 200


@dataclass
class UploadSession:
    id: str
    source: str
    file_name: str
    file_size: int
    total_chunks: int
    content_type: str | None
    created_at: float
    updated_at: float
    received_chunks: set[int]
    directory: Path


class UploadSessionStore:
    def __init__(self, root_dir: Path) -> None:
        self._root_dir = root_dir
        self._sessions: dict[str, UploadSession] = {}
        self._lock = threading.Lock()
        self._root_dir.mkdir(parents=True, exist_ok=True)

    def create(
        self,
        *,
        source: str,
        file_name: str,
        file_size: int,
        total_chunks: int,
        content_type: str | None,
    ) -> str:
        if file_size <= 0:
            raise HTTPException(status_code=400, detail="fileSize must be positive.")
        if total_chunks <= 0:
            raise HTTPException(status_code=400, detail="totalChunks must be positive.")

        upload_id = uuid.uuid4().hex
        now = time.time()
        upload_dir = self._root_dir / upload_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        with self._lock:
            self._prune_locked()
            self._sessions[upload_id] = UploadSession(
                id=upload_id,
                source=source,
                file_name=file_name,
                file_size=file_size,
                total_chunks=total_chunks,
                content_type=content_type,
                created_at=now,
                updated_at=now,
                received_chunks=set(),
                directory=upload_dir,
            )
        return upload_id

    def add_chunk(self, upload_id: str, *, index: int, data: bytes) -> None:
        if index < 0:
            raise HTTPException(status_code=400, detail="Chunk index must be non-negative.")
        if not data:
            raise HTTPException(status_code=400, detail="Chunk payload is empty.")

        with self._lock:
            self._prune_locked()
            session = self._sessions.get(upload_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Upload session not found.")
            if index >= session.total_chunks:
                raise HTTPException(status_code=400, detail="Chunk index is out of range.")

            chunk_path = session.directory / f"{index:08d}.part"
            chunk_path.write_bytes(data)
            session.received_chunks.add(index)
            session.updated_at = time.time()

    def get_status(self, upload_id: str) -> dict[str, Any]:
        with self._lock:
            self._prune_locked()
            session = self._sessions.get(upload_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Upload session not found.")
            return {
                "uploadId": session.id,
                "source": session.source,
                "fileName": session.file_name,
                "fileSize": session.file_size,
                "totalChunks": session.total_chunks,
                "receivedChunks": len(session.received_chunks),
                "complete": len(session.received_chunks) == session.total_chunks,
            }

    def finalize(self, upload_id: str) -> tuple[bytes, str | None]:
        with self._lock:
            self._prune_locked()
            session = self._sessions.get(upload_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Upload session not found.")
            missing = [i for i in range(session.total_chunks) if i not in session.received_chunks]
            if missing:
                raise HTTPException(
                    status_code=409,
                    detail=f"Upload is incomplete. Missing chunks: {len(missing)}.",
                )

            parts: list[bytes] = []
            for index in range(session.total_chunks):
                chunk_path = session.directory / f"{index:08d}.part"
                if not chunk_path.exists():
                    raise HTTPException(status_code=409, detail="Upload is incomplete.")
                parts.append(chunk_path.read_bytes())
            content = b"".join(parts)

            if len(content) != session.file_size:
                raise HTTPException(
                    status_code=409,
                    detail="Assembled upload size does not match the declared file size.",
                )

            content_type = session.content_type
            self._cleanup_session_locked(upload_id)
            return content, content_type

    def _prune_locked(self) -> None:
        now = time.time()
        expired = [
            upload_id
            for upload_id, session in self._sessions.items()
            if now - session.updated_at > UPLOAD_RETENTION_SECONDS
        ]
        for upload_id in expired:
            self._cleanup_session_locked(upload_id)

        if len(self._sessions) <= MAX_STORED_UPLOADS:
            return

        overflow = len(self._sessions) - MAX_STORED_UPLOADS
        sorted_ids = sorted(self._sessions.items(), key=lambda item: item[1].updated_at)
        for upload_id, _session in sorted_ids[:overflow]:
            self._cleanup_session_locked(upload_id)

    def _cleanup_session_locked(self, upload_id: str) -> None:
        session = self._sessions.pop(upload_id, None)
        if not session:
            return
        shutil.rmtree(session.directory, ignore_errors=True)


upload_sessions = UploadSessionStore(
    Path(__file__).resolve().parents[2] / "data" / "upload_sessions"
)
