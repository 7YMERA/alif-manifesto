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
      updateScroll();
    }, 1150);
  };

  function startFromBus() {
    if (ManifestoScene && ManifestoScene.triggerBusDeparture) {
      ManifestoScene.triggerBusDeparture();
    } else {
      window.onBusIntroStart();
    }
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
      targetEl.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      if (!targetEl.hasAttribute('tabindex')) targetEl.setAttribute('tabindex', '-1');
      targetEl.focus({ preventScroll: true });
    });
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
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

  // ── Scroll-reveal (animation-on-scroll skill) ──────────────────────────
  // Pauses animation until element enters viewport, then fires once.
  const _scrollRevealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        _scrollRevealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    _scrollRevealIO.observe(el);
  });
}
