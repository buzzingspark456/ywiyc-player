/* ═══════════════════════════════════════════════════════
   TRACK LIST
═══════════════════════════════════════════════════════ */
const AUDIO_BASE_URL = (window.YWIYC_AUDIO_BASE_URL || "").trim();

function buildAudioPath(file) {
  const encodedFile = encodeURIComponent(file);
  if (!AUDIO_BASE_URL) return `audio/${encodedFile}`;
  return `${AUDIO_BASE_URL.replace(/\/$/, "")}/${encodedFile}`;
}

function isSameOriginUrl(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

const lessons = [
  { number: 1,  file: "Your Wish Is Your Command Disk 1.mp3" },
  { number: 2,  file: "Your Wish Is Your Command Disk 2.mp3" },
  { number: 3,  file: "Your Wish Is Your Command Disk 3.mp3" },
  { number: 4,  file: "Your Wish Is Your Command Disk 4.mp3" },
  { number: 5,  file: "Your Wish Is Your Command Disk 5.mp3" },
  { number: 6,  file: "Your Wish Is Your Command Disk 6.mp3" },
  { number: 7,  file: "Your Wish Is Your Command Disk 7.mp3" },
  { number: 8,  file: "Your Wish Is Your Command Disk 8.mp3" },
  { number: 9,  file: "Your Wish Is Your Command Disk 9.mp3" },
  { number: 10, file: "Your Wish Is Your Command Disk 10.mp3" },
  { number: 11, file: "Your Wish Is Your Command Disk 11.mp3" },
  { number: 12, file: "Your Wish Is Your Command Disk 12.mp3" },
  { number: 13, file: "Your Wish Is Your Command Disk 13.mp3" },
  { number: 14, file: "Your Wish is Your Command - How to Manifest Your Desires Disk 14.mp3" },
].map(l => ({
  ...l,
  title: `Lesson ${l.number}`,
  path:  buildAudioPath(l.file),
}));

/* ═══════════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════════ */
const audio          = document.getElementById("audio");

// Player UI
const currentTitle   = document.getElementById("currentTitle");
const currentFile    = document.getElementById("currentFile");
const audioStatus    = document.getElementById("audioStatus");
const artworkFrame   = document.getElementById("artworkFrame");
const playingRing    = document.getElementById("playingRing");

// Scrubber
const progressBar    = document.getElementById("progressBar");
const progressFill   = document.getElementById("progressFill");
const scrubberTrack  = document.getElementById("scrubberTrack");
const timeElapsed    = document.getElementById("timeElapsed");
const timeDuration   = document.getElementById("timeDuration");

// Controls
const playBtn        = document.getElementById("playBtn");
const prevBtn        = document.getElementById("prevBtn");
const nextBtn        = document.getElementById("nextBtn");
const rewindBtn      = document.getElementById("rewindBtn");
const forwardBtn     = document.getElementById("forwardBtn");
const shuffleBtn     = document.getElementById("shuffleBtn");
const repeatBtn      = document.getElementById("repeatBtn");
const muteBtn        = document.getElementById("muteBtn");
const shuffleDot     = document.getElementById("shuffleDot");
const repeatDot      = document.getElementById("repeatDot");

// Volume
const volumeSlider   = document.getElementById("volumeSlider");
const volumeFill     = document.getElementById("volumeFill");

// Playlist
const lessonList     = document.getElementById("lessonList");
const search         = document.getElementById("search");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const countEl        = document.getElementById("count");

// Modal
const shortcutsBtn   = document.getElementById("shortcutsBtn");
const shortcutsModal = document.getElementById("shortcutsModal");
const closeModalBtn  = document.getElementById("closeModalBtn");

// Visualizer
const canvas         = document.getElementById("visualizer");
const canvasCtx      = canvas.getContext("2d");

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let currentIndex   = Number(localStorage.getItem("ywiYC.currentIndex") || 0);
let isShuffle      = localStorage.getItem("ywiYC.isShuffle") === "true";
let isRepeat       = localStorage.getItem("ywiYC.isRepeat")  === "true";
let savedVolume    = Number(localStorage.getItem("ywiYC.volume") ?? 0.8);
let isMuted        = localStorage.getItem("ywiYC.isMuted")  === "true";
let filteredLessons = [...lessons];

// Web Audio
let audioCtx       = null;
let analyser       = null;
let dataArray      = null;
let source         = null;
let vizActive      = false;
let rafId          = null;

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
function fmt(secs) {
  if (!isFinite(secs) || isNaN(secs)) return "0:00";
  const h   = Math.floor(secs / 3600);
  const m   = Math.floor((secs % 3600) / 60);
  const s   = Math.floor(secs % 60);
  const ss  = s < 10 ? `0${s}` : s;
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : m;
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

/** Update the CSS custom property that positions the thumb overlay */
function setThumbPos(trackEl, percent) {
  trackEl.style.setProperty("--thumb-pos", `${Math.min(Math.max(percent, 0), 100)}%`);
}

function storageKey(name, lessonNumber = lessons[currentIndex].number) {
  return `ywiYC.${name}.${lessonNumber}`;
}

function saveCurrentPosition() {
  if (!lessons[currentIndex] || !isFinite(audio.currentTime)) return;
  const num = lessons[currentIndex].number;
  localStorage.setItem(storageKey("time", num), String(Math.floor(audio.currentTime)));
  if (isFinite(audio.duration) && audio.duration > 0) {
    localStorage.setItem(storageKey("duration", num), String(Math.floor(audio.duration)));
  }
  localStorage.setItem("ywiYC.currentIndex", String(currentIndex));
}

function showAudioStatus(message, isError = false) {
  audioStatus.textContent = message;
  audioStatus.classList.toggle("hidden", !message);
  audioStatus.classList.toggle("audio-status--error", isError);
}

/* ═══════════════════════════════════════════════════════
   VOLUME
═══════════════════════════════════════════════════════ */
function applyVolume() {
  audio.volume = isMuted ? 0 : savedVolume;
  const pct = isMuted ? 0 : savedVolume * 100;
  volumeFill.style.width = `${pct}%`;
  setThumbPos(volumeFill.parentElement, pct);
  // icon swap
  document.querySelector(".vol-icon--high").classList.toggle("hidden", isMuted || savedVolume === 0);
  document.querySelector(".vol-icon--muted").classList.toggle("hidden", !isMuted && savedVolume > 0);
}

function initVolume() {
  volumeSlider.value = savedVolume;
  applyVolume();
}

/* ═══════════════════════════════════════════════════════
   TOGGLE STATES (shuffle / repeat)
═══════════════════════════════════════════════════════ */
function syncToggles() {
  shuffleBtn.classList.toggle("active", isShuffle);
  repeatBtn.classList.toggle("active",  isRepeat);
}

/* ═══════════════════════════════════════════════════════
   WEB AUDIO VISUALIZER
═══════════════════════════════════════════════════════ */
function initAudioCtx() {
  if (audioCtx) return;
  if (!isSameOriginUrl(audio.currentSrc || audio.src)) return;
  try {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize       = 512;
    analyser.smoothingTimeConstant = 0.8;
    const bufLen = analyser.frequencyBinCount;
    dataArray    = new Uint8Array(bufLen);

    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  } catch (e) {
    console.warn("Web Audio init failed:", e);
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
}

function startViz() {
  initAudioCtx();
  if (audioCtx?.state === "suspended") audioCtx.resume();
  if (!vizActive) {
    vizActive = true;
    drawViz();
  }
}

function stopViz() {
  vizActive = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  // Clear canvas gently
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawViz() {
  if (!vizActive) return;
  rafId = requestAnimationFrame(drawViz);

  const W = canvas.width;
  const H = canvas.height;
  canvasCtx.clearRect(0, 0, W, H);

  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);

  // Only draw the bottom ~40% of frequency bins (bass + mids → more musical)
  const binCount  = Math.floor(dataArray.length * 0.5);
  const barW      = (W / binCount) * 1.4;
  let   x         = 0;

  for (let i = 0; i < binCount; i++) {
    const val     = dataArray[i];
    const pct     = val / 255;
    const barH    = H * pct * 0.72;
    if (barH < 2) { x += barW; continue; }

    const grad = canvasCtx.createLinearGradient(0, H, 0, H - barH);
    grad.addColorStop(0,    "rgba(42,157,143,0.0)");
    grad.addColorStop(0.25, "rgba(42,157,143,0.55)");
    grad.addColorStop(0.75, "rgba(233,196,106,0.9)");
    grad.addColorStop(1,    "rgba(248,220,130,1)");

    canvasCtx.fillStyle = grad;
    canvasCtx.beginPath();

    const r = Math.min(barW * 0.4, 5);
    canvasCtx.roundRect(x, H - barH, Math.max(barW - 2, 1), barH, [r, r, 0, 0]);
    canvasCtx.fill();

    x += barW;
  }
}

/* ═══════════════════════════════════════════════════════
   PLAYBACK STATE
═══════════════════════════════════════════════════════ */
function syncPlayState() {
  const playing = !audio.paused;
  const app     = document.getElementById("app");
  app.classList.toggle("is-playing", playing);

  // play/pause icons
  playBtn.querySelector(".play-icon").classList.toggle("hidden",  playing);
  playBtn.querySelector(".pause-icon").classList.toggle("hidden", !playing);
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");

  if (playing) {
    startViz();
  } else {
    stopViz();
  }
}

/* ═══════════════════════════════════════════════════════
   LOAD A TRACK
═══════════════════════════════════════════════════════ */
function setLesson(index, autoplay = false) {
  saveCurrentPosition();
  currentIndex = ((index % lessons.length) + lessons.length) % lessons.length;
  const lesson = lessons[currentIndex];

  audio.src = lesson.path;
  currentTitle.textContent = lesson.title;
  currentFile.textContent  = lesson.file;
  localStorage.setItem("ywiYC.currentIndex", String(currentIndex));
  showAudioStatus("");

  // Reset scrubber
  progressBar.value = 0;
  progressFill.style.width = "0%";
  setThumbPos(scrubberTrack, 0);
  timeElapsed.textContent  = "0:00";
  timeDuration.textContent = "0:00";

  renderList();

  if (autoplay) {
    if (audioCtx?.state === "suspended") audioCtx.resume();
    audio.play().catch(err => {
      console.warn("Playback blocked:", err);
      showAudioStatus("Tap Play again. Your browser blocked autoplay until you interact with the page.", true);
    });
  }
}

/* ═══════════════════════════════════════════════════════
   CONTROL ACTIONS
═══════════════════════════════════════════════════════ */
function togglePlay() {
  if (audio.paused) {
    if (audioCtx?.state === "suspended") audioCtx.resume();
    audio.play().catch(e => {
      console.warn(e);
      showAudioStatus("Audio could not start. Check that the MP3 files are online and reachable.", true);
    });
  } else {
    audio.pause();
  }
}

function playNext() {
  saveCurrentPosition();
  if (isShuffle) {
    let idx;
    do { idx = Math.floor(Math.random() * lessons.length); }
    while (idx === currentIndex && lessons.length > 1);
    setLesson(idx, true);
  } else {
    setLesson(currentIndex + 1, true);
  }
}

function playPrev() {
  saveCurrentPosition();
  // If more than 4s in, restart; otherwise go to previous
  if (audio.currentTime > 4) {
    audio.currentTime = 0;
  } else {
    setLesson(currentIndex - 1, true);
  }
}

function skip(secs) {
  audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + secs));
  saveCurrentPosition();
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem("ywiYC.isMuted", String(isMuted));
  applyVolume();
}

/* ═══════════════════════════════════════════════════════
   SCRUBBER / TIMELINE UPDATE
═══════════════════════════════════════════════════════ */
function updateScrubber() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  if (document.activeElement !== progressBar) {
    progressBar.value = pct;
    progressFill.style.width = `${pct}%`;
    setThumbPos(scrubberTrack, pct);
    timeElapsed.textContent = fmt(audio.currentTime);
  }
}

/* ═══════════════════════════════════════════════════════
   PLAYLIST RENDER
═══════════════════════════════════════════════════════ */
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function highlight(text, query) {
  if (!query) return esc(text);
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safeQuery})`, "gi");
  return esc(text).replace(re, "<mark>$1</mark>");
}

function renderList() {
  const query = search.value.trim().toLowerCase();
  clearSearchBtn.classList.toggle("hidden", query === "");

  filteredLessons = lessons.filter(l =>
    `${l.title} ${l.file}`.toLowerCase().includes(query)
  );
  countEl.textContent = String(filteredLessons.length);
  lessonList.innerHTML = "";

  if (!filteredLessons.length) {
    lessonList.innerHTML = `<p class="empty-msg">No lessons match "<strong>${esc(query)}</strong>"</p>`;
    return;
  }

  filteredLessons.forEach(lesson => {
    const realIdx   = lessons.indexOf(lesson);
    const isCurrent = realIdx === currentIndex;

    const savedTime     = Number(localStorage.getItem(storageKey("time", lesson.number))     || 0);
    const savedDuration = Number(localStorage.getItem(storageKey("duration", lesson.number)) || 0);

    let progPct    = 0;
    let isDone     = false;
    if (savedDuration > 0) {
      progPct = Math.min((savedTime / savedDuration) * 100, 100);
      isDone  = progPct > 95;
    }

    const doneBadge = isDone
      ? `<span class="done-badge">
           <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
             <polyline points="20 6 9 17 4 12"></polyline>
           </svg>
           <span class="done-text">Done</span>
         </span>`
      : "";

    const resumeBadge = !isDone && savedTime > 3
      ? `<span class="resume-badge">Saved ${fmt(savedTime)}</span>`
      : "";

    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = `lesson${isCurrent ? " active" : ""}`;
    btn.setAttribute("aria-current", isCurrent ? "true" : "false");
    btn.style.setProperty("--prog", `${progPct}%`);

    btn.innerHTML = `
      <span class="lesson-num">${lesson.number}</span>
      <span class="lesson-meta">
        <span class="lesson-meta__title">${highlight(lesson.title, query)}</span>
        <span class="lesson-meta__file">${highlight(lesson.file, query)}</span>
        ${resumeBadge}
      </span>
      ${doneBadge}
      <div class="lesson-progress-bar"></div>
    `;

    btn.addEventListener("click", () => setLesson(realIdx, true));
    lessonList.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════════════════
   MEDIA SESSION API
═══════════════════════════════════════════════════════ */
function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const lesson = lessons[currentIndex];
  navigator.mediaSession.metadata = new MediaMetadata({
    title:   lesson.title,
    artist:  "Kevin Trudeau",
    album:   "Your Wish Is Your Command",
    artwork: [{ src: "cover.png", sizes: "1200x675", type: "image/png" }],
  });
  navigator.mediaSession.setActionHandler("play",           togglePlay);
  navigator.mediaSession.setActionHandler("pause",          togglePlay);
  navigator.mediaSession.setActionHandler("previoustrack",  playPrev);
  navigator.mediaSession.setActionHandler("nexttrack",      playNext);
  navigator.mediaSession.setActionHandler("seekbackward",   () => skip(-10));
  navigator.mediaSession.setActionHandler("seekforward",    () => skip(10));
}

/* ═══════════════════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════════════════ */

// — Play/Pause
playBtn.addEventListener("click",   togglePlay);
prevBtn.addEventListener("click",   playPrev);
nextBtn.addEventListener("click",   playNext);
rewindBtn.addEventListener("click", () => skip(-10));
forwardBtn.addEventListener("click",() => skip(10));

// — Shuffle
shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  localStorage.setItem("ywiYC.isShuffle", String(isShuffle));
  syncToggles();
});

// — Repeat
repeatBtn.addEventListener("click", () => {
  isRepeat = !isRepeat;
  localStorage.setItem("ywiYC.isRepeat", String(isRepeat));
  syncToggles();
});

// — Mute
muteBtn.addEventListener("click", toggleMute);

// — Scrubber drag
progressBar.addEventListener("input", () => {
  const pct = Number(progressBar.value);
  progressFill.style.width = `${pct}%`;
  setThumbPos(scrubberTrack, pct);
  if (audio.duration) {
    timeElapsed.textContent = fmt((pct / 100) * audio.duration);
  }
});

progressBar.addEventListener("change", () => {
  if (audio.duration) {
    audio.currentTime = (Number(progressBar.value) / 100) * audio.duration;
    saveCurrentPosition();
    renderList();
  }
});

// — Volume slider
volumeSlider.addEventListener("input", () => {
  savedVolume = Number(volumeSlider.value);
  localStorage.setItem("ywiYC.volume", String(savedVolume));
  if (isMuted) {
    isMuted = false;
    localStorage.setItem("ywiYC.isMuted", "false");
  }
  applyVolume();
});

// — Search
search.addEventListener("input", renderList);
clearSearchBtn.addEventListener("click", () => {
  search.value = "";
  renderList();
  search.focus();
});

// — Modal
shortcutsBtn.addEventListener("click", toggleModal);
closeModalBtn.addEventListener("click", toggleModal);
shortcutsModal.addEventListener("click", e => {
  if (e.target === shortcutsModal) toggleModal();
});

function toggleModal() {
  shortcutsModal.classList.toggle("hidden");
}

// — Audio Events
audio.addEventListener("play",  syncPlayState);
audio.addEventListener("pause", syncPlayState);

audio.addEventListener("loadedmetadata", () => {
  showAudioStatus("");
  timeDuration.textContent = fmt(audio.duration);
  const num = lessons[currentIndex].number;
  localStorage.setItem(storageKey("duration", num), String(Math.floor(audio.duration)));

  // Restore saved position — resume exactly where left off
  const saved = Number(localStorage.getItem(storageKey("time", num)) || 0);
  if (saved > 3 && saved < audio.duration - 5) {
    audio.currentTime = saved;
    // Show resume hint briefly
    document.getElementById("eyebrowLabel").textContent = `Resuming from ${fmt(saved)}`;
    setTimeout(() => {
      document.getElementById("eyebrowLabel").textContent = "Now Playing";
    }, 3000);
  }

  setupMediaSession();
});

// Throttle localStorage writes — only every ~1s to avoid performance hit
let _lastSaveTime = 0;
audio.addEventListener("timeupdate", () => {
  updateScrubber();

  const now = Date.now();
  if (now - _lastSaveTime > 1000) {
    _lastSaveTime = now;
    saveCurrentPosition();
  }

  // Live update active card progress bar without full re-render
  if (audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    const activeCard = lessonList.querySelector(".lesson.active");
    if (activeCard) {
      activeCard.style.setProperty("--prog", `${pct}%`);
    }
  }
});

// Always save on pause/unload so position is never lost
audio.addEventListener("pause", () => {
  saveCurrentPosition();
  renderList();
});

window.addEventListener("beforeunload", () => {
  saveCurrentPosition();
});

audio.addEventListener("ended", () => {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNext();
  }
});

audio.addEventListener("error", e => {
  console.error("Audio error:", e);
  timeDuration.textContent = "Error";
  const lesson = lessons[currentIndex];
  showAudioStatus(`Cannot load audio for ${lesson.title}. The MP3 URL is missing or blocked: ${lesson.path}`, true);
});

// — Keyboard shortcuts
document.addEventListener("keydown", e => {
  // Don't intercept when typing in search
  if (document.activeElement === search) {
    if (e.key === "Escape") search.blur();
    return;
  }

  switch (e.key) {
    case " ":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowLeft":
      e.preventDefault();
      skip(-10);
      break;
    case "ArrowRight":
      e.preventDefault();
      skip(10);
      break;
    case "ArrowUp":
      e.preventDefault();
      volumeSlider.value = Math.min(1, Number(volumeSlider.value) + 0.05).toFixed(2);
      volumeSlider.dispatchEvent(new Event("input"));
      break;
    case "ArrowDown":
      e.preventDefault();
      volumeSlider.value = Math.max(0, Number(volumeSlider.value) - 0.05).toFixed(2);
      volumeSlider.dispatchEvent(new Event("input"));
      break;
    case "m":
    case "M":
      toggleMute();
      break;
    case "s":
    case "S":
      shuffleBtn.click();
      break;
    case "r":
    case "R":
      repeatBtn.click();
      break;
    case "/":
      e.preventDefault();
      search.focus();
      search.select();
      break;
    case "?":
      toggleModal();
      break;
  }
});

// — Canvas resize on orientation change
window.addEventListener("orientationchange", () => {
  setTimeout(resizeCanvas, 200);
});

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
initVolume();
syncToggles();
setLesson(currentIndex, false);
syncPlayState();
