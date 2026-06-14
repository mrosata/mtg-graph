"""Back-compat entry point. The implementation now lives in the mtga_export package."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mtga_export.cli import run  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(run(Path(__file__).resolve().parent))
