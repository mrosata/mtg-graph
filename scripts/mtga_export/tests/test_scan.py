from __future__ import annotations

import struct
from mtga_export.memory.fake import FakeMemory

def test_fake_pattern_scan_finds_pair():
    # one region: junk, then (grpId=70000, qty=3) at offset 8
    region = b"\x00" * 8 + struct.pack("<II", 70000, 3) + b"\x00" * 8
    mem = FakeMemory(regions=[(0x1000, region)])
    hits = mem.pattern_scan(struct.pack("<II", 70000, 3))
    assert hits == [0x1000 + 8]

def test_fake_read_bytes():
    mem = FakeMemory(regions=[(0x2000, b"ABCDEFGH")])
    assert mem.read_bytes(0x2002, 3) == b"CDE"

from mtga_export.scan import find_blocks, autodetect_collection, find_collection, card_purity

def _block_bytes(pairs):
    return b"".join(struct.pack("<II", k, v) for k, v in pairs)


def test_card_purity():
    assert card_purity({1: 1, 2: 1, 3: 1}, {1, 2}) == 2 / 3
    assert card_purity({}, {1}) == 0.0


def test_find_collection_pins_real_block_via_anchor():
    # Real collection (anchor card 70000 owned x3) plus a rarity-shaped DECOY
    # that contains the same card 70000 but with value 2 (rarity != quantity).
    coll = [(70000, 3)] + [(70001 + i, (i * 7) % 4 + 1) for i in range(150)]
    rarity = [(70000, 2)] + [(70001 + i, (i * 3) % 4 + 1) for i in range(150)]
    region = b"\x00" * 64 + _block_bytes(rarity) + b"\xff" * 8192 + _block_bytes(coll) + b"\x00" * 64
    mem = FakeMemory(regions=[(0x10000, region)])
    card_ids = {p[0] for p in coll} | {p[0] for p in rarity}
    status, blk = find_collection(mem, [(70000, 3)], card_ids)
    assert status == "ok"
    assert blk[70000] == 3          # our quantity, not the rarity value
    assert len(blk) >= 100


def test_find_collection_ambiguous_needs_second_anchor():
    # Two distinct pure blocks both contain (70000, 3) -> ambiguous.
    b1 = [(70000, 3)] + [(70001 + i, i % 4 + 1) for i in range(120)]
    b2 = [(70000, 3)] + [(80001 + i, i % 4 + 1) for i in range(120)]
    region = b"\x00" * 64 + _block_bytes(b1) + b"\xff" * 8192 + _block_bytes(b2) + b"\x00" * 64
    mem = FakeMemory(regions=[(0x10000, region)])
    card_ids = {p[0] for p in b1} | {p[0] for p in b2}
    status, payload = find_collection(mem, [(70000, 3)], card_ids)
    assert status == "ambiguous"


def test_find_collection_rejects_low_purity():
    # Block contains the anchor but its keys are mostly NOT real cards.
    blk = [(70000, 3)] + [(70001 + i, i % 4 + 1) for i in range(120)]
    region = b"\x00" * 64 + _block_bytes(blk) + b"\x00" * 64
    mem = FakeMemory(regions=[(0x10000, region)])
    status, payload = find_collection(mem, [(70000, 3)], {70000})  # only anchor is a real card
    assert status == "not_found"


def test_find_collection_needs_anchor():
    mem = FakeMemory(regions=[(0x10000, b"\x00" * 64)])
    assert find_collection(mem, [], {1})[0] == "need_anchor"

def test_find_blocks_extracts_dense_run():
    pairs = [(70000 + i, (i % 4) + 1) for i in range(60)]  # 60 valid pairs
    data = b"\x00" * 32 + _block_bytes(pairs) + b"\x00" * 400
    blocks = find_blocks(data, base=0)
    assert any(len(b) >= 50 for b in blocks)
    big = max(blocks, key=len)
    assert big[70000] == 1

def test_autodetect_picks_dominant_block():
    big = _block_bytes([(70000 + i, (i % 4) + 1) for i in range(200)])
    small = _block_bytes([(80000 + i, 1) for i in range(60)])
    region = b"\x00" * 64 + big + b"\xff" * 4096 + small
    mem = FakeMemory(regions=[(0x10000, region)])
    status, payload = autodetect_collection(mem)
    assert status == "ok"
    assert len(payload) >= 200

def test_autodetect_ambiguous_needs_anchor():
    a = _block_bytes([(70000 + i, 1) for i in range(120)])
    b = _block_bytes([(90000 + i, 1) for i in range(120)])
    region = b"\x00" * 64 + a + b"\xff" * 4096 + b
    mem = FakeMemory(regions=[(0x20000, region)])
    status, payload = autodetect_collection(mem)
    assert status == "ambiguous"
    # anchor in block B collapses it
    status2, coll = autodetect_collection(mem, anchors=[(90000, 1)])
    assert status2 == "ok"
    assert 90000 in coll

from mtga_export.scan import _score_block

def test_score_block_counts_satisfied_lower_bounds():
    block = {70000: 4, 70001: 2, 70004: 4}
    constraints = [
        {"gids": [70000], "count": 4},          # 4 >= 4  ✓
        {"gids": [70001], "count": 3},          # 2 >= 3  ✗
        {"gids": [70003, 70004], "count": 4},   # max(0,4)=4 >= 4  ✓ (multi-printing)
        {"gids": [99999], "count": 1},          # absent → 0 >= 1  ✗
    ]
    assert _score_block(block, constraints) == 2
