"""Frozen-binary entry point.

PyInstaller runs the spec's script as ``__main__`` with no package context,
which breaks the relative imports inside ``mtga_export/__main__.py``. This
shim imports the package by name so its internals resolve normally.
"""
from __future__ import annotations

import sys

from mtga_export.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
