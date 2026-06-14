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

from mtga_export.scan import find_blocks, autodetect_collection

def _block_bytes(pairs):
    return b"".join(struct.pack("<II", k, v) for k, v in pairs)

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
