// Multiview: three muted YouTube players; keys 1/2/3 unmute one and mute the others.
// Left/Right arrows seek the selected slot (Shift = longer jump).
// Alt+L opens a simple input to paste a YouTube link; Alt+S opens the (advanced) YouTube search.
// Either way the video replaces the one in the selected slot (default: slot 1).
const STORAGE_KEY = "multiview.videos";
const players = [null, null, null];
let activeSlot = -1;   // slot with audio on (-1 = everything muted)
let selectedSlot = 0;  // slot that "change video" applies to (last clicked / last number key)
let apiReady = false;

// Accepts watch?v=, youtu.be/, /live/, /embed/ URLs or a bare 11-char ID.
function parseVideoId(input) {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function loadVideos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === 3) return saved;
  } catch (_) { /* ignore corrupt storage */ }
  return [...window.DEFAULT_VIDEOS];
}

function saveVideo(slot, raw) {
  const videos = loadVideos();
  videos[slot] = raw;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

function slotEl(i) { return document.querySelector(`[data-slot="${i}"]`); }

function setSelected(slot) {
  selectedSlot = slot;
  document.querySelectorAll(".slot").forEach((el, i) => el.classList.toggle("selected", i === slot));
}

function setActive(slot) {
  activeSlot = slot;
  players.forEach((p, i) => {
    if (!p || !p.mute) return;
    if (i === slot) { p.unMute(); p.setVolume(100); } else { p.mute(); }
  });
  document.querySelectorAll(".slot").forEach((el, i) => el.classList.toggle("active", i === slot));
}

// Creates a player in the slot, or swaps the video if one already exists.
function showVideo(slot, id) {
  const hint = slotEl(slot).querySelector(".empty-hint");
  if (hint) hint.remove();
  if (players[slot]) { players[slot].loadVideoById(id); return; }
  players[slot] = new YT.Player(`player-${slot}`, {
    videoId: id,
    playerVars: {
      autoplay: 1, mute: 1, controls: 0, rel: 0, modestbranding: 1,
      iv_load_policy: 3, disablekb: 1, playsinline: 1, fs: 0,
    },
    events: {
      onReady: (e) => {
        if (slot === activeSlot) e.target.unMute(); else e.target.mute();
        e.target.playVideo();
      },
    },
  });
}

function showEmptyHint(slot) {
  const hint = document.createElement("div");
  hint.className = "empty-hint";
  hint.textContent = "Empty - press Alt+L to paste a video link";
  slotEl(slot).appendChild(hint);
}

// Seek the selected video by a number of seconds (negative = rewind).
// On live streams, rewinding works while DVR is enabled; forward stops at the live edge.
const SEEK_SHORT = 10;
const SEEK_LONG = 60;
function seekSelected(delta) {
  const p = players[selectedSlot];
  if (!p || !p.seekTo) return;
  p.seekTo(Math.max(0, p.getCurrentTime() + delta), true);
}

// --- Search modal ---
// Uses the YouTube Data API v3 (search.list). The API key is entered once and kept only in localStorage.
const KEY_STORAGE = "multiview.apiKey";
const dialog = document.createElement("div");
dialog.id = "dialog";
dialog.hidden = true;
dialog.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-head"><span class="modal-title"></span><button type="button" class="close" aria-label="Close">&times;</button></div>
    <form class="search-form">
      <input class="query" type="text" placeholder="Search YouTube or paste a link" autocomplete="off">
      <label class="live-toggle"><input type="checkbox" class="live-only"> Live only</label>
      <div class="dest" role="radiogroup" aria-label="Destination video">
        <span>Load into:</span>
        <label><input type="radio" name="dest" value="0"><span>Video 1</span></label>
        <label><input type="radio" name="dest" value="1"><span>Video 2</span></label>
        <label><input type="radio" name="dest" value="2"><span>Video 3</span></label>
      </div>
    </form>
    <form class="key-form" hidden>
      <p>Searching needs a free YouTube Data API key (see README). It is stored only in this browser.</p>
      <input class="key" type="password" placeholder="Paste API key" autocomplete="off">
      <button type="submit">Save key</button>
    </form>
    <p class="status"></p>
    <ul class="results"></ul>
    <button type="button" class="reset-key" hidden>Change API key</button>
  </div>`;
document.body.appendChild(dialog);
const $ = (sel) => dialog.querySelector(sel);
let mode = "link"; // "link" = paste a URL only, "search" = full YouTube search
const queryInput = $(".query"), liveOnly = $(".live-only"), statusEl = $(".status"), resultsEl = $(".results");
const keyForm = $(".key-form"), searchForm = $(".search-form"), resetKeyBtn = $(".reset-key");

function getKey() { try { return localStorage.getItem(KEY_STORAGE) || ""; } catch (_) { return ""; } }

function decodeHtml(s) { return new DOMParser().parseFromString(s, "text/html").documentElement.textContent; }

function openDialog(newMode) {
  mode = newMode;
  dialog.querySelector(".modal").classList.toggle("link-mode", mode === "link");
  $(".modal-title").textContent = mode === "link" ? "Paste a YouTube link" : "Search YouTube";
  // Destination defaults to the currently selected video.
  dialog.querySelector(`input[name="dest"][value="${selectedSlot}"]`).checked = true;
  queryInput.placeholder = mode === "link" ? "https://www.youtube.com/watch?v=..." : "Search YouTube or paste a link";
  queryInput.classList.remove("invalid");
  queryInput.value = "";
  resultsEl.textContent = "";
  statusEl.textContent = "";
  dialog.hidden = false;
  refreshKeyUi();
}

function refreshKeyUi() {
  // Link mode never needs the API key.
  const needsKey = mode === "search" && !getKey();
  keyForm.hidden = !needsKey;
  searchForm.hidden = needsKey;
  resetKeyBtn.hidden = mode !== "search" || needsKey;
  (needsKey ? $(".key") : queryInput).focus();
}

function closeDialog() {
  dialog.hidden = true;
  document.activeElement && document.activeElement.blur();
}

// Slot the chosen video lands in: the destination picked in the modal (defaults to the selected slot).
function targetSlot() {
  const checked = dialog.querySelector('input[name="dest"]:checked');
  return checked ? Number(checked.value) : selectedSlot;
}

// Loads a video into the target slot and remembers it.
function chooseVideo(id) {
  const slot = targetSlot();
  saveVideo(slot, `https://www.youtube.com/watch?v=${id}`);
  showVideo(slot, id);
  setSelected(slot);
  closeDialog();
}

function renderResults(items) {
  resultsEl.textContent = "";
  if (!items.length) { statusEl.textContent = "No embeddable results."; return; }
  statusEl.textContent = "";
  items.forEach((it) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    const img = document.createElement("img");
    img.src = it.snippet.thumbnails.medium.url;
    img.alt = "";
    const info = document.createElement("span");
    info.className = "info";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = decodeHtml(it.snippet.title);
    const chan = document.createElement("span");
    chan.className = "channel";
    chan.textContent = decodeHtml(it.snippet.channelTitle);
    info.append(title, chan);
    if (it.snippet.liveBroadcastContent === "live") {
      const live = document.createElement("span");
      live.className = "live-badge";
      live.textContent = "LIVE";
      info.append(live);
    }
    btn.append(img, info);
    btn.addEventListener("click", () => chooseVideo(it.id.videoId));
    li.appendChild(btn);
    resultsEl.appendChild(li);
  });
}

async function search(q) {
  statusEl.textContent = "Searching...";
  resultsEl.textContent = "";
  const params = new URLSearchParams({
    part: "snippet", type: "video", videoEmbeddable: "true", maxResults: "12", q, key: getKey(),
  });
  if (liveOnly.checked) params.set("eventType", "live");
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : `HTTP ${res.status}`);
    renderResults(data.items || []);
  } catch (err) {
    statusEl.textContent = `Search failed: ${decodeHtml(String(err.message))}`;
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) return;
  if (mode === "link") {
    const linkId = parseVideoId(q);
    if (!linkId) { queryInput.classList.add("invalid"); return; }
    chooseVideo(linkId);
    return;
  }
  const id = /youtu/.test(q) ? parseVideoId(q) : null; // a pasted YouTube link loads directly
  if (id) chooseVideo(id); else search(q);
});

keyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const k = $(".key").value.trim();
  if (!k) return;
  try { localStorage.setItem(KEY_STORAGE, k); } catch (_) { /* storage unavailable */ }
  $(".key").value = "";
  refreshKeyUi();
});

resetKeyBtn.addEventListener("click", () => {
  try { localStorage.removeItem(KEY_STORAGE); } catch (_) { /* ignore */ }
  resultsEl.textContent = "";
  statusEl.textContent = "";
  refreshKeyUi();
});

queryInput.addEventListener("input", () => queryInput.classList.remove("invalid"));
$(".close").addEventListener("click", closeDialog);
dialog.addEventListener("mousedown", (e) => { if (e.target === dialog) closeDialog(); }); // click on backdrop

// Arrow keys move focus through the results.
dialog.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const btns = [...resultsEl.querySelectorAll("button")];
  if (!btns.length) return;
  e.preventDefault();
  const i = btns.indexOf(document.activeElement);
  const next = e.key === "ArrowDown" ? Math.min(i + 1, btns.length - 1) : i - 1;
  (next < 0 ? queryInput : btns[next]).focus();
});

// Clicking a slot selects it (audio is unchanged).
document.querySelectorAll(".slot").forEach((el, i) => el.addEventListener("click", () => setSelected(i)));

// Called by the YouTube IFrame API once it has loaded.
window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  loadVideos().forEach((raw, i) => {
    const id = parseVideoId(raw);
    if (id) showVideo(i, id); else showEmptyHint(i);
  });
};

document.addEventListener("keydown", (e) => {
  if (!dialog.hidden) {
    if (e.key === "Escape") closeDialog();
    return; // let typing go to the input
  }
  // Alt+L: use e.code because Alt changes e.key on macOS.
  if (e.altKey && e.code === "KeyL") { e.preventDefault(); if (apiReady) openDialog("link"); return; }
  if (e.altKey && e.code === "KeyS") { e.preventDefault(); if (apiReady) openDialog("search"); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    seekSelected((e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? SEEK_LONG : SEEK_SHORT));
    return;
  }
  if (e.key === "1" || e.key === "2" || e.key === "3") {
    const slot = Number(e.key) - 1;
    setSelected(slot);
    setActive(slot === activeSlot ? -1 : slot); // pressing the active key again mutes all
  } else if (e.key === "0" || e.key === "m") {
    setActive(-1);
  }
});

setSelected(0);
