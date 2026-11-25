/* ==========================================================================
   ALIF MANIFESTO — Scroll Orchestration, Gate, Auto-Cruise & Back-to-Top
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const gate = document.getElementById('opening-gate');
  const gateBtn = document.getElementById('gate-enter-btn');
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
  const storyCards = Array.from(document.querySelectorAll('.story-card'));

  // =========================================================================
  // 1. Click-to-Open Entrance Gate
  // =========================================================================

  function openGate() {
    if (!gate || gate.classList.contains('is-open')) return;
    gate.classList.add('is-open');
    document.body.classList.remove('is-gated');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  if (gateBtn) {
    gateBtn.addEventListener('click', openGate);
  }
  window.addEventListener('keydown', function (e) {
    if (document.body.classList.contains('is-gated') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openGate();
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

  function updateScroll() {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    if (window.ManifestoScene) {
      window.ManifestoScene.setScrollProgress(progress);
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
})();
