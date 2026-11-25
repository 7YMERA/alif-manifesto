/* ==========================================================================
   ALIF MANIFESTO — Scroll Orchestration, Auto-Cruise, Street Simulator & UI
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const lightBtn = document.getElementById('light-toggle');
  const cruiseBtn = document.getElementById('cruise-toggle');
  const hudYear = document.getElementById('hud-year');
  const hudPhase = document.getElementById('hud-phase');
  const hudFill = document.getElementById('hud-meter-fill');
  const progressBar = document.getElementById('scroll-progress-bar');
  const yearBackdrop = document.getElementById('year-backdrop');
  const railLinks = Array.from(document.querySelectorAll('.rail-link'));
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const storyCards = Array.from(document.querySelectorAll('.story-card'));

  const PHASE_META = [
    { id: 'opening', year: '2026', label: 'The Manifesto' },
    { id: 'frustration', year: '2026', label: 'Why Streets Matter' },
    { id: 'highways-reimagined', year: '2026', label: 'Keep & Green Highways' },
    { id: 'phase-1', year: '2026–2027', label: 'Year 1 · Foundation' },
    { id: 'phase-2', year: '2028–2029', label: 'Year 3 · Knowledge & NGOs' },
    { id: 'phase-3', year: '2030–2031', label: 'Year 5 · Influence' },
    { id: 'phase-4', year: '2036', label: 'Year 10 · Public Office' }
  ];

  // =========================================================================
  // 1. Theme (Light / Dark) & 3D Lighting (Day / Golden Hour)
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
  // 2. Scroll Progress -> 3D Scene, Progress Hairline & Kinetic Year Watermark
  // =========================================================================

  let currentPreviewMode = null;

  function updateScroll() {
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    if (window.ManifestoScene) {
      window.ManifestoScene.setScrollProgress(progress);
      if (currentPreviewMode && progress > 0.34) {
        currentPreviewMode = null;
        window.ManifestoScene.setPreviewMode(null);
      }
    }

    const pct = (progress * 100).toFixed(2) + '%';
    if (hudFill) hudFill.style.width = pct;
    if (progressBar) progressBar.style.width = pct;

    if (yearBackdrop) {
      const interpolatedYear = Math.round(2026 + progress * 10);
      yearBackdrop.textContent = String(interpolatedYear);
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  // =========================================================================
  // 3. Auto-Cruise 3D Timeline Glide
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
    window.scrollBy(0, 2.2);
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

  // Stop auto-cruise immediately if user takes manual control
  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, stopCruise, { passive: true });
  });

  // =========================================================================
  // 4. Chapter Active State & Card Reveal Observer
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
  // 5. Interactive Street Simulator (Chapter 01: Highway vs Bus & Sidewalk)
  // =========================================================================

  const simButtons = Array.from(document.querySelectorAll('.sim-btn[data-mode]'));
  const greenButtons = Array.from(document.querySelectorAll('.green-btn[data-green]'));
  const simCapacity = document.getElementById('sim-capacity');
  const simSidewalk = document.getElementById('sim-sidewalk');
  const simSpeed = document.getElementById('sim-speed');
  const simCaption = document.getElementById('sim-caption');

  const SIM_DATA = {
    highway: {
      capacity: '1,800 / hr',
      sidewalk: '0.8 m broken',
      speed: '14 km/h jam',
      caption:
        'Status quo: Adding more urban highways triggers induced demand. Cars fill the new lanes within months while elderly pedestrians still have nowhere safe to cross.'
    },
    transit: {
      capacity: '9,000+ / hr',
      sidewalk: '3.5 m shaded',
      speed: '42 km/h bus',
      caption:
        '2036 vision: Convert car lanes into enforced, beautified bus lanes with wide shaded kaki lima, raised zebra crossings, and protected bike lanes. Watch the 3D street transform behind this card.'
    }
  };

  simButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const mode = btn.getAttribute('data-mode');
      const data = SIM_DATA[mode];
      if (!data) return;

      simButtons.forEach(function (b) {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      if (simCapacity) simCapacity.textContent = data.capacity;
      if (simSidewalk) simSidewalk.textContent = data.sidewalk;
      if (simSpeed) simSpeed.textContent = data.speed;
      if (simCaption) simCaption.textContent = data.caption;

      currentPreviewMode = mode;
      if (window.ManifestoScene) {
        window.ManifestoScene.setPreviewMode(mode);
      }
    });
  });

  greenButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const mode = btn.getAttribute('data-green');
      greenButtons.forEach(function (b) {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (window.ManifestoScene) {
        window.ManifestoScene.setGreenOverpass(mode);
      }
    });
  });

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
