from __future__ import annotations

import struct

GRP_MIN, GRP_MAX = 1000, 500000
QTY_MIN, QTY_MAX = 1, 400
MIN_BLOCK = 50          # minimum entries to count as a candidate block
MISS_LIMIT = 50         # consecutive invalid pairs that end a block
DOMINANCE = 2.0         # top block must be >= this * runner-up to auto-pick
WINDOW = 2 * 1024 * 1024  # bytes read around an anchor hit to reconstruct its block
MIN_PURITY = 0.85       # fraction of a block's keys that must be real card grpIds
DECK_MIN_MATCH = 6      # winner must satisfy at least this many deck constraints
DECK_LOCATE_BUDGET = 12 # cap on pattern-scans spent locating candidate blocks
COPY_OVERLAP = 0.8      # tied top blocks sharing >= this key fraction are copies

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


def card_purity(blk: dict[int, int], card_ids) -> float:
    """Fraction of a block's keys that are real card grpIds."""
    if not blk:
        return 0.0
    return sum(1 for k in blk if k in card_ids) / len(blk)


def _score_block(block: dict[int, int], constraints) -> int:
    """How many deck constraints `owned >= count` the block satisfies.
    A constraint carries every printing grpId of one card; the best printing wins.
    """
    n = 0
    for c in constraints:
        owned = max((block.get(g, 0) for g in c["gids"]), default=0)
        if owned >= c["count"]:
            n += 1
    return n


def _blocks_around(mem, addr: int, window: int) -> list[dict[int, int]]:
    """Read a window around a hit address and extract the dense blocks in it.

    Tries a centered read first (the block can extend before the hit); if that
    range is unmapped, falls back to reading forward from the hit.
    """
    half = window // 2
    for start in (max(0, addr - half), addr):
        data = mem.read_bytes(start, window)
        if data:
            return find_blocks(data, start)
    return []


def find_collection(mem, anchors, card_ids, min_purity: float = MIN_PURITY,
                    window: int = WINDOW):
    """Locate the owned-collection block by anchoring on cards the user owns.

    For the first anchor (grpId, qty) we pattern-scan memory for its 8 raw bytes
    — those occur essentially only where that card sits next to that exact count,
    i.e. the collection. We extract the block around each hit and keep blocks that
    contain ALL supplied anchors and whose keys are mostly real cards (purity).

    Returns (status, payload):
      'ok'          -> payload is the collection dict {grpId: qty}
      'ambiguous'   -> payload is the count of distinct candidate blocks
                       (a single anchor collided; supply another)
      'not_found'   -> payload is None
      'need_anchor' -> payload is None (no anchors supplied)
    """
    if not anchors:
        return ("need_anchor", None)
    gid0, qty0 = anchors[0]
    found: dict[tuple, dict[int, int]] = {}
    for addr in mem.pattern_scan(struct.pack("<II", gid0, qty0)):
        for blk in _blocks_around(mem, addr, window):
            if all(blk.get(a) == q for a, q in anchors) and card_purity(blk, card_ids) >= min_purity:
                sig = (len(blk), min(blk), max(blk), sum(blk.values()))
                found[sig] = blk
    if not found:
        return ("not_found", None)
    if len(found) > 1:
        return ("ambiguous", len(found))
    return ("ok", next(iter(found.values())))


def find_collection_by_deck(mem, constraints, card_ids, min_purity: float = MIN_PURITY,
                            window: int = WINDOW, min_match: int = DECK_MIN_MATCH,
                            locate_budget: int = DECK_LOCATE_BUDGET,
                            copy_overlap: float = COPY_OVERLAP):
    """Locate the collection from a pasted deck's `owned >= count` constraints.

    LOCATE: pattern-scan the highest-count cards first (owned is in [count, 4], so
    scan (gid, count..4) for every printing gid), stopping at the first card that
    yields any card-pure candidate block (an owned high-count card pins the block).
    SCORE: rank candidate blocks by how many constraints they satisfy. Bail to
    'inconclusive' only if too few matched, or if two GENUINELY DIFFERENT blocks
    tie for the top (can't tell which is the collection). Duplicate copies of the
    collection (which memory keeps a couple of) tie but overlap heavily — those are
    fine; pick the fullest.

    Returns (status, payload, meta) where meta = {"matched", "total"}:
      'ok'           -> payload is the collection dict {grpId: qty}
      'inconclusive' -> payload is None (too few matches or no clear winner)
      'not_found'    -> payload is None (no card-pure candidate located)
    """
    total = len(constraints)
    if not constraints:
        return ("not_found", None, {"matched": 0, "total": 0})

    ordered = sorted(constraints, key=lambda c: c["count"], reverse=True)
    candidates: dict[tuple, dict[int, int]] = {}
    budget = locate_budget
    for c in ordered:
        if budget <= 0:
            break
        for gid in c["gids"]:
            for v in range(c["count"], 5):  # owned value is somewhere in [count, 4]
                if budget <= 0:
                    break
                budget -= 1
                for addr in mem.pattern_scan(struct.pack("<II", gid, v)):
                    for blk in _blocks_around(mem, addr, window):
                        if card_purity(blk, card_ids) >= min_purity:
                            sig = (len(blk), min(blk), max(blk), sum(blk.values()))
                            candidates[sig] = blk
        if candidates:
            break  # an owned high-count card located the block; scoring does the rest

    if not candidates:
        return ("not_found", None, {"matched": 0, "total": total})

    scored = sorted(
        ((_score_block(b, constraints), card_purity(b, card_ids), len(b), i, b)
         for i, b in enumerate(candidates.values())),
        reverse=True,
    )
    best_score, _, _, _, best = scored[0]
    meta = {"matched": best_score, "total": total}

    # Too few of the deck's cards matched: the collection probably isn't loaded into
    # memory yet (exporting a deck leaves you in the deck builder, not the Collection
    # tab), or the deck is mostly cards you don't own.
    if best_score < min_match:
        return ("inconclusive", None, meta)

    # Blocks tied for the top score. Near-duplicates are just copies of the
    # collection -> pick the fullest (best). Genuinely different blocks tied at the
    # top (e.g. the collection vs the card->rarity table on an all-4-of deck) are
    # true ambiguity -> bail.
    top = [b for sc, _, _, _, b in scored if sc == best_score]
    if len(top) > 1:
        base = set(best)
        duplicates = all(
            len(base & set(b)) / max(len(base), len(b)) >= copy_overlap
            for b in top[1:]
        )
        if not duplicates:
            return ("inconclusive", None, meta)

    return ("ok", best, meta)
