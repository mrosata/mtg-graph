from __future__ import annotations

import ctypes
import ctypes.util
import subprocess
from typing import Iterator

from .base import ProcessMemory

# Spike (2026-06-13) confirmed task_for_pid + mach_vm_read succeed on the native
# macOS Epic build of MTG Arena. The process path was
#   /Users/Shared/Epic Games/MagicTheGathering/MTGA.app/Contents/MacOS/MTGA
# which `ps -axo comm` reports verbatim; the "mtga" substring matches it.
NAME_HINTS = ["mtga", "magicthegathering", "wine", "crossover", "whisky"]
# Scan regions up to this size. Diagnostics (2026-06-13) found the owned-collection
# block in a region between 256 MB and 1 GB (the old 256 MB cap skipped it); regions
# over 1 GB never held it. Reads are CHUNKED (below), so this cap bounds which
# regions we look at, not how much memory we allocate at once.
MAX_REGION = 1024 * 1024 * 1024
# Read memory in overlapping chunks so we never allocate a multi-hundred-MB buffer
# (that thrashed memory and stalled). Overlap by 7 bytes so an 8-byte pattern that
# straddles a chunk boundary is still found.
SCAN_CHUNK = 16 * 1024 * 1024

_libsys = ctypes.CDLL(ctypes.util.find_library("System"), use_errno=True)
_libsys.mach_task_self.restype = ctypes.c_uint32
KERN_SUCCESS = 0
VM_REGION_BASIC_INFO_64 = 9


class MacMemory(ProcessMemory):
    def __init__(self):
        self._task = None

    def find_process(self, name_hints: list[str]) -> int | None:
        hints = [h.lower() for h in name_hints]
        out = subprocess.run(
            ["ps", "-axo", "pid=,comm="], capture_output=True, text=True
        ).stdout
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            pid_str, _, comm = line.partition(" ")
            if not pid_str.isdigit():
                continue
            if any(h in comm.lower() for h in hints):
                pid = int(pid_str)
                if self._attach(pid):
                    return pid
        return None

    def _attach(self, pid: int) -> bool:
        task = ctypes.c_uint32(0)
        kr = _libsys.task_for_pid(_libsys.mach_task_self(), pid, ctypes.byref(task))
        if kr != KERN_SUCCESS:
            return False
        self._task = task.value
        return True

    def _iter_region_bounds(self) -> Iterator[tuple[int, int]]:
        """Yield (base, length) for every region, without reading any of it."""
        assert self._task is not None
        address = ctypes.c_uint64(1)
        while True:
            size = ctypes.c_uint64(0)
            info = (ctypes.c_int * 16)()
            count = ctypes.c_uint32(16)
            obj = ctypes.c_uint32(0)
            kr = _libsys.mach_vm_region(
                self._task,
                ctypes.byref(address),
                ctypes.byref(size),
                VM_REGION_BASIC_INFO_64,
                ctypes.byref(info),
                ctypes.byref(count),
                ctypes.byref(obj),
            )
            if kr != KERN_SUCCESS:
                break
            base, length = address.value, size.value
            yield base, length
            address = ctypes.c_uint64(base + length)

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
        # Read in chunks so a large region never becomes one giant allocation.
        for base, length in self._iter_region_bounds():
            if not 0 < length <= MAX_REGION:
                continue
            off = 0
            while off < length:
                data = self.read_bytes(base + off, min(SCAN_CHUNK, length - off))
                if data:
                    yield (base + off, data)
                off += SCAN_CHUNK

    def pattern_scan(self, pattern: bytes) -> list[int]:
        plen = len(pattern)
        hits: list[int] = []
        for base, length in self._iter_region_bounds():
            if not 0 < length <= MAX_REGION:
                continue
            off = 0
            while off < length:
                # overlap by plen-1 so a pattern straddling a chunk is still found
                data = self.read_bytes(base + off, min(SCAN_CHUNK + plen - 1, length - off))
                if data:
                    start = 0
                    while True:
                        i = data.find(pattern, start)
                        if i < 0:
                            break
                        hits.append(base + off + i)
                        start = i + 1
                off += SCAN_CHUNK
        return hits

    def read_bytes(self, addr: int, size: int) -> bytes:
        buf = (ctypes.c_char * size)()
        out = ctypes.c_uint64(0)
        kr = _libsys.mach_vm_read_overwrite(
            self._task,
            ctypes.c_uint64(addr),
            ctypes.c_uint64(size),
            ctypes.cast(buf, ctypes.c_void_p),
            ctypes.byref(out),
        )
        if kr != KERN_SUCCESS:
            return b""
        return bytes(buf[: out.value])
