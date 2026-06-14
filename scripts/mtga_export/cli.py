from __future__ import annotations
import difflib
import sys
from pathlib import Path

from .carddb import load_card_db, name_to_id
from .memory import get_memory
from .scan import find_collection
from .export import resolve_rows, write_all

NAME_HINTS = ["MTGA.exe", "mtga", "magicthegathering", "wine", "crossover", "whisky"]


def _resolve_card(n2i: dict[str, int], raw: str) -> int | None:
    key = raw.strip().lower()
    if key in n2i:
        return n2i[key]
    match = difflib.get_close_matches(key, n2i.keys(), n=1, cutoff=0.6)
    if match:
        print(f"    using '{match[0].title()}'")
        return n2i[match[0]]
    return None


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

    n2i = name_to_id(db)
    card_ids = set(db)
    print("\nTo find your collection, name ONE card you own and how many you have.")
    print("(A card you own 3 or 4 of works best.)")

    anchors: list[tuple[int, int]] = []
    payload = None
    while True:
        gid = _resolve_card(n2i, input("  Card you own: "))
        if gid is None:
            print("    Card not found — check spelling.")
            continue
        try:
            qty = int(input("    Quantity you own: "))
            if qty < 1:
                raise ValueError
        except ValueError:
            print("    Enter a whole number >= 1.")
            continue

        anchors.append((gid, qty))
        print("  Scanning memory (~15-30s)...")
        status, payload = find_collection(mem, anchors, card_ids)
        if status == "ok":
            break
        if status == "ambiguous":
            print("  That card alone wasn't unique — add one more card to narrow it down.")
            continue
        print("  Couldn't locate your collection from that card.")
        print("  Try a different card you own (ideally one you have 3-4 of).")
        anchors.pop()

    rows = resolve_rows(payload, db)
    paths = write_all(rows, out_dir)
    print(f"\nExported {len(rows)} entries:")
    for k, p in paths.items():
        print(f"  {k}: {p}")
    return 0
