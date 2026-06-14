# MTGA native cross-platform collection exporter — design

Status: draft (awaiting user review)
Date: 2026-06-13
Depends on: `2026-06-08-mtga-import-design.md` (the app-side import this feeds)

## Goal

Let **macOS** users generate their MTG Arena collection so the app's existing
**"Collection JSON"** import works for them — not just Windows users. Today the
exporter (`scripts/mtg.py`) is Windows-only because it reads the live `MTGA.exe`
process via `pymem`. We make the exporter cross-platform by isolating the one
OS-specific primitive (process-memory reading) behind an interface with a native
macOS implementation, and we give the whole flow a real UI by folding a **live
scan** source into the app's existing `MtgaImportPanel`.

Two user-facing wins, both in service of "make this painless":

1. **Zero cards typed in the common case.** The collection is the largest dense
   block of `(card_id, quantity)` pairs in Arena's memory; we auto-detect it. The
   "anchor" cards become a rare disambiguation fallback, not a required step.
2. **No terminal.** A one-click launcher starts the local engine (with the GUI
   privilege prompt on macOS). The app detects the engine and drives the scan.

### Why this matters / context

The `2026-06-08` design established that the app already imports
`mtga_collection.json` (the exact `[{count,name,set,cn}]` shape `mtg.py` writes)
through `parseMtgaCollectionJson` → `resolveLibrary` → the library system. That
same design also documents (revision 2026-06-09) that **Mac/Linux Arena clients
stopped writing collection events to `Player.log` ~2021**. So for Mac users,
memory scanning is the *only* path to their collection — and the JSON it produces
already has a home in the app. This project closes that loop.

## Non-goals

- **Replacing the Player.log or Collection-JSON-file paths.** They stay. Live
  scan is an additional source.
- **Deck export.** The memory scan yields collection counts only (same as the
  JSON file). Decks remain a Player.log-only / Windows-only feature.
- **Owned-aware app features** (owned filter, deck building from owned). Already
  built on top of the library system; nothing to do here.
- **Wildcards, vault, currencies, draft tokens.** Out of scope.
- **Windows behavior change.** The Windows path keeps using `pymem` with its
  current algorithm; we only refactor it behind the interface.
- **Remote / hosted engine.** The bridge binds to `127.0.0.1` only. No network
  exposure, ever.

## Architecture overview

The only OS-specific code is the memory-read primitive. Everything else is shared.
The core move is a `ProcessMemory` interface; the scan/anchor/block algorithm is
written once against it.

```
scripts/mtga_export/                      (Python package — refactor of mtg.py)
  carddb.py        GrpId → {name,set,cn}. SQLite (.mtga) primary, Scryfall
                   fallback, JSON cache. Cross-platform path discovery.
  memory/
    base.py        ProcessMemory ABC: find_process, iter_regions,
                   pattern_scan, read_bytes
    windows.py     pymem-backed (current behavior, unchanged algorithm)
    macos.py       ctypes/mach: task_for_pid, mach_vm_region, mach_vm_read
    __init__.py    platform dispatch (sys.platform)
  scan.py          autodetect_collection() + anchor scan + find_blocks +
                   pick-best-block. Platform-agnostic (uses the interface only).
  export.py        json / txt / csv writers (unchanged formats)
  cli.py           interactive CLI, now cross-platform (parity with today)
  server.py        localhost HTTP bridge for the app UI
  __main__.py      `python -m mtga_export` → CLI; `--serve` → bridge
scripts/launch-mac.command                one-click macOS launcher (GUI sudo)
scripts/launch-windows.bat                one-click Windows launcher
scripts/spike_macos_read.py               throwaway feasibility probe (plan step 1)
```

`mtg.py` is preserved as a thin shim that imports and calls `mtga_export.cli` so
existing instructions / links keep working.

**De-risking note:** the card-DB layer needs no memory access and no Wine — the
Scryfall fallback is pure HTTP. So only `macos.py` carries Mac-specific risk;
everything else works on Mac on day one.

## The `ProcessMemory` interface

```python
class ProcessMemory(ABC):
    @abstractmethod
    def find_process(self, name_hints: list[str]) -> int | None: ...
    @abstractmethod
    def iter_regions(self) -> Iterator[tuple[int, int]]:  # (base, size)
        ...
    @abstractmethod
    def read_bytes(self, addr: int, size: int) -> bytes: ...
    def pattern_scan(self, pattern: bytes) -> list[int]:
        # default impl: iterate regions, bytes.find across each
        ...
```

- **windows.py** wraps the current `pymem` calls. `pattern_scan` delegates to
  `pm.pattern_scan_all`; `iter_regions` is unused on Windows (kept for parity).
- **macos.py** implements the same surface with mach syscalls via `ctypes`.

The existing `find_blocks` and anchor loop in `mtg.py` move into `scan.py`
verbatim except for swapping `pm.read_bytes` / `pm.pattern_scan_all` for the
interface methods.

## macOS reader (`macos.py`) — the risky part

`ctypes` against `libSystem`:

- `task_for_pid(mach_task_self(), pid, &task)` — **requires root.** Get the
  target task port.
- `find_process`: enumerate PIDs via `libproc` `proc_listpids` + `proc_pidpath`,
  match against name hints. Under Wine the process is **not** `MTGA.exe` natively
  — likely `wine64-preloader`, `MTGA.exe` as a Wine thread, or the
  CrossOver/Whisky helper. The spike (below) determines the real match; the hint
  list is configurable and the bridge can expose a "pick process" fallback.
- `iter_regions`: loop `mach_vm_region` over the task's address space, yielding
  readable regions. Restrict the scan to private/writable regions (where the
  mutable collection array lives) to keep pure-Python scanning tractable.
- `read_bytes`: `mach_vm_read_overwrite(task, addr, size, buf, &outsize)`.

### Feasibility spike — PLAN STEP 1, HARD GATE

`scripts/spike_macos_read.py`: given a PID, `task_for_pid` under sudo, read 16
bytes from one region, print them. Run against the live Arena-under-Wine process.

- **Pass** → proceed with the full build.
- **Fail** (hardened-runtime/SIP blocks the task port even as root) → STOP and
  reconsider before building anything else. Document the failure mode; the
  fallback is "run inside the Wine bottle" (the rejected option), revisited with
  data.

No UI, engine, or app code is written until the spike passes.

## Zero-anchor auto-detection (`scan.py`)

`find_blocks` already recognizes dense runs of `(k, v)` where `1000 ≤ k < 500000`
(plausible GrpId) and `1 ≤ v ≤ 400` (plausible quantity). The full collection is
the largest such block. So:

```
autodetect_collection(mem) ->
    scan private/writable regions for ALL dense (k,v) blocks (no anchor needed)
    rank by len(block)
    if top block is dominant (>= 2x the runner-up, and len > THRESHOLD):
        return ("ok", top_block)         # zero anchors
    elif candidates exist but ambiguous:
        return ("ambiguous", candidates) # ask for ONE anchor
    else:
        return ("not_found", [])
```

When ambiguous, a single user-supplied anchor `(grpId, qty)` filters candidates
to the block containing that exact pair — collapsing to one. This is the
"enter one card" path, now a fallback rather than the default. (`THRESHOLD` and
the dominance ratio are tuned during the spike against a real dump and pinned as
constants with a comment.)

## Card-DB layer (`carddb.py`)

Ported from `mtg.py` `load_card_database`, made cross-platform:

- **SQLite primary.** Same `Cards` + `Localizations` scan. Path discovery adds
  macOS bottle roots (globbed):
  - Whisky: `~/Library/Application Support/com.isaacmarovitz.Whisky/Bottles/*/drive_c/Program Files/Wizards of the Coast/MTGA/MTGA_Data/Downloads/Raw`
  - CrossOver: `~/Library/Application Support/CrossOver/Bottles/*/drive_c/.../MTGA_Data/Downloads/Raw`
  - Wine default: `~/.wine/drive_c/.../MTGA_Data/Downloads/Raw`
- **Scryfall fallback** (unchanged) — fully cross-platform, so the card DB never
  hard-fails on path discovery.
- **JSON cache** (`arena_id_lookup.json`) — unchanged.

## Bridge API (`server.py`)

`http.server` from stdlib (no new dependencies). Binds `127.0.0.1:<port>` (default
`17171`, configurable). Sends permissive CORS for `localhost` origins so the app
(dev `:5173` or built host) can call it.

- `GET /api/health` →
  `{ platform, version, running_as_root, arena_process_found, card_db_ready }`
- `GET /api/cards/search?q=<str>` → `[{ grpId, name, set, collectorNumber }]`
  (anchor search, backed by the Arena card DB — used only on the ambiguous path)
- `POST /api/scan` body `{ anchors?: [{ grpId, quantity }] }` →
  - `{ status: "ok", collection: [{count,name,set,cn}] }`
  - `{ status: "ambiguous", candidateCount: N }` — needs an anchor
  - `{ status: "not_found" }` | `{ status: "no_process" }` | `{ status: "needs_root" }`
- `POST /api/export` body `{ collection }` → writes json/txt/csv next to the
  engine; returns paths. (Optional convenience; the app imports directly from the
  `/api/scan` response, so file export is mainly for CLI parity.)

Scan is synchronous with a spinner in the UI (v1). SSE progress is noted as
optional future polish, not built.

## Ease-of-use: launchers

The app shows a launch card when `/api/health` is unreachable.

- **macOS** `launch-mac.command` (double-clickable): ensures a venv + deps, then
  launches the bridge with privilege escalation via
  `osascript -e 'do shell script "… -m mtga_export --serve" with administrator
  privileges'` — the standard macOS GUI password prompt, no terminal literacy
  needed. First run may also need a one-time "allow Terminal/Python to control
  your computer" / Full Disk Access acknowledgement; the launch card links to a
  short doc covering it.
- **Windows** `launch-windows.bat`: installs deps, runs `python -m mtga_export
  --serve` (UAC elevation if required). The existing `.exe` packaging can wrap
  this later; not required for v1.

Packaged single-file binaries (PyInstaller) are future polish — the launcher +
system Python covers v1.

## App integration — `scan` source in `MtgaImportPanel`

Fold into the existing component (`app/src/components/MtgaImportPanel.tsx`),
**reusing the existing `ready` → summary → confirm machinery untouched**.

- Extend `type Source = 'log' | 'json'` → `'log' | 'json' | 'scan'` and add a
  third `SourceButton` ("Live scan").
- New `handleScan()`: probe `GET /api/health`; then `POST /api/scan`. On
  `status: "ok"`, feed the returned array through the **existing** path:
  `resolveLibrary(parseMtgaCollectionJson(JSON.stringify(collection)), cards,
  KNOWN_SET_CODES)` → set `state = { kind: 'ready', libraryResult, … }`. The
  downstream summary/confirm/`importLibrary` flow is identical to the JSON file
  source — **zero new resolution code.**
- New small states for the scan source only:
  - **engine offline** → launch card (download/run `launch-mac.command`,
    "I've started it → Retry").
  - **needs root** → "Re-launch with the one-click launcher (it asks for your
    password)."
  - **no process** → "Open MTG Arena and visit the Collection tab, then Scan."
  - **scanning** → spinner.
  - **ambiguous** → inline card search (`GET /api/cards/search`, styled like the
    app's existing search) + quantity, "Add this card to narrow it down," then
    re-scan. Editing/removing the anchor re-scans; this is the only place the
    anchor UI appears.
  - **ok** → existing summary + confirm.

A new tiny client module `app/src/lib/mtgaScanBridge.ts` wraps the three fetch
calls with a typed surface and a configurable base URL
(`VITE_MTGA_BRIDGE_URL`, default `http://127.0.0.1:17171`).

The Windows "Player.log only carries collection on Windows" banner copy is
extended to mention that Mac users can now use **Live scan** instead of the
Windows-side exporter.

## End-to-end data flow (live scan)

```
User clicks "Live scan" in MtgaImportPanel
  → mtgaScanBridge.health()          (engine up? root? process found?)
  → mtgaScanBridge.scan()            POST /api/scan
       Python: autodetect_collection(ProcessMemory)
         ok        → resolve GrpId→{name,set,cn} via carddb → JSON array
         ambiguous → return status; UI collects ONE anchor → re-scan
  → parseMtgaCollectionJson(JSON) → resolveLibrary(…, cards) → LibraryImportResult
  → existing LibraryImportSummary → Confirm → libraryStore.importLibrary
```

## Error handling

Engine-side returns structured `status` codes (above); the UI maps each to
actionable copy. No exceptions cross the bridge — failures are status payloads.
Card-DB load failure falls back to Scryfall; only a total failure (no SQLite, no
network) yields `card_db_ready: false`, surfaced in the launch card.

## Testing

### Python (`scripts/mtga_export/tests/`)

- `carddb`: parse a fixture `.mtga` SQLite (tiny hand-built db with `Cards` +
  `Localizations`) → expected lookup. Scryfall fetch mocked.
- `scan`: feed synthetic memory bytes (a crafted region containing one dominant
  dense block + a small decoy) through a **fake `ProcessMemory`**; assert
  `autodetect_collection` returns the dominant block ("ok"); assert the
  two-similar-blocks case returns "ambiguous"; assert an anchor disambiguates.
- `export`: array → exact json/txt/csv bytes (formats frozen for app
  compatibility — the txt/csv match today's output).
- `server`: spin the handler with a fake engine; assert `/api/scan` shapes and
  CORS headers.
- The mach layer (`macos.py`) is validated by the **spike**, not unit tests
  (can't unit-test against a live foreign process). Guarded by
  `sys.platform == 'darwin'` and skipped elsewhere.

### App (`app/src/components/MtgaImportPanel.test.tsx`)

- `scan` source happy path: mock `mtgaScanBridge` → health ok, scan returns a
  small collection → summary renders → confirm calls `importLibrary`.
- engine-offline state: health rejects → launch card visible, confirm disabled.
- ambiguous → anchor search renders, adding a card triggers re-scan (mock
  returns "ok" the second time).
- Reuse existing `LibraryImportSummary` tests; don't retest summary rendering.

## Risks & open questions

- **R1 (gating): macOS `task_for_pid` may be blocked** by hardened-runtime/SIP on
  the Wine build. Mitigated by the spike-first gate. If it fails, the project
  pivots to "run inside the bottle."
- **R2: pure-Python full-memory scan may be slow** (Arena can hold GBs).
  Mitigated by restricting to private/writable regions and `bytes.find`. If still
  slow, narrow further or read in chunks; measured during the spike.
- **R3: Wine process name is unknown** until the spike. The hint list +
  "pick process" fallback covers drift across Whisky/CrossOver/Wine versions.
- **R4: first-run macOS TCC prompts** (automation / Full Disk Access). Documented
  in the launch card; cannot be fully automated away.
- **Open:** target release version (CLAUDE.md says v0.14.4; specs reference
  v0.38 — reconcile before tagging). Bridge default port (`17171` proposed).

## Out of scope / future

- PyInstaller single-file binaries for zero-Python installs.
- SSE scan progress streaming.
- Deck extraction from memory (counts only today).
- Linux native reader (`process_vm_readv`) — same interface, additive later.
