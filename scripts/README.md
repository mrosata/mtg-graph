# Changelog - V1.2

- added priority for local card sql database, scryfall used as backup

- added progress bar for mem searching

- removed redundant comments on source code

- fixed issue where the .txt would list items multiple times

- added csv exports for Moxfield

- added card set identifiers to the .txt 

- and more small changes

imported collection to moxfield:
<img width="1901" height="962" alt="image" src="https://github.com/user-attachments/assets/4f784272-e2fc-4521-8aa1-9137c1029aa4" />

Better text file
- before: 
<img width="1080" height="467" alt="image" src="https://github.com/user-attachments/assets/c0bb05cd-4996-4b2a-8c12-7b4bba20aabe" />

- after: 
<img width="1112" height="480" alt="image" src="https://github.com/user-attachments/assets/9609dd74-69c2-4c85-9ea1-8a9c35aa7d6e" />

Progress bars: 
<img width="388" height="96" alt="image" src="https://github.com/user-attachments/assets/ccc5c324-3f62-430b-bc74-366c4f9314d9" />

# MTG Arena Live-Scan Helper

A small local helper that scans your live MTG Arena memory and serves your
collection to the mtg-graph web app over `http://127.0.0.1:17171`. Nothing is
exported or uploaded — the web app reads from the bridge directly.

## Install (recommended — prebuilt binary)

The latest binaries live on
[GitHub Releases](https://github.com/mrosata/mtg-graph/releases/latest).
No Python install required.

### macOS

1. Download `MTGA-Bridge-mac.zip` and unzip it.
2. **Right-click → Open** on `MTGA-Bridge.command` (only needed the first time —
   macOS Gatekeeper flags unsigned launchers).
3. Enter your Mac password when prompted (memory reads require admin).
4. Open MTG Arena and visit the **Collection** tab, scrolling through it once
   so your collection loads into memory.
5. Back in the mtg-graph app, open the MTGA import dialog and choose
   **Live scan**.

### Windows

1. Download `MTGA-Bridge-windows.exe`.
2. Double-click it. SmartScreen may say "Windows protected your PC" the first
   time — click **More info → Run anyway**.
3. Approve the UAC prompt (memory reads require admin).
4. Same Collection-tab + Live scan steps as above.

Close the terminal window (or press Ctrl-C) when you're done to stop the
bridge.

> **First-launch note.** The bridge downloads a ~10 MB card database from
> Scryfall the first time it runs, which can take 30-60 seconds before the
> "bridge on http://127.0.0.1:17171" message appears. The result is cached
> next to the binary so subsequent launches are instant.

## How the scan works (no card-name required)

In the app's Live scan view, the default mode is **Paste a deck**. Open any
deck you own in Arena, export it, and paste — the scanner uses the deck's card
counts to find your collection in memory. Falls back to **Search a card** if
the deck-anchored scan is inconclusive.

## Troubleshooting

- "Bridge not responding" — make sure `MTGA-Bridge.command` (Mac) or
  `MTGA-Bridge.exe` (Windows) is still running.
- "Couldn't find your collection" — open the Collection tab in Arena and
  scroll the full list once. Without that step, the collection isn't in
  memory yet.
- Mac says **"MTGA-Bridge is damaged"** — right-click → Open on the .command
  file rather than double-clicking. Or run
  `xattr -dr com.apple.quarantine /path/to/MTGA-Bridge.command` once.
- Windows SmartScreen blocks the .exe — click **More info → Run anyway**.

## For contributors — run from source

```bash
cd scripts
python -m pip install -r requirements.txt
python -m mtga_export --serve   # bridge mode (used by the web app)
python -m mtga_export            # interactive CLI (writes mtga_collection.{json,txt,csv})
```

The Python source lives at `scripts/mtga_export/`. Per-OS memory backends are
under `scripts/mtga_export/memory/` (`macos.py` uses mach + ctypes;
`windows.py` uses pymem). The HTTP bridge is `server.py`.

### Building the release binaries

PyInstaller specs are in `scripts/build/`. The
[`release-bridge`](../.github/workflows/release-bridge.yml) GitHub Actions
workflow builds them on a `bridge-v*` tag push and attaches the artifacts to a
GitHub Release. To build locally:

```bash
cd scripts
pip install pyinstaller
pyinstaller --clean --noconfirm build/macos.spec       # or build/windows.spec
# Output: scripts/dist/mtga-bridge (Mac) or mtga-bridge.exe (Windows)
```

## Files

- `mtga_export/` — current Python package (cross-platform).
- `build/` — PyInstaller specs + bundled launcher (`MTGA-Bridge.command`).
- `requirements.txt` — runtime Python dependencies (`pymem` is Windows-only).
- `mtg.py` — legacy single-file Windows-only exporter from the upstream fork.
  Kept for archival reasons; the supported entry point is `mtga_export`.
- `launch-mac.command` / `launch-windows.bat` — source-checkout launchers for
  contributors. End users should use the prebuilt binaries instead.
