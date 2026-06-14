from __future__ import annotations

from typing import Iterator
from .base import ProcessMemory


class FakeMemory(ProcessMemory):
    def __init__(self, regions: list[tuple[int, bytes]]):
        self._regions = regions

    def find_process(self, name_hints: list[str]) -> int | None:
        return 1234

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        yield from self._regions

    def read_bytes(self, addr: int, size: int) -> bytes:
        for base, data in self._regions:
            if base <= addr < base + len(data):
                off = addr - base
                return data[off : off + size]
        return b""
