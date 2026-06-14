from __future__ import annotations

import struct
from typing import Iterator
from .base import ProcessMemory


class WindowsMemory(ProcessMemory):
    def __init__(self):
        import pymem  # imported lazily so non-Windows never needs it
        self._pymem = pymem
        self._pm = None

    def find_process(self, name_hints: list[str]) -> int | None:
        for hint in name_hints:
            try:
                self._pm = self._pymem.Pymem(hint)
                return self._pm.process_id
            except Exception:
                continue
        return None

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        return iter(())  # unused on Windows; pattern_scan is overridden below

    def read_bytes(self, addr: int, size: int) -> bytes:
        return self._pm.read_bytes(addr, size)

    def pattern_scan(self, pattern: bytes) -> list[int]:
        res = self._pm.pattern_scan_all(pattern, return_multiple=True)
        return list(res or [])
