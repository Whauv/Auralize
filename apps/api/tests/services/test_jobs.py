from __future__ import annotations

import unittest

from app.services.jobs import AnalysisJobStore
from fastapi import HTTPException


class AnalysisJobStoreTests(unittest.TestCase):
    def test_safe_error_message_for_http_exception_uses_detail(self) -> None:
        error = AnalysisJobStore._safe_error_message(HTTPException(status_code=400, detail="Bad input"))
        self.assertEqual(error, "Bad input")

    def test_safe_error_message_for_unexpected_exception_is_sanitized(self) -> None:
        error = AnalysisJobStore._safe_error_message(RuntimeError("database password exposed"))
        self.assertEqual(error, "Analysis failed unexpectedly. Please retry.")


if __name__ == "__main__":
    unittest.main()
