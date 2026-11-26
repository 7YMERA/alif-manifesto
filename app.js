/* ==========================================================================
   ALIF MANIFESTO — Scroll Orchestration, Gate, Auto-Cruise & Back-to-Top
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const busOverlay = document.getElementById('bus-intro-overlay');
  const busTrigger = document.getElementById('bus-intro-trigger');
  const soundBtn = document.getElementById('sound-toggle');
  const themeBtn = document.getElementById('theme-toggle');
  const lightBtn = document.getElementById('light-toggle');
  const cruiseBtn = document.getElementById('cruise-toggle');
  const backToTopBtn = document.getElementById('back-to-top');
  const hudYear = document.getElementById('hud-year');
  const hudPhase = document.getElementById('hud-phase');
  const hudFill = document.getElementById('hud-meter-fill');
  const progressBar = document.getElementById('scroll-progress-bar');
  const yearBackdrop = document.getElementById('year-backdrop');
  const railLinks = Array.from(document.querySelectorAll('.rail-link'));
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const storyCards = Array.from(document.querySelectorAll('.story-card, .rail-flow'));

  function syncSoundBtn(on) {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', String(!!on));
    const label = soundBtn.querySelector('span');
    if (label) label.textContent = on ? 'Sound On' : 'Sound Off';
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      if (!window.ManifestoAudio) return;
      syncSoundBtn(window.ManifestoAudio.toggle());
    });
  }

  // =========================================================================
  // 1. Click-the-Back-of-the-Bus 3D Opening
  // =========================================================================

  window.onBusIntroStart = function () {
    if (busOverlay) busOverlay.classList.add('is-hidden');
    if (window.ManifestoAudio) {
      syncSoundBtn(window.ManifestoAudio.start());
      window.ManifestoAudio.setProgress(0);
    }
    setTimeout(function () {
      document.body.classList.remove('is-gated');
      window.scrollTo({ top: 0, behavior: 'auto' });
      updateScroll();
      if (typeof renderRailConnectors === 'function') renderRailConnectors();
    }, 1150);
  };

  function startFromBus() {
    if (window.ManifestoScene && window.ManifestoScene.triggerBusDeparture) {
      window.ManifestoScene.triggerBusDeparture();
    } else {
      window.onBusIntroStart();
    }
  }

  if (busTrigger) {
    busTrigger.addEventListener('click', startFromBus);
  }
  window.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('is-gated') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startFromBus();
    }
  });

  const PHASE_META = [
    { id: 'opening', year: '2026', label: 'Morning Congestion' },
    { id: 'frustration', year: '2026', label: 'Bus 750 Stuck in Jam' },
    { id: 'highways-reimagined', year: '2026', label: 'Keep & Green Concrete' },
    { id: 'phase-1', year: '2026–2027', label: 'Year 1 · Foundation' },
    { id: 'phase-2', year: '2028–2029', label: 'Year 3 · Buses & Rail' },
    { id: 'phase-3', year: '2030–2031', label: 'Year 5 · Shared Spaces' },
    { id: 'phase-4', year: '2036', label: '2036 · Charter' },
    { id: 'city-showcase', year: '2036', label: 'Kuala Lumpur 2036' }
  ];

  // Smooth anchor link navigation
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = anchor.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Floating Back-to-Top button
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =========================================================================
  // 2. Theme (Light / Dark) & 3D Lighting (Day / Golden Hour)
  // =========================================================================

  function setTheme(theme) {
    const dark = theme === 'dark';
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', String(dark));
      const label = themeBtn.querySelector('span');
      if (label) label.textContent = dark ? 'Light Mode' : 'Dark Mode';
    }
    if (window.ManifestoScene) {
      window.ManifestoScene.setDark(dark);
    }
    try {
      localStorage.setItem('alif-manifesto-theme', dark ? 'dark' : 'light');
    } catch (e) {}
  }

  let savedTheme = 'light';
  try {
    const stored = localStorage.getItem('alif-manifesto-theme');
    if (stored === 'dark' || stored === 'light') savedTheme = stored;
  } catch (e) {}
  setTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  let goldenActive = false;
  if (lightBtn) {
    lightBtn.addEventListener('click', function () {
      goldenActive = !goldenActive;
      lightBtn.setAttribute('aria-pressed', String(goldenActive));
      const label = lightBtn.querySelector('span');
      if (label) label.textContent = goldenActive ? 'Golden Hour' : 'Daylight';
      if (window.ManifestoScene) {
        window.ManifestoScene.setLighting(goldenActive ? 'golden' : 'day');
      }
    });
  }

  // =========================================================================
  // 3. Scroll Progress -> 3D Scene, Hairline, Year Watermark & Back-to-Top
  // =========================================================================

  const compareDock = document.getElementById('compare-dock');
  const compareSlider = document.getElementById('compare-slider');
  const compareBefore = document.getElementById('compare-before');
  const compareAfter = document.getElementById('compare-after');

  function applyCompareUI(ratio) {
    if (compareSlider) compareSlider.value = String(Math.round(ratio * 100));
    if (compareBefore) compareBefore.classList.toggle('is-active', ratio < 0.5);
    if (compareAfter) compareAfter.classList.toggle('is-active', ratio >= 0.5);
    if (window.ManifestoScene && window.ManifestoScene.setCompareRatio) {
      window.ManifestoScene.setCompareRatio(ratio);
    }
    if (window.ManifestoAudio) {
      window.ManifestoAudio.setProgress(ratio);
    }
  }

  if (compareSlider) {
    compareSlider.addEventListener('input', function () {
      applyCompareUI(Number(compareSlider.value) / 100);
    });
  }
  if (compareBefore) {
    compareBefore.addEventListener('click', function () {
      applyCompareUI(0);
    });
  }
  if (compareAfter) {
    compareAfter.addEventListener('click', function () {
      applyCompareUI(1);
    });
  }

  // Force top of page on refresh so browser scroll restoration never triggers end-of-page UI early
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  function updateScroll() {
    const gated = document.body.classList.contains('is-gated');
    if (gated) {
      if (window.ManifestoScene) {
        window.ManifestoScene.setScrollProgress(0);
        if (window.ManifestoScene.setCompareRatio) window.ManifestoScene.setCompareRatio(null);
      }
      if (window.ManifestoAudio) window.ManifestoAudio.setProgress(0);
      if (hudFill) hudFill.style.width = '0%';
      if (progressBar) progressBar.style.width = '0%';
      if (yearBackdrop) yearBackdrop.textContent = '2026';
      if (backToTopBtn) backToTopBtn.classList.remove('is-shown');
      if (compareDock) compareDock.classList.remove('is-shown');
      return;
    }

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    if (window.ManifestoScene) {
      window.ManifestoScene.setScrollProgress(progress);
      if (progress < 0.84 && window.ManifestoScene.setCompareRatio) {
        window.ManifestoScene.setCompareRatio(null);
      }
    }

    if (window.ManifestoAudio && progress < 0.88) {
      const audioPretty = Math.max(0, Math.min(1, (progress - 0.34) / 0.38));
      window.ManifestoAudio.setProgress(audioPretty);
    }

    const pct = (progress * 100).toFixed(2) + '%';
    if (hudFill) hudFill.style.width = pct;
    if (progressBar) progressBar.style.width = pct;

    if (yearBackdrop) {
      yearBackdrop.textContent = String(Math.round(2026 + progress * 10));
    }

    if (backToTopBtn) {
      backToTopBtn.classList.toggle('is-shown', progress > 0.14);
    }

    if (compareDock) {
      const atEnd = progress > 0.88;
      compareDock.classList.toggle('is-shown', atEnd);
      if (!atEnd && compareSlider && compareSlider.value !== '100') {
        compareSlider.value = '100';
        if (compareBefore) compareBefore.classList.remove('is-active');
        if (compareAfter) compareAfter.classList.add('is-active');
      }
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  // =========================================================================
  // 4. Auto-Cruise 3D Timeline Glide
  // =========================================================================

  let cruising = false;
  let cruiseRaf = 0;

  function stopCruise() {
    if (!cruising) return;
    cruising = false;
    cancelAnimationFrame(cruiseRaf);
    if (cruiseBtn) {
      cruiseBtn.setAttribute('aria-pressed', 'false');
      const label = cruiseBtn.querySelector('span');
      if (label) label.textContent = 'Auto-Cruise';
    }
  }

  function stepCruise() {
    if (!cruising) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const current = window.scrollY || window.pageYOffset || 0;
    if (current >= maxScroll - 2) {
      stopCruise();
      return;
    }
    window.scrollBy(0, 2.3);
    cruiseRaf = requestAnimationFrame(stepCruise);
  }

  if (cruiseBtn) {
    cruiseBtn.addEventListener('click', function () {
      if (cruising) {
        stopCruise();
        return;
      }
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if ((window.scrollY || 0) >= maxScroll - 16) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      cruising = true;
      cruiseBtn.setAttribute('aria-pressed', 'true');
      const label = cruiseBtn.querySelector('span');
      if (label) label.textContent = 'Stop Cruise';
      cruiseRaf = requestAnimationFrame(stepCruise);
    });
  }

  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, stopCruise, { passive: true });
  });

  // =========================================================================
  // 5. Chapter Active State & Card Reveal Observer
  // =========================================================================

  if ('IntersectionObserver' in window) {
    const cardObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.14 }
    );
    storyCards.forEach(function (card) {
      cardObserver.observe(card);
    });

    const chapterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          railLinks.forEach(function (link) {
            const match = link.getAttribute('href') === '#' + id;
            link.classList.toggle('is-active', match);
            if (match) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
          });
          const meta = PHASE_META.find(function (m) {
            return m.id === id;
          });
          if (meta) {
            if (hudYear) hudYear.textContent = meta.year;
            if (hudPhase) hudPhase.textContent = meta.label;
          }
        });
      },
      { rootMargin: '-38% 0px -48% 0px', threshold: 0 }
    );
    chapters.forEach(function (ch) {
      chapterObserver.observe(ch);
    });
  } else {
    storyCards.forEach(function (card) {
      card.classList.add('is-visible');
    });
  }

  // =========================================================================
  // 6. "Witness This Timeline" Interactive Stamp
  // =========================================================================

  const pledgeBtn = document.getElementById('pledge-btn');
  if (pledgeBtn) {
    let stamped = false;
    try {
      stamped = localStorage.getItem('alif-manifesto-witnessed') === 'true';
    } catch (e) {}

    function renderStamp() {
      pledgeBtn.classList.toggle('is-stamped', stamped);
      pledgeBtn.setAttribute('aria-pressed', String(stamped));
      pledgeBtn.textContent = stamped
        ? '✓ Witnessed · Hold Me To This in 2036'
        : 'Witness This 10-Year Pledge';
    }

    renderStamp();

    pledgeBtn.addEventListener('click', function () {
      stamped = !stamped;
      try {
        localStorage.setItem('alif-manifesto-witnessed', String(stamped));
      } catch (e) {}
      renderStamp();
    });
  }

  // =========================================================================
  // 7. Continuous Subtle Klang Valley Transit-Map Rail Connectors
  // =========================================================================

  const connectorSvg = document.getElementById('rail-connector-svg');
  const mainEl = document.getElementById('main-content');

  function getOffsetBox(el, ancestor) {
    if (!el || !ancestor) return null;
    // SVG elements have no offsetLeft/offsetWidth (they read as undefined -> NaN paths),
    // so measure them with the bounding rect relative to the ancestor instead.
    if (typeof el.offsetWidth !== 'number') {
      const er = el.getBoundingClientRect();
      const ar = ancestor.getBoundingClientRect();
      const sx = ancestor.offsetWidth ? ar.width / ancestor.offsetWidth : 1;
      const sy = ancestor.offsetHeight ? ar.height / ancestor.offsetHeight : 1;
      const left = (er.left - ar.left) / sx;
      const top = (er.top - ar.top) / sy;
      const width = er.width / sx;
      const height = er.height / sy;
      return {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height,
        width: width,
        height: height,
        cx: left + width * 0.5
      };
    }
    let x = 0;
    let y = 0;
    let cur = el;
    while (cur && cur !== ancestor) {
      x += cur.offsetLeft || 0;
      y += cur.offsetTop || 0;
      cur = cur.offsetParent;
    }
    return {
      left: x,
      top: y,
      right: x + el.offsetWidth,
      bottom: y + el.offsetHeight,
      width: el.offsetWidth,
      height: el.offsetHeight,
      cx: x + el.offsetWidth * 0.5
    };
  }

  // Rounded-corner polyline path helper for sleek MRT/LRT map 45° elbows
  function buildRoundedPolyline(pts, radius) {
    if (pts.length < 2) return '';
    let d = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      const v1x = curr[0] - prev[0];
      const v1y = curr[1] - prev[1];
      const v2x = next[0] - curr[0];
      const v2y = next[1] - curr[1];
      const len1 = Math.hypot(v1x, v1y) || 1;
      const len2 = Math.hypot(v2x, v2y) || 1;
      const r = Math.min(radius, len1 * 0.45, len2 * 0.45);
      const ax = curr[0] - (v1x / len1) * r;
      const ay = curr[1] - (v1y / len1) * r;
      const bx = curr[0] + (v2x / len2) * r;
      const by = curr[1] + (v2y / len2) * r;
      d += ' L ' + ax.toFixed(1) + ' ' + ay.toFixed(1);
      d += ' Q ' + curr[0].toFixed(1) + ' ' + curr[1].toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    const last = pts[pts.length - 1];
    d += ' L ' + last[0].toFixed(1) + ' ' + last[1].toFixed(1);
    return d;
  }

  function buildOctilinearRoute(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < 36 || dy <= 24) {
      return 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
    }
    const dir = dx > 0 ? 1 : -1;
    const yMid = y1 + dy * 0.5;
    const diag = Math.min(Math.abs(dx) * 0.28, dy * 0.44, 180);
    const pts = [
      [x1, y1],
      [x1 + dir * diag, yMid],
      [x2 - dir * diag, yMid],
      [x2, y2]
    ];
    return buildRoundedPolyline(pts, 26);
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (k) {
      el.setAttribute(k, String(attrs[k]));
    });
    return el;
  }

  function renderRailConnectors() {
    if (!connectorSvg || !mainEl) return;
    const w = mainEl.offsetWidth;
    const h = mainEl.offsetHeight;
    if (!w || !h) return;

    connectorSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    connectorSvg.innerHTML = '';

    const defs = svgEl('defs', {});
    connectorSvg.appendChild(defs);

    let gradCounter = 0;

    function addTrack(d, x1, y1, x2, y2, colorStart, colorEnd, opts) {
      opts = opts || {};
      const gradId = 'rail-grad-' + ++gradCounter;
      const grad = svgEl('linearGradient', {
        id: gradId,
        gradientUnits: 'userSpaceOnUse',
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1)
      });
      grad.appendChild(svgEl('stop', {
        offset: '0%',
        'stop-color': colorStart,
        'stop-opacity': opts.fadeTop ? '0' : '1'
      }));
      if (opts.fadeTop) {
        grad.appendChild(svgEl('stop', {
          offset: '38%',
          'stop-color': colorStart,
          'stop-opacity': '0.9'
        }));
      }
      grad.appendChild(svgEl('stop', {
        offset: '100%',
        'stop-color': colorEnd,
        'stop-opacity': '1'
      }));
      defs.appendChild(grad);

      if (!opts.fadeTop) {
        connectorSvg.appendChild(svgEl('path', {
          d: d,
          class: 'rail-track-halo'
        }));
      }

      connectorSvg.appendChild(svgEl('path', {
        d: d,
        class: 'rail-track-line',
        stroke: 'url(#' + gradId + ')'
      }));

      if (opts.pulse) {
        connectorSvg.appendChild(svgEl('path', {
          d: d,
          class: 'rail-track-pulse'
        }));
      }

      if (opts.startDot) {
        connectorSvg.appendChild(svgEl('circle', {
          cx: x1.toFixed(1),
          cy: y1.toFixed(1),
          r: 4.5,
          class: 'rail-anchor-dot',
          stroke: colorStart
        }));
      }
      if (opts.endDot) {
        connectorSvg.appendChild(svgEl('circle', {
          cx: x2.toFixed(1),
          cy: y2.toFixed(1),
          r: 4.5,
          class: 'rail-anchor-dot',
          stroke: colorEnd
        }));
      }
    }

    const c0 = getOffsetBox(document.querySelector('#opening .story-card'), mainEl);
    const c1 = getOffsetBox(document.querySelector('#frustration .story-card'), mainEl);
    const c2 = getOffsetBox(document.querySelector('#highways-reimagined .story-card'), mainEl);
    const p1Head = getOffsetBox(document.querySelector('#phase-1 .rail-hub-head'), mainEl);
    const p1Out = getOffsetBox(document.querySelector('#phase-1 .rail-transfer'), mainEl);
    const p2Head = getOffsetBox(document.querySelector('#phase-2 .rail-hub-head'), mainEl);
    const p2Out = getOffsetBox(document.querySelector('#phase-2 .rail-transfer'), mainEl);
    const p3Head = getOffsetBox(document.querySelector('#phase-3 .rail-hub-head'), mainEl);
    const p3Out = getOffsetBox(document.querySelector('#phase-3 .rail-transfer'), mainEl);
    const interSvgEl = document.getElementById('interchange-svg');
    const interBox = getOffsetBox(interSvgEl, mainEl);

    const BLUE = '#0047AB';
    const RED = '#D92332';
    const GREEN = '#0E7C59';

    // 1. Ch 00 (Left) -> Ch 01 (Right)
    if (c0 && c1) {
      const x1 = c0.left + 26;
      const y1 = c0.bottom;
      const x2 = c1.left + 26;
      const y2 = c1.top;
      addTrack(buildOctilinearRoute(x1, y1, x2, y2), x1, y1, x2, y2, RED, RED, {
        pulse: true,
        startDot: true,
        endDot: true
      });
    }

    // 2. Ch 01 (Right) -> Ch 02 (Right) — clean vertical drop along the right card spine
    if (c1 && c2) {
      const x1 = c1.left + 26;
      const y1 = c1.bottom;
      const x2 = c2.left + 26;
      const y2 = c2.top;
      addTrack(buildOctilinearRoute(x1, y1, x2, y2), x1, y1, x2, y2, RED, GREEN, {
        pulse: true,
        startDot: true,
        endDot: true
      });
    }

    // 3. Ch 02 (Right) -> Phase I / Line 01 (Left)
    if (c2 && p1Head) {
      const x1 = c2.left + 26;
      const y1 = c2.bottom;
      const x2 = p1Head.left + 18;
      const y2 = p1Head.top;
      addTrack(buildOctilinearRoute(x1, y1, x2, y2), x1, y1, x2, y2, GREEN, BLUE, {
        pulse: true,
        startDot: true,
        endDot: true
      });
    }

    // 4. Phase I / Line 01 (Left) -> Phase II / Line 02 (Right)
    if (p1Out && p2Head) {
      const x1 = p1Out.left + 12;
      const y1 = p1Out.bottom;
      const x2 = p2Head.left + 18;
      const y2 = p2Head.top;
      addTrack(buildOctilinearRoute(x1, y1, x2, y2), x1, y1, x2, y2, BLUE, RED, {
        pulse: true,
        endDot: true
      });
    }

    // 5. Phase II / Line 02 (Right) -> Phase III / Line 03 (Left)
    if (p2Out && p3Head) {
      const x1 = p2Out.left + 12;
      const y1 = p2Out.bottom;
      const x2 = p3Head.left + 18;
      const y2 = p3Head.top;
      addTrack(buildOctilinearRoute(x1, y1, x2, y2), x1, y1, x2, y2, RED, GREEN, {
        pulse: true,
        endDot: true
      });
    }

    // 6. 2036 Central Interchange: 5 Tall Vertical Feeder Lines Descending Into Convergence Dots
    if (interSvgEl && interBox) {
      const dots = Array.from(interSvgEl.querySelectorAll('.interchange-dot'));
      const scaleX = interBox.width / 960;
      const scaleY = interBox.height / 108;
      const feederHeight = Math.min(460, Math.max(240, window.innerHeight * 0.46));

      dots.forEach(function (dot, idx) {
        const cxAttr = parseFloat(dot.getAttribute('cx')) || 0;
        const cyAttr = parseFloat(dot.getAttribute('cy')) || 10;
        const col = dot.getAttribute('data-color') || BLUE;
        const x = interBox.left + cxAttr * scaleX;
        const yEnd = interBox.top + cyAttr * scaleY;
        const yStart = yEnd - feederHeight;

        const d = 'M ' + x.toFixed(1) + ' ' + yStart.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + yEnd.toFixed(1);
        addTrack(d, x, yStart, x, yEnd, col, col, {
          fadeTop: true,
          pulse: idx === 2
        });

        // Connect Phase III transfer pill smoothly into the Center Line 03 feeder!
        if (idx === 2 && p3Out) {
          const sx = p3Out.left + 12;
          const sy = p3Out.bottom;
          const joinY = Math.max(sy + 40, yEnd - 70);
          addTrack(buildOctilinearRoute(sx, sy, x, joinY), sx, sy, x, joinY, GREEN, GREEN, {
            pulse: true
          });
        }
      });
    }
  }

  let railResizeTimer = 0;
  function scheduleRailRender() {
    clearTimeout(railResizeTimer);
    railResizeTimer = setTimeout(renderRailConnectors, 60);
  }

  window.addEventListener('resize', scheduleRailRender, { passive: true });
  window.addEventListener('load', renderRailConnectors);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(renderRailConnectors);
  }
  renderRailConnectors();
})();
