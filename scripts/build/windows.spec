# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the Windows MTGA Bridge binary.
# Build from repo root with:
#   cd scripts && pyinstaller --clean --noconfirm build/windows.spec
# Output: scripts/dist/mtga-bridge.exe — the file users double-click.

import os
import sys

# Resolve scripts/ regardless of where pyinstaller was invoked from.
SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(SPEC), '..'))
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from PyInstaller.utils.hooks import collect_submodules

hidden = collect_submodules('mtga_export')

a = Analysis(
    [os.path.join(os.path.dirname(SPEC), 'mtga_bridge_launcher.py')],
    pathex=[SCRIPTS_DIR],
    binaries=[],
    datas=[],
    hiddenimports=hidden + ['pymem', 'pymem.process'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='mtga-bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # Trigger UAC consent on launch so the binary can read MTGA process memory.
    uac_admin=True,
)
