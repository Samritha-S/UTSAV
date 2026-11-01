"""Pytest wrapper for ranges.js Node.js test suite."""

import shutil
import subprocess
from pathlib import Path

import pytest

NODE_TEST_PATH = Path(__file__).parent / "js" / "test_ranges.mjs"


def test_ranges_js_suite():
    """Verify ranges.js test suite passes using Node.js."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js binary not available in environment.")

    res = subprocess.run(
        [node_bin, str(NODE_TEST_PATH)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"ranges.js tests failed:\n{res.stdout}\n{res.stderr}"
