"""Diagnostic v2 — confirm a TRUTH-FREE rule can pick the real owned-card dict.

v1 proved the collection lives at a clean (grpId, qty) block. v2 adds, per block:
  * card_purity = fraction of keys that resolve to a REAL card in the card DB
    (production CAN compute this; the truth file CANNOT be used in prod).
  * region size (to set the production MAX_REGION cap correctly).
Then it applies a candidate PROPOSED RULE (no truth) and checks the winner
against the Windows truth, so we know whether zero-anchor selection is reliable
or whether we must fall back to a user anchor.

Run with Arena open + Collection tab scrolled:
    sudo python3 scripts/diag_macos_collection.py
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

DIAG_MAX_REGION = 2 * 1024 * 1024 * 1024  # 2 GB per region for diagnostics


def main() -> int:
    if os.geteuid() != 0:
        print("Re-run with sudo.")
        return 2

    out_dir = Path(__file__).resolve().parent
    truth_path = Path.home() / "Downloads" / "mtga_collection.json"
    db = load_card_db(sys.platform, out_dir / "arena_id_lookup.json")
    n2i = name_to_id(db)
    card_ids = set(db.keys())  # every real arena card grpId (production-available)

    truth = json.load(truth_path.open())
    owned_qty: dict[int, int] = {}
    for x in truth:
        gid = n2i.get(str(x.get("name", "")).lower())
        if gid is not None:
            owned_qty[gid] = x.get("count")
    owned_ids = set(owned_qty)
    print(f"truth resolved {len(owned_ids)} grpIds; db has {len(card_ids)} cards")

    mem = M.MacMemory()
    pid = mem.find_process(M.NAME_HINTS)
    if not pid:
        print("MTGA process not found.")
        return 1
    print(f"attached to pid {pid}")

    # block -> (region_base, region_len_bytes, dict)
    blocks: list[tuple[int, int, dict[int, int]]] = []
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
        address = ctypes.c_uint64(base + length)
        if length > DIAG_MAX_REGION:
            continue
        data = mem.read_bytes(base, length)
        if not data:
            continue
        for blk in find_blocks(data, base):
            blocks.append((base, length, blk))

    def purity(blk):
        return sum(1 for k in blk if k in card_ids) / len(blk)

    def small_frac(blk, cap=8):
        return sum(1 for v in blk.values() if v <= cap) / len(blk)

    print(f"\ncandidate blocks: {len(blocks)}")
    print("\n=== top 20 by size: size | regionMB | card_purity | small<=8 | owned(truth) | qty_match | top_vals ===")
    for base, length, blk in sorted(blocks, key=lambda b: len(b[2]), reverse=True)[:20]:
        in_owned = sum(1 for k in blk if k in owned_ids)
        qm = sum(1 for k in blk if owned_qty.get(k) == blk[k])
        vals = collections.Counter(blk.values())
        print(f"  size={len(blk):6d} reg={length/1e6:7.1f}MB purity={purity(blk):.2f} "
              f"small={small_frac(blk):.2f} owned={in_owned:5d} qty_match={qm:5d} "
              f"top={dict(vals.most_common(5))}")

    # ---- PROPOSED TRUTH-FREE RULE ----
    # collection-like = keys are real cards (purity high) AND values look like
    # real quantities (mostly small). Among those, pick the largest.
    candidates = [
        (base, length, blk) for base, length, blk in blocks
        if purity(blk) >= 0.90 and small_frac(blk, 8) >= 0.95
    ]
    print(f"\ncollection-like candidates (purity>=0.90 & small>=0.95): {len(candidates)}")
    for base, length, blk in sorted(candidates, key=lambda b: len(b[2]), reverse=True)[:8]:
        qm = sum(1 for k in blk if owned_qty.get(k) == blk[k])
        print(f"  @0x{base:x} size={len(blk):6d} reg={length/1e6:.1f}MB "
              f"purity={purity(blk):.2f} qty_match_truth={qm}")

    if candidates:
        winner = max(candidates, key=lambda b: len(b[2]))
        wbase, wlen, wblk = winner
        qm = sum(1 for k in wblk if owned_qty.get(k) == wblk[k])
        agree = qm / len(wblk)
        print(f"\nRULE WINNER: @0x{wbase:x} size={len(wblk)} region={wlen/1e6:.1f}MB")
        print(f"  -> agrees with Windows truth on {qm}/{len(wblk)} = {agree:.1%} of entries")
        print("  -> VERDICT:", "ZERO-ANCHOR RULE WORKS ✅" if agree >= 0.85
              else "RULE STILL AMBIGUOUS — anchor fallback needed ❌")
    else:
        print("\nNo collection-like candidate under the rule — need to relax/redesign.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
