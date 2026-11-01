"""Pytest wrapper running Node.js tests for client-side ICS generator and router helpers.

Gracefully skips if Node.js is not installed on the system to ensure CI stability.
"""

import shutil
import subprocess
from pathlib import Path

import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
NODE_ICS_SCRIPT = BASE_DIR / "tests" / "js" / "test_ics_router.mjs"
NODE_SEAL_SCRIPT = BASE_DIR / "tests" / "js" / "test_seal.mjs"


def test_node_ics_and_router_suite():
    """Execute Node.js test suite for ICS RFC 5545 compliance and pure router hash parsing."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js runtime not installed on host; skipping client-side JS unit tests.")

    assert NODE_ICS_SCRIPT.exists(), f"Node test file missing: {NODE_ICS_SCRIPT}"

    result = subprocess.run(
        [node_bin, str(NODE_ICS_SCRIPT)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, (
        f"Node.js tests failed with exit code {result.returncode}.\n"
        f"STDOUT:\n{result.stdout}\n"
        f"STDERR:\n{result.stderr}"
    )
    assert "All Node.js ICS & Router helper tests passed successfully!" in result.stdout


def test_node_seal_suite():
    """Execute Node.js test suite for geometric Kolam seal path generator."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js runtime not installed on host; skipping client-side JS unit tests.")

    assert NODE_SEAL_SCRIPT.exists(), f"Node test file missing: {NODE_SEAL_SCRIPT}"

    result = subprocess.run(
        [node_bin, str(NODE_SEAL_SCRIPT)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, (
        f"Node.js tests failed with exit code {result.returncode}.\n"
        f"STDOUT:\n{result.stdout}\n"
        f"STDERR:\n{result.stderr}"
    )
    assert "All Kolam Seal Node.js tests passed successfully!" in result.stdout
