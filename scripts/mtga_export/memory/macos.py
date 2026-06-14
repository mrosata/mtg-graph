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
# Cap per-region reads so the pure-Python block scan stays tractable. The Mono/
# managed heap that holds the collection is segmented into chunks well under this;
# bump it if a live scan can't find the collection (see plan Task 11).
MAX_REGION = 256 * 1024 * 1024

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

    def iter_regions(self) -> Iterator[tuple[int, bytes]]:
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
            if 0 < length <= MAX_REGION:
                data = self.read_bytes(base, length)
                if data:
                    yield (base, data)
            address = ctypes.c_uint64(base + length)

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
