from __future__ import annotations
import sys
from pathlib import Path

def _out_dir() -> Path:
    # PyInstaller-frozen binary: cache lives next to the executable so the
    # Scryfall card-db fetch is paid only on first launch.
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent  # scripts/ in dev checkout

def main() -> int:
    out_dir = _out_dir()
    if "--serve" in sys.argv:
        from .server import serve
        return serve(out_dir)
    from .cli import run
    return run(out_dir)

if __name__ == "__main__":
    raise SystemExit(main())
