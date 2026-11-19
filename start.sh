#!/bin/sh
# YouTube embeds need http(s), not file://, so serve the folder locally.
cd "$(dirname "$0")" && echo "Open http://localhost:8765" && python3 -m http.server 8765
