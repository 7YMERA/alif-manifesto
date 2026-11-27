/**
 * Scroll-driven camera for the Klang Valley fly-through. A pure function of scroll progress
 * s in [0, 1], so tools/check-city.mjs can measure turn rates and collisions without a browser.
 *
 * The flight is one continuous forward glide down the boulevard that climbs to a high vantage
 * over KL. It never reverses direction. The gaze starts straight ahead along the road and eases
 * towards each landmark in turn (the "highlights") and back, with smooth bell-shaped weights.
 */
import * as THREE from 'three';
import { LANDMARKS } from '../city/layout.js';

const lm = Object.fromEntries(LANDMARKS.map(([id, x, z]) => [id, [x, z]]));

/** Position control points. x stays near the boulevard axis, height grows slowly. */
const POS = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.6, 7.2, 66),
  new THREE.Vector3(0.1, 8.1, 22),
  new THREE.Vector3(0.0, 10.4, -22),
  new THREE.Vector3(0.6, 13.4, -64),
  new THREE.Vector3(0.9, 19.0, -100),
  new THREE.Vector3(0.2, 30.0, -122),
  new THREE.Vector3(-4.0, 44.0, -136),
], false, 'centripetal');

/** Landmark gaze targets (where the camera looks, roughly mid-height of each tower) and when. */
const HIGHLIGHTS = [
  { at: 0.08, width: 0.07, strength: 0.55, target: [lm.klcc[0], 46, lm.klcc[1]] },
  { at: 0.30, width: 0.07, strength: 0.50, target: [lm.merdeka118[0], 46, lm.merdeka118[1]] },
  { at: 0.47, width: 0.07, strength: 0.50, target: [lm.menara_kl[0], 40, lm.menara_kl[1]] },
  { at: 0.64, width: 0.07, strength: 0.50, target: [lm.exchange106[0], 44, lm.exchange106[1]] },
  { at: 0.88, width: 0.12, strength: 0.80, target: [lm.klcc[0], 36, lm.klcc[1]] },
];

const FOV_START = 46, FOV_END = 52;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const bell = (s, c, w) => Math.exp(-0.5 * Math.pow((s - c) / w, 2));

const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _l = new THREE.Vector3(), _g = new THREE.Vector3();

/** Writes the camera position and look-at point for scroll s, returns the field of view. */
export function cameraPose(s, outPos, outLook) {
  s = clamp(s, 0, 1);
  POS.getPointAt(s, outPos);
  POS.getTangentAt(Math.min(0.999, s), _t);

  // Look-ahead along the road, tipping down a little more as we climb.
  const climb = smooth(s);
  const ahead = 85 + 40 * climb;
  outLook.copy(outPos).addScaledVector(_t, ahead);
  outLook.y = outPos.y - ahead * Math.tan((4 + 11 * climb) * Math.PI / 180);
  outLook.x = outPos.x + (outLook.x - outPos.x) * 0.15; // keep the axis calm

  // Ease the gaze towards each highlight and back.
  HIGHLIGHTS.forEach((h) => {
    const w = bell(s, h.at, h.width) * h.strength;
    if (w < 1e-3) return;
    _g.set(h.target[0], h.target[1], h.target[2]);
    outLook.lerp(_g, w);
  });
  return FOV_START + (FOV_END - FOV_START) * climb;
}

// ── Oracle ───────────────────────────────────────────────────────────────────
/** Angular speed and acceleration of the view direction, in degrees per unit of scroll. */
export function turnStats(poseFn, steps = 600) {
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const dirs = [];
  for (let i = 0; i <= steps; i++) {
    poseFn(i / steps, pos, look);
    dirs.push(look.clone().sub(pos).normalize());
  }
  const rate = [];
  for (let i = 1; i < dirs.length; i++) rate.push((dirs[i].angleTo(dirs[i - 1]) * 180 / Math.PI) * steps);
  let maxRate = 0, maxAccel = 0;
  rate.forEach((r, i) => { maxRate = Math.max(maxRate, r); if (i) maxAccel = Math.max(maxAccel, Math.abs(r - rate[i - 1]) * steps); });
  // does the camera ever travel backwards along the corridor (a direction cusp)?
  let reversals = 0;
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    poseFn(i / steps, pos, look);
    if (prev && pos.z - prev.z > 1e-4) reversals++;
    prev = pos.clone();
  }
  return { maxRate, maxAccel, reversals };
}

/** Real footprints and heights of the landmark models, in scene units (radius, top). */
const LANDMARK_BODY = { klcc: [24, 95], menara_kl: [8, 80], merdeka118: [16, 105], exchange106: [16, 95] };

/** Does the camera ever pass through a building, a landmark, the highway deck or the ground? */
export function collisions(obstacles = [], steps = 800) {
  const found = [];
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    cameraPose(s, pos, look);
    const tag = `s=${s.toFixed(3)} at (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`;
    if (pos.y < 3) found.push(`${tag}: too close to the ground`);
    // elevated highway deck (x -21..-12, y 5.5..9.5) and the viaduct (x 14.5..21.2, y 7..10.5)
    if (pos.z < 80 && pos.z > -250 && pos.y > 5.5 && pos.y < 9.5 && pos.x > -21 && pos.x < -12) found.push(`${tag}: inside the highway deck`);
    if (pos.z < 80 && pos.z > -250 && pos.y > 7 && pos.y < 10.5 && pos.x > 14.5 && pos.x < 21.2) found.push(`${tag}: inside the rail viaduct`);
    LANDMARKS.forEach(([id, lx, lz]) => {
      const [r, top] = LANDMARK_BODY[id];
      if (Math.hypot(pos.x - lx, pos.z - lz) < r + 10 && pos.y < top + 8) found.push(`${tag}: too near ${id}`);
    });
    obstacles.forEach((b, k) => {
      if (Math.abs(pos.x - b.x) < b.w / 2 + 6 && Math.abs(pos.z - b.z) < b.d / 2 + 6 && pos.y < b.h + 6) found.push(`${tag}: too near building ${k}`);
    });
  }
  return [...new Set(found)].slice(0, 8);
}

export function validate(obstacles = []) {
  const problems = [];
  const st = turnStats(cameraPose);
  if (st.maxRate > 420) problems.push(`view turns too fast: ${st.maxRate.toFixed(0)} deg per unit scroll (limit 420)`);
  if (st.maxAccel > 14000) problems.push(`view direction changes too abruptly: ${st.maxAccel.toFixed(0)} (limit 14000)`);
  if (st.reversals) problems.push(`camera moves backwards along the corridor in ${st.reversals} steps`);
  problems.push(...collisions(obstacles));
  return problems;
}
