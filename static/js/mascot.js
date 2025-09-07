// Centralized mascot helper
const MASCOT_IMAGES = {
  male: '/static/img/teacher.png',
  female: '/static/img/teacherla.png'
};

function getMascotGender() {
  return localStorage.getItem('mascotGender') || 'male';
}

function applyMascotChoice() {
  try {
    const gender = getMascotGender();
    const img = MASCOT_IMAGES[gender] || MASCOT_IMAGES.male;
    document.querySelectorAll('.mascot-sprite').forEach(el => {
      el.style.backgroundImage = `url('${img}')`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundSize = el.dataset.bgSize || '400% 100%';
      // preserve any existing positioning behavior
    });
  } catch (e) {
    console.error('mascot.applyMascotChoice error:', e);
  }
}

function applyActiveStateToButtons() {
  try {
    const maleBtn = document.getElementById('mascotMaleBtn');
    const femaleBtn = document.getElementById('mascotFemaleBtn');
    const current = getMascotGender();
    if (maleBtn) maleBtn.classList.toggle('active', current === 'male');
    if (femaleBtn) femaleBtn.classList.toggle('active', current === 'female');
  } catch (e) { console.warn('applyActiveStateToButtons error', e); }
}

// Enhance setMascotGender to update UI and pick voice immediately
window.setMascotGender = async function(gender) {
  if (gender !== 'male' && gender !== 'female') return;
  localStorage.setItem('mascotGender', gender);
  applyMascotChoice();
  applyActiveStateToButtons();
  updateMascotTTSButton();

  // Speak a short confirmation using the chosen voice (if available)
  try {
    await ensureVoicesLoaded();
    const chosenVoice = chooseVoiceForGender(gender);
    const msg = gender === 'male' ? 'Mascot set to male voice' : 'Mascot set to female voice';
    // Use the chosen voice name (optional chaining) so speakNow will pick the exact voice
    speakNow(msg, { voiceName: chosenVoice?.name });
  } catch (e) {
    console.warn('Error while setting mascot gender voice:', e);
    // Fallback: speak without explicit voice
    try { speakNow(gender === 'male' ? 'Mascot set to male voice' : 'Mascot set to female voice'); } catch (err) { /* ignore */ }
  }
};

window.getMascotGender = getMascotGender;

// Auto-apply when DOM is ready and wire optional buttons
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyMascotChoice();
    const maleBtn = document.getElementById('mascotMaleBtn');
    const femaleBtn = document.getElementById('mascotFemaleBtn');
    if (maleBtn) maleBtn.addEventListener('click', (e) => { e.stopPropagation(); window.setMascotGender('male'); });
    if (femaleBtn) femaleBtn.addEventListener('click', (e) => { e.stopPropagation(); window.setMascotGender('female'); });
    applyActiveStateToButtons();
  });
} else {
  applyMascotChoice();
  const maleBtn = document.getElementById('mascotMaleBtn');
  const femaleBtn = document.getElementById('mascotFemaleBtn');
  if (maleBtn) maleBtn.addEventListener('click', (e) => { e.stopPropagation(); window.setMascotGender('male'); });
  if (femaleBtn) femaleBtn.addEventListener('click', (e) => { e.stopPropagation(); window.setMascotGender('female'); });
  applyActiveStateToButtons();
}

// --- Text-to-Speech (TTS) centralized feature ---
// Uses Web Speech API SpeechSynthesis to read mascot speech bubbles.
const synth = window.speechSynthesis || null;
let mascotTTSEnabled = (localStorage.getItem('mascotTTS') !== 'false');

// --- helper: ensure voices are loaded ---
let _voicesReady = false;
function ensureVoicesLoaded() {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    const voices = synth.getVoices();
    if (voices && voices.length) {
      _voicesReady = true;
      return resolve();
    }
    function onVoicesChanged() {
      _voicesReady = true;
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve();
    }
    synth.addEventListener('voiceschanged', onVoicesChanged);
    // Fallback timeout in case event doesn't fire
    setTimeout(() => { _voicesReady = true; resolve(); }, 1200);
  });
}

// Remove emojis and common pictographs so TTS doesn't read them aloud
function stripEmojis(text) {
  if (!text) return '';
  try {
    // Remove pictographic unicode ranges and variation selectors
    return String(text).replace(/[\p{Extended_Pictographic}\u2600-\u26FF\u2700-\u27BF]/gu, '').replace(/\s+/g, ' ').trim();
  } catch (e) {
    // Fallback for environments without Unicode property escapes
    return String(text).replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g,' ').trim();
  }
}

// Improved voice selection and logging
function chooseVoiceForGender(gender) {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  // Log available voices for debugging (name + lang)
  try {
    const table = voices.map(v => ({ name: v?.name || '<unknown>', lang: v?.lang || '<unknown>', default: !!v?.default }));
    console.log('Available TTS voices:');
    console.table(table);
  } catch (e) { /* ignore logging errors */ }

  const g = String(gender || '').toLowerCase();

  const femaleHints = ['female','samantha','alloy','kate','amy','victoria','zhiyu','sara','sarah','ava','google uk english female','zira'];
  const maleHints = ['male','david','daniel','mark','john','tom','matt','alex','mike','peter','google us english','google uk english male','ryan'];

  // 1) Try matching gender token in voice name
  let picked = null;
  if (g === 'female') {
    picked = voices.find(v => femaleHints.some(h => (v?.name || '').toLowerCase().includes(h)));
  } else if (g === 'male') {
    picked = voices.find(v => maleHints.some(h => (v?.name || '').toLowerCase().includes(h)));
  }

  // 2) If not found, prefer English voices (lang starts with 'en') and try to match hints there
  if (!picked) {
    const enVoices = voices.filter(v => (v?.lang || '').toLowerCase().startsWith('en'));
    if (g === 'female') {
      picked = enVoices.find(v => femaleHints.some(h => (v?.name || '').toLowerCase().includes(h)));
    } else if (g === 'male') {
      picked = enVoices.find(v => maleHints.some(h => (v?.name || '').toLowerCase().includes(h)));
    }
    // If still no gendered hint, pick any English voice
    if (!picked && enVoices.length) picked = enVoices[0];
  }

  // 3) Final fallback to the first available voice
  if (!picked) picked = voices[0] || null;

  return picked;
}

// Updated speakNow to strip emojis and choose voice based on mascot gender
async function speakNow(text, opts = {}) {
  if (!synth || !text || !mascotTTSEnabled) return;
  try {
    await ensureVoicesLoaded();
    synth.cancel();

    const raw = String(text);
    const cleaned = stripEmojis(raw);
    if (!cleaned) return;

    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.lang = opts.lang || 'en-US';
    utt.rate = typeof opts.rate === 'number' ? opts.rate : 1.0;
    utt.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1.0;
    utt.volume = typeof opts.volume === 'number' ? opts.volume : 1.0;

    // prefer voice by explicit name if provided
    if (opts.voiceName) {
      const v = synth.getVoices().find(vo => vo.name === opts.voiceName);
      if (v) utt.voice = v;
    }

    // otherwise choose based on mascot gender
    if (!utt.voice) {
      const gender = getMascotGender();
      const chosen = chooseVoiceForGender(gender);
      if (chosen) utt.voice = chosen;
    }

    synth.speak(utt);
  } catch (e) {
    console.warn('TTS speak error', e);
  }
}

// Public API
window.mascotSpeak = function(text, opts) {
  speakNow(text, opts || {});
};
window.enableMascotTTS = function() { mascotTTSEnabled = true; localStorage.setItem('mascotTTS','true'); updateMascotTTSButton(); };
window.disableMascotTTS = function() { mascotTTSEnabled = false; localStorage.setItem('mascotTTS','false'); updateMascotTTSButton(); };
window.toggleMascotTTS = function() { mascotTTSEnabled = !mascotTTSEnabled; localStorage.setItem('mascotTTS', mascotTTSEnabled ? 'true' : 'false'); updateMascotTTSButton(); };

// Inject small toggle UI so users can enable/disable read-aloud across pages
let _ttsButton = null;
function createMascotTTSButton() {
  if (_ttsButton) return _ttsButton;
  _ttsButton = document.createElement('button');
  _ttsButton.id = 'mascotTTSBtn';
  _ttsButton.setAttribute('aria-label','Toggle mascot read aloud');
  _ttsButton.style.cssText = 'position:fixed;right:12px;bottom:84px;z-index:2200;padding:8px 12px;border-radius:999px;border:none;background:linear-gradient(90deg,var(--accent),var(--accent-2));color:#fff;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(15,23,42,0.12)';
  _ttsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    window.toggleMascotTTS();
    // If enabling, speak current visible bubble immediately
    if (mascotTTSEnabled) {
      // delay slightly to allow enable state to persist
      setTimeout(() => speakCurrentVisibleBubble(), 150);
    } else {
      // cancel any ongoing speech when disabling
      if (synth) synth.cancel();
    }
  });
  document.body.appendChild(_ttsButton);
  updateMascotTTSButton();
  return _ttsButton;
}

function updateMascotTTSButton() {
  if (!_ttsButton) return;
  _ttsButton.textContent = mascotTTSEnabled ? '🔊 TTS ON' : '🔈 TTS OFF';
  _ttsButton.title = mascotTTSEnabled ? 'Disable mascot read-aloud' : 'Enable mascot read-aloud';
}

// Observe .speech-bubble nodes and auto-read their textual content when it changes
const __mascotObservers = new WeakMap();
function watchSpeechBubble(node) {
  if (!node || node.nodeType !== 1) return;
  if (__mascotObservers.has(node)) return;
  let lastText = node.textContent.trim();
  // Speak initial content when observer is attached and TTS enabled
  if (lastText && mascotTTSEnabled) {
    // small delay so voices have a chance to load on page open
    setTimeout(() => speakNow(lastText), 250);
  }
  const mo = new MutationObserver((mutations) => {
    const txt = node.textContent.trim();
    if (txt && txt !== lastText) {
      lastText = txt;
      // speak the updated content
      if (mascotTTSEnabled) {
        speakNow(txt);
      }
    }
  });
  mo.observe(node, { childList: true, subtree: true, characterData: true });
  __mascotObservers.set(node, mo);
}

// Speak the currently visible speech bubble (first visible .speech-bubble)
function speakCurrentVisibleBubble() {
  if (!mascotTTSEnabled) return;
  const bubbles = Array.from(document.querySelectorAll('.speech-bubble'));
  for (const b of bubbles) {
    const style = window.getComputedStyle(b);
    if (style.display === 'none' || style.visibility === 'hidden' || b.offsetParent === null) continue;
    const txt = b.textContent.trim();
    if (txt) { speakNow(txt); break; }
  }
}

// Find existing speech bubbles on the page and attach observers
function scanAndObserveSpeechBubbles() {
  // Find existing speech bubbles on the page and attach observers
  try {
    const bubbles = document.querySelectorAll('.speech-bubble');
    bubbles.forEach(b => watchSpeechBubble(b));
  } catch (e) {
    console.warn('scanAndObserveSpeechBubbles failed', e);
  }
}

// Observe added nodes to attach observers to new speech bubbles
let bodyObserver = null;
function startGlobalSpeechObserver() {
  if (bodyObserver) return;
  scanAndObserveSpeechBubbles();
  bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.speech-bubble')) {
          watchSpeechBubble(n);
        }
        const inner = n.querySelectorAll && n.querySelectorAll('.speech-bubble');
        inner && inner.forEach(watchSpeechBubble);
      });
    });
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// Initialize TTS UI and observer on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    createMascotTTSButton();
    startGlobalSpeechObserver();
  });
} else {
  createMascotTTSButton();
  startGlobalSpeechObserver();
}

// Export for other modules (preserve existing exports)
export { getMascotGender, applyMascotChoice };
