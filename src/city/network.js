/**
 * Road network for the 3D city. Pure data plus small geometry helpers (no three.js, no DOM).
 *
 * Rule enforced by tools/check-city.mjs: every road end either meets another road, dives into a
 * tunnel, merges onto a road as a ramp, or runs off to a horizon node that sits inside the fog.
 * No road may stop in the middle of the city.
 */
import { MAIN, RING, BASIN } from './layout.js';

const ringPt = (phi) => [RING.cx + RING.r * Math.cos(phi), RING.cz + RING.r * Math.sin(phi)];
const round = (p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];

// ── Nodes ────────────────────────────────────────────────────────────────────
// type: 'junction' (>= 3 roads), 'ring' (on the ring), 'horizon' (road leaves the scene),
//       'tunnel' (rail dives underground), 'merge' (ramp lands on a road)
const PHI = { N: -1.6, E: 0.15, SE: 0.95, M: 1.85, W: 3.0 };

export const NODES = {
  // boulevard
  mainS:  { pos: [0, MAIN.zStart], type: 'horizon' },
  x1:     { pos: [0, -12], type: 'junction' },
  x2:     { pos: [0, -96], type: 'junction' },
  x3:     { pos: [0, -182], type: 'junction' },
  // cross streets (left / right ends run to the horizon)
  c1W: { pos: [-470, -12], type: 'horizon' },  c1E: { pos: [470, -12], type: 'horizon' },
  c2W: { pos: [-470, -96], type: 'horizon' },  c2E: { pos: [470, -96], type: 'horizon' },
  c3W: { pos: [-470, -182], type: 'horizon' }, c3E: { pos: [470, -182], type: 'horizon' },
  // KLCC ring
  rN:  { pos: round(ringPt(PHI.N)),  type: 'ring' },
  rE:  { pos: round(ringPt(PHI.E)),  type: 'ring' },
  rSE: { pos: round(ringPt(PHI.SE)), type: 'ring' },
  rM:  { pos: round(ringPt(PHI.M)),  type: 'ring' },
  rW:  { pos: round(ringPt(PHI.W)),  type: 'ring' },
  // arterials leaving the ring (Jalan Ampang, Tun Razak, Sultan Ismail, Pantai-bound)
  hE:  { pos: [430, -330], type: 'horizon' },
  hN:  { pos: [-30, -540], type: 'horizon' },
  hW:  { pos: [-430, -260], type: 'horizon' },
  hSE: { pos: [440, -190], type: 'horizon' },
  // elevated highway: ends are ramps that land on ground roads
  hwyNearLand: { pos: [-5, 240], type: 'merge' },
  hwyFarLand:  { pos: [-130, -322], type: 'merge' },
  // rail viaduct: both ends dive into tunnels
  railNearPortal: { pos: [17.8, 292], type: 'tunnel' },
  railFarPortal:  { pos: [17.8, -236], type: 'tunnel' },
};

// ── Roads ────────────────────────────────────────────────────────────────────
// kind: 'ground' | 'elevated' | 'rail'. `pts` are intermediate control points (x, z).
// For elevated roads `h` gives [x, y, z] control points. `built` says who draws it:
// 'legacy' = existing boxes in scene.js, 'ribbon' = src/city/roadMesh.js.
export const ROADS = [
  // boulevard, split at the cross streets
  { id: 'main-1', kind: 'ground', built: 'legacy', w: MAIN.width, a: 'mainS', b: 'x1', pts: [] },
  { id: 'main-2', kind: 'ground', built: 'legacy', w: MAIN.width, a: 'x1', b: 'x2', pts: [] },
  { id: 'main-3', kind: 'ground', built: 'legacy', w: MAIN.width, a: 'x2', b: 'x3', pts: [] },
  { id: 'main-4', kind: 'ground', built: 'ribbon', w: MAIN.width, a: 'x3', b: 'rM', pts: [[0, -232], [3, -250]], skip: 'slab' },

  // cross streets
  { id: 'c1-w', kind: 'ground', built: 'legacy', w: 11.5, a: 'c1W', b: 'x1', pts: [] },
  { id: 'c1-e', kind: 'ground', built: 'legacy', w: 11.5, a: 'x1', b: 'c1E', pts: [] },
  { id: 'c2-w', kind: 'ground', built: 'legacy', w: 11.5, a: 'c2W', b: 'x2', pts: [] },
  { id: 'c2-e', kind: 'ground', built: 'legacy', w: 11.5, a: 'x2', b: 'c2E', pts: [] },
  { id: 'c3-w', kind: 'ground', built: 'legacy', w: 11.5, a: 'c3W', b: 'x3', pts: [] },
  { id: 'c3-e', kind: 'ground', built: 'legacy', w: 11.5, a: 'x3', b: 'c3E', pts: [] },

  // KLCC ring, in arcs between its junctions (angles increase clockwise seen from above)
  { id: 'ring-NE', kind: 'ground', built: 'ribbon', w: RING.width, a: 'rN', b: 'rE', arc: [PHI.N, PHI.E + Math.PI * 2 - Math.PI * 2] },
  { id: 'ring-ESE', kind: 'ground', built: 'ribbon', w: RING.width, a: 'rE', b: 'rSE', arc: [PHI.E, PHI.SE] },
  { id: 'ring-SEM', kind: 'ground', built: 'ribbon', w: RING.width, a: 'rSE', b: 'rM', arc: [PHI.SE, PHI.M] },
  { id: 'ring-MW', kind: 'ground', built: 'ribbon', w: RING.width, a: 'rM', b: 'rW', arc: [PHI.M, PHI.W] },
  { id: 'ring-WN', kind: 'ground', built: 'ribbon', w: RING.width, a: 'rW', b: 'rN', arc: [PHI.W, PHI.N + Math.PI * 2] },

  // arterials
  { id: 'ampang',       kind: 'ground', built: 'ribbon', w: 12, a: 'rE',  b: 'hE',  pts: [[120, -283], [260, -303]], marks: true },
  { id: 'tun-razak',    kind: 'ground', built: 'ribbon', w: 12, a: 'rN',  b: 'hN',  pts: [[12, -400], [-8, -470]], marks: true },
  { id: 'sultan-ismail',kind: 'ground', built: 'ribbon', w: 12, a: 'rW',  b: 'hW',  pts: [[-62, -318], [-130, -322], [-260, -300]], marks: true },
  { id: 'pantai-se',    kind: 'ground', built: 'ribbon', w: 11, a: 'rSE', b: 'hSE', pts: [[92, -262], [170, -228], [300, -208]], marks: true },

  // elevated highway (Bypass 1): existing deck is x = -16.5, z 74..-242 at y 7.2
  { id: 'hwy-near-ramp', kind: 'elevated', built: 'ribbon', w: 8.4, land: 'hwyNearLand',
    h: [[-16.5, 7.8, 74], [-16.5, 7.6, 120], [-15, 5.5, 165], [-11.5, 2.5, 200], [-5, 0.12, 240]] },
  { id: 'hwy-far-ramp', kind: 'elevated', built: 'ribbon', w: 8.4, land: 'hwyFarLand',
    h: [[-16.5, 7.8, -242], [-20, 7.8, -262], [-34, 6.4, -286], [-62, 4.2, -306], [-96, 1.8, -316], [-130, 0.12, -322]] },

  // rail: viaduct between two tunnel portals
  { id: 'rail', kind: 'rail', built: 'legacy', w: 5.8, a: 'railNearPortal', b: 'railFarPortal', pts: [] },
];

// ── Geometry helpers (2D, centripetal Catmull-Rom) ───────────────────────────
function cr(p0, p1, p2, p3, t) {
  // uniform Catmull-Rom is enough here; control points are well spaced
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((i) =>
    0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
  );
}

/** Centreline of a ground road as [[x, z], ...], from node a to node b. */
export function roadCentreline(road, step = 6) {
  if (road.arc) {
    const [a0, a1] = road.arc;
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * RING.r / step));
    const out = [];
    for (let i = 0; i <= n; i++) out.push(ringPt(a0 + ((a1 - a0) * i) / n));
    return out;
  }
  const A = NODES[road.a].pos, B = NODES[road.b].pos;
  const ctrl = [A, ...(road.pts || []), B];
  if (ctrl.length === 2) {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(1, Math.ceil(len / (step * 4)));
    return Array.from({ length: n + 1 }, (_, i) => [A[0] + ((B[0] - A[0]) * i) / n, A[1] + ((B[1] - A[1]) * i) / n]);
  }
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let s = 1; s < P.length - 2; s++) {
    const len = Math.hypot(P[s + 1][0] - P[s][0], P[s + 1][1] - P[s][1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i < n; i++) out.push(cr(P[s - 1], P[s], P[s + 1], P[s + 2], i / n));
  }
  out.push(B.slice());
  return out;
}

/** Distance from (x, z) to the nearest ground road centreline, minus half its width. */
const centrelineCache = new Map();
function cachedCentreline(r) {
  if (!centrelineCache.has(r.id)) centrelineCache.set(r.id, roadCentreline(r, 10));
  return centrelineCache.get(r.id);
}

export function clearanceFromRoads(x, z) {
  let best = Infinity;
  for (const r of ROADS) {
    if (r.kind !== 'ground') continue;
    const pts = cachedCentreline(r);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)) - r.w / 2;
      if (d < best) best = d;
    }
  }
  return best;
}

/** Structural check used by tools/check-city.mjs. Returns a list of problems (empty = good). */
export function validateNetwork() {
  const problems = [];
  const degree = {};
  const add = (id, road) => { (degree[id] ||= []).push(road.id); };
  ROADS.forEach((r) => { if (r.a) add(r.a, r); if (r.b) add(r.b, r); if (r.land) add(r.land, r); });

  for (const [id, n] of Object.entries(NODES)) {
    const deg = (degree[id] || []).length;
    const dist = Math.hypot(n.pos[0] - BASIN.cx, n.pos[1] - BASIN.cz);
    if (n.type === 'horizon') {
      if (deg !== 1 && id !== 'mainS') problems.push(`horizon node ${id} should end exactly one road (has ${deg})`);
      if (dist > BASIN.maxRoadRadius) problems.push(`horizon node ${id} is ${dist.toFixed(0)} from the basin centre; roads would run into hills (max ${BASIN.maxRoadRadius})`);
    } else if (n.type === 'junction') {
      if (deg < 3) problems.push(`junction ${id} has only ${deg} roads`);
    } else if (n.type === 'ring') {
      if (deg < 3) problems.push(`ring node ${id} has only ${deg} roads (ring arcs count twice)`);
    } else if (n.type === 'merge') {
      if (deg !== 1) problems.push(`merge node ${id} should end one ramp (has ${deg})`);
    } else if (n.type === 'tunnel') {
      if (deg !== 1) problems.push(`tunnel node ${id} should end one rail line (has ${deg})`);
    }
  }

  // ramps must land on a ground road, and start at the existing deck
  for (const r of ROADS.filter((x) => x.kind === 'elevated')) {
    // h[0] sits on the existing deck (y 7.8); the last point lands on the ground at node `land`
    const landing = r.h[r.h.length - 1];
    const np = NODES[r.land].pos;
    if (Math.hypot(landing[0] - np[0], landing[2] - np[1]) > 0.5) problems.push(`ramp ${r.id} does not end at node ${r.land}`);
    if (Math.abs(r.h[0][1] - 7.8) > 0.01 || Math.abs(r.h[0][0] + 16.5) > 0.01) problems.push(`ramp ${r.id} does not start on the existing deck`);
    if (landing[1] > 1) problems.push(`ramp ${r.id} lands at height ${landing[1]} (should reach the ground)`);
    const d = clearanceFromRoads(landing[0], landing[2]);
    if (d > 0.5) problems.push(`ramp ${r.id} lands ${d.toFixed(1)} units off any road`);
  }

  // every ground road end must coincide with a node
  for (const r of ROADS.filter((x) => x.kind === 'ground' && !x.arc)) {
    const pts = roadCentreline(r);
    const A = NODES[r.a].pos, B = NODES[r.b].pos;
    if (Math.hypot(pts[0][0] - A[0], pts[0][1] - A[1]) > 0.01) problems.push(`road ${r.id} does not start at ${r.a}`);
    if (Math.hypot(pts[pts.length - 1][0] - B[0], pts[pts.length - 1][1] - B[1]) > 0.01) problems.push(`road ${r.id} does not end at ${r.b}`);
  }
  // ring arcs must actually land on the ring nodes
  for (const r of ROADS.filter((x) => x.arc)) {
    const pts = roadCentreline(r);
    const A = NODES[r.a].pos, B = NODES[r.b].pos;
    if (Math.hypot(pts[0][0] - A[0], pts[0][1] - A[1]) > 0.1) problems.push(`ring arc ${r.id} does not start at ${r.a}`);
    if (Math.hypot(pts[pts.length - 1][0] - B[0], pts[pts.length - 1][1] - B[1]) > 0.1) problems.push(`ring arc ${r.id} does not end at ${r.b}`);
  }
  return problems;
}
