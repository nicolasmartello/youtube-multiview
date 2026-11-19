# youtube-multiview

Internal tool: three stacked YouTube players (no chat, no controls), all muted.

- `./start.sh`, then open http://localhost:8765
- Keys `1` / `2` / `3`: unmute that video (others get muted). Press again, `0` or `m` to mute all.
- `Alt+L`: paste a YouTube link to replace the selected video (click a video or press 1/2/3 to select; default is 1). Enter confirms, Esc cancels. Saved in localStorage; defaults live in `config.js`.
