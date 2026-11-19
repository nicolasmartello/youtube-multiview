// Multiview: three muted YouTube players; keys 1/2/3 unmute one and mute the others.
// Alt+L opens an input to replace the video in the selected slot (default: slot 1).
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
  hint.textContent = "Empty - press Alt+L to set a video";
  slotEl(slot).appendChild(hint);
}

// --- "Change video" dialog ---
const dialog = document.createElement("div");
dialog.id = "dialog";
dialog.hidden = true;
dialog.innerHTML = `<form><label></label><input type="text" placeholder="Paste a YouTube link" autocomplete="off"></form>`;
document.body.appendChild(dialog);
const dialogInput = dialog.querySelector("input");
const dialogLabel = dialog.querySelector("label");

function openDialog() {
  dialogLabel.textContent = `Replace video ${selectedSlot + 1}`;
  dialogInput.value = "";
  dialog.hidden = false;
  dialogInput.focus();
}

function closeDialog() {
  dialog.hidden = true;
  dialogInput.blur();
}

dialog.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = dialogInput.value.trim();
  const id = parseVideoId(raw);
  if (!id) { dialogInput.classList.add("invalid"); return; }
  saveVideo(selectedSlot, raw);
  showVideo(selectedSlot, id);
  closeDialog();
});
dialogInput.addEventListener("input", () => dialogInput.classList.remove("invalid"));

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
  if (e.altKey && e.code === "KeyL") { e.preventDefault(); if (apiReady) openDialog(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "1" || e.key === "2" || e.key === "3") {
    const slot = Number(e.key) - 1;
    setSelected(slot);
    setActive(slot === activeSlot ? -1 : slot); // pressing the active key again mutes all
  } else if (e.key === "0" || e.key === "m") {
    setActive(-1);
  }
});

setSelected(0);
