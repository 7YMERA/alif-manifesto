import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { ManifestoAudio } from './audio.js';

export function initApp(ManifestoScene) {
  const busOverlay = document.getElementById('bus-intro-overlay');
  const busTrigger = document.getElementById('bus-intro-trigger');
  const soundBtn = document.getElementById('sound-toggle');
  const scrollCue = document.getElementById('scroll-cue');
  const backToTopBtn = document.getElementById('back-to-top');
  const progressBar = document.getElementById('scroll-progress-bar');

  const compareDock = document.getElementById('compare-dock');
  const compareSlider = document.getElementById('compare-slider');
  const compareBefore = document.getElementById('compare-before');
  const compareAfter = document.getElementById('compare-after');
  const timelapseBtn = document.getElementById('timelapse-play');

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reducedQuery.matches ? 'auto' : 'smooth');

  // ── Lenis Smooth Scroll (cinematic-scroll-storytelling skill) ──────────
  // Native scroll stays the deterministic source of truth; disabled under reduced motion,
  // paused while gated or when the tab is hidden.
  let lenis = null;
  let lenisRaf = 0;

  const stopLenisRaf = () => {
    if (!lenisRaf) return;
    cancelAnimationFrame(lenisRaf);
    lenisRaf = 0;
  };

  const startLenisRaf = () => {
    if (!lenis || lenisRaf || document.hidden) return;
    const tick = (time) => {
      lenisRaf = 0;
      if (!lenis || document.hidden) return;
      lenis.raf(time);
      lenisRaf = requestAnimationFrame(tick);
    };
    lenisRaf = requestAnimationFrame(tick);
  };

  function syncLenis() {
    if (reducedQuery.matches) {
      stopLenisRaf();
      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
      return;
    }
    if (!lenis) {
      lenis = new Lenis({
        lerp: 0.09,
        smoothWheel: true,
        wheelMultiplier: 0.92,
        syncTouch: false,
      });
      lenis.on('scroll', () => {
        if (typeof queueUpdate === 'function') queueUpdate();
      });
    }
    if (document.body.classList.contains('is-gated')) {
      lenis.stop();
      stopLenisRaf();
    } else if (!document.hidden) {
      lenis.start();
      startLenisRaf();
    }
  }

  if (reducedQuery.addEventListener) {
    reducedQuery.addEventListener('change', syncLenis);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLenisRaf();
    } else if (lenis && !document.body.classList.contains('is-gated')) {
      startLenisRaf();
    }
  });

  function syncSoundBtn(on) {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', String(!!on));
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      syncSoundBtn(ManifestoAudio.toggle());
    });
  }

  window.onBusIntroStart = () => {
    if (busOverlay) busOverlay.classList.add('is-hidden');
    syncSoundBtn(ManifestoAudio.start());
    ManifestoAudio.setProgress(0);
    setTimeout(() => {
      document.body.classList.remove('is-gated');
      window.scrollTo({ top: 0, behavior: 'auto' });
      syncLenis();
      updateScroll();
    }, reducedQuery.matches ? 250 : 1150);
  };

  function startFromBus() {
    if (ManifestoScene && ManifestoScene.triggerBusDeparture) {
      ManifestoScene.triggerBusDeparture();
    } else {
      window.onBusIntroStart();
    }
  }

  // Graceful fallback if WebGL failed to initialize (build-threejs-scroll-worlds skill)
  if (!ManifestoScene) {
    document.body.classList.add('no-webgl');
    document.body.classList.remove('is-gated');
    if (busOverlay) busOverlay.classList.add('is-hidden');
  }

  if (busTrigger) busTrigger.addEventListener('click', startFromBus);
  window.addEventListener('keydown', (e) => {
    const onControl = e.target instanceof Element && e.target.closest('button, a, input, select, textarea');
    if (document.body.classList.contains('is-gated') && !onControl && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startFromBus();
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      e.preventDefault();
      if (lenis && !reducedQuery.matches) {
        lenis.scrollTo(targetEl, { offset: -76 });
      } else {
        targetEl.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
      if (!targetEl.hasAttribute('tabindex')) targetEl.setAttribute('tabindex', '-1');
      targetEl.focus({ preventScroll: true });
    });
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      if (lenis && !reducedQuery.matches) {
        lenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      }
    });
  }

  // Timelapse Transformation Controls (2026 <-> 2036)
  let timelapseRaf = 0;
  let timelapsePlaying = false;

  function stopTimelapse() {
    if (!timelapsePlaying) return;
    timelapsePlaying = false;
    cancelAnimationFrame(timelapseRaf);
    if (timelapseBtn) {
      timelapseBtn.classList.remove('is-playing');
      const label = timelapseBtn.querySelector('span');
      if (label) label.textContent = 'Play Timelapse';
    }
  }

  function applyCompareUI(ratio) {
    const clamped = Math.max(0, Math.min(1, ratio));
    if (compareSlider) compareSlider.value = String(Math.round(clamped * 100));
    if (compareBefore) compareBefore.classList.toggle('is-active', clamped < 0.5);
    if (compareAfter) compareAfter.classList.toggle('is-active', clamped >= 0.5);
    if (ManifestoScene && ManifestoScene.setCompareRatio) {
      ManifestoScene.setCompareRatio(clamped);
    }
    ManifestoAudio.setProgress(clamped);
  }

  if (compareSlider) {
    compareSlider.addEventListener('input', () => {
      stopTimelapse();
      applyCompareUI(Number(compareSlider.value) / 100);
    });
  }
  if (compareBefore) {
    compareBefore.addEventListener('click', () => {
      stopTimelapse();
      applyCompareUI(0);
    });
  }
  if (compareAfter) {
    compareAfter.addEventListener('click', () => {
      stopTimelapse();
      applyCompareUI(1);
    });
  }

  if (timelapseBtn) {
    timelapseBtn.addEventListener('click', () => {
      if (timelapsePlaying) {
        stopTimelapse();
        return;
      }
      if (reducedQuery.matches) {
        applyCompareUI(compareSlider && compareSlider.value === '100' ? 0 : 1);
        return;
      }
      timelapsePlaying = true;
      timelapseBtn.classList.add('is-playing');
      const label = timelapseBtn.querySelector('span');
      if (label) label.textContent = 'Pause Timelapse';

      const duration = 8000;
      const startTime = performance.now();
      applyCompareUI(0);

      const step = (now) => {
        if (!timelapsePlaying) return;
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        applyCompareUI(eased);
        if (t < 1) {
          timelapseRaf = requestAnimationFrame(step);
        } else {
          stopTimelapse();
        }
      };
      timelapseRaf = requestAnimationFrame(step);
    });
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  function updateScroll() {
    const gated = document.body.classList.contains('is-gated');
    if (gated) {
      if (ManifestoScene) {
        ManifestoScene.setScrollProgress(0);
        if (ManifestoScene.setCompareRatio) ManifestoScene.setCompareRatio(null);
      }
      ManifestoAudio.setProgress(0);
      if (progressBar) progressBar.style.width = '0%';
      if (scrollCue) scrollCue.classList.remove('is-shown');
      if (backToTopBtn) backToTopBtn.classList.remove('is-shown');
      if (compareDock) compareDock.classList.remove('is-shown');
      return;
    }

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    if (ManifestoScene) {
      ManifestoScene.setScrollProgress(progress);
      if (progress < 0.84 && ManifestoScene.setCompareRatio) {
        ManifestoScene.setCompareRatio(null);
      }
    }

    if (progress < 0.86) {
      const audioPretty = Math.max(0, Math.min(1, (progress - 0.25) / 0.50));
      ManifestoAudio.setProgress(audioPretty);
    }

    if (progressBar) progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
    if (scrollCue) scrollCue.classList.toggle('is-shown', progress < 0.03);
    if (backToTopBtn) backToTopBtn.classList.toggle('is-shown', progress > 0.14);

    if (compareDock) {
      const atEnd = progress > 0.86;
      compareDock.classList.toggle('is-shown', atEnd);
      if (!atEnd) {
        stopTimelapse();
        if (compareSlider && compareSlider.value !== '100') {
          compareSlider.value = '100';
          if (compareBefore) compareBefore.classList.remove('is-active');
          if (compareAfter) compareAfter.classList.add('is-active');
        }
      }
    }
  }

  let scrollQueued = false;
  const queueUpdate = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      updateScroll();
    });
  };
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate, { passive: true });
  updateScroll();
  syncLenis();

  const pledgeBtn = document.getElementById('pledge-btn');
  if (pledgeBtn) {
    let stamped = false;
    try {
      stamped = localStorage.getItem('alif-manifesto-witnessed') === 'true';
    } catch {}

    function renderStamp() {
      pledgeBtn.classList.toggle('is-stamped', stamped);
      pledgeBtn.textContent = stamped
        ? '✓ Witnessed · Hold Me To This in 2036'
        : 'Witness This 10-Year Pledge';
    }

    renderStamp();

    pledgeBtn.addEventListener('click', () => {
      stamped = !stamped;
      try {
        localStorage.setItem('alif-manifesto-witnessed', String(stamped));
      } catch {}
      renderStamp();
    });
  }

  // ── Rail-map connectors between the phase cards ────────────────────────
  // Drawn from the cards' real positions, so the lines stay joined to both cards at any width.
  const LINE_CLASS = { blue: 'rl-blue', red: 'rl-red', green: 'rl-green' };
  function drawRailLinks() {
    document.querySelectorAll('.rail-link').forEach((link) => {
      const prev = link.previousElementSibling, next = link.nextElementSibling;
      if (!prev || !next) return;
      const box = link.getBoundingClientRect();
      const a = prev.getBoundingClientRect(), b = next.getBoundingClientRect();
      const w = box.width, h = box.height;
      const ax = a.left + a.width / 2 - box.left, bx = b.left + b.width / 2 - box.left;
      const r = Math.min(26, h * 0.18);
      const dot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="8" class="${c}"/>`;
      let svg = '';
      if (link.classList.contains('rail-link--fan')) {
        // three lines (one per phase colour) leave the last phase and arrive down both sides of 2036
        const cols = ['rl-blue', 'rl-red', 'rl-green'];
        const left = b.left - box.left, right = b.right - box.left;
        const narrow = b.width > w - 8 || left < 70;
        cols.forEach((c, i) => {
          const sx = ax + (i - 1) * 11;
          const targets = narrow ? [bx + (i - 1) * 11] : [left - 43 + i * 12, right + 19 + i * 12];
          targets.forEach((tx) => {
            const yTurn = h * 0.42;
            const dir = Math.sign(tx - sx) || 1;
            const rr = Math.min(r, Math.abs(tx - sx) / 2);
            svg += `<path class="${c}" d="M${sx} 0 V${yTurn - rr} Q${sx} ${yTurn} ${sx + dir * rr} ${yTurn} H${tx - dir * rr} Q${tx} ${yTurn} ${tx} ${yTurn + rr} V${h}"/>`;
          });
          svg += dot(sx, 0, c);
        });
      } else {
        const c = LINE_CLASS[link.dataset.from] || 'rl-blue';
        const nc = link.nextElementSibling && link.nextElementSibling.id === 'phase-3' ? 'rl-green' : 'rl-red';
        const yMid = h / 2;
        if (Math.abs(ax - bx) < 4) {
          svg = `<path class="${c}" d="M${ax} 0 V${h}"/>`;
        } else {
          const dir = Math.sign(bx - ax);
          const rr = Math.min(r, Math.abs(bx - ax) / 2);
          svg = `<path class="${c}" d="M${ax} 0 V${yMid - rr} Q${ax} ${yMid} ${ax + dir * rr} ${yMid} H${bx - dir * rr} Q${bx} ${yMid} ${bx} ${yMid + rr} V${h}"/>`;
        }
        svg += dot(ax, 0, c) + dot(bx, h, nc);
      }
      link.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="presentation">${svg}</svg>`;
    });
  }
  let railQueued = false;
  const queueRails = () => {
    if (railQueued) return;
    railQueued = true;
    requestAnimationFrame(() => { railQueued = false; drawRailLinks(); });
  };
  drawRailLinks();
  window.addEventListener('resize', queueRails, { passive: true });
  window.addEventListener('load', queueRails);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRails);

  // ── Scroll-reveal (animation-on-scroll skill) ──────────────────────────
  // Pauses animation until element enters viewport, then fires once.
  const revealEls = document.querySelectorAll('.animate-on-scroll');
  if (!('IntersectionObserver' in window) || reducedQuery.matches) {
    revealEls.forEach((el) => el.classList.add('is-revealed'));
  } else {
    const _scrollRevealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          _scrollRevealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    revealEls.forEach((el) => {
      _scrollRevealIO.observe(el);
    });
  }
}
