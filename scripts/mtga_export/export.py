from __future__ import annotations

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
