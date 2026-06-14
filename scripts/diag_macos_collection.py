"""Diagnostic — locate the REAL owned-card dictionary in MTGA's memory, using the
Windows mtga_collection.json (ground truth) as an oracle.

Run with Arena open + Collection tab scrolled:
    sudo python3 scripts/diag_macos_collection.py

It walks ALL readable regions (read cap raised to 1 GB for diagnostics, vs the
256 MB production cap), runs the SAME find_blocks extraction we use in prod, and
for every candidate block reports how well its keys/values match your truth. Then
it dumps the raw bytes around a few known-owned grpIds so we can see the real
record layout if no clean (grpId, qty) block exists.

Reads truth from ~/Downloads/mtga_collection.json.
"""
from __future__ import annotations

import collections
import ctypes
import json
import os
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mtga_export.carddb import load_card_db, name_to_id
from mtga_export.scan import find_blocks
import mtga_export.memory.macos as M

DIAG_MAX_REGION = 1024 * 1024 * 1024  # 1 GB per region (prod is 256 MB)


def main() -> int:
    if os.geteuid() != 0:
        print("Re-run with sudo.")
        return 2

    out_dir = Path(__file__).resolve().parent
    truth_path = Path.home() / "Downloads" / "mtga_collection.json"
    if not truth_path.exists():
        print(f"Truth file not found at {truth_path}")
        return 1

    db = load_card_db(sys.platform, out_dir / "arena_id_lookup.json")
    n2i = name_to_id(db)
    truth = json.load(truth_path.open())

    owned_qty: dict[int, int] = {}
    unresolved = 0
    for x in truth:
        gid = n2i.get(str(x.get("name", "")).lower())
        if gid is None:
            unresolved += 1
            continue
        owned_qty[gid] = x.get("count")
    owned_ids = set(owned_qty)
    print(f"truth: {len(truth)} entries; resolved {len(owned_ids)} to grpId; {unresolved} unresolved")

    mem = M.MacMemory()
    pid = mem.find_process(M.NAME_HINTS)
    if not pid:
        print("MTGA process not found.")
        return 1
    print(f"attached to pid {pid}")

    # pick a few distinctive known-owned ids (qty 3/4) for byte dumps
    samples = [g for g in owned_ids if owned_qty[g] in (3, 4)][:5]
    dumps: dict[int, list[int] | None] = {g: None for g in samples}

    blocks: list[tuple[int, dict[int, int]]] = []
    total_bytes = 0
    big_regions = 0
    n_regions = 0

    address = ctypes.c_uint64(1)
    while True:
        size = ctypes.c_uint64(0)
        info = (ctypes.c_int * 16)()
        count = ctypes.c_uint32(16)
        obj = ctypes.c_uint32(0)
        kr = M._libsys.mach_vm_region(
            mem._task, ctypes.byref(address), ctypes.byref(size),
            M.VM_REGION_BASIC_INFO_64, ctypes.byref(info),
            ctypes.byref(count), ctypes.byref(obj),
        )
        if kr != M.KERN_SUCCESS:
            break
        base, length = address.value, size.value
        n_regions += 1
        total_bytes += length
        address = ctypes.c_uint64(base + length)
        if length > DIAG_MAX_REGION:
            big_regions += 1
            continue
        data = mem.read_bytes(base, length)
        if not data:
            continue
        for blk in find_blocks(data, base):
            blocks.append((base, blk))
        # collect byte dumps for sample ids (first occurrence anywhere)
        for gid in samples:
            if dumps[gid] is not None:
                continue
            idx = data.find(struct.pack("<I", gid))
            if idx >= 0:
                start = max(0, idx - 16)
                chunk = data[start : start + 64]
                ints = struct.unpack(f"<{len(chunk) // 4}I", chunk[: (len(chunk) // 4) * 4])
                dumps[gid] = (idx - start) // 4, list(ints)  # (position-of-gid-in-ints, ints)

    print(f"\nregions: {n_regions}, total {total_bytes / 1e6:.0f} MB, "
          f"regions over {DIAG_MAX_REGION / 1e9:.0f}GB skipped: {big_regions}")
    print(f"candidate blocks (size>50): {len(blocks)}")

    blocks.sort(key=lambda b: len(b[1]), reverse=True)
    print("\n=== top blocks (size, owned-key overlap, qty-matches-truth, top values) ===")
    for base, blk in blocks[:15]:
        in_owned = sum(1 for k in blk if k in owned_ids)
        qty_match = sum(1 for k in blk if owned_qty.get(k) == blk[k])
        vals = collections.Counter(blk.values())
        print(f"  @0x{base:x} size={len(blk):5d} owned={in_owned:5d}/{len(blk):<5d} "
              f"qty_match={qty_match:5d} top_vals={dict(vals.most_common(5))}")

    print("\n=== byte dump around known-owned grpIds (ints; * marks the grpId) ===")
    for gid, info2 in dumps.items():
        name = db.get(gid, {}).get("name", "?")
        if info2 is None:
            print(f"  grpId {gid} ({name}, truth qty {owned_qty[gid]}): NOT FOUND in scanned memory")
            continue
        pos, ints = info2
        rendered = " ".join((f"*{v}*" if i == pos else str(v)) for i, v in enumerate(ints))
        print(f"  grpId {gid} ({name}, truth qty {owned_qty[gid]}): {rendered}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
