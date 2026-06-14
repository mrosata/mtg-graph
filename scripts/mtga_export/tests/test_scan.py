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
