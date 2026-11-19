# YouTube Multiview

A tiny internal tool for watching **multiple YouTube streams at the same time**, built for a vertical monitor. I use it to keep several live financial news channels (stock market coverage, markets, business news, etc.) on screen at once without the usual YouTube clutter.

Live: https://nicolasmartello.github.io/youtube-multiview/

## Features

- Three stacked players that fill the screen.
- Clean view: no chat, no player controls, no recommendations or other YouTube UI.
- Everything starts **muted**; you pick which stream you want to hear.
- Swap any stream on the fly by pasting a YouTube link.
- Power users: search YouTube from inside the page (optionally live streams only).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` | Unmute that video and mute the others. Press the same key again to mute all. |
| `0` or `m` | Mute everything. |
| `←` / `→` | Rewind / fast-forward the **selected** video by 10 seconds (`Shift` = 60 seconds). On live streams, rewinding needs DVR enabled and forward stops at the live edge. |
| `Alt+L` (`Option+L` on Mac) | Open a simple input, paste a YouTube link and press `Enter` to load it into the **selected** video. `Esc` cancels. |
| `Alt+S` (`Option+S` on Mac) | Advanced: open the YouTube search modal. Choose which video the result loads into (defaults to the selected one), type and press `Enter`, use `↑`/`↓` to move through the results, `Enter` to pick one. Needs an API key (see below). |

The selected video is the last one you clicked or the last number key you pressed (default: video 1). It is shown with a subtle white outline; the video with audio on gets a red outline.

## Search setup (optional, one time)

Only needed for `Alt+S`. Pasting links with `Alt+L` works without any setup. Search uses the YouTube Data API v3, which needs a free API key:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **YouTube Data API v3**.
2. Create an API key (Credentials > Create credentials > API key). Recommended: restrict it to the YouTube Data API and to your site's HTTP referrer.
3. Press `Alt+S` in the app and paste the key when asked.

The key is stored only in your browser's `localStorage`; it is never committed to the repo. Each search costs 100 quota units out of the free 10,000 per day (about 100 searches). Results are limited to embeddable videos so they won't show the "error 153" screen.

## Configuration

- Default videos live in [`config.js`](config.js) (full URLs or 11-character video IDs).
- Videos loaded with `Alt+L` or `Alt+S` are saved in the browser's `localStorage` and take precedence over the defaults. Clear the site data to go back to the defaults.

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
