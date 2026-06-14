# MTGA Native Cross-Platform Exporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MTG Arena collection exporter run natively on macOS (not just Windows) so Mac users can generate the `mtga_collection.json` the app already imports, driven from a new "Live scan" source in `MtgaImportPanel`.

**Architecture:** Refactor `scripts/mtg.py` into a `mtga_export` Python package whose only OS-specific code sits behind a `ProcessMemory` interface (Windows = `pymem`, macOS = `ctypes`/mach). A platform-agnostic `scan.py` does zero-anchor auto-detection of the collection block; a stdlib `http.server` bridge exposes it to the app; the React app adds a `'scan'` source that reuses the existing resolve/summary/confirm machinery.

**Tech Stack:** Python 3.11+ (stdlib `ctypes`, `sqlite3`, `http.server`; `pymem`, `requests`), `pytest` for Python tests. React/Vite/TS + Vitest for the app.

---

## Phase ordering & the spike gate

- **Phase 0 (Task 1)** is a HARD GATE. Do not start Phase 1+ engine/app code until the spike passes on a real Mac. If it fails, STOP and escalate — the fallback is "run inside the Wine bottle," which is a different design.
- **Phases 1–3, 6, 8** are platform-agnostic and fully TDD-able with fakes/mocks; they do **not** require a live Arena process.
- **Phase 4** (real mach reader) consumes the spike's documented outputs (process-name hints, region filter, block thresholds).

File map (all new unless noted):

```
scripts/
  spike_macos_read.py                 Phase 0, throwaway
  mtg.py                              MODIFY → thin shim into mtga_export.cli
  requirements.txt                   MODIFY → add pytest (dev)
  mtga_export/
    __init__.py
    __main__.py                       `python -m mtga_export [--serve]`
    carddb.py                         GrpId→{name,set,cn}: sqlite + scryfall + cache
    scan.py                           autodetect_collection / anchor / find_blocks
    export.py                         json/txt/csv writers
    cli.py                            interactive CLI (cross-platform parity)
    server.py                         localhost bridge
    memory/
      __init__.py                     platform dispatch
      base.py                         ProcessMemory ABC + default pattern_scan
      windows.py                      pymem adapter (ported from mtg.py)
      macos.py                        mach/ctypes adapter (Phase 4)
      fake.py                         in-memory fake for tests
    tests/
      conftest.py
      test_carddb.py
      test_scan.py
      test_export.py
      test_server.py
app/src/lib/
  mtgaScanBridge.ts                   typed fetch wrapper for the bridge
  mtgaScanBridge.test.ts
app/src/components/
  MtgaImportPanel.tsx                 MODIFY → add 'scan' source
  MtgaImportPanel.test.tsx            MODIFY → add scan-source tests
```

---

## Phase 0 — Feasibility spike (HARD GATE)

### Task 1: macOS memory-read spike

**Files:**
- Create: `scripts/spike_macos_read.py`

- [ ] **Step 1: Write the spike**

```python
"""Throwaway feasibility probe — can we read MTG-Arena-under-Wine memory on macOS?

Run on a Mac with Arena open (Collection tab visited) under Wine/CrossOver/Whisky:
    sudo python3 scripts/spike_macos_read.py

It prints candidate processes, attaches to the chosen one via task_for_pid, and
reads 16 bytes from the first readable region. SUCCESS or the failing errno tells
us whether Phase 4 is viable.
"""
import ctypes
import ctypes.util
import os
import subprocess
import sys

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
libsys = ctypes.CDLL(ctypes.util.find_library("System"), use_errno=True)

KERN_SUCCESS = 0

def list_candidate_pids():
    # Wine/CrossOver process names vary; collect anything plausible.
    out = subprocess.run(["ps", "-axo", "pid=,comm="], capture_output=True, text=True).stdout
    cands = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        pid_str, _, comm = line.partition(" ")
        low = comm.lower()
        if any(h in low for h in ("mtga", "wine", "crossover", "whisky")):
            cands.append((int(pid_str), comm.strip()))
    return cands

def task_for_pid(pid):
    task = ctypes.c_uint32(0)
    # mach_task_self() is a fixed special port; expose it via libsys.
    mach_task_self = libsys.mach_task_self
    mach_task_self.restype = ctypes.c_uint32
    kr = libsys.task_for_pid(mach_task_self(), pid, ctypes.byref(task))
    return kr, task.value

def first_region(task):
    # mach_vm_region(task, &address, &size, VM_REGION_BASIC_INFO_64, info, &count, &object_name)
    address = ctypes.c_uint64(1)
    size = ctypes.c_uint64(0)
    VM_REGION_BASIC_INFO_64 = 9
    info = (ctypes.c_int * 16)()
    count = ctypes.c_uint32(16)
    object_name = ctypes.c_uint32(0)
    kr = libsys.mach_vm_region(
        task, ctypes.byref(address), ctypes.byref(size),
        VM_REGION_BASIC_INFO_64, ctypes.byref(info),
        ctypes.byref(count), ctypes.byref(object_name),
    )
    return kr, address.value, size.value

def read_bytes(task, addr, n):
    buf = (ctypes.c_char * n)()
    out = ctypes.c_uint64(0)
    kr = libsys.mach_vm_read_overwrite(
        task, ctypes.c_uint64(addr), ctypes.c_uint64(n),
        ctypes.cast(buf, ctypes.c_void_p), ctypes.byref(out),
    )
    return kr, bytes(buf[: out.value])

def main():
    if os.geteuid() != 0:
        print("Re-run with sudo (task_for_pid needs root).")
        return 2
    cands = list_candidate_pids()
    if not cands:
        print("No Wine/MTGA candidate processes. Is Arena running under Wine?")
        return 1
    print("Candidates:")
    for pid, comm in cands:
        print(f"  {pid}\t{comm}")
    for pid, comm in cands:
        kr, task = task_for_pid(pid)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] task_for_pid FAILED kr={kr}")
            continue
        kr, addr, size = first_region(task)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] mach_vm_region FAILED kr={kr}")
            continue
        kr, data = read_bytes(task, addr, 16)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] read FAILED kr={kr}")
            continue
        print(f"[{pid} {comm}] SUCCESS region=0x{addr:x} size={size} first16={data.hex()}")
        return 0
    print("\nAll candidates failed. Likely hardened-runtime/SIP blocking task_for_pid.")
    return 1

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: USER runs it on their Mac**

With Arena open and the Collection tab scrolled, run:
`sudo python3 scripts/spike_macos_read.py`

- [ ] **Step 3: Evaluate the gate**

- **SUCCESS line printed** → record the winning process `comm` name and region size in the commit message; these feed Phase 4's `name_hints` and region filter. Proceed.
- **All candidates fail** (task_for_pid kr≠0) → **STOP.** This is risk R1 materializing. Do not build Phases 1–8. Escalate to the user: the native reader is blocked; revisit "run inside the bottle."

- [ ] **Step 4: Commit the spike + findings**

```bash
git add scripts/spike_macos_read.py
git commit -m "spike(mtga): macOS process-memory read feasibility probe

Findings: <SUCCESS/FAIL>; winning process comm=<name>; region size=<n>."
```

---

## Phase 1 — Package skeleton + card DB

### Task 2: Package skeleton and pytest wiring

**Files:**
- Create: `scripts/mtga_export/__init__.py`, `scripts/mtga_export/tests/__init__.py`, `scripts/mtga_export/tests/conftest.py`
- Modify: `scripts/requirements.txt`

- [ ] **Step 1: Create empty package init**

`scripts/mtga_export/__init__.py`:
```python
"""Cross-platform MTG Arena collection exporter."""
__version__ = "2.1.0"
```

- [ ] **Step 2: Create tests package + conftest**

`scripts/mtga_export/tests/__init__.py`: empty file.

`scripts/mtga_export/tests/conftest.py`:
```python
import sys
from pathlib import Path

# Make `import mtga_export` work when running pytest from scripts/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
```

- [ ] **Step 3: Add pytest to dev deps**

Append to `scripts/requirements.txt`:
```
pytest
```

- [ ] **Step 4: Verify collection runs**

Run: `cd scripts && python -m pytest mtga_export/tests -q`
Expected: `no tests ran` (exit 5) — confirms discovery works without error.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export scripts/requirements.txt
git commit -m "chore(mtga): package skeleton + pytest wiring"
```

### Task 3: Card DB — SQLite parsing

**Files:**
- Create: `scripts/mtga_export/carddb.py`, `scripts/mtga_export/tests/test_carddb.py`

- [ ] **Step 1: Write the failing test**

`scripts/mtga_export/tests/test_carddb.py`:
```python
import sqlite3
from mtga_export.carddb import parse_mtga_sqlite

def _make_db(path):
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE Localizations (Id INTEGER, Text TEXT, Format TEXT)")
    conn.execute("CREATE TABLE Cards (GrpId INTEGER, TitleId INTEGER, ExpansionCode TEXT, CollectorNumber TEXT)")
    conn.execute("INSERT INTO Localizations VALUES (10, 'Abrade', 'en-US')")
    conn.execute("INSERT INTO Cards VALUES (70000, 10, 'DMU', '131')")
    conn.commit()
    conn.close()

def test_parse_mtga_sqlite_maps_grpid(tmp_path):
    db = tmp_path / "data_cards.mtga"
    _make_db(str(db))
    lookup = parse_mtga_sqlite(str(db))
    assert lookup[70000] == {"name": "Abrade", "set": "DMU", "collector_number": "131"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd scripts && python -m pytest mtga_export/tests/test_carddb.py -q`
Expected: FAIL — `ModuleNotFoundError: mtga_export.carddb`.

- [ ] **Step 3: Implement `parse_mtga_sqlite`**

`scripts/mtga_export/carddb.py`:
```python
import sqlite3

def parse_mtga_sqlite(path: str) -> dict[int, dict]:
    """Return {GrpId: {name, set, collector_number}} from one .mtga SQLite file."""
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        cur = conn.cursor()
        tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "Cards" not in tables or "Localizations" not in tables:
            return {}
        loc = {}
        try:
            rows = cur.execute("SELECT Id, Text FROM Localizations WHERE Format LIKE '%en-US%' OR Format IS NULL")
        except sqlite3.Error:
            rows = cur.execute("SELECT Id, Text FROM Localizations")
        for lid, text in rows.fetchall():
            if text:
                loc[lid] = text
        cols = {r[1] for r in cur.execute("PRAGMA table_info(Cards)")}
        sel_set = "ExpansionCode" if "ExpansionCode" in cols else "NULL"
        sel_cn = "CollectorNumber" if "CollectorNumber" in cols else "NULL"
        lookup = {}
        for grp, title, set_code, cn in cur.execute(
            f"SELECT GrpId, TitleId, {sel_set}, {sel_cn} FROM Cards"
        ):
            if title in loc:
                lookup[grp] = {
                    "name": loc[title],
                    "set": set_code or "",
                    "collector_number": str(cn) if cn else "",
                }
        return lookup
    finally:
        conn.close()
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd scripts && python -m pytest mtga_export/tests/test_carddb.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/carddb.py scripts/mtga_export/tests/test_carddb.py
git commit -m "feat(mtga): parse_mtga_sqlite card-definition reader"
```

### Task 4: Card DB — cross-platform path discovery + Scryfall fallback + cache

**Files:**
- Modify: `scripts/mtga_export/carddb.py`
- Modify: `scripts/mtga_export/tests/test_carddb.py`

- [ ] **Step 1: Write failing tests**

Append to `test_carddb.py`:
```python
from mtga_export.carddb import raw_path_globs, name_to_id

def test_raw_path_globs_includes_mac_bottles():
    globs = raw_path_globs("darwin")
    joined = " ".join(globs)
    assert "Whisky" in joined and "CrossOver" in joined
    assert all("MTGA_Data/Downloads/Raw" in g for g in globs)

def test_raw_path_globs_windows():
    globs = raw_path_globs("win32")
    assert any("Steam" in g for g in globs)

def test_name_to_id_lowercases():
    lookup = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
    assert name_to_id(lookup)["abrade"] == 70000
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd scripts && python -m pytest mtga_export/tests/test_carddb.py -q`
Expected: FAIL — `ImportError` for `raw_path_globs` / `name_to_id`.

- [ ] **Step 3: Implement path discovery, fallback, cache, name index**

Append to `carddb.py`:
```python
import glob
import json
import os
from pathlib import Path

import requests

def raw_path_globs(platform: str) -> list[str]:
    home = str(Path.home())
    if platform == "darwin":
        suffix = "drive_c/Program Files/Wizards of the Coast/MTGA/MTGA_Data/Downloads/Raw"
        return [
            f"{home}/Library/Application Support/com.isaacmarovitz.Whisky/Bottles/*/{suffix}",
            f"{home}/Library/Application Support/CrossOver/Bottles/*/{suffix}",
            f"{home}/.wine/{suffix}",
        ]
    if platform.startswith("win"):
        return [
            r"C:\Program Files (x86)\Steam\steamapps\common\MTGA\MTGA_Data\Downloads\Raw",
            r"C:\Program Files\Wizards of the Coast\MTGA\MTGA_Data\Downloads\Raw",
            r"C:\Program Files (x86)\Wizards of the Coast\MTGA\MTGA_Data\Downloads\Raw",
        ]
    return []

def find_raw_dir(platform: str) -> str | None:
    for pattern in raw_path_globs(platform):
        for hit in sorted(glob.glob(pattern)):
            if os.path.isdir(hit):
                return hit
    return None

def load_local_db(platform: str) -> dict[int, dict]:
    raw = find_raw_dir(platform)
    if not raw:
        return {}
    files = sorted(Path(raw).glob("*.mtga"), key=lambda f: f.stat().st_size, reverse=True)
    lookup: dict[int, dict] = {}
    for f in files:
        if f.stat().st_size < 500 * 1024:
            continue
        try:
            lookup.update(parse_mtga_sqlite(str(f)))
        except sqlite3.Error:
            continue
        if len(lookup) > 1000:
            break
    return lookup

def fetch_scryfall_db() -> dict[int, dict]:
    headers = {"User-Agent": "MTGACollectionExporter/2.1", "Accept": "application/json"}
    meta = requests.get("https://api.scryfall.com/bulk-data/default-cards", headers=headers, timeout=30).json()
    cards = requests.get(meta["download_uri"], headers=headers, timeout=120).json()
    lookup = {}
    for c in cards:
        if c.get("arena_id"):
            lookup[c["arena_id"]] = {
                "name": c.get("name", "Unknown"),
                "set": c.get("set", "").upper(),
                "collector_number": c.get("collector_number", ""),
            }
    return lookup

def load_card_db(platform: str, cache_path: Path) -> dict[int, dict]:
    if cache_path.exists():
        try:
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            return {int(k): v for k, v in data.items() if isinstance(v, dict)}
        except Exception:
            pass
    lookup = load_local_db(platform) or fetch_scryfall_db()
    if lookup:
        try:
            cache_path.write_text(json.dumps({str(k): v for k, v in lookup.items()}), encoding="utf-8")
        except Exception:
            pass
    return lookup

def name_to_id(lookup: dict[int, dict]) -> dict[str, int]:
    return {v["name"].lower(): k for k, v in lookup.items()}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd scripts && python -m pytest mtga_export/tests/test_carddb.py -q`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/carddb.py scripts/mtga_export/tests/test_carddb.py
git commit -m "feat(mtga): cross-platform card-DB load (paths, scryfall, cache)"
```

---

## Phase 2 — ProcessMemory interface + adapters

### Task 5: `ProcessMemory` ABC + fake + default pattern_scan

**Files:**
- Create: `scripts/mtga_export/memory/__init__.py`, `scripts/mtga_export/memory/base.py`, `scripts/mtga_export/memory/fake.py`
- Create: `scripts/mtga_export/tests/test_scan.py` (memory-layer portion)

- [ ] **Step 1: Write the failing test**

`scripts/mtga_export/tests/test_scan.py`:
```python
import struct
from mtga_export.memory.fake import FakeMemory

def test_fake_pattern_scan_finds_pair():
    # one region: junk, then (grpId=70000, qty=3) at offset 8
    region = b"\x00" * 8 + struct.pack("<II", 70000, 3) + b"\x00" * 8
    mem = FakeMemory(regions=[(0x1000, region)])
    hits = mem.pattern_scan(struct.pack("<II", 70000, 3))
    assert hits == [0x1000 + 8]

def test_fake_read_bytes():
    mem = FakeMemory(regions=[(0x2000, b"ABCDEFGH")])
    assert mem.read_bytes(0x2002, 3) == b"CDE"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd scripts && python -m pytest mtga_export/tests/test_scan.py -q`
Expected: FAIL — `ModuleNotFoundError: mtga_export.memory.fake`.

- [ ] **Step 3: Implement base + fake**

`scripts/mtga_export/memory/__init__.py`:
```python
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
```

`scripts/mtga_export/memory/base.py`:
```python
from abc import ABC, abstractmethod
from typing import Iterator

class ProcessMemory(ABC):
    @abstractmethod
    def find_process(self, name_hints: list[str]) -> int | None: ...

    @abstractmethod
    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        """Yield (base_address, region_bytes) for readable regions."""

    @abstractmethod
    def read_bytes(self, addr: int, size: int) -> bytes: ...

    def pattern_scan(self, pattern: bytes) -> list[int]:
        hits: list[int] = []
        for base, data in self.iter_regions():
            start = 0
            while True:
                i = data.find(pattern, start)
                if i < 0:
                    break
                hits.append(base + i)
                start = i + 1
        return hits
```

`scripts/mtga_export/memory/fake.py`:
```python
from typing import Iterator
from .base import ProcessMemory

class FakeMemory(ProcessMemory):
    def __init__(self, regions: list[tuple[int, bytes]]):
        self._regions = regions

    def find_process(self, name_hints: list[str]) -> int | None:
        return 1234

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        yield from self._regions

    def read_bytes(self, addr: int, size: int) -> bytes:
        for base, data in self._regions:
            if base <= addr < base + len(data):
                off = addr - base
                return data[off : off + size]
        return b""
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd scripts && python -m pytest mtga_export/tests/test_scan.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/memory scripts/mtga_export/tests/test_scan.py
git commit -m "feat(mtga): ProcessMemory interface + fake + default pattern_scan"
```

### Task 6: Windows adapter (port from mtg.py)

**Files:**
- Create: `scripts/mtga_export/memory/windows.py`

- [ ] **Step 1: Implement the adapter**

> No unit test — `pymem` only works against a live Windows process. Parity is verified by the Windows user running the CLI (Task 11). Keep the algorithm identical to today's `mtg.py`.

`scripts/mtga_export/memory/windows.py`:
```python
import struct
from typing import Iterator
from .base import ProcessMemory

class WindowsMemory(ProcessMemory):
    def __init__(self):
        import pymem  # imported lazily so non-Windows never needs it
        self._pymem = pymem
        self._pm = None

    def find_process(self, name_hints: list[str]) -> int | None:
        for hint in name_hints:
            try:
                self._pm = self._pymem.Pymem(hint)
                return self._pm.process_id
            except Exception:
                continue
        return None

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        return iter(())  # unused on Windows; pattern_scan is overridden below

    def read_bytes(self, addr: int, size: int) -> bytes:
        return self._pm.read_bytes(addr, size)

    def pattern_scan(self, pattern: bytes) -> list[int]:
        res = self._pm.pattern_scan_all(pattern, return_multiple=True)
        return list(res or [])
```

- [ ] **Step 2: Smoke-import on the dev machine**

Run: `cd scripts && python -c "import mtga_export.memory.windows" ` only on Windows. On Mac, skip (the lazy `import pymem` lives inside `__init__`, so the module imports fine but instantiation needs pymem).
Expected: no error importing the module.

- [ ] **Step 3: Commit**

```bash
git add scripts/mtga_export/memory/windows.py
git commit -m "feat(mtga): Windows pymem adapter (ported from mtg.py)"
```

---

## Phase 3 — Scan algorithm (zero-anchor auto-detect)

### Task 7: `find_blocks` + `autodetect_collection` + anchor disambiguation

**Files:**
- Create: `scripts/mtga_export/scan.py`
- Modify: `scripts/mtga_export/tests/test_scan.py`

- [ ] **Step 1: Write failing tests**

Append to `test_scan.py`:
```python
from mtga_export.scan import find_blocks, autodetect_collection
from mtga_export.memory.fake import FakeMemory

def _block_bytes(pairs):
    return b"".join(struct.pack("<II", k, v) for k, v in pairs)

def test_find_blocks_extracts_dense_run():
    pairs = [(70000 + i, (i % 4) + 1) for i in range(60)]  # 60 valid pairs
    data = b"\x00" * 32 + _block_bytes(pairs) + b"\x00" * 400
    blocks = find_blocks(data, base=0)
    assert any(len(b) >= 50 for b in blocks)
    big = max(blocks, key=len)
    assert big[70000] == 1

def test_autodetect_picks_dominant_block():
    big = _block_bytes([(70000 + i, (i % 4) + 1) for i in range(200)])
    small = _block_bytes([(80000 + i, 1) for i in range(60)])
    region = b"\x00" * 64 + big + b"\xff" * 4096 + small
    mem = FakeMemory(regions=[(0x10000, region)])
    status, payload = autodetect_collection(mem)
    assert status == "ok"
    assert len(payload) >= 200

def test_autodetect_ambiguous_needs_anchor():
    a = _block_bytes([(70000 + i, 1) for i in range(120)])
    b = _block_bytes([(90000 + i, 1) for i in range(120)])
    region = b"\x00" * 64 + a + b"\xff" * 4096 + b
    mem = FakeMemory(regions=[(0x20000, region)])
    status, payload = autodetect_collection(mem)
    assert status == "ambiguous"
    # anchor in block B collapses it
    status2, coll = autodetect_collection(mem, anchors=[(90000, 1)])
    assert status2 == "ok"
    assert 90000 in coll
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd scripts && python -m pytest mtga_export/tests/test_scan.py -q`
Expected: FAIL — `ModuleNotFoundError: mtga_export.scan`.

- [ ] **Step 3: Implement scan**

`scripts/mtga_export/scan.py`:
```python
import struct

GRP_MIN, GRP_MAX = 1000, 500000
QTY_MIN, QTY_MAX = 1, 400
MIN_BLOCK = 50          # minimum entries to count as a candidate block
MISS_LIMIT = 50         # consecutive invalid pairs that end a block
DOMINANCE = 2.0         # top block must be >= this * runner-up to auto-pick

def find_blocks(data: bytes, base: int) -> list[dict[int, int]]:
    """Find dense runs of valid (grpId, qty) pairs, scanning both 8-byte phases."""
    n = len(data) // 4
    ints = struct.unpack(f"<{n}I", data[: n * 4])
    blocks: list[dict[int, int]] = []
    for off in (0, 1):
        curr: dict[int, int] = {}
        misses = 0
        for i in range(off, len(ints) - 1, 2):
            k, v = ints[i], ints[i + 1]
            if GRP_MIN <= k < GRP_MAX and QTY_MIN <= v <= QTY_MAX:
                curr[k] = v
                misses = 0
            else:
                misses += 1
            if misses > MISS_LIMIT:
                if len(curr) > MIN_BLOCK:
                    blocks.append(curr)
                curr = {}
                misses = 0
        if len(curr) > MIN_BLOCK:
            blocks.append(curr)
    return blocks

def _all_candidates(mem) -> list[dict[int, int]]:
    cands: list[dict[int, int]] = []
    for base, data in mem.iter_regions():
        cands.extend(find_blocks(data, base))
    return cands

def autodetect_collection(mem, anchors: list[tuple[int, int]] | None = None):
    """Return (status, payload).

    status 'ok'        -> payload is the collection dict {grpId: qty}
    status 'ambiguous' -> payload is the candidate count (needs an anchor)
    status 'not_found' -> payload is None
    """
    cands = _all_candidates(mem)
    cands = [c for c in cands if len(c) > MIN_BLOCK]
    if not cands:
        return ("not_found", None)

    if anchors:
        for aid, aqty in anchors:
            matching = [c for c in cands if c.get(aid) == aqty]
            if matching:
                return ("ok", max(matching, key=len))
        return ("not_found", None)

    cands.sort(key=len, reverse=True)
    top = cands[0]
    runner = len(cands[1]) if len(cands) > 1 else 0
    if runner == 0 or len(top) >= DOMINANCE * runner:
        return ("ok", top)
    return ("ambiguous", len(cands))
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd scripts && python -m pytest mtga_export/tests/test_scan.py -q`
Expected: PASS (all scan tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/scan.py scripts/mtga_export/tests/test_scan.py
git commit -m "feat(mtga): zero-anchor collection auto-detection + anchor fallback"
```

### Task 8: Resolve collection dict → export rows

**Files:**
- Create: `scripts/mtga_export/export.py`
- Create: `scripts/mtga_export/tests/test_export.py`

- [ ] **Step 1: Write failing test**

`scripts/mtga_export/tests/test_export.py`:
```python
from mtga_export.export import resolve_rows, to_json_array, to_txt

LOOKUP = {
    70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"},
    70001: {"name": "Abrade", "set": "DMU", "collector_number": "131"},  # dup printing
    70002: {"name": "Sheoldred", "set": "DMU", "collector_number": "107"},
}

def test_resolve_rows_merges_by_name_set():
    rows = resolve_rows({70000: 2, 70001: 2, 70002: 1}, LOOKUP)
    abrade = next(r for r in rows if r["name"] == "Abrade")
    assert abrade["count"] == 4
    assert {"count": 1, "name": "Sheoldred", "set": "DMU", "cn": "107"} in rows

def test_to_json_array_shape():
    rows = [{"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"}]
    assert to_json_array(rows) == rows  # already the app's expected shape

def test_to_txt_format():
    rows = [{"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"}]
    assert to_txt(rows) == "4 Abrade (DMU)\n"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd scripts && python -m pytest mtga_export/tests/test_export.py -q`
Expected: FAIL — `ModuleNotFoundError: mtga_export.export`.

- [ ] **Step 3: Implement export**

`scripts/mtga_export/export.py`:
```python
import csv
import io
import json

def resolve_rows(collection: dict[int, int], lookup: dict[int, dict]) -> list[dict]:
    """Merge a {grpId: qty} collection into app-shaped rows, by (name, set)."""
    merged: dict[tuple[str, str], dict] = {}
    for grp, qty in collection.items():
        info = lookup.get(grp)
        if not info:
            continue
        key = (info["name"], info["set"])
        row = merged.setdefault(
            key,
            {"count": 0, "name": info["name"], "set": info["set"], "cn": info.get("collector_number", "")},
        )
        row["count"] += qty
    return sorted(merged.values(), key=lambda r: (r["name"], r["set"]))

def to_json_array(rows: list[dict]) -> list[dict]:
    return rows

def to_txt(rows: list[dict]) -> str:
    out = []
    for r in rows:
        set_str = f" ({r['set']})" if r["set"] else ""
        out.append(f"{r['count']} {r['name']}{set_str}\n")
    return "".join(out)

def to_csv(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Count", "Name", "Edition", "Condition", "Language", "Foil", "Tag"])
    for r in rows:
        w.writerow([r["count"], r["name"], r["set"], "Near Mint", "English", "", ""])
    return buf.getvalue()

def write_all(rows: list[dict], out_dir) -> dict[str, str]:
    from pathlib import Path
    out_dir = Path(out_dir)
    paths = {
        "json": out_dir / "mtga_collection.json",
        "txt": out_dir / "mtga_collection.txt",
        "csv": out_dir / "mtga_collection.csv",
    }
    paths["json"].write_text(json.dumps(to_json_array(rows), indent=2), encoding="utf-8")
    paths["txt"].write_text(to_txt(rows), encoding="utf-8")
    paths["csv"].write_text(to_csv(rows), encoding="utf-8")
    return {k: str(v) for k, v in paths.items()}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd scripts && python -m pytest mtga_export/tests/test_export.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/export.py scripts/mtga_export/tests/test_export.py
git commit -m "feat(mtga): resolve collection → app-shaped json/txt/csv"
```

---

## Phase 4 — Native macOS reader (consumes spike findings)

### Task 9: `MacMemory` mach adapter

**Files:**
- Create: `scripts/mtga_export/memory/macos.py`

> Uses the spike's documented outputs. Replace `NAME_HINTS` with the winning
> `comm` substring(s) from Task 1, and keep the region size cap that kept the
> scan tractable. No unit test (needs a live process); validated by Task 12.

- [ ] **Step 1: Implement the adapter**

`scripts/mtga_export/memory/macos.py`:
```python
import ctypes
import ctypes.util
import subprocess
from typing import Iterator
from .base import ProcessMemory

# From the Phase 0 spike: substrings that matched the Arena-under-Wine process.
NAME_HINTS = ["mtga", "wine", "crossover", "whisky"]
MAX_REGION = 64 * 1024 * 1024  # skip giant mapped regions; collection lives in private rw

_libsys = ctypes.CDLL(ctypes.util.find_library("System"), use_errno=True)
_libsys.mach_task_self.restype = ctypes.c_uint32
KERN_SUCCESS = 0
VM_REGION_BASIC_INFO_64 = 9

class MacMemory(ProcessMemory):
    def __init__(self):
        self._task = None

    def find_process(self, name_hints: list[str]) -> int | None:
        out = subprocess.run(["ps", "-axo", "pid=,comm="], capture_output=True, text=True).stdout
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            pid_str, _, comm = line.partition(" ")
            if any(h in comm.lower() for h in name_hints):
                pid = int(pid_str)
                if self._attach(pid):
                    return pid
        return None

    def _attach(self, pid: int) -> bool:
        task = ctypes.c_uint32(0)
        kr = _libsys.task_for_pid(_libsys.mach_task_self(), pid, ctypes.byref(task))
        if kr != KERN_SUCCESS:
            return False
        self._task = task.value
        return True

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        assert self._task is not None
        address = ctypes.c_uint64(1)
        while True:
            size = ctypes.c_uint64(0)
            info = (ctypes.c_int * 16)()
            count = ctypes.c_uint32(16)
            obj = ctypes.c_uint32(0)
            kr = _libsys.mach_vm_region(
                self._task, ctypes.byref(address), ctypes.byref(size),
                VM_REGION_BASIC_INFO_64, ctypes.byref(info),
                ctypes.byref(count), ctypes.byref(obj),
            )
            if kr != KERN_SUCCESS:
                break
            base, length = address.value, size.value
            if 0 < length <= MAX_REGION:
                data = self.read_bytes(base, length)
                if data:
                    yield (base, data)
            address = ctypes.c_uint64(base + length)

    def read_bytes(self, addr: int, size: int) -> bytes:
        buf = (ctypes.c_char * size)()
        out = ctypes.c_uint64(0)
        kr = _libsys.mach_vm_read_overwrite(
            self._task, ctypes.c_uint64(addr), ctypes.c_uint64(size),
            ctypes.cast(buf, ctypes.c_void_p), ctypes.byref(out),
        )
        if kr != KERN_SUCCESS:
            return b""
        return bytes(buf[: out.value])
```

- [ ] **Step 2: Smoke-import on Mac**

Run: `cd scripts && python -c "import mtga_export.memory.macos"`
Expected: no error (ctypes binding loads; nothing attached yet).

- [ ] **Step 3: Commit**

```bash
git add scripts/mtga_export/memory/macos.py
git commit -m "feat(mtga): native macOS mach memory adapter"
```

---

## Phase 5 — CLI parity + shim

### Task 10: CLI + `__main__` + mtg.py shim

**Files:**
- Create: `scripts/mtga_export/cli.py`, `scripts/mtga_export/__main__.py`
- Modify: `scripts/mtg.py`

- [ ] **Step 1: Implement the CLI**

`scripts/mtga_export/cli.py`:
```python
import sys
from pathlib import Path

from .carddb import load_card_db, name_to_id
from .memory import get_memory
from .scan import autodetect_collection
from .export import resolve_rows, write_all

NAME_HINTS = ["MTGA.exe", "mtga", "wine", "crossover", "whisky"]

def run(out_dir: Path) -> int:
    cache = out_dir / "arena_id_lookup.json"
    print("Loading card database...")
    db = load_card_db(sys.platform, cache)
    if not db:
        print("Card database unavailable.")
        return 1

    mem = get_memory()
    if mem.find_process(NAME_HINTS) is None:
        print("MTG Arena process not found. Open Arena and visit the Collection tab.")
        return 1

    print("Scanning memory...")
    status, payload = autodetect_collection(mem)
    if status == "ambiguous":
        print("Multiple candidate blocks found; enter one owned card to disambiguate.")
        n2i = name_to_id(db)
        name = input("  Card name: ").strip().lower()
        qty = int(input("  Quantity: "))
        aid = n2i.get(name)
        if aid is None:
            print("  Card not found.")
            return 1
        status, payload = autodetect_collection(mem, anchors=[(aid, qty)])
    if status != "ok":
        print("Could not locate collection.")
        return 1

    rows = resolve_rows(payload, db)
    paths = write_all(rows, out_dir)
    print(f"Exported {len(rows)} entries:")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0
```

`scripts/mtga_export/__main__.py`:
```python
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
```

- [ ] **Step 2: Replace mtg.py with a shim**

`scripts/mtg.py` (full new contents):
```python
"""Back-compat entry point. The implementation now lives in the mtga_export package."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mtga_export.cli import run  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(run(Path(__file__).resolve().parent))
```

- [ ] **Step 3: Verify import wiring**

Run: `cd scripts && python -c "from mtga_export.cli import run; print('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add scripts/mtga_export/cli.py scripts/mtga_export/__main__.py scripts/mtg.py
git commit -m "feat(mtga): cross-platform CLI + mtg.py shim"
```

### Task 11: USER validates the CLI end-to-end (Mac)

- [ ] **Step 1: Run the CLI on Mac with Arena open**

Run: `cd scripts && sudo python3 -m mtga_export`
Expected: prints "Exported N entries" with N in the thousands; `mtga_collection.json` written. If "ambiguous," it prompts for one card and then succeeds.

- [ ] **Step 2: If it fails, debug before continuing**

REQUIRED SUB-SKILL on any failure here: superpowers:systematic-debugging. Common causes: wrong `NAME_HINTS` (re-check spike), `MAX_REGION` too small (collection in a larger region), or not run with sudo.

---

## Phase 6 — Bridge server

### Task 12: `server.py` localhost bridge

**Files:**
- Create: `scripts/mtga_export/server.py`
- Create: `scripts/mtga_export/tests/test_server.py`

- [ ] **Step 1: Write the failing test**

`scripts/mtga_export/tests/test_server.py`:
```python
import json
from mtga_export.server import build_handler_class
from mtga_export.memory.fake import FakeMemory
import struct

class _Engine:
    def __init__(self, status, payload):
        self._status, self._payload = status, payload
        self.db = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
    def scan(self, anchors=None):
        return self._status, self._payload
    def search(self, q):
        return [{"grpId": 70000, "name": "Abrade", "set": "DMU", "collectorNumber": "131"}]
    def health(self):
        return {"platform": "test", "running_as_root": True, "arena_process_found": True, "card_db_ready": True}

def test_scan_ok_returns_rows():
    engine = _Engine("ok", {70000: 4})
    handler = build_handler_class(engine)
    # exercise the pure response builder rather than sockets:
    status, body = handler.handle_scan(engine, {"anchors": []})
    assert status == 200
    assert {"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"} in json.loads(body)["collection"]

def test_scan_ambiguous_status():
    engine = _Engine("ambiguous", 3)
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {})
    assert json.loads(body)["status"] == "ambiguous"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd scripts && python -m pytest mtga_export/tests/test_server.py -q`
Expected: FAIL — `ModuleNotFoundError: mtga_export.server`.

- [ ] **Step 3: Implement the server**

`scripts/mtga_export/server.py`:
```python
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from .carddb import load_card_db, name_to_id
from .memory import get_memory
from .scan import autodetect_collection
from .export import resolve_rows

DEFAULT_PORT = 17171

class Engine:
    def __init__(self, out_dir: Path):
        self.db = load_card_db(sys.platform, out_dir / "arena_id_lookup.json")
        self._n2i = name_to_id(self.db) if self.db else {}
        self._mem = None
        self._pid = None

    def _ensure_mem(self):
        if self._mem is None:
            self._mem = get_memory()
        self._pid = self._mem.find_process(["MTGA.exe", "mtga", "wine", "crossover", "whisky"])
        return self._pid is not None

    def health(self):
        import os
        root = (os.name != "nt" and os.geteuid() == 0)
        found = False
        try:
            found = self._ensure_mem()
        except Exception:
            found = False
        return {
            "platform": sys.platform,
            "running_as_root": bool(root),
            "arena_process_found": found,
            "card_db_ready": bool(self.db),
        }

    def search(self, q: str):
        q = q.lower()
        out = []
        for name, gid in self._n2i.items():
            if q in name:
                info = self.db[gid]
                out.append({"grpId": gid, "name": info["name"], "set": info["set"], "collectorNumber": info["collector_number"]})
            if len(out) >= 20:
                break
        return out

    def scan(self, anchors=None):
        if not self._ensure_mem():
            return ("no_process", None)
        return autodetect_collection(self._mem, anchors=anchors)

def build_handler_class(engine: "Engine"):
    class Handler(BaseHTTPRequestHandler):
        @staticmethod
        def handle_scan(eng, body):
            anchors = [(a["grpId"], a["quantity"]) for a in body.get("anchors", [])]
            status, payload = eng.scan(anchors=anchors or None)
            if status == "ok":
                rows = resolve_rows(payload, eng.db)
                return 200, json.dumps({"status": "ok", "collection": rows})
            return 200, json.dumps({"status": status})

        def _send(self, status, body):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.end_headers()
            self.wfile.write(body.encode("utf-8"))

        def do_OPTIONS(self):
            self._send(204, "")

        def do_GET(self):
            u = urlparse(self.path)
            if u.path == "/api/health":
                self._send(200, json.dumps(engine.health()))
            elif u.path == "/api/cards/search":
                q = parse_qs(u.query).get("q", [""])[0]
                self._send(200, json.dumps(engine.search(q)))
            else:
                self._send(404, json.dumps({"error": "not found"}))

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw or b"{}")
            if urlparse(self.path).path == "/api/scan":
                status, payload = self.handle_scan(engine, body)
                self._send(status, payload)
            else:
                self._send(404, json.dumps({"error": "not found"}))

        def log_message(self, *args):
            pass

    return Handler

def serve(out_dir: Path, port: int = DEFAULT_PORT) -> int:
    engine = Engine(out_dir)
    handler = build_handler_class(engine)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"MTGA bridge on http://127.0.0.1:{port} — leave this open, scan from the app.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd scripts && python -m pytest mtga_export/tests/test_server.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/mtga_export/server.py scripts/mtga_export/tests/test_server.py
git commit -m "feat(mtga): localhost bridge server (health/search/scan)"
```

---

## Phase 7 — Launchers

### Task 13: One-click launchers

**Files:**
- Create: `scripts/launch-mac.command`, `scripts/launch-windows.bat`

- [ ] **Step 1: macOS launcher**

`scripts/launch-mac.command`:
```bash
#!/bin/bash
# Double-click to start the MTGA bridge. Prompts for your password (memory
# reading needs admin rights), then leaves a Terminal window running the bridge.
cd "$(dirname "$0")" || exit 1
python3 -m pip install --quiet --user -r requirements.txt
osascript -e 'do shell script "cd \"'"$PWD"'\" && /usr/bin/python3 -m mtga_export --serve" with administrator privileges'
```

Then make it executable:
Run: `chmod +x scripts/launch-mac.command`

- [ ] **Step 2: Windows launcher**

`scripts/launch-windows.bat`:
```bat
@echo off
cd /d "%~dp0"
python -m pip install --quiet -r requirements.txt
python -m mtga_export --serve
pause
```

- [ ] **Step 3: Manual smoke (Mac)**

Run: `cd scripts && python3 -m mtga_export --serve` (without sudo), then in another terminal `curl -s http://127.0.0.1:17171/api/health`.
Expected: JSON health object; `running_as_root` is `false` here (the launcher adds root).

- [ ] **Step 4: Commit**

```bash
git add scripts/launch-mac.command scripts/launch-windows.bat
git commit -m "feat(mtga): one-click launchers for mac and windows"
```

---

## Phase 8 — App "Live scan" source

### Task 14: Bridge client `mtgaScanBridge.ts`

**Files:**
- Create: `app/src/lib/mtgaScanBridge.ts`, `app/src/lib/mtgaScanBridge.test.ts`

- [ ] **Step 1: Write the failing test**

`app/src/lib/mtgaScanBridge.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { scanCollection, bridgeHealth } from './mtgaScanBridge';

afterEach(() => vi.restoreAllMocks());

describe('mtgaScanBridge', () => {
  it('returns ok collection from /api/scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }] }),
    })) as unknown as typeof fetch);
    const res = await scanCollection([]);
    expect(res.status).toBe('ok');
    expect(res.collection?.[0]?.name).toBe('Abrade');
  });

  it('maps a network failure to engine-offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('refused'); }) as unknown as typeof fetch);
    const h = await bridgeHealth();
    expect(h.online).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && npx vitest run src/lib/mtgaScanBridge.test.ts`
Expected: FAIL — cannot resolve `./mtgaScanBridge`.

- [ ] **Step 3: Implement the client**

`app/src/lib/mtgaScanBridge.ts`:
```ts
const BASE = import.meta.env.VITE_MTGA_BRIDGE_URL ?? 'http://127.0.0.1:17171';

export type ScanRow = { count: number; name: string; set: string; cn: string };
export type ScanStatus = 'ok' | 'ambiguous' | 'not_found' | 'no_process' | 'needs_root';
export type ScanResult = { status: ScanStatus; collection?: ScanRow[] };
export type Health = {
  online: boolean;
  running_as_root?: boolean;
  arena_process_found?: boolean;
  card_db_ready?: boolean;
};
export type CardHit = { grpId: number; name: string; set: string; collectorNumber: string };

export async function bridgeHealth(): Promise<Health> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (!r.ok) return { online: false };
    return { online: true, ...(await r.json()) };
  } catch {
    return { online: false };
  }
}

export async function searchCards(q: string): Promise<CardHit[]> {
  const r = await fetch(`${BASE}/api/cards/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return (await r.json()) as CardHit[];
}

export async function scanCollection(
  anchors: { grpId: number; quantity: number }[],
): Promise<ScanResult> {
  const r = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anchors }),
  });
  if (!r.ok) return { status: 'not_found' };
  return (await r.json()) as ScanResult;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd app && npx vitest run src/lib/mtgaScanBridge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/mtgaScanBridge.ts app/src/lib/mtgaScanBridge.test.ts
git commit -m "feat(app): MTGA scan bridge client"
```

### Task 15: Add `'scan'` source to `MtgaImportPanel`

**Files:**
- Modify: `app/src/components/MtgaImportPanel.tsx`
- Modify: `app/src/components/MtgaImportPanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Append to `app/src/components/MtgaImportPanel.test.tsx` (reuse the file's existing imports of `render`, `screen`, `userEvent`, and the `graphStore` mock; if a `vi.mock('../lib/mtgaScanBridge')` is needed, add it at top-of-file):
```tsx
import * as bridge from '../lib/mtgaScanBridge';

it('scan source: healthy scan imports library', async () => {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  vi.spyOn(bridge, 'scanCollection').mockResolvedValue({
    status: 'ok',
    collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }],
  });
  const onClose = vi.fn();
  render(<MtgaImportPanel mode="full" onClose={onClose} />);
  await userEvent.click(screen.getByRole('tab', { name: /live scan/i }));
  await userEvent.click(screen.getByRole('button', { name: /scan my collection/i }));
  expect(await screen.findByText(/import library/i)).toBeInTheDocument();
});

it('scan source: engine offline shows launch card', async () => {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ online: false });
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  await userEvent.click(screen.getByRole('tab', { name: /live scan/i }));
  await userEvent.click(screen.getByRole('button', { name: /scan my collection/i }));
  expect(await screen.findByText(/start the exporter/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd app && npx vitest run src/components/MtgaImportPanel.test.tsx`
Expected: FAIL — no "Live scan" tab / "Scan my collection" button.

- [ ] **Step 3: Implement the scan source**

In `app/src/components/MtgaImportPanel.tsx`:

(a) Extend the source type and imports:
```tsx
import { bridgeHealth, scanCollection } from '../lib/mtgaScanBridge';
import { parseMtgaCollectionJson } from '../lib/mtgaJsonParser';
// change:
type Source = 'log' | 'json' | 'scan';
```

(b) Add a third `SourceButton` after the Collection JSON button:
```tsx
<SourceButton
  active={source === 'scan'}
  onClick={() => { setSource('scan'); resetParseState(); }}
>
  Live scan
</SourceButton>
```

(c) Add a scan handler that funnels into the **existing** resolve path:
```tsx
const [scanMsg, setScanMsg] = useState<string | null>(null);

const handleScan = async () => {
  setScanMsg(null);
  setState({ kind: 'parsing', bytes: 0, total: 0 });
  const health = await bridgeHealth();
  if (!health.online) {
    setState({ kind: 'idle' });
    setScanMsg('Start the exporter first — double-click launch-mac.command, approve the password prompt, then Scan again.');
    return;
  }
  if (!health.arena_process_found) {
    setState({ kind: 'idle' });
    setScanMsg('Open MTG Arena and visit the Collection tab, then Scan again.');
    return;
  }
  const res = await scanCollection([]);
  if (res.status === 'ambiguous') {
    setState({ kind: 'idle' });
    setScanMsg('Found more than one candidate — add one owned card below to narrow it down.');
    return;
  }
  if (res.status !== 'ok' || !res.collection) {
    setState({ kind: 'idle' });
    setScanMsg("Couldn't locate your collection. Make sure Arena is on the Collection tab.");
    return;
  }
  const parsed = parseMtgaCollectionJson(JSON.stringify(res.collection));
  const result = resolveLibrary(parsed, cards, KNOWN_SET_CODES);
  setState({ kind: 'ready', libraryResult: result, mtgaSummary: null, decks: null, filename: 'Live scan' });
};
```

(d) Render the scan UI when `effectiveSource === 'scan'` (replacing the file-picker block for that source):
```tsx
{effectiveSource === 'scan' && (
  <div>
    <p className="text-xs text-vellum-dim">
      Scan your live MTG Arena collection — no file needed. Requires the exporter
      running locally (one-click launcher) and Arena open on the Collection tab.
    </p>
    <button
      type="button"
      onClick={() => void handleScan()}
      className="focus-brass mt-3 inline-flex items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
    >
      Scan my collection
    </button>
    {scanMsg && (
      <p className="mt-3 rounded border border-brass/40 bg-ink-raised px-3 py-2 text-xs text-vellum-mute">
        {scanMsg}
      </p>
    )}
  </div>
)}
```

(e) Guard the existing file-picker `<label>` so it only renders for `'log'`/`'json'`:
```tsx
{effectiveSource !== 'scan' && (
  <label className="focus-brass mt-3 inline-flex ...">
    {/* existing file input unchanged */}
  </label>
)}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd app && npx vitest run src/components/MtgaImportPanel.test.tsx`
Expected: PASS (new + existing tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MtgaImportPanel.tsx app/src/components/MtgaImportPanel.test.tsx
git commit -m "feat(app): Live scan source in MtgaImportPanel"
```

### Task 16: Ambiguous-path anchor search UI

**Files:**
- Modify: `app/src/components/MtgaImportPanel.tsx`
- Modify: `app/src/components/MtgaImportPanel.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `MtgaImportPanel.test.tsx`:
```tsx
it('scan source: ambiguous then anchor resolves', async () => {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  const scan = vi.spyOn(bridge, 'scanCollection')
    .mockResolvedValueOnce({ status: 'ambiguous' })
    .mockResolvedValueOnce({ status: 'ok', collection: [{ count: 3, name: 'Sheoldred', set: 'DMU', cn: '107' }] });
  vi.spyOn(bridge, 'searchCards').mockResolvedValue([
    { grpId: 70002, name: 'Sheoldred', set: 'DMU', collectorNumber: '107' },
  ]);
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  await userEvent.click(screen.getByRole('tab', { name: /live scan/i }));
  await userEvent.click(screen.getByRole('button', { name: /scan my collection/i }));
  await userEvent.type(screen.getByPlaceholderText(/search a card/i), 'sheol');
  await userEvent.click(await screen.findByText(/Sheoldred/));
  await userEvent.type(screen.getByLabelText(/quantity/i), '3');
  await userEvent.click(screen.getByRole('button', { name: /narrow it down/i }));
  expect(await screen.findByText(/import library/i)).toBeInTheDocument();
  expect(scan).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && npx vitest run src/components/MtgaImportPanel.test.tsx -t ambiguous`
Expected: FAIL — no anchor search input.

- [ ] **Step 3: Implement anchor search**

Add state + a small anchor sub-UI shown when `scanMsg` indicates ambiguity. In `MtgaImportPanel.tsx`:
```tsx
const [anchorHits, setAnchorHits] = useState<import('../lib/mtgaScanBridge').CardHit[]>([]);
const [anchor, setAnchor] = useState<{ grpId: number; name: string } | null>(null);
const [anchorQty, setAnchorQty] = useState('');
const [ambiguous, setAmbiguous] = useState(false);

// in handleScan, replace the ambiguous branch body with:
if (res.status === 'ambiguous') {
  setState({ kind: 'idle' });
  setAmbiguous(true);
  setScanMsg('Found more than one candidate — add one owned card to narrow it down.');
  return;
}

const runAnchorScan = async () => {
  if (!anchor || !anchorQty) return;
  setAmbiguous(false);
  const res = await scanCollection([{ grpId: anchor.grpId, quantity: Number(anchorQty) }]);
  if (res.status === 'ok' && res.collection) {
    const parsed = parseMtgaCollectionJson(JSON.stringify(res.collection));
    setState({ kind: 'ready', libraryResult: resolveLibrary(parsed, cards, KNOWN_SET_CODES), mtgaSummary: null, decks: null, filename: 'Live scan' });
  } else {
    setScanMsg("Still couldn't pin it down — try a different card with a distinctive quantity.");
  }
};
```

And render, inside the `effectiveSource === 'scan'` block, after `scanMsg`:
```tsx
{ambiguous && (
  <div className="mt-3 space-y-2">
    <input
      type="text"
      placeholder="Search a card you own…"
      className="focus-brass w-full rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm text-vellum-mute"
      onChange={async (e) => setAnchorHits(await searchCards(e.target.value))}
    />
    <ul className="max-h-32 overflow-auto text-sm">
      {anchorHits.map((h) => (
        <li key={h.grpId}>
          <button type="button" className="text-vellum-mute hover:text-brass-hi" onClick={() => setAnchor({ grpId: h.grpId, name: h.name })}>
            {h.name} ({h.set})
          </button>
        </li>
      ))}
    </ul>
    {anchor && (
      <div className="flex items-center gap-2">
        <span className="text-sm text-brass-hi">{anchor.name}</span>
        <input aria-label="quantity" type="number" min={1} value={anchorQty}
          onChange={(e) => setAnchorQty(e.target.value)}
          className="w-16 rounded border border-ink-line-2 bg-ink-raised px-2 py-1 text-sm" />
        <button type="button" onClick={() => void runAnchorScan()}
          className="focus-brass rounded bg-brass px-3 py-1 text-sm font-semibold text-ink-bg">
          Narrow it down
        </button>
      </div>
    )}
  </div>
)}
```

Add the `searchCards` import to the existing bridge import line.

- [ ] **Step 4: Run to verify it passes**

Run: `cd app && npx vitest run src/components/MtgaImportPanel.test.tsx`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MtgaImportPanel.tsx app/src/components/MtgaImportPanel.test.tsx
git commit -m "feat(app): anchor disambiguation UI for live scan"
```

---

## Phase 9 — Full gate + docs

### Task 17: Update copy + run full gate

**Files:**
- Modify: `app/src/components/MtgaImportPanel.tsx` (banner copy)
- Modify: `scripts/README.md`

- [ ] **Step 1: Extend the Windows banner to mention Live scan**

In the `mode === 'full'` banner, append a sentence:
```tsx
{' '}On <strong>Mac</strong>, skip the file entirely — use <strong>Live scan</strong>
above (one-click launcher reads Arena directly).
```

- [ ] **Step 2: Update scripts/README.md**

Add a "macOS / cross-platform" section documenting: `launch-mac.command`, the password prompt, "open Arena → Collection tab," and that the app's Live scan talks to it on `127.0.0.1:17171`.

- [ ] **Step 3: Run the Python suite**

Run: `cd scripts && python -m pytest mtga_export/tests -q`
Expected: PASS (all).

- [ ] **Step 4: Run the full app gate**

Run: `npm test` (from repo root)
Expected: pipeline + app vitest + app build all green. (The app build is what catches TS errors vitest misses — see CLAUDE.md.)

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MtgaImportPanel.tsx scripts/README.md
git commit -m "docs(mtga): live-scan copy + cross-platform README"
```

---

## Self-review notes

- **Spec coverage:** ProcessMemory interface (Tasks 5–6, 9) ✓; zero-anchor autodetect (Task 7) ✓; card DB sqlite+scryfall+paths (Tasks 3–4) ✓; bridge API health/search/scan (Task 12) ✓; launchers (Task 13) ✓; `scan` source folded into MtgaImportPanel reusing resolveLibrary (Tasks 14–16) ✓; export formats frozen (Task 8) ✓; CLI parity + mtg.py shim (Task 10) ✓; spike gate (Task 1) ✓; tests at every layer ✓.
- **Spike-fed values:** `NAME_HINTS` and `MAX_REGION` in Task 9 are filled from Task 1's findings — not placeholders, explicit dependencies.
- **Type consistency:** `ScanResult.status` strings match the server's emitted statuses; `ScanRow` matches `parseMtgaCollectionJson`'s expected `{count,name,set,cn}`; `resolveLibrary(parsed, cards, KNOWN_SET_CODES)` matches the existing JSON-source call site.
- **Open item from spec:** target release version still unresolved (CLAUDE.md v0.14.4 vs specs v0.38) — confirm with the user before tagging.
