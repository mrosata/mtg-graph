from __future__ import annotations

import sqlite3

def _load_localizations(cur, tables: set) -> dict[int, str]:
    """Build {LocId: english text}, tolerant of the two known .mtga schemas.

    Windows builds:  Localizations(Id, Text, Format)
    macOS Epic build: Localizations_enUS(LocId, Formatted, Loc)  [Localizations is just LocId]
    """
    loc: dict[int, str] = {}
    if "Localizations_enUS" in tables:
        for locid, formatted, text in cur.execute(
            "SELECT LocId, Formatted, Loc FROM Localizations_enUS"
        ):
            # prefer the plain (Formatted=0) variant; fall back to any
            if text and (formatted == 0 or locid not in loc):
                loc[locid] = text
        return loc
    if "Localizations" in tables:
        try:
            rows = cur.execute(
                "SELECT Id, Text FROM Localizations WHERE Format LIKE '%en-US%' OR Format IS NULL"
            )
        except sqlite3.Error:
            rows = cur.execute("SELECT Id, Text FROM Localizations")
        for lid, text in rows.fetchall():
            if text:
                loc[lid] = text
    return loc


def parse_mtga_sqlite(path: str) -> dict[int, dict]:
    """Return {GrpId: {name, set, collector_number}} from one .mtga SQLite file."""
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        cur = conn.cursor()
        tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "Cards" not in tables:
            return {}
        loc = _load_localizations(cur, tables)
        if not loc:
            return {}
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
            # Native macOS Epic build keeps its downloaded data here.
            f"{home}/Library/Application Support/com.wizards.mtga/Downloads/Raw",
            # Windows-under-Wine wrappers.
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
    """Resolve grpId -> card. Order: cache, then Scryfall (authoritative names
    that match the app's graph artifact), then the local .mtga DB as an offline
    fallback. The local DB's multi-face card names diverge from Scryfall's, which
    breaks the app's name-based import, so it is only used when Scryfall is
    unreachable."""
    if cache_path.exists():
        try:
            data = json.loads(cache_path.read_text(encoding="utf-8"))
            return {int(k): v for k, v in data.items() if isinstance(v, dict)}
        except Exception:
            pass
    try:
        lookup = fetch_scryfall_db()
    except Exception:
        lookup = {}
    if not lookup:
        lookup = load_local_db(platform)
    if lookup:
        try:
            cache_path.write_text(json.dumps({str(k): v for k, v in lookup.items()}), encoding="utf-8")
        except Exception:
            pass
    return lookup

def name_to_id(lookup: dict[int, dict]) -> dict[str, int]:
    return {v["name"].lower(): k for k, v in lookup.items()}

_BASICS = {
    "plains", "island", "swamp", "mountain", "forest", "wastes",
    "snow-covered plains", "snow-covered island", "snow-covered swamp",
    "snow-covered mountain", "snow-covered forest",
}

def name_to_ids(lookup: dict[int, dict]) -> dict[str, list[int]]:
    """name (lowercased) -> every grpId that prints under it (all printings)."""
    out: dict[str, list[int]] = {}
    for gid, info in lookup.items():
        out.setdefault(info["name"].lower(), []).append(gid)
    return out

def is_basic(name: str) -> bool:
    return name.strip().lower() in _BASICS
