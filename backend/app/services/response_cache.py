from __future__ import annotations

import hashlib
import threading
import time
from typing import Any


class ResponseCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        now = time.time()
        with self._lock:
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
            self._store[key] = (expires_at, value)
        return value


response_cache = ResponseCache()


def sha256_digest(value: bytes | str) -> str:
    raw_value = value.encode("utf-8") if isinstance(value, str) else value
    return hashlib.sha256(raw_value).hexdigest()
