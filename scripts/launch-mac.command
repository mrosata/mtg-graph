#!/bin/bash
# Double-click to start the MTGA bridge. Prompts for your password (memory
# reading needs admin rights), then leaves a Terminal window running the bridge.
cd "$(dirname "$0")" || exit 1
python3 -m pip install --quiet --user -r requirements.txt
osascript -e 'do shell script "cd \"'"$PWD"'\" && /usr/bin/python3 -m mtga_export --serve" with administrator privileges'
