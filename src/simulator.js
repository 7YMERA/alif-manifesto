/**
 * Induced Demand Test
 * Drives the live 3D city behind the page (see ManifestoScene.setSimScenario) and
 * the metric panel. Four steps: status quo -> Bypass 2 on top of Bypass 1 ->
 * Bypass 3 on top of that -> mass rail instead.
 *
 * All metric values are an illustrative model, not measurements. The only measured
 * figure on the page is the RapidKL 750 audit (18 km, 40 min).
 */

const SCENARIOS = {
  base: {
    status: 'Today · status quo',
    legend: [
      ['Bypass 1', 'Full', 'bad'],
      ['Ground roads', 'Full', 'bad'],
    ],
    metrics: { pph: 1800, journey: 40, noise: 82, co2: 210 },
    insight: `Bypass 1 already exists, and it is <mark class="hl hl--red">full</mark>. The ground roads crawl beneath it. Measured on the RapidKL 750: <mark class="hl hl--blue">18 km in 40 minutes</mark>, because the bus sits in the same traffic as everyone else.`,
  },
  bypass2: {
    status: 'Bypass 2, built on top of Bypass 1',
    legend: [
      ['Bypass 2', 'Full', 'bad'],
      ['Bypass 1', 'Full', 'bad'],
      ['Ground roads', 'Full', 'bad'],
    ],
    metrics: { pph: 2100, journey: 40, noise: 86, co2: 240 },
    insight: `Bypass 2 opens and, for a while, it flows. So more people drive. Then <mark class="hl hl--red">Bypass 1 and Bypass 2 are both full</mark>. Studies of US cities find traffic rises roughly in step with road capacity (Duranton &amp; Turner, 2011). More road invites more cars.`,
  },
  bypass3: {
    status: 'Bypass 3, built on top of Bypass 2',
    legend: [
      ['Bypass 3', 'Full', 'bad'],
      ['Bypass 2', 'Full', 'bad'],
      ['Bypass 1', 'Full', 'bad'],
      ['Ground roads', 'Full', 'bad'],
    ],
    metrics: { pph: 2200, journey: 41, noise: 89, co2: 265 },
    insight: `So build Bypass 3. Same result: <mark class="hl hl--red">all three are full</mark> and the ground roads still crawl. Bypass 4? Every one of these is a road for cars, so every one of them fills up. There is no last bypass.`,
  },
  rail: {
    status: 'Mass rail instead',
    legend: [
      ['Bypass 2 and 3', 'Never built', 'off'],
      ['Bypass 1', 'Flowing', 'ok'],
      ['Ground roads', 'Flowing', 'ok'],
      ['Mass rail', 'Running', 'rail'],
    ],
    metrics: { pph: 12800, journey: 20, noise: 64, co2: 38 },
    insight: `Take people off the road instead. <mark class="hl hl--blue">Mass rail</mark> moves far more people per hour on a strip a fraction as wide, and it does not fill up by inviting more cars. The money for Bypass 2 and 3 builds the line.`,
  },
};

const METRIC_MAX = { pph: 14000, journey: 60, noise: 95, co2: 280 };
const METRIC_UNIT = { pph: '', journey: ' min', noise: ' dB', co2: ' g/km' };
const METRIC_INVERT = { pph: false, journey: true, noise: true, co2: true };

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

  function switchTo(key) {
    if (key === activeKey) return;
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
      pushToScene();
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
  renderMetrics();
}
