/**
 * Induced Demand Corridor Simulator
 * Shows a top-down cross-section of the Shah Alam→KL corridor.
 * Three states: base jam → more car lanes (induced demand) → transit + shared lanes.
 */

export function initSimulator() {
  const section = document.getElementById('jam-simulator');
  const canvas = document.getElementById('sim-canvas');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');

  // ── Design tokens ─────────────────────────────────────────────
  const C = {
    asphalt:   '#272e38',
    divider:   '#191e26',
    busLane:   '#0047ab',
    bikeLane:  '#0e7c59',
    sidewalk:  '#d6cbb8',
    park:      '#c8d8b0',
    centerDash:'rgba(240,232,210,0.22)',
    laneEdge:  'rgba(240,232,210,0.14)',
    busLabel:  'rgba(255,255,255,0.32)',
    treeA:     '#2d7a4a',
    treeB:     '#3b9460',
    trainBody: '#f7f8fa',
    trainBlue: '#0047ab',
    trainRed:  '#d92332',
    trainGap:  '#181e28',
  };

  const CAR_PALETTE = [
    '#d8dde4','#4a5564','#9daabb','#1b3e74',
    '#8f2820','#c4a450','#2b3344','#4b7466',
  ];

  // ── Scenario definitions ──────────────────────────────────────
  // Each lane: { id, type, dir(-1/0/+1), share }
  // share values are relative; they'll be normalised at render time.
  const SCENARIOS = {
    base: {
      label: 'Status Quo',
      year:  '2026',
      lanes: [
        { id:'sw-t',  type:'walk', dir: 0,  share:1.0 },
        { id:'ct1',   type:'car',  dir:-1,  share:1.9 },
        { id:'ct2',   type:'car',  dir:-1,  share:1.9 },
        { id:'div',   type:'div',  dir: 0,  share:0.4 },
        { id:'cb1',   type:'car',  dir: 1,  share:1.9 },
        { id:'cb2',   type:'car',  dir: 1,  share:1.9 },
        { id:'sw-b',  type:'walk', dir: 0,  share:1.0 },
      ],
      carDensity: 0.78, carSpeedPx: 11,
      metrics: { pph:1800, journey:48, noise:82, co2:210 },
      insight: `Two car lanes. 48-minute jam on a <mark class="hl hl--red">18 km</mark> stretch every morning. <mark class="hl hl--blue">RapidKL 750</mark> bus shares the same congestion — zero point adding more buses if they crawl with cars.`,
    },
    lanes: {
      label: '+ Car Lanes',
      year:  '2028',
      lanes: [
        { id:'sw-t',  type:'walk', dir: 0,  share:0.6 },
        { id:'ct1',   type:'car',  dir:-1,  share:1.6 },
        { id:'ct2',   type:'car',  dir:-1,  share:1.6 },
        { id:'ct3',   type:'car',  dir:-1,  share:1.6 },
        { id:'div',   type:'div',  dir: 0,  share:0.4 },
        { id:'cb1',   type:'car',  dir: 1,  share:1.6 },
        { id:'cb2',   type:'car',  dir: 1,  share:1.6 },
        { id:'cb3',   type:'car',  dir: 1,  share:1.6 },
        { id:'sw-b',  type:'walk', dir: 0,  share:0.6 },
      ],
      carDensity: 0.90, carSpeedPx: 13,
      metrics: { pph:2200, journey:42, noise:87, co2:245 },
      insight: `Six car lanes. <mark class="hl hl--red">+22% more cars within 2 years</mark> — induced demand. Same jam, just wider. Walkable space shrunk by 40%. Noise up. CO₂ up. The old answer doesn't work.`,
    },
    transit: {
      label: '+ Transit',
      year:  '2032',
      lanes: [
        { id:'pk-t',  type:'park', dir: 0,  share:1.3 },
        { id:'bk-t',  type:'bike', dir:-1,  share:0.8 },
        { id:'bs-t',  type:'bus',  dir:-1,  share:1.3 },
        { id:'ct1',   type:'car',  dir:-1,  share:1.6 },
        { id:'div',   type:'div',  dir: 0,  share:0.4 },
        { id:'cb1',   type:'car',  dir: 1,  share:1.6 },
        { id:'bs-b',  type:'bus',  dir: 1,  share:1.3 },
        { id:'bk-b',  type:'bike', dir: 1,  share:0.8 },
        { id:'pk-b',  type:'park', dir: 0,  share:1.3 },
      ],
      carDensity: 0.26, carSpeedPx: 36,
      hasTrain: true,
      metrics: { pph:12800, journey:14, noise:64, co2:38 },
      insight: `One enforced bus lane each way + elevated rail. Buses move <mark class="hl hl--blue">70+ passengers</mark> per trip. Trains carry <mark class="hl hl--blue">1,200 per car × 6 cars</mark>. 7× more people in the same corridor. Streets bloom. Noise drops. Air clears.`,
    },
  };

  // ── Animated lane state ───────────────────────────────────────
  let fromKey = 'base', toKey = 'base', transT = 1;
  let activeKey = 'base';

  function getLaneStates(t) {
    const from = SCENARIOS[fromKey].lanes;
    const to   = SCENARIOS[toKey].lanes;
    const allIds = [...new Set([...from.map(l => l.id), ...to.map(l => l.id)])];
    const te = easeInOut(t);
    return allIds.map(id => {
      const f = from.find(l => l.id === id) || { share:0, type:'car', dir:0 };
      const t2 = to.find(l => l.id === id)  || { share:0, type:f.type, dir:f.dir };
      return {
        id,
        type:  t > 0.5 ? t2.type : f.type,
        dir:   t2.dir,
        share: lerp(f.share, t2.share, te),
      };
    }).filter(l => l.share > 0.001);
  }

  function computeLaneRects(H, states) {
    const total = states.reduce((s, l) => s + l.share, 0);
    let y = 0;
    return states.map(l => {
      const h = (l.share / total) * H;
      const r = { ...l, y, h };
      y += h;
      return r;
    });
  }

  // ── Vehicle particles ─────────────────────────────────────────
  let vehicles = [];

  function respawn() {
    vehicles = [];
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;
    const scen = SCENARIOS[activeKey];
    const laneRects = computeLaneRects(H, getLaneStates(1));

    laneRects.forEach(lr => {
      if (lr.type === 'car') {
        const slots = Math.ceil(W / 50);
        for (let i = 0; i < slots; i++) {
          if (Math.random() > scen.carDensity) continue;
          vehicles.push({
            type:'car', laneId: lr.id,
            x: Math.random() * (W + 60) - 30,
            color: CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)],
            speedFactor: 0.6 + Math.random() * 0.9,
          });
        }
      } else if (lr.type === 'bus') {
        for (let i = 0; i < 3; i++) {
          vehicles.push({
            type:'bus', laneId: lr.id,
            x: (W / 3) * i + Math.random() * 50,
            color: '#d92332',
          });
        }
      } else if (lr.type === 'bike') {
        for (let i = 0; i < 7; i++) {
          vehicles.push({
            type:'bike', laneId: lr.id,
            x: Math.random() * W,
          });
        }
      }
    });
  }

  // ── Train ─────────────────────────────────────────────────────
  let trainX = -600;

  // ── Metric animation ──────────────────────────────────────────
  const METRIC_MAX = { pph:14000, journey:60, noise:95, co2:260 };
  const METRIC_UNIT = { pph:'', journey:' min', noise:' dB', co2:' g/km' };
  const METRIC_INVERT = { pph:false, journey:true, noise:true, co2:true };
  let metricFrom = { ...SCENARIOS.base.metrics };
  let metricTarg = { ...SCENARIOS.base.metrics };
  let metricT = 1;

  function tickMetrics(dt) {
    if (metricT >= 1) return;
    metricT = Math.min(1, metricT + dt * 0.9);
    const te = easeInOut(metricT);
    Object.keys(metricCur).forEach(k => {
      metricCur[k] = lerp(metricFrom[k], metricTarg[k], te);
    });
    renderMetrics();
  }

  function renderMetrics() {
    Object.keys(metricCur).forEach(k => {
      const valEl = document.getElementById('sim-m-' + k);
      const barEl = document.getElementById('sim-b-' + k);
      const v = metricCur[k];
      if (valEl) {
        valEl.textContent = (k === 'pph'
          ? Math.round(v).toLocaleString()
          : Math.round(v)) + METRIC_UNIT[k];
      }
      if (barEl) {
        const pct = METRIC_INVERT[k]
          ? 1 - v / METRIC_MAX[k]
          : v / METRIC_MAX[k];
        barEl.style.width = (Math.min(1, Math.max(0, pct)) * 100) + '%';
        // Green = good (high pph or low noise/co2/journey)
        const goodness = METRIC_INVERT[k] ? 1 - v / METRIC_MAX[k] : v / METRIC_MAX[k];
        const hue = Math.round(goodness * 142); // 0=red → 142=green
        barEl.style.background = `hsl(${hue},65%,38%)`;
      }
    });
  }

  // ── Switch scenario ───────────────────────────────────────────
  function switchTo(key) {
    if (key === activeKey && transT >= 1) return;
    fromKey = activeKey;
    toKey = key;
    transT = 0;
    activeKey = key;

    metricFrom = { ...metricCur };
    metricTarg = { ...SCENARIOS[key].metrics };
    metricT = 0;

    // Insight
    const ins = document.getElementById('sim-insight');
    if (ins) {
      ins.style.opacity = '0';
      setTimeout(() => {
        ins.innerHTML = SCENARIOS[key].insight;
        ins.style.opacity = '1';
      }, 280);
    }

    // Year badge
    const yr = document.getElementById('sim-year');
    if (yr) yr.textContent = SCENARIOS[key].year + ' — ' + SCENARIOS[key].label;

    // Button states
    document.querySelectorAll('.sim-btn').forEach(b => {
      b.classList.toggle('sim-btn--active', b.dataset.scenario === key);
    });

    respawn();
  }

  // ── Draw helpers ──────────────────────────────────────────────
  function drawTree(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.treeA;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.1, y - r * 0.15, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = C.treeB;
    ctx.fill();
  }

  function drawCar(x, y, w, h, color, dir) {
    const r = Math.min(3, h * 0.3);
    ctx.fillStyle = color;
    roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.fill();
    // windscreen hint
    ctx.fillStyle = 'rgba(140,195,235,0.5)';
    const wsX = dir > 0 ? x + w * 0.08 : x - w * 0.44;
    roundRect(wsX, y - h * 0.38, w * 0.34, h * 0.76, 2);
    ctx.fill();
  }

  function drawBus(x, y, w, h, dir) {
    const r = 3;
    ctx.fillStyle = '#f7f8fa';
    roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.fill();
    ctx.fillStyle = C.trainBlue;
    ctx.fillRect(x - w / 2, y + h * 0.28, w, h * 0.24);
    ctx.fillStyle = C.trainRed;
    ctx.fillRect(x - w / 2, y + h * 0.08, w, h * 0.18);
    // windows
    ctx.fillStyle = 'rgba(55,85,115,0.72)';
    for (let wx = x - w / 2 + 5; wx < x + w / 2 - 5; wx += 11) {
      ctx.fillRect(wx, y - h * 0.44, 7, h * 0.44);
    }
  }

  function drawBike(x, y, w, h) {
    ctx.fillStyle = '#0e7c59';
    roundRect(x - w / 2, y - h / 2, w, h, 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Render loop ───────────────────────────────────────────────
  let lastNow = performance.now();

  function render(now) {
    requestAnimationFrame(render);
    const dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;

    // Advance transitions
    if (transT < 1) transT = Math.min(1, transT + dt * 1.3);
    tickMetrics(dt);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;

    const dpr = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Current lane layout
    const states = getLaneStates(transT);
    const rects  = computeLaneRects(H, states);

    // ── Background clear ──────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // ── Draw lanes ────────────────────────────────────────────
    rects.forEach(lr => {
      let fill = C.asphalt;
      if (lr.type === 'walk') fill = C.sidewalk;
      if (lr.type === 'park') fill = C.park;
      if (lr.type === 'bus')  fill = C.busLane;
      if (lr.type === 'bike') fill = C.bikeLane;
      if (lr.type === 'div')  fill = C.divider;
      ctx.fillStyle = fill;
      ctx.fillRect(0, lr.y, W, lr.h);

      // Trees for walk/park lanes
      if ((lr.type === 'walk' || lr.type === 'park') && lr.h > 14) {
        const spacing = 62;
        const r = Math.min(lr.h * 0.34, 10);
        for (let tx = spacing * 0.5; tx < W; tx += spacing) {
          drawTree(tx, lr.y + lr.h * 0.5, r);
        }
      }

      // Lane edge line
      if (lr.type === 'car' || lr.type === 'bus') {
        ctx.strokeStyle = C.laneEdge;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(0, lr.y + lr.h);
        ctx.lineTo(W, lr.y + lr.h);
        ctx.stroke();
      }

      // BUS ONLY label
      if (lr.type === 'bus' && lr.h > 14) {
        ctx.fillStyle = C.busLabel;
        ctx.font = `600 ${Math.max(8, Math.min(12, lr.h * 0.42))}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BUS ONLY', W * 0.5, lr.y + lr.h * 0.5);
      }
    });

    // ── Center dashes ─────────────────────────────────────────
    ctx.strokeStyle = C.centerDash;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([22, 16]);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Update + draw vehicles ────────────────────────────────
    const scen = SCENARIOS[activeKey];
    vehicles.forEach(v => {
      const lr = rects.find(l => l.id === v.laneId);
      if (!lr || lr.h < 8) return;

      const spd = (v.type === 'bus'  ? scen.carSpeedPx * 1.8  :
                   v.type === 'bike' ? scen.carSpeedPx * 1.1  :
                   scen.carSpeedPx * (v.speedFactor || 1)) * lr.dir;
      v.x += spd * dt * 60;

      // Wraparound
      if (spd > 0 && v.x >  W + 80) v.x = -80;
      if (spd < 0 && v.x < -80)     v.x =  W + 80;

      const cy = lr.y + lr.h * 0.5;
      if (v.type === 'car') {
        const cw = 32, ch = Math.min(lr.h * 0.56, 18);
        drawCar(v.x, cy, cw, ch, v.color, lr.dir);
      } else if (v.type === 'bus') {
        const bw = 70, bh = Math.min(lr.h * 0.68, 24);
        drawBus(v.x, cy, bw, bh, lr.dir);
      } else if (v.type === 'bike') {
        const kw = 14, kh = Math.min(lr.h * 0.42, 10);
        drawBike(v.x, cy, kw, kh);
      }
    });

    // ── Elevated train (transit only) ─────────────────────────
    const trainAlpha = activeKey === 'transit'
      ? Math.min(1, transT * 2)
      : transT < 0.5 && toKey === 'transit' ? transT * 2 : 0;

    if (trainAlpha > 0.01) {
      trainX += 220 * dt;
      if (trainX > W + 240) trainX = -560;

      const topLane = rects[0];
      if (topLane && topLane.h > 10) {
        const ty = topLane.y + topLane.h * 0.5;
        const th = Math.min(topLane.h * 0.62, 22);
        ctx.globalAlpha = trainAlpha;
        for (let c = 0; c < 5; c++) {
          const cx = trainX - c * 108;
          // coach
          ctx.fillStyle = C.trainBody;
          roundRect(cx - 46, ty - th / 2, 92, th, 4);
          ctx.fill();
          ctx.fillStyle = C.trainBlue;
          ctx.fillRect(cx - 46, ty + th * 0.26, 92, th * 0.24);
          ctx.fillStyle = C.trainRed;
          ctx.fillRect(cx - 46, ty + th * 0.07, 92, th * 0.18);
          // inter-coach gap
          if (c < 4) {
            ctx.fillStyle = C.trainGap;
            ctx.fillRect(cx + 46, ty - th * 0.2, 16, th * 0.4);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // ── Scenario label overlay ────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = 'rgba(255,245,220,0.72)';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ ' + SCENARIOS[activeKey].year + ' · ' + SCENARIOS[activeKey].label, 12, 12);
  }

  // ── Utilities ─────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t)  { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  // ── Wire buttons ──────────────────────────────────────────────
  document.getElementById('sim-btn-base')?.addEventListener('click',    () => switchTo('base'));
  document.getElementById('sim-btn-lanes')?.addEventListener('click',   () => switchTo('lanes'));
  document.getElementById('sim-btn-transit')?.addEventListener('click', () => switchTo('transit'));

  // ── Boot ──────────────────────────────────────────────────────
  const ins = document.getElementById('sim-insight');
  if (ins) ins.innerHTML = SCENARIOS.base.insight;
  const yr = document.getElementById('sim-year');
  if (yr) yr.textContent = '2026 — Status Quo';
  document.querySelector('[data-scenario="base"]')?.classList.add('sim-btn--active');

  renderMetrics();
  respawn();
  requestAnimationFrame(render);
}
