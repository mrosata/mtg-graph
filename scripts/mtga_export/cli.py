from __future__ import annotations
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
