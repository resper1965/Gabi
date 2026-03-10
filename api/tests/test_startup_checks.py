"""
Tests for Gabi Hub — Startup Checks (TD-6)
"""

import pytest
from unittest.mock import patch
from app.core.startup_checks import check_dependencies


class TestCheckDependencies:
    """Test startup dependency validation."""

    @patch("app.core.startup_checks.importlib.import_module")
    def test_all_available(self, mock_import):
        """No missing deps → returns empty list."""
        mock_import.return_value = True
        missing = check_dependencies()
        assert missing == []

    @patch("app.core.startup_checks.importlib.import_module")
    def test_missing_dep_logged(self, mock_import):
        """Missing dep → returned in list."""
        def side_effect(name):
            if name == "pymupdf":
                raise ImportError("not found")
            return True
        mock_import.side_effect = side_effect

        missing = check_dependencies(fail_hard=False)
        assert "pymupdf" in missing

    @patch("app.core.startup_checks.importlib.import_module")
    def test_fail_hard_raises(self, mock_import):
        """fail_hard=True → raises ImportError."""
        mock_import.side_effect = ImportError("not found")
        with pytest.raises(ImportError):
            check_dependencies(fail_hard=True)
