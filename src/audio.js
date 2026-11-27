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
      isEnabled: () => false,
      playChime: () => {},
      playHorn: () => {}
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
    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }

  function canPlaySfx() {
    return Boolean(enabled && ctx && masterGain && !document.hidden && ctx.state === 'running');
  }

  function playPledgeChime() {
    const now = ctx.currentTime;
    // Warm 3-note rising Malaysian LRT/MRT station chime (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    const step = 0.13;

    notes.forEach((freq, i) => {
      const t0 = now + i * step;
      const dur = i === notes.length - 1 ? 0.68 : 0.42;

      const oscFund = ctx.createOscillator();
      const oscOver = ctx.createOscillator();
      const fundGain = ctx.createGain();
      const overGain = ctx.createGain();
      const noteGain = ctx.createGain();

      oscFund.type = 'sine';
      oscFund.frequency.setValueAtTime(freq, t0);

      oscOver.type = 'triangle';
      oscOver.frequency.setValueAtTime(freq * 2, t0);

      fundGain.gain.value = 0.82;
      overGain.gain.value = 0.18;

      noteGain.gain.setValueAtTime(0.0001, t0);
      noteGain.gain.linearRampToValueAtTime(0.06, t0 + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      oscFund.connect(fundGain);
      oscOver.connect(overGain);
      fundGain.connect(noteGain);
      overGain.connect(noteGain);
      noteGain.connect(masterGain);

      oscFund.start(t0);
      oscOver.start(t0);
      oscFund.stop(t0 + dur + 0.03);
      oscOver.stop(t0 + dur + 0.03);
      oscFund.onended = () => {
        oscFund.disconnect();
        oscOver.disconnect();
        fundGain.disconnect();
        overGain.disconnect();
        noteGain.disconnect();
      };
    });
  }

  function playTickChime() {
    const now = ctx.currentTime;
    const dur = 0.035;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + dur);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.025, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g);
    g.connect(masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.01);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  function clearAmbientTimers() {
    clearTimeout(hornTimer);
    clearTimeout(birdTimer);
    hornTimer = null;
    birdTimer = null;
  }

  function scheduleHorn() {
    clearTimeout(hornTimer);
    hornTimer = null;
    if (!enabled || document.hidden) return;
    const delay = 2600 + Math.random() * 4200;
    hornTimer = setTimeout(() => {
      hornTimer = null;
      if (!enabled || document.hidden) return;
      if (ctx && ctx.state === 'running' && currentLevel < 0.42) {
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
    birdTimer = null;
    if (!enabled || document.hidden) return;
    const delay = 2400 + Math.random() * 3800;
    birdTimer = setTimeout(() => {
      birdTimer = null;
      if (!enabled || document.hidden) return;
      if (ctx && ctx.state === 'running' && currentLevel > 0.52) {
        playGentleBird((currentLevel - 0.52) / 0.48);
      }
      scheduleBird();
    }, delay);
  }

  function syncTimers() {
    if (enabled && started && !document.hidden) {
      if (!hornTimer) scheduleHorn();
      if (!birdTimer) scheduleBird();
    } else {
      clearAmbientTimers();
    }
  }

  function setSmoothParam(param, value, now, tau) {
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, tau);
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

    document.addEventListener('visibilitychange', () => {
      if (!ctx || !started) return;
      if (document.hidden) {
        clearAmbientTimers();
        if (ctx.state === 'running') ctx.suspend();
      } else {
        if (enabled && ctx.state === 'suspended') ctx.resume();
        syncTimers();
      }
    });
  }

  function applyMix() {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;
    const t = clamp(currentLevel, 0, 1);

    setSmoothParam(masterGain.gain, enabled ? 0.85 : 0.0001, now, 0.12);
    const trafficVol = 0.34 * (1 - t * 0.82);
    const cutoffHz = 820 - t * 620;
    setSmoothParam(trafficGain.gain, trafficVol, now, 0.18);
    setSmoothParam(trafficFilter.frequency, cutoffHz, now, 0.18);

    setSmoothParam(breezeGain.gain, 0.065 * t, now, 0.25);
    setSmoothParam(calmGain.gain, 0.75 * t, now, 0.25);
  }

  return {
    start() {
      initGraph();
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      enabled = true;
      started = true;
      applyMix();
      syncTimers();
      return enabled;
    },
    toggle() {
      if (!started) return this.start();
      if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume();
      enabled = !enabled;
      applyMix();
      syncTimers();
      return enabled;
    },
    setProgress(prettyRatio) {
      currentLevel = clamp(prettyRatio, 0, 1);
      if (ctx && started) applyMix();
    },
    isEnabled() {
      return enabled;
    },
    playChime(kind) {
      if (!canPlaySfx()) return;
      if (kind === 'pledge') {
        playPledgeChime();
      } else if (kind === 'tick') {
        playTickChime();
      }
    },
    playHorn() {
      if (!canPlaySfx()) return;
      playDistantHorn(0.85);
    }
  };
}

export const ManifestoAudio = createAudioEngine();
window.ManifestoAudio = ManifestoAudio;
