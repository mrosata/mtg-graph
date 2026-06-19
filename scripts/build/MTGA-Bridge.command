#!/bin/bash
# MTGA Bridge launcher (macOS). Double-click to start.
#
# What this does:
#   1. Runs the bundled `mtga-bridge` binary with admin privileges (memory
#      reads on Arena require root via task_for_pid).
#   2. Leaves the bridge listening on http://127.0.0.1:17171 until you close
#      this Terminal window or press Ctrl-C.
#
# First-launch friction: macOS Gatekeeper may say "MTGA-Bridge.command cannot
# be opened because the developer cannot be verified." Right-click → Open
# (once) to allow it.
cd "$(dirname "$0")" || exit 1
echo "Starting MTGA Bridge..."
echo
echo "  • You'll be asked for your Mac password — memory reads need admin."
echo "  • The bridge listens on http://127.0.0.1:17171"
echo "  • Go back to the web app and use the Live scan tab."
echo "  • Close this window (or Ctrl-C) to stop the bridge."
echo
osascript -e "do shell script \"'$PWD/mtga-bridge' --serve\" with administrator privileges"
