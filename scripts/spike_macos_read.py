"""Throwaway feasibility probe — can we read live MTG Arena memory on macOS?

Works for either setup: the NATIVE macOS Arena (Epic Games build) or Arena
running under a Windows compat layer (Wine/CrossOver/Whisky).

Run on a Mac with Arena open and the Collection tab scrolled (so the collection
loads into memory):
    sudo python3 scripts/spike_macos_read.py

It prints candidate processes, attaches to each via task_for_pid, and reads 16
bytes from the first readable region. The result tells us whether the native
reader (Phase 4) is viable:

  * "SUCCESS region=… size=…" -> we can read Arena's memory. Note the process
    `comm` and region size; they feed memory/macos.py (NAME_HINTS, MAX_REGION).
  * "task_for_pid FAILED kr=…" on every candidate -> blocked. For a native,
    notarized Arena this almost certainly means the hardened runtime is denying
    the task port even as root (SIP/hardened-runtime). Memory reading is not
    available without disabling protections; we fall back to a different design.
"""
import ctypes
import ctypes.util
import os
import subprocess
import sys

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
libsys = ctypes.CDLL(ctypes.util.find_library("System"), use_errno=True)

KERN_SUCCESS = 0

def list_candidate_pids():
    # Wine/CrossOver process names vary; collect anything plausible.
    out = subprocess.run(["ps", "-axo", "pid=,comm="], capture_output=True, text=True).stdout
    cands = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        pid_str, _, comm = line.partition(" ")
        low = comm.lower()
        if any(h in low for h in ("mtga", "wine", "crossover", "whisky")):
            cands.append((int(pid_str), comm.strip()))
    return cands

def task_for_pid(pid):
    task = ctypes.c_uint32(0)
    # mach_task_self() is a fixed special port; expose it via libsys.
    mach_task_self = libsys.mach_task_self
    mach_task_self.restype = ctypes.c_uint32
    kr = libsys.task_for_pid(mach_task_self(), pid, ctypes.byref(task))
    return kr, task.value

def first_region(task):
    # mach_vm_region(task, &address, &size, VM_REGION_BASIC_INFO_64, info, &count, &object_name)
    address = ctypes.c_uint64(1)
    size = ctypes.c_uint64(0)
    VM_REGION_BASIC_INFO_64 = 9
    info = (ctypes.c_int * 16)()
    count = ctypes.c_uint32(16)
    object_name = ctypes.c_uint32(0)
    kr = libsys.mach_vm_region(
        task, ctypes.byref(address), ctypes.byref(size),
        VM_REGION_BASIC_INFO_64, ctypes.byref(info),
        ctypes.byref(count), ctypes.byref(object_name),
    )
    return kr, address.value, size.value

def read_bytes(task, addr, n):
    buf = (ctypes.c_char * n)()
    out = ctypes.c_uint64(0)
    kr = libsys.mach_vm_read_overwrite(
        task, ctypes.c_uint64(addr), ctypes.c_uint64(n),
        ctypes.cast(buf, ctypes.c_void_p), ctypes.byref(out),
    )
    return kr, bytes(buf[: out.value])

def main():
    if os.geteuid() != 0:
        print("Re-run with sudo (task_for_pid needs root).")
        return 2
    cands = list_candidate_pids()
    if not cands:
        print("No MTGA/Wine candidate processes found.")
        print("Is MTG Arena actually running right now? Find its real process name with:")
        print("    ps -axo pid,comm | grep -i -E 'mtga|arena|wizards'")
        print("…then tell me the name and I'll add it to the hint list.")
        return 1
    print("Candidates:")
    for pid, comm in cands:
        print(f"  {pid}\t{comm}")
    for pid, comm in cands:
        kr, task = task_for_pid(pid)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] task_for_pid FAILED kr={kr}")
            continue
        kr, addr, size = first_region(task)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] mach_vm_region FAILED kr={kr}")
            continue
        kr, data = read_bytes(task, addr, 16)
        if kr != KERN_SUCCESS:
            print(f"[{pid} {comm}] read FAILED kr={kr}")
            continue
        print(f"[{pid} {comm}] SUCCESS region=0x{addr:x} size={size} first16={data.hex()}")
        return 0
    print("\nAll candidates failed. Likely hardened-runtime/SIP blocking task_for_pid.")
    return 1

if __name__ == "__main__":
    sys.exit(main())
