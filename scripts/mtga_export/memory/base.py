from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterator


class ProcessMemory(ABC):
    @abstractmethod
    def find_process(self, name_hints: list[str]) -> int | None: ...

    @abstractmethod
    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        """Yield (base_address, region_bytes) for readable regions."""

    @abstractmethod
    def read_bytes(self, addr: int, size: int) -> bytes: ...

    def pattern_scan(self, pattern: bytes) -> list[int]:
        hits: list[int] = []
        for base, data in self.iter_regions():
            start = 0
            while True:
                i = data.find(pattern, start)
                if i < 0:
                    break
                hits.append(base + i)
                start = i + 1
        return hits
