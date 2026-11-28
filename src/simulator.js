/**
 * Induced Demand Test
 * Drives the live 3D city behind the page (see ManifestoScene.setSimScenario) and
 * the metric panel. Four steps: status quo -> Bypass 2 on top of Bypass 1 ->
 * Bypass 3 on top of that -> mass rail instead.
 *
 * All metric values are an illustrative model, not measurements. The only measured
 * figure on the page is the RapidKL 750 audit (18 km, 40 min).
 */

import { ManifestoAudio } from './audio.js';

const SCENARIOS = {
  base: {
    status: 'Today · status quo',
    legend: [
      ['Bypass 1', 'Full', 'bad'],
      ['Ground roads', 'Full', 'bad'],
      ['Shoplots', 'Open', 'ok'],
    ],
    tags: [
      { label: 'Bypass 1 (existing)', state: 'Full', tone: 'bad', at: [-16.5, 9, -40] },
      { label: 'Ground road', state: 'Crawling', tone: 'bad', at: [0, 1, -70] },
      { label: 'Shophouses', state: 'Open', tone: 'ok', at: [-27, 7, -40] },
    ],
    metrics: { pph: 1800, journey: 40, noise: 82, shops: 70 },
    insight: `<mark class="hl hl--red">Cars cause congestion. Not people.</mark> Each car is one or two people taking up a whole lane. Bypass 1 is full, the ground roads crawl, and the RapidKL 750 bus is stuck in the same jam: <mark class="hl hl--blue">18 km in 40 minutes</mark>.`,
  },
  widen: {
    status: 'Widen the road: shophouses demolished',
    legend: [
      ['New lanes', '+8, full', 'bad'],
      ['Ground road', 'Full', 'bad'],
      ['Shophouses', 'Demolished', 'bad'],
    ],
    tags: [
      { label: '8 new lanes', state: 'Full', tone: 'bad', at: [14, 1, -22] },
      { label: 'Shophouses', state: 'Demolished', tone: 'bad', at: [-30, 2, -14] },
      { label: 'Bypass 1', state: 'Full', tone: 'bad', at: [-16.5, 9, -95] },
    ],
    metrics: { pph: 2000, journey: 40, noise: 86, shops: 25 },
    insight: `The other classic answer: <mark class="hl hl--red">knock down the buildings beside the road and add lanes</mark>. The shophouses and the kaki lima that lined it are gone. The new lanes fill with the extra cars they invite, so it is <mark class="hl hl--red">just as jammed, with nothing left beside it</mark>. Widen a road and the jam widens with it.`,
  },
  bypass2: {
    status: 'Bypass 2: flyovers over the shophouses',
    legend: [
      ['Flyovers', 'Full', 'bad'],
      ['Ground roads', 'Emptying', 'bad'],
      ['Shoplots', 'Closing', 'bad'],
    ],
    tags: [
      { label: 'Bypass 2 flyovers', state: 'Full', tone: 'bad', at: [4, 24, -40] },
      { label: 'Ground road', state: 'Emptying', tone: 'bad', at: [0, 1, -70] },
      { label: 'Shophouses', state: 'Closing', tone: 'bad', at: [-27, 7, -40] },
    ],
    metrics: { pph: 2100, journey: 40, noise: 86, shops: 40 },
    insight: `Bypass 2 swings left and right over the shophouses. Drivers move up onto the flyover, so <mark class="hl hl--red">the regular road empties and the shops lose their passing trade</mark>. For a while it flows, then it fills too. More road invites more cars (Duranton &amp; Turner, 2011).`,
  },
  bypass3: {
    status: 'Bypass 3: nobody wants to be here',
    legend: [
      ['Flyovers', 'Full', 'bad'],
      ['Ground roads', 'Empty', 'bad'],
      ['Shoplots', 'Shuttered', 'bad'],
    ],
    tags: [
      { label: 'Flyovers, 3 levels', state: 'Full', tone: 'bad', at: [6, 36, -48] },
      { label: 'Ground road', state: 'Empty', tone: 'bad', at: [0, 1, -70] },
      { label: 'Shophouses', state: 'Shuttered', tone: 'bad', at: [-27, 7, -40] },
    ],
    metrics: { pph: 2200, journey: 41, noise: 89, shops: 12 },
    insight: `Now that the flyovers exist, <mark class="hl hl--red">nobody uses the regular roads</mark>. The shoplots die. It is too loud to work beside a speeding highway. <mark class="hl hl--red">In the end nobody wants to live, work or run a business here.</mark> And the flyovers are still full. There is no last bypass.`,
  },
  rail: {
    status: 'Mass rail instead',
    legend: [
      ['Bypass 2 and 3', 'Never built', 'off'],
      ['Streets', 'Flowing', 'ok'],
      ['Shoplots', 'Open', 'ok'],
      ['Mass rail', 'Running', 'rail'],
    ],
    tags: [
      { label: 'Mass rail', state: 'Running', tone: 'rail', at: [17.8, 11, -170] },
      { label: 'Streets', state: 'Flowing', tone: 'ok', at: [0, 1, -70] },
      { label: 'Shophouses', state: 'Open', tone: 'ok', at: [-27, 7, -40] },
    ],
    metrics: { pph: 12800, journey: 20, noise: 64, shops: 88 },
    insight: `<mark class="hl hl--blue">Mass transit fixes congestion because it takes the cars off the road</mark>, and it brings people to the shopfronts instead of over them. Streets, shops and homes stay alive. <mark class="hl hl--blue">It is not too late for Malaysia.</mark> Stop the bypasses and build the line.`,
  },
};

const METRIC_MAX = { pph: 14000, journey: 60, noise: 95, shops: 100 };
const METRIC_UNIT = { pph: '', journey: ' min', noise: ' dB', shops: '%' };
const METRIC_INVERT = { pph: false, journey: true, noise: true, shops: false };

const ORDER = ['base', 'widen', 'bypass2', 'bypass3', 'rail'];
const STEP_MS = 7500;
// For each metric: is a bigger number better? (drives the green / red "vs today" chip)
const HIGHER_IS_BETTER = { pph: true, journey: false, noise: false, shops: true };
const DELTA_FMT = {
  pph: (d) => (d > 0 ? '+' : '') + Math.round(d).toLocaleString() + ' people',
  journey: (d) => (d > 0 ? '+' : '') + Math.round(d) + ' min',
  noise: (d) => (d > 0 ? '+' : '') + Math.round(d) + ' dB',
  shops: (d) => (d > 0 ? '+' : '') + Math.round(d) + ' pts',
};

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export function initSimulator(ManifestoScene) {
  const section = document.getElementById('jam-simulator');
  if (!section) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = [...section.querySelectorAll('.sim-btn')];
  const insightEl = document.getElementById('sim-insight');
  const yearEl = document.getElementById('sim-year');
  const legendEl = document.getElementById('sim-legend');
  const tagsEl = document.getElementById('sim-tags');
  const stepNumEl = document.getElementById('sim-stepnum');
  const stepLabelEl = document.getElementById('sim-step-label');
  const progressEls = [...section.querySelectorAll('.sim-progress i')];
  const playBtn = document.getElementById('sim-play');
  const wideHud = window.matchMedia('(min-width: 981px)');

  let activeKey = 'base';
  let onScreen = false;
  let cur = { ...SCENARIOS.base.metrics };
  let from = { ...cur };
  let targ = { ...cur };
  let t = 1;
  let raf = 0;
  let tStart = 0;

  function renderMetrics() {
    Object.keys(cur).forEach((k) => {
      const valEl = document.getElementById('sim-m-' + k);
      const barEl = document.getElementById('sim-b-' + k);
      const v = cur[k];
      if (valEl) {
        valEl.textContent = (k === 'pph' ? Math.round(v).toLocaleString() : Math.round(v)) + METRIC_UNIT[k];
      }
      if (barEl) {
        const goodness = Math.min(1, Math.max(0, METRIC_INVERT[k] ? 1 - v / METRIC_MAX[k] : v / METRIC_MAX[k]));
        barEl.style.width = goodness * 100 + '%';
        barEl.style.background = `hsl(${Math.round(goodness * 142)},65%,38%)`; // red to green
      }
    });
  }

  /** "vs today" chips: green when the change is an improvement, red when it is worse. */
  function renderDeltas(key) {
    const base = SCENARIOS.base.metrics, now = SCENARIOS[key].metrics;
    Object.keys(now).forEach((k) => {
      const el = document.getElementById('sim-d-' + k);
      if (!el) return;
      const d = now[k] - base[k];
      el.className = 'sim-metric__delta';
      if (key === 'base' || d === 0) { el.textContent = 'today'; return; }
      const better = HIGHER_IS_BETTER[k] ? d > 0 : d < 0;
      el.classList.add(better ? 'is-good' : 'is-bad');
      el.textContent = (better ? '▲ ' : '▼ ') + DELTA_FMT[k](d) + ' vs today';
    });
  }

  // ── Tags pinned to things in the 3D city (wide screens only) ──────────
  let tagEls = [];
  function renderTags(tags) {
    if (!tagsEl) return;
    tagsEl.innerHTML = tags
      .map((tg) => `<div class="sim-tag sim-tag--${tg.tone}"><i class="sim-tag__line"></i><div class="sim-tag__box"><b>${tg.label}</b><span>${tg.state}</span></div></div>`)
      .join('');
    tagEls = [...tagsEl.children];
  }
  let tagRaf = 0;
  function tagLoop() {
    tagRaf = 0;
    if (!onScreen || !wideHud.matches || !ManifestoScene || !ManifestoScene.project) return;
    const tags = SCENARIOS[activeKey].tags;
    const w = window.innerWidth, h = window.innerHeight;
    tags.forEach((tg, i) => {
      const el = tagEls[i];
      if (!el) return;
      const p = ManifestoScene.project(tg.at[0], tg.at[1], tg.at[2]);
      // keep tags in the open middle of the screen, clear of the side panels, title and caption
      const visible = p.ok && p.x > 340 && p.x < w - 330 && p.y > 160 && p.y < h - 200;
      el.classList.toggle('is-hidden', !visible);
      el.classList.toggle('flip', p.x > w - 520);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
    tagRaf = requestAnimationFrame(tagLoop);
  }
  function startTags() {
    if (!tagRaf && onScreen && wideHud.matches) tagRaf = requestAnimationFrame(tagLoop);
  }

  // ── Step UI: numbers, progress segments, play button ──────────────────
  function renderStep(key) {
    const n = ORDER.indexOf(key) + 1;
    if (stepNumEl) stepNumEl.textContent = `Step ${n} / ${ORDER.length}`;
    if (stepLabelEl) stepLabelEl.textContent = `Step ${n} / ${ORDER.length}`;
    progressEls.forEach((el, i) => {
      el.classList.toggle('is-on', i < n && key === 'rail');
      el.classList.toggle('is-bad', i < n && key !== 'rail');
    });
  }

  let playing = false;
  let playTimer = 0;
  function setPlayLabel() {
    if (!playBtn) return;
    playBtn.setAttribute('aria-pressed', String(playing));
    const label = playBtn.querySelector('span');
    if (label) label.textContent = playing ? 'Pause' : (activeKey === 'rail' ? 'Replay the story' : 'Play the story');
  }
  function setPlaying(on) {
    playing = on;
    clearTimeout(playTimer);
    setPlayLabel();
    if (on) {
      playTimer = setTimeout(() => {
        const next = ORDER[ORDER.indexOf(activeKey) + 1];
        if (!next) { setPlaying(false); return; }
        switchTo(next, true);
      }, STEP_MS);
    }
  }
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playing) { setPlaying(false); return; }
      if (activeKey === 'rail') switchTo('base', true);
      setPlaying(true);
    });
  }

  function tick(now) {
    t = Math.min(1, (now - tStart) / 1100); // wall-clock, so it finishes on slow devices too
    const e = ease(t);
    Object.keys(cur).forEach((k) => { cur[k] = lerp(from[k], targ[k], e); });
    renderMetrics();
    raf = t < 1 ? requestAnimationFrame(tick) : 0;
  }

  function renderLegend(rows) {
    if (!legendEl) return;
    legendEl.innerHTML = rows
      .map(([name, state, tone]) => `<li class="sim-legend__row sim-legend__row--${tone}"><span>${name}</span><b>${state}</b></li>`)
      .join('');
  }

  function pushToScene() {
    if (ManifestoScene && ManifestoScene.setSimScenario) {
      ManifestoScene.setSimScenario(onScreen ? activeKey : null);
    }
  }

  function switchTo(key, fromPlay = false) {
    if (!fromPlay) setPlaying(false);       // choosing a step yourself ends the autoplay
    if (key === activeKey) return;
    ManifestoAudio.playChime('tick');
    activeKey = key;
    const sc = SCENARIOS[key];

    from = { ...cur };
    targ = { ...sc.metrics };
    t = 0;
    tStart = performance.now();
    if (reduced.matches) {
      cur = { ...targ };
      t = 1;
      renderMetrics();
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }

    if (insightEl) insightEl.innerHTML = sc.insight;
    if (yearEl) yearEl.textContent = sc.status;
    renderLegend(sc.legend);
    renderTags(sc.tags);
    renderDeltas(key);
    renderStep(key);
    setPlayLabel();
    if (fromPlay) setPlaying(true);         // schedule the next step of the autoplay
    buttons.forEach((b) => {
      const on = b.dataset.scenario === key;
      b.classList.toggle('sim-btn--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    pushToScene();
  }

  buttons.forEach((b) => b.addEventListener('click', () => switchTo(b.dataset.scenario)));

  // The 3D city only follows the simulator while its section crosses the middle of the screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      document.body.classList.toggle('is-sim', onScreen);
      if (!onScreen) setPlaying(false);
      pushToScene();
      startTags();
    }, { rootMargin: '-30% 0px -30% 0px' }).observe(section);
  }

  if (insightEl) insightEl.innerHTML = SCENARIOS.base.insight;
  if (yearEl) yearEl.textContent = SCENARIOS.base.status;
  renderLegend(SCENARIOS.base.legend);
  buttons.forEach((b) => {
    const on = b.dataset.scenario === 'base';
    b.classList.toggle('sim-btn--active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  renderTags(SCENARIOS.base.tags);
  renderDeltas('base');
  renderStep('base');
  renderMetrics();
  wideHud.addEventListener('change', startTags);
}
