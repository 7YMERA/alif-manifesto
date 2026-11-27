/**
 * Where the background buildings go. Pure and deterministic (seeded), so tools/check-city.mjs can
 * prove no building sits on a road, a ramp, a landmark or the corridor.
 */
import { clearanceFromRoads, ROADS } from './network.js';
import { LANDMARKS, CORRIDOR, RING } from './layout.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RAMP_PATHS = ROADS.filter((r) => r.kind === 'elevated').map((r) => r.h.map((p) => [p[0], p[2]]));

function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/** Free space around (x, z): how far a footprint of radius r may reach before it hits something. */
export function freeSpace(x, z) {
  let free = clearanceFromRoads(x, z);
  RAMP_PATHS.forEach((p) => { free = Math.min(free, distToPolyline(x, z, p) - 4.2); });
  LANDMARKS.forEach(([, lx, lz, lr]) => { free = Math.min(free, Math.hypot(x - lx, z - lz) - lr); });
  // the built-up corridor (shop rows, highway, viaduct) and the rail portals
  if (z < CORRIDOR.zNear && z > CORRIDOR.zFar - 12) free = Math.min(free, CORRIDOR.halfWidth - Math.abs(x));
  return free;
}

export const BUILDINGS = (() => {
  const rand = rng(20261127);
  const out = [];
  const cores = [[RING.cx, RING.cz], [-40, -215]]; // KLCC and the Merdeka / Bukit Bintang side
  for (let gx = -300; gx <= 300; gx += 24) {
    for (let gz = -520; gz <= -70; gz += 24) {
      const x = gx + (rand() - 0.5) * 14;
      const z = gz + (rand() - 0.5) * 14;
      const w = 11 + rand() * 11, d = 11 + rand() * 11;
      const reach = Math.hypot(w, d) / 2 + 3;
      if (freeSpace(x, z) < reach) continue;
      const dCore = Math.min(...cores.map(([cx, cz]) => Math.hypot(x - cx, z - cz)));
      const core = Math.exp(-Math.pow(dCore / 190, 2));
      if (rand() > 0.35 + 0.6 * core) continue;            // thin out the suburbs
      const h = 10 + core * (22 + rand() * 26) + rand() * 8; // 10 .. ~56, landmarks stay the tallest
      out.push({
        x, z, w, d, h,
        palette: Math.floor(rand() * 6),
        podium: rand() < 0.55 ? 5 + rand() * 4 : 0,
        crown: rand() < 0.4 ? 0.12 + rand() * 0.14 : 0,
        seed: Math.floor(rand() * 1e6),
      });
    }
  }
  return out;
})();

export function validate() {
  const problems = [];
  if (BUILDINGS.length < 60) problems.push(`only ${BUILDINGS.length} buildings placed; skyline would look empty`);
  BUILDINGS.forEach((b, i) => {
    const reach = Math.hypot(b.w, b.d) / 2;
    const free = freeSpace(b.x, b.z);
    if (free < reach) problems.push(`building ${i} at (${b.x.toFixed(0)}, ${b.z.toFixed(0)}) overlaps something by ${(reach - free).toFixed(1)} units`);
    if (b.h > 60) problems.push(`building ${i} is ${b.h.toFixed(0)} tall and would out-top the landmarks`);
  });
  return problems.slice(0, 12);
}
