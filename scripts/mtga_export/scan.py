from __future__ import annotations

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
