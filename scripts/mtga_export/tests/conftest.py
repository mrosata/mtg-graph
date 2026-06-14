import sys
from pathlib import Path

# Make `import mtga_export` work when running pytest from scripts/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
