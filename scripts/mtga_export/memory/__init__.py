from __future__ import annotations

import sys


def get_memory():
    """Return the platform ProcessMemory implementation."""
    if sys.platform == "darwin":
        from .macos import MacMemory
        return MacMemory()
    if sys.platform.startswith("win"):
        from .windows import WindowsMemory
        return WindowsMemory()
    raise RuntimeError(f"Unsupported platform: {sys.platform}")
