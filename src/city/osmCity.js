/**
 * Real Kuala Lumpur building fabric (OpenStreetMap footprints and heights, centred on KLCC),
 * from the owner's portfolio (7YMERA/7ymera.github.io, assets/city/kl_city.json).
 *
 * The mesh stores every building as a wall piece plus a separate roof piece that only rests on
 * it. This module places the city in the corridor scene and removes whatever would sit on a road,
 * a ramp, a landmark plot or the shop corridor, taking roofs with their walls. Pure (no DOM, no
 * three.js) so tools/check-city.mjs runs exactly the code the browser runs.
 *
 * Attribution: map data (c) OpenStreetMap contributors, ODbL.
 */
import { MODEL_SCALE, RING, BASIN } from './layout.js';
import { freeSpace } from './clearance.js';

const GROUND_M = 4;         // a piece whose lowest point is above this (metres) is a roof or crown
const BASE_LIFT_M = 1.4;    // the mesh's ground sits at about y = -1.4 m
const MAX_RADIUS = 470;     // keep everything on the flat basin

function decode(b64, Type) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Type(u.buffer);
}

/**
 * Raw file -> scene-space positions and indices. The city is turned 180 degrees about the
 * vertical axis, so most of it lies beyond KLCC (towards KL) rather than behind the camera.
 */
export function placeCity(raw) {
  const q = decode(raw.positions, Int16Array);
  const ix = decode(raw.indices, Uint16Array);
  const k = raw.scale * MODEL_SCALE;               // int16 -> metres -> scene units
  const pos = new Float32Array(q.length);
  for (let i = 0; i < q.length; i += 3) {
    pos[i] = RING.cx - q[i] * k;
    pos[i + 1] = (q[i + 1] * raw.scale + BASE_LIFT_M) * MODEL_SCALE;
    pos[i + 2] = RING.cz - q[i + 2] * k;
  }
  return { pos, ix };
}

/** Group triangles into pieces (connected vertices) with a bounding box each. */
function pieces(pos, ix) {
  const nV = pos.length / 3, nT = ix.length / 3;
  const parent = new Int32Array(nV);
  for (let i = 0; i < nV; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < nT; t++) {
    const a = find(ix[t * 3]);
    for (let k = 1; k < 3; k++) { const b = find(ix[t * 3 + k]); if (b !== a) parent[b] = a; }
  }
  const box = new Map();
  for (let v = 0; v < nV; v++) {
    const r = find(v);
    let b = box.get(r);
    if (!b) { b = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, y0: 1e9, y1: -1e9 }; box.set(r, b); }
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    if (z < b.z0) b.z0 = z; if (z > b.z1) b.z1 = z;
  }
  return { find, box };
}

/**
 * Keeps the buildings that fit between the roads. Returns the kept triangle indices and one
 * obstacle box per kept piece ({ x, z, w, d, h }) for the camera collision check.
 */
export function selectBuildings(pos, ix) {
  const { find, box } = pieces(pos, ix);
  const groundLimit = GROUND_M * MODEL_SCALE;
  const grounded = [];                       // { root, b, ok }
  const floating = [];                       // { root, b, host }
  box.forEach((b, r) => { (b.y0 > groundLimit ? floating : grounded).push({ root: r, b, ok: true, host: -1 }); });

  const fits = (b, margin) => {
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const reach = Math.hypot(w, d) / 2 + margin;
    return Math.hypot(cx - BASIN.cx, cz - BASIN.cz) + reach < MAX_RADIUS && freeSpace(cx, cz) >= reach;
  };

  grounded.forEach((g) => { g.ok = fits(g.b, 1.2); });

  // a roof or crown belongs to the building whose walls it rests on; if the roof alone hits a road
  // (overhang), the whole building goes, so no wall is ever left with its top missing
  floating.forEach((f) => {
    const cx = (f.b.x0 + f.b.x1) / 2, cz = (f.b.z0 + f.b.z1) / 2;
    f.host = grounded.findIndex((g) => cx > g.b.x0 - 0.6 && cx < g.b.x1 + 0.6 && cz > g.b.z0 - 0.6 && cz < g.b.z1 + 0.6);
    if (f.host >= 0 && !fits(f.b, 0.3)) grounded[f.host].ok = false;
  });

  const kept = new Set();
  let dropped = 0, groundKept = 0;
  grounded.forEach((g) => { if (g.ok) { kept.add(g.root); groundKept++; } else dropped++; });
  floating.forEach((f) => { if (f.host >= 0 && grounded[f.host].ok) kept.add(f.root); });

  // palette per piece from its position, so a building's walls and roof agree on colour
  const palette = (r) => {
    const q = box.get(r);
    const gx = Math.round((q.x0 + q.x1) / 20), gz = Math.round((q.z0 + q.z1) / 20);
    return (((gx * 73856093) ^ (gz * 19349663)) >>> 0) % 6;
  };
  const keep = [], pal = [];
  for (let t = 0; t < ix.length / 3; t++) {
    const r = find(ix[t * 3]);
    if (kept.has(r)) { keep.push(ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2]); pal.push(palette(r)); }
  }
  const boxes = [];
  kept.forEach((r) => {
    const b = box.get(r);
    boxes.push({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, w: b.x1 - b.x0, d: b.z1 - b.z0, h: b.y1 });
  });
  return { indices: new Uint16Array(keep), palettes: new Uint8Array(pal), boxes, dropped, groundKept };
}
