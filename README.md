# YouTube Multiview

A tiny internal tool for watching **multiple YouTube streams at the same time**, built for a vertical monitor. I use it to keep several live financial news channels (stock market coverage, markets, business news, etc.) on screen at once without the usual YouTube clutter.

Live: https://nicolasmartello.github.io/youtube-multiview/

## Features

- Three stacked players that fill the screen.
- Clean view: no chat, no player controls, no recommendations or other YouTube UI.
- Everything starts **muted**; you pick which stream you want to hear.
- Swap any stream on the fly by pasting a new YouTube link.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` | Unmute that video and mute the others. Press the same key again to mute all. |
| `0` or `m` | Mute everything. |
| `←` / `→` | Rewind / fast-forward the **selected** video by 10 seconds (`Shift` = 60 seconds). On live streams, rewinding needs DVR enabled and forward stops at the live edge. |
| `Alt+L` (`Option+L` on Mac) | Open an input to paste a YouTube link and replace the **selected** video. `Enter` confirms, `Esc` cancels. |

The selected video is the last one you clicked or the last number key you pressed (default: video 1). It is shown with a subtle white outline; the video with audio on gets a red outline.

## Configuration

- Default videos live in [`config.js`](config.js) (full URLs or 11-character video IDs).
- Videos changed with `Alt+L` are saved in the browser's `localStorage` and take precedence over the defaults. Clear the site data to go back to the defaults.

## Running locally

YouTube refuses to embed videos from `file://` pages (error 153), so serve the folder over HTTP:

```bash
./start.sh
```

Then open http://localhost:8765.

## Deployment

Plain static site (no build step). Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Notes

- Some channels disable embedding for their videos; those will show a YouTube error instead of the player.
- Autoplay only works because the players start muted.
