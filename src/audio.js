/* ==========================================================================
   ALIF MANIFESTO — Scroll-Driven Procedural Web Audio Soundscape Engine
   ========================================================================== */

const AudioCtx = window.AudioContext || window.webkitAudioContext;

function createAudioEngine() {
  if (!AudioCtx) {
    return {
      start: () => false,
      toggle: () => false,
      setProgress: () => {},
      isEnabled: () => false
    };
  }

  let ctx = null;
  let masterGain = null;
  let trafficGain = null;
  let trafficFilter = null;
  let calmGain = null;
  let breezeGain = null;
  let railHumGain = null;

  let enabled = false;
  let started = false;
  let currentLevel = 0;
  let hornTimer = null;
  let birdTimer = null;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function createNoiseBuffer(audioCtx, seconds, brown) {
    const length = Math.floor(audioCtx.sampleRate * seconds);
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.03 * white) / 1.03;
        data[i] = last * 3.2;
      } else {
        last = 0.85 * last + 0.15 * white;
        data[i] = last * 1.8;
      }
    }
    return buffer;
  }

  function playDistantHorn(intensity) {
    const now = ctx.currentTime;
    const dur = 0.22 + Math.random() * 0.24;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 620 + Math.random() * 140;
    f.Q.value = 2.4;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    const base = Math.random() > 0.5 ? 392 : 415;
    osc1.frequency.value = base;
    osc2.frequency.value = base * 1.25;

    const vol = 0.032 * clamp(intensity, 0, 1);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.025);
    g.gain.setValueAtTime(vol, now + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(f);
    osc2.connect(f);
    f.connect(g);
    g.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.02);
    osc2.stop(now + dur + 0.02);
  }

  function scheduleHorn() {
    clearTimeout(hornTimer);
    const delay = 2600 + Math.random() * 4200;
    hornTimer = setTimeout(() => {
      if (enabled && ctx && ctx.state === 'running' && currentLevel < 0.42) {
        playDistantHorn(1 - currentLevel / 0.42);
      }
      scheduleHorn();
    }, delay);
  }

  function playGentleBird(intensity) {
    const now = ctx.currentTime;
    const notes = [1760, 1975, 2093, 2349, 2637];
    const startFreq = notes[Math.floor(Math.random() * notes.length)];
    const chirpCount = Math.random() > 0.45 ? 2 : 1;

    for (let i = 0; i < chirpCount; i++) {
      const t0 = now + i * 0.16;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t0);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.18, t0 + 0.06);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.94, t0 + 0.12);

      const vol = 0.018 * clamp(intensity, 0, 1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.14);
    }
  }

  function scheduleBird() {
    clearTimeout(birdTimer);
    const delay = 2400 + Math.random() * 3800;
    birdTimer = setTimeout(() => {
      if (enabled && ctx && ctx.state === 'running' && currentLevel > 0.52) {
        playGentleBird((currentLevel - 0.52) / 0.48);
      }
      scheduleBird();
    }, delay);
  }

  function initGraph() {
    if (ctx) return;
    ctx = new AudioCtx();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(ctx.destination);

    const brownSrc = ctx.createBufferSource();
    brownSrc.buffer = createNoiseBuffer(ctx, 4, true);
    brownSrc.loop = true;

    trafficFilter = ctx.createBiquadFilter();
    trafficFilter.type = 'lowpass';
    trafficFilter.frequency.value = 780;
    trafficFilter.Q.value = 0.7;

    trafficGain = ctx.createGain();
    trafficGain.gain.value = 0.34;

    brownSrc.connect(trafficFilter);
    trafficFilter.connect(trafficGain);
    trafficGain.connect(masterGain);
    brownSrc.start();

    const breezeSrc = ctx.createBufferSource();
    breezeSrc.buffer = createNoiseBuffer(ctx, 5, false);
    breezeSrc.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'bandpass';
    breezeFilter.frequency.value = 980;
    breezeFilter.Q.value = 1.1;

    breezeGain = ctx.createGain();
    breezeGain.gain.value = 0.0;

    breezeSrc.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(masterGain);
    breezeSrc.start();

    calmGain = ctx.createGain();
    calmGain.gain.value = 0.0;

    const hum1 = ctx.createOscillator();
    const hum2 = ctx.createOscillator();
    hum1.type = 'sine';
    hum2.type = 'sine';
    hum1.frequency.value = 174.61;
    hum2.frequency.value = 261.63;

    railHumGain = ctx.createGain();
    railHumGain.gain.value = 0.022;

    hum1.connect(railHumGain);
    hum2.connect(railHumGain);
    railHumGain.connect(calmGain);
    calmGain.connect(masterGain);
    hum1.start();
    hum2.start();

    scheduleHorn();
    scheduleBird();
  }

  function applyMix() {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;
    const t = clamp(currentLevel, 0, 1);

    masterGain.gain.setTargetAtTime(enabled ? 0.85 : 0.0001, now, 0.12);
    const trafficVol = 0.34 * (1 - t * 0.82);
    const cutoffHz = 820 - t * 620;
    trafficGain.gain.setTargetAtTime(trafficVol, now, 0.18);
    trafficFilter.frequency.setTargetAtTime(cutoffHz, now, 0.18);

    breezeGain.gain.setTargetAtTime(0.065 * t, now, 0.25);
    calmGain.gain.setTargetAtTime(0.75 * t, now, 0.25);
  }

  return {
    start() {
      initGraph();
      if (ctx.state === 'suspended') ctx.resume();
      enabled = true;
      started = true;
      applyMix();
      return enabled;
    },
    toggle() {
      if (!started) return this.start();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      enabled = !enabled;
      applyMix();
      return enabled;
    },
    setProgress(prettyRatio) {
      currentLevel = clamp(prettyRatio, 0, 1);
      if (ctx && started) applyMix();
    },
    isEnabled() {
      return enabled;
    }
  };
}

export const ManifestoAudio = createAudioEngine();
window.ManifestoAudio = ManifestoAudio;
