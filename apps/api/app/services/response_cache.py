from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import threading
import time
from typing import Any

DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "response_cache.json"
DISK_CACHE_PATH = Path(os.getenv("AURALIZE_RESPONSE_CACHE_PATH", DEFAULT_CACHE_PATH))


class ResponseCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._loaded_disk_cache = False

    def get(self, key: str) -> Any | None:
        now = time.time()
        with self._lock:
            self._load_disk_cache_locked(now)
            cached = self._store.get(key)
            if cached is None:
                return None

            expires_at, value = cached
            if expires_at < now:
                self._store.pop(key, None)
                return None

            return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> Any:
        expires_at = time.time() + ttl_seconds
        with self._lock:
            self._load_disk_cache_locked(time.time())
            self._store[key] = (expires_at, value)
            self._save_disk_cache_locked()
        return value

    def _load_disk_cache_locked(self, now: float) -> None:
        if self._loaded_disk_cache:
            return

        self._loaded_disk_cache = True
        if not DISK_CACHE_PATH.exists():
            return

        try:
            payload = json.loads(DISK_CACHE_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return

        if not isinstance(payload, dict):
            return

        for key, item in payload.items():
            if not isinstance(item, dict):
                continue
            expires_at = item.get("expiresAt")
            if not isinstance(expires_at, (float, int)) or expires_at < now:
                continue
            self._store[str(key)] = (float(expires_at), item.get("value"))

    def _save_disk_cache_locked(self) -> None:
        try:
            DISK_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                key: {"expiresAt": expires_at, "value": value}
                for key, (expires_at, value) in self._store.items()
                if expires_at >= time.time()
            }
            DISK_CACHE_PATH.write_text(json.dumps(payload), encoding="utf-8")
        except (OSError, TypeError, ValueError):
            return


response_cache = ResponseCache()


def sha256_digest(value: bytes | str) -> str:
    raw_value = value.encode("utf-8") if isinstance(value, str) else value
    return hashlib.sha256(raw_value).hexdigest()
