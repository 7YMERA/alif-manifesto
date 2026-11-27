import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ManifestoAudio } from './audio.js';

gsap.registerPlugin(ScrollTrigger);

export function initApp(ManifestoScene) {
  const busOverlay = document.getElementById('bus-intro-overlay');
  const busTrigger = document.getElementById('bus-intro-trigger');
  const soundBtn = document.getElementById('sound-toggle');
  const scrollCue = document.getElementById('scroll-cue');
  const backToTopBtn = document.getElementById('back-to-top');
  const progressBar = document.getElementById('scroll-progress-bar');

  const yearHudWrap = document.getElementById('year-hud-wrap');
  const yearHud = document.getElementById('year-hud');
  const yearHudDot = document.getElementById('year-hud-dot');
  const yearHudYear = document.getElementById('year-hud-year');
  const yearHudStage = document.getElementById('year-hud-stage');
  const yearHudFill = document.getElementById('year-hud-fill');
  const routeDrawer = document.getElementById('route-drawer');
  const routeStops = routeDrawer ? Array.from(routeDrawer.querySelectorAll('.route-stop')) : [];

  const compareDock = document.getElementById('compare-dock');
  const compareSlider = document.getElementById('compare-slider');
  const compareBefore = document.getElementById('compare-before');
  const compareAfter = document.getElementById('compare-after');
  const timelapseBtn = document.getElementById('timelapse-play');

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reducedQuery.matches ? 'auto' : 'smooth');

  // ── Lenis Smooth Scroll + GSAP ScrollTrigger sync ──────────────────────
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
        ScrollTrigger.update();
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
      ScrollTrigger.refresh();
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

  function scrollToSection(targetEl) {
    if (!targetEl) return;
    if (lenis && !reducedQuery.matches) {
      lenis.scrollTo(targetEl, { offset: -76 });
    } else {
      targetEl.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    }
    if (!targetEl.hasAttribute('tabindex')) targetEl.setAttribute('tabindex', '-1');
    targetEl.focus({ preventScroll: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      e.preventDefault();
      scrollToSection(targetEl);
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

  // ── Kinetic Year & Transit Line HUD + Klang Valley Route Drawer ────────
  const HUD_CHAPTERS = [
    { id: 'opening',             year: '2026',      stage: 'Shah Alam Gridlock',   line: 'red' },
    { id: 'frustration',         year: '2026',      stage: 'RapidKL 750 · 40 min', line: 'red' },
    { id: 'jam-simulator',       year: '2026',      stage: 'Induced Demand Test',  line: 'red' },
    { id: 'highways-reimagined', year: '2027',      stage: 'Greened Highways',     line: 'green' },
    { id: 'phase-1',             year: '2026–2027', stage: 'Line 01 · Foundation', line: 'blue' },
    { id: 'phase-2',             year: '2028–2029', stage: 'Line 02 · Buses & Rail', line: 'red' },
    { id: 'phase-3',             year: '2030–2031', stage: 'Line 03 · Shared Spaces', line: 'green' },
    { id: 'phase-4',             year: '2036',      stage: '2036 · All Lines Merge', line: 'blue' },
    { id: 'city-showcase',       year: '2036',      stage: '2036 · Shared KL',     line: 'gold' },
  ].map((c) => ({ ...c, el: document.getElementById(c.id) }));

  function isRouteDrawerOpen() {
    return Boolean(routeDrawer && !routeDrawer.hidden);
  }

  function openRouteDrawer() {
    if (!routeDrawer || !yearHud) return;
    routeDrawer.hidden = false;
    yearHud.setAttribute('aria-expanded', 'true');
    if (yearHudWrap) yearHudWrap.classList.add('is-open');
  }

  function closeRouteDrawer({ restoreFocus = false } = {}) {
    if (!routeDrawer || !yearHud || routeDrawer.hidden) return;
    routeDrawer.hidden = true;
    yearHud.setAttribute('aria-expanded', 'false');
    if (yearHudWrap) yearHudWrap.classList.remove('is-open');
    if (restoreFocus) yearHud.focus();
  }

  let currentActiveStopId = 'opening';
  function syncActiveRouteStop(activeId) {
    if (!routeStops.length || currentActiveStopId === activeId) return;
    currentActiveStopId = activeId;
    const selector = `#${activeId}`;
    routeStops.forEach((stop) => {
      if (stop.dataset.target === selector) {
        stop.setAttribute('aria-current', 'location');
      } else {
        stop.removeAttribute('aria-current');
      }
    });
  }

  function setYearHudStage(stage) {
    if (!yearHudStage) return;
    yearHudStage.dataset.realStage = stage;
    if (!yearHudStage.dataset.honkActive) {
      yearHudStage.textContent = stage;
    }
  }

  if (yearHud && routeDrawer) {
    yearHud.addEventListener('click', () => {
      if (isRouteDrawerOpen()) {
        closeRouteDrawer();
      } else {
        openRouteDrawer();
      }
    });

    routeStops.forEach((stop, idx) => {
      stop.addEventListener('click', () => {
        const targetSelector = stop.dataset.target;
        const targetEl = targetSelector ? document.querySelector(targetSelector) : null;
        closeRouteDrawer({ restoreFocus: false });
        if (targetEl) {
          syncActiveRouteStop(targetEl.id);
          scrollToSection(targetEl);
        }
      });

      stop.addEventListener('keydown', (e) => {
        if (!isRouteDrawerOpen()) return;
        let nextIdx = -1;
        if (e.key === 'ArrowDown') nextIdx = (idx + 1) % routeStops.length;
        else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + routeStops.length) % routeStops.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = routeStops.length - 1;
        if (nextIdx >= 0) {
          e.preventDefault();
          routeStops[nextIdx].focus();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isRouteDrawerOpen()) {
        e.preventDefault();
        closeRouteDrawer({ restoreFocus: true });
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (!isRouteDrawerOpen()) return;
      if (yearHudWrap && e.target instanceof Node && !yearHudWrap.contains(e.target)) {
        closeRouteDrawer({ restoreFocus: false });
      }
    });
  }

  function updateYearHud(progress, overrideRatio = null) {
    if (!yearHud) return;
    if (overrideRatio !== null) {
      const yr = Math.round(2026 + overrideRatio * 10);
      const isAfter = overrideRatio >= 0.5;
      yearHud.dataset.line = isAfter ? 'gold' : 'red';
      if (yearHudYear) yearHudYear.textContent = String(yr);
      setYearHudStage(isAfter ? 'After · Shared KL' : 'Before · 2026 Jam');
      if (yearHudFill) yearHudFill.style.transform = `scaleX(${Math.max(0.04, overrideRatio).toFixed(3)})`;
      if (yearHudDot) yearHudDot.dataset.line = yearHud.dataset.line;
      syncActiveRouteStop('city-showcase');
      return;
    }
    const triggerY = window.innerHeight * 0.55;
    let active = HUD_CHAPTERS[0];
    for (let i = 0; i < HUD_CHAPTERS.length; i++) {
      const el = HUD_CHAPTERS[i].el;
      if (el && el.getBoundingClientRect().top <= triggerY) {
        active = HUD_CHAPTERS[i];
      }
    }
    yearHud.dataset.line = active.line;
    if (yearHudDot) yearHudDot.dataset.line = active.line;
    if (yearHudYear) yearHudYear.textContent = active.year;
    setYearHudStage(active.stage);
    if (yearHudFill) yearHudFill.style.transform = `scaleX(${Math.max(0.04, progress).toFixed(3)})`;
    syncActiveRouteStop(active.id);
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
    updateYearHud(1, clamped);
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
      if (yearHud) yearHud.classList.remove('is-shown');
      closeRouteDrawer({ restoreFocus: false });
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
      updateYearHud(progress, null);
    }

    if (progressBar) progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
    if (scrollCue) scrollCue.classList.toggle('is-shown', progress < 0.03);
    if (backToTopBtn) backToTopBtn.classList.toggle('is-shown', progress > 0.14);
    if (yearHud) {
      const showHud = progress > 0.02;
      yearHud.classList.toggle('is-shown', showHud);
      if (!showHud || document.body.classList.contains('is-sim') || (progress > 0.86 && window.innerWidth <= 720)) {
        closeRouteDrawer({ restoreFocus: false });
      }
    }

    if (compareDock) {
      const atEnd = progress > 0.86;
      compareDock.classList.toggle('is-shown', atEnd);
      document.body.classList.toggle('is-compare', atEnd);
      if (!atEnd) {
        stopTimelapse();
        if (compareSlider && compareSlider.value !== '100') {
          compareSlider.value = '100';
          if (compareBefore) compareBefore.classList.remove('is-active');
          if (compareAfter) compareAfter.classList.add('is-active');
        }
      } else if (!timelapsePlaying && compareSlider) {
        updateYearHud(progress, Number(compareSlider.value) / 100);
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

  // ── Witness Pledge Stamp ───────────────────────────────────────────────
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

  // ── Scroll-Drawn Rail-Map SVG Connectors (timeline beam) ───────────────
  const LINE_CLASS = { blue: 'rl-blue', red: 'rl-red', green: 'rl-green' };
  const railTriggers = [];

  function drawRailLinks() {
    while (railTriggers.length) {
      const st = railTriggers.pop();
      if (st) st.kill();
    }

    document.querySelectorAll('.rail-link').forEach((link) => {
      const prev = link.previousElementSibling;
      const next = link.nextElementSibling;
      if (!prev || !next) return;
      const box = link.getBoundingClientRect();
      const a = prev.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      const w = box.width;
      const h = box.height;
      const ax = a.left + a.width / 2 - box.left;
      const bx = b.left + b.width / 2 - box.left;
      const r = Math.min(26, h * 0.18);
      const dot = (x, y, c, extra = '') => `<circle cx="${x}" cy="${y}" r="8" class="${c}${extra ? ' ' + extra : ''}"/>`;
      let tracks = '';
      let beams = '';
      let dots = '';

      if (link.classList.contains('rail-link--fan')) {
        const cols = ['rl-blue', 'rl-red', 'rl-green'];
        const left = b.left - box.left;
        const right = b.right - box.left;
        const narrow = b.width > w - 8 || left < 70;
        cols.forEach((c, i) => {
          const sx = ax + (i - 1) * 11;
          const targets = narrow ? [bx + (i - 1) * 11] : [left - 43 + i * 12, right + 19 + i * 12];
          targets.forEach((tx) => {
            const yTurn = h * 0.42;
            const dir = Math.sign(tx - sx) || 1;
            const rr = Math.min(r, Math.abs(tx - sx) / 2);
            const d = `M${sx} 0 V${yTurn - rr} Q${sx} ${yTurn} ${sx + dir * rr} ${yTurn} H${tx - dir * rr} Q${tx} ${yTurn} ${tx} ${yTurn + rr} V${h}`;
            tracks += `<path class="rail-track ${c}" d="${d}"/>`;
            beams += `<path class="rail-beam ${c}" d="${d}"/>`;
          });
          dots += dot(sx, 0, c, 'rail-dot-start');
        });
      } else {
        const c = LINE_CLASS[link.dataset.from] || 'rl-blue';
        const nc = link.nextElementSibling && link.nextElementSibling.id === 'phase-3' ? 'rl-green' : 'rl-red';
        const yMid = h / 2;
        let d;
        if (Math.abs(ax - bx) < 4) {
          d = `M${ax} 0 V${h}`;
        } else {
          const dir = Math.sign(bx - ax);
          const rr = Math.min(r, Math.abs(bx - ax) / 2);
          d = `M${ax} 0 V${yMid - rr} Q${ax} ${yMid} ${ax + dir * rr} ${yMid} H${bx - dir * rr} Q${bx} ${yMid} ${bx} ${yMid + rr} V${h}`;
        }
        tracks = `<path class="rail-track ${c}" d="${d}"/>`;
        beams = `<path class="rail-beam ${c}" d="${d}"/>`;
        dots = dot(ax, 0, c, 'rail-dot-start') + dot(bx, h, nc, 'rail-dot-end');
      }

      link.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="presentation">${tracks}${beams}${dots}</svg>`;

      if (reducedQuery.matches) {
        link.classList.add('is-arrived');
        return;
      }

      const beamPaths = Array.from(link.querySelectorAll('.rail-beam'));
      beamPaths.forEach((p) => {
        const len = p.getTotalLength ? p.getTotalLength() : h * 2;
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.dataset.len = String(len);
      });

      const st = ScrollTrigger.create({
        trigger: link,
        start: 'top 84%',
        end: 'bottom 44%',
        scrub: 0.45,
        onUpdate: (self) => {
          const prog = self.progress;
          beamPaths.forEach((p) => {
            const len = Number(p.dataset.len || 0);
            p.style.strokeDashoffset = String(len * (1 - prog));
          });
          link.classList.toggle('is-arrived', prog > 0.92);
        },
      });
      railTriggers.push(st);
    });
  }

  let railQueued = false;
  const queueRails = () => {
    if (railQueued) return;
    railQueued = true;
    requestAnimationFrame(() => {
      railQueued = false;
      drawRailLinks();
      ScrollTrigger.refresh();
    });
  };
  drawRailLinks();
  window.addEventListener('resize', queueRails, { passive: true });
  window.addEventListener('load', queueRails);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRails);

  // ── Masked Word-by-Word Kinetic Headlines (cinematic-scroll-storytelling) ─
  function splitWordsSafe(element) {
    if (element.dataset.splitReady === 'true') return;
    const rawText = (element.textContent || '').trim();
    element.setAttribute('aria-label', rawText);

    const wrapTextNode = (node) => {
      const frag = document.createDocumentFragment();
      const parts = (node.nodeValue || '').split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        if (!part.trim()) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const mask = document.createElement('span');
        const word = document.createElement('span');
        mask.className = 'split-word-mask';
        mask.setAttribute('aria-hidden', 'true');
        word.className = 'split-word';
        word.textContent = part;
        mask.appendChild(word);
        frag.appendChild(mask);
      });
      node.parentNode.replaceChild(frag, node);
    };

    const children = Array.from(element.childNodes);
    children.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        wrapTextNode(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        child.setAttribute('aria-hidden', 'true');
        Array.from(child.childNodes).forEach((grand) => {
          if (grand.nodeType === Node.TEXT_NODE) wrapTextNode(grand);
        });
      }
    });
    element.dataset.splitReady = 'true';
  }

  function initCinematicMotion() {
    const revealEls = document.querySelectorAll('.animate-on-scroll');

    if (reducedQuery.matches) {
      revealEls.forEach((el) => el.classList.add('is-revealed'));
      document.querySelectorAll('mark.hl').forEach((m) => m.classList.add('is-lit'));
      return;
    }

    // 1. Editorial card reveals + fallback IntersectionObserver so elements always reveal cleanly
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' })
      : null;

    revealEls.forEach((el) => {
      if (io) io.observe(el);
      else el.classList.add('is-revealed');
    });

    // 2. Masked word-by-word kinetic headlines
    document.querySelectorAll('[data-split-reveal]').forEach((heading) => {
      splitWordsSafe(heading);
      const words = heading.querySelectorAll('.split-word');
      const marks = heading.querySelectorAll('mark.hl');
      gsap.fromTo(
        words,
        { yPercent: 118, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.82,
          ease: 'power4.out',
          stagger: 0.042,
          scrollTrigger: {
            trigger: heading,
            start: 'top 86%',
            once: true,
            onEnter: () => {
              setTimeout(() => {
                marks.forEach((m) => m.classList.add('is-lit'));
              }, 220);
            },
          },
        }
      );
    });

    // 3. Staggered flowchart station nodes inside Phases I-III
    document.querySelectorAll('.milestone-list').forEach((list) => {
      const items = list.querySelectorAll('li');
      gsap.fromTo(
        items,
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power3.out',
          stagger: 0.09,
          scrollTrigger: {
            trigger: list,
            start: 'top 84%',
            once: true,
          },
        }
      );
    });

    // 4. Rolling stat tickers (RapidKL 750 40 min -> 22 min)
    document.querySelectorAll('[data-count-to]').forEach((el) => {
      const target = Number(el.dataset.countTo || 0);
      const suffix = el.dataset.suffix || '';
      const counter = { val: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(counter, {
            val: target,
            duration: 1.15,
            ease: 'power3.out',
            onUpdate: () => {
              el.textContent = `${Math.round(counter.val)}${suffix}`;
            },
          });
        },
      });
    });
  }

  initCinematicMotion();

  // ── 21st.dev Pointer-Tracked Border Spotlight & Subtle 3D Tilt ─────────
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !reducedQuery.matches) {
    document.querySelectorAll('[data-spotlight]').forEach((card) => {
      const isPillar = card.classList.contains('charter-card');
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mx', `${x.toFixed(1)}px`);
        card.style.setProperty('--my', `${y.toFixed(1)}px`);
        if (isPillar && !card.closest('.is-deck')) {
          const rx = ((y / rect.height) - 0.5) * -6;
          const ry = ((x / rect.width) - 0.5) * 6;
          card.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
          card.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
        }
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  // ── 21st.dev Interactive 3D Charter Deck (Grid <-> 3D Spring Deck) ─────
  const phase4Section = document.getElementById('phase-4');
  const charterGrid = document.getElementById('charter-grid');
  const deckNav = document.getElementById('charter-deck-nav');
  const deckDots = document.getElementById('deck-dots');
  const deckCount = document.getElementById('deck-count');
  const deckPrev = document.getElementById('deck-prev');
  const deckNext = document.getElementById('deck-next');
  const viewBtns = Array.from(document.querySelectorAll('[data-charter-view]'));

  if (charterGrid && deckNav) {
    const cards = Array.from(charterGrid.querySelectorAll('.charter-card'));
    let activeIdx = 0;
    let isDeck = false;

    if (deckDots) {
      cards.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'deck-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', String(idx === 0));
        dot.setAttribute('aria-label', `Pillar ${idx + 1}`);
        dot.addEventListener('click', () => setDeckIndex(idx));
        deckDots.appendChild(dot);
      });
    }

    function syncCharterPressed() {
      cards.forEach((c, i) => {
        const pressed = isDeck ? i === activeIdx : c.classList.contains('is-pinned');
        c.setAttribute('aria-pressed', String(pressed));
      });
    }

    function applyDeckLayout() {
      if (!isDeck) {
        cards.forEach((c) => {
          c.style.transform = '';
          c.style.opacity = '';
          c.style.zIndex = '';
          c.classList.remove('is-deck-front', 'is-deck-behind');
        });
        syncCharterPressed();
        return;
      }
      const n = cards.length;
      cards.forEach((card, i) => {
        const offset = (i - activeIdx + n) % n;
        const visibleDepth = Math.min(offset, 3);
        const y = visibleDepth * 14;
        const scale = 1 - visibleDepth * 0.048;
        const rotX = -visibleDepth * 3.5;
        const alpha = offset > 3 ? 0 : 1 - visibleDepth * 0.18;
        card.style.zIndex = String(n - offset);
        card.style.opacity = String(alpha);
        card.style.transform = reducedQuery.matches
          ? (offset === 0 ? 'translate3d(0,0,0)' : 'translate3d(0,0,0) scale(0.96)')
          : `translate3d(0, ${y}px, 0) perspective(900px) rotateX(${rotX}deg) scale(${scale.toFixed(3)})`;
        card.classList.toggle('is-deck-front', offset === 0);
        card.classList.toggle('is-deck-behind', offset > 0);
      });
      syncCharterPressed();
      if (deckCount) {
        const activeTitle = cards[activeIdx]?.querySelector('h3')?.textContent?.trim() || '';
        const visibleCount = `${String(activeIdx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
        deckCount.textContent = '';
        const visSpan = document.createElement('span');
        visSpan.setAttribute('aria-hidden', 'true');
        visSpan.textContent = visibleCount;
        const srSpan = document.createElement('span');
        srSpan.className = 'sr-only';
        srSpan.textContent = activeTitle
          ? `Pillar ${activeIdx + 1} of ${n}: ${activeTitle}`
          : `Pillar ${activeIdx + 1} of ${n}`;
        deckCount.append(visSpan, srSpan);
      }
      if (deckDots) {
        deckDots.querySelectorAll('.deck-dot').forEach((d, idx) => {
          d.classList.toggle('is-active', idx === activeIdx);
          d.setAttribute('aria-selected', String(idx === activeIdx));
        });
      }
    }

    function setDeckIndex(idx) {
      const n = cards.length;
      activeIdx = ((idx % n) + n) % n;
      applyDeckLayout();
    }

    function activateCharterCard(card, idx) {
      if (isDeck) {
        setDeckIndex(idx === activeIdx ? activeIdx + 1 : idx);
      } else {
        const nextPinned = !card.classList.contains('is-pinned');
        cards.forEach((c) => {
          const pinned = c === card && nextPinned;
          c.classList.toggle('is-pinned', pinned);
          c.setAttribute('aria-pressed', String(pinned));
        });
      }
    }

    cards.forEach((card, idx) => {
      card.addEventListener('click', () => activateCharterCard(card, idx));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateCharterCard(card, idx);
        }
      });
    });

    if (phase4Section) {
      phase4Section.addEventListener('keydown', (e) => {
        if (!isDeck) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setDeckIndex(activeIdx - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setDeckIndex(activeIdx + 1);
        }
      });
    }

    if (deckPrev) deckPrev.addEventListener('click', () => setDeckIndex(activeIdx - 1));
    if (deckNext) deckNext.addEventListener('click', () => setDeckIndex(activeIdx + 1));

    viewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        isDeck = btn.dataset.charterView === 'deck';
        charterGrid.classList.toggle('is-deck', isDeck);
        deckNav.hidden = !isDeck;
        viewBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        applyDeckLayout();
        queueRails();
      });
    });
  }
}
