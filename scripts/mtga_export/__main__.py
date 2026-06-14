from __future__ import annotations
import sys
from pathlib import Path

def main() -> int:
    out_dir = Path(__file__).resolve().parent.parent  # scripts/
    if "--serve" in sys.argv:
        from .server import serve
        return serve(out_dir)
    from .cli import run
    return run(out_dir)

if __name__ == "__main__":
    raise SystemExit(main())
