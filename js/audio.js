/**
 * Audio engine — muzik lalai (assets/music.mp3) & kesan bunyi
 */
const AudioEngine = (() => {
  const MUTE_KEY = 'quizJikeyMusicMuted';
  const DEFAULT_MUSIC = 'assets/music.mp3';
  const MUSIC_VOLUME = 0.20;

  let ctx = null;
  let isMuted = false;
  let sfxOn = true;
  let htmlAudio = null;
  let isPlaying = false;

  try {
    isMuted = localStorage.getItem(MUTE_KEY) === '1';
  } catch (_) {}

  function saveMutePref() {
    try {
      localStorage.setItem(MUTE_KEY, isMuted ? '1' : '0');
    } catch (_) {}
  }

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ensureAudio() {
    if (!htmlAudio) {
      htmlAudio = new Audio(DEFAULT_MUSIC);
      htmlAudio.loop = true;
      htmlAudio.volume = MUSIC_VOLUME;
      htmlAudio.addEventListener('ended', () => { isPlaying = false; });
    }
    return htmlAudio;
  }

  function stopHtmlAudio() {
    if (htmlAudio) {
      htmlAudio.pause();
      htmlAudio.currentTime = 0;
    }
    isPlaying = false;
  }

  async function startMusic() {
    if (isMuted) return;

    const audio = ensureAudio();
    try {
      await audio.play();
      isPlaying = true;
    } catch (_) {
      isPlaying = false;
    }
  }

  function stopMusic() {
    stopHtmlAudio();
  }

  function mute() {
    isMuted = true;
    saveMutePref();
    stopMusic();
    updateMusicIcon();
  }

  function unmute() {
    isMuted = false;
    saveMutePref();
    startMusic();
    updateMusicIcon();
  }

  function onMusicButtonClick() {
    if (!isMuted && !isPlaying) {
      startMusic();
      return;
    }
    if (isMuted) unmute();
    else mute();
  }

  function playTone(freq, duration, type, volume, startTime) {
    if (!ctx || freq === 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playSfx(type) {
    if (!sfxOn) return;
    init();
    const now = ctx.currentTime;

    if (type === 'correct') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'click') {
      playTone(800, 0.05, 'sine', 0.08, now);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.45);
      });
    } else if (type === 'perfect') {
      for (let i = 0; i < 8; i++) {
        playTone(523.25 * Math.pow(1.059, i * 2), 0.15, 'sine', 0.1, now + i * 0.06);
      }
    }
  }

  function toggleSfx() {
    sfxOn = !sfxOn;
    updateSfxIcon();
    return sfxOn;
  }

  function resumeOnInteraction() {
    const resume = () => {
      init();
      if (!isMuted && !isPlaying) startMusic();
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
  }

  function updateMusicIcon() {
    const btn = document.getElementById('musicToggle');
    const icon = document.getElementById('musicIcon');
    if (!btn || !icon) return;
    if (isMuted) {
      icon.textContent = '🔇';
      btn.title = 'Hidupkan muzik';
      btn.setAttribute('aria-label', 'Hidupkan muzik');
    } else {
      icon.textContent = '🔊';
      btn.title = 'Matikan muzik';
      btn.setAttribute('aria-label', 'Matikan muzik');
    }
  }

  function updateSfxIcon() {
    const btn = document.getElementById('sfxToggle');
    if (!btn) return;
    btn.classList.toggle('muted', !sfxOn);
    btn.title = sfxOn ? 'Matikan kesan bunyi' : 'Hidupkan kesan bunyi';
    btn.setAttribute('aria-label', sfxOn ? 'Matikan kesan bunyi' : 'Hidupkan kesan bunyi');
  }

  function initAudio() {
    updateMusicIcon();
    updateSfxIcon();
    if (!isMuted) startMusic();
  }

  return {
    init,
    initAudio,
    startMusic,
    stopMusic,
    playSfx,
    onMusicButtonClick,
    toggleSfx,
    updateSfxIcon,
    updateMusicIcon,
    resumeOnInteraction,
    get isMuted() { return isMuted; },
    get sfxOn() { return sfxOn; }
  };
})();
