import * as THREE from 'three';
import { ROADS, NODES, roadCentreline } from './network.js';
import { BASIN } from './layout.js';

/**
 * Roads dissolve into the haze before the basin ends, so none of them stops in open ground.
 * The fade is a function of world distance from the basin centre.
 */
export function applyHorizonFade(material, from = BASIN.maxRoadRadius - 85, to = BASIN.maxRoadRadius - 5) {
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeCentre = { value: new THREE.Vector2(BASIN.cx, BASIN.cz) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFadeXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFadeXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vFadeXZ; uniform vec2 uFadeCentre;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(${from.toFixed(1)}, ${to.toFixed(1)}, length(vFadeXZ - uFadeCentre));`);
  };
  material.customProgramCacheKey = () => 'horizonFade';
  return material;
}

/** Asphalt strip texture: grain, edge lines, optional dashed centre line. u across, v along. */
function asphaltTexture(withCentre) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a414b';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${i % 2 ? '255,255,255' : '0,0,0'},${0.03 + (i % 5) * 0.012})`;
    g.fillRect((i * 53) % 128, (i * 97) % 128, 1 + (i % 2), 1);
  }
  g.fillStyle = 'rgba(240,236,224,0.85)';
  g.fillRect(7, 0, 3, 128);            // edge lines
  g.fillRect(118, 0, 3, 128);
  if (withCentre) {
    g.fillStyle = 'rgba(240,226,170,0.9)';
    g.fillRect(62, 8, 4, 56);          // dashed centre line, half of each tile
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function makeRoadMaterials() {
  const mk = (withCentre) => new THREE.MeshStandardMaterial({
    map: asphaltTexture(withCentre), roughness: 0.9, metalness: 0.02,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  return { plain: applyHorizonFade(mk(false)), marked: applyHorizonFade(mk(true)) };
}

/** Flat road strip along a 2D centreline. v advances one texture tile per 16 m. */
export function roadStripGeometry(pts, width, y) {
  const pos = [], uv = [], idx = [];
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const nx = -dz * width / 2, nz = dx * width / 2;
    pos.push(pts[i][0] + nx, y, pts[i][1] + nz, pts[i][0] - nx, y, pts[i][1] - nz);
    uv.push(0, dist / 16, 1, dist / 16);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // make sure the surface faces up whatever the road's direction
  if (geo.attributes.normal.getY(0) < 0) {
    const ix = geo.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    geo.computeVertexNormals();
  }
  return geo;
}

/**
 * Every ground road marked built:'ribbon' in the network, as flat strips.
 * Returns the group; roads get slightly different heights so crossings do not z-fight.
 */
export function buildGroundRoads() {
  const group = new THREE.Group();
  const mats = makeRoadMaterials();
  let layer = 0;
  ROADS.filter((r) => r.kind === 'ground' && r.built === 'ribbon').forEach((r) => {
    const pts = roadCentreline(r, 5);
    const mesh = new THREE.Mesh(roadStripGeometry(pts, r.w, 0.075 + (layer++ % 4) * 0.012), r.marks ? mats.marked : mats.plain);
    mesh.receiveShadow = true;
    mesh.name = r.id;
    group.add(mesh);
  });
  return group;
}

/**
 * Curved elevated deck (ramp or flyover) with a crisp rectangular cross-section.
 * Index order follows the path, so geometry.setDrawRange grows the road from its start.
 * `lift` raises the whole section along the road's up vector (used for thin asphalt overlays).
 */
export function deckRibbonGeometry(curve, segs, halfW, thick, lift = 0) {
  const pos = [], nor = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), t = new THREE.Vector3(), s = new THREE.Vector3(), u = new THREE.Vector3();
  for (let k = 0; k <= segs; k++) {
    const f = k / segs;
    curve.getPointAt(f, p);
    curve.getTangentAt(f, t);
    s.crossVectors(up, t).normalize();
    u.crossVectors(t, s).normalize();
    const corner = (sx, ud) => [
      p.x + s.x * halfW * sx + u.x * (ud + lift),
      p.y + s.y * halfW * sx + u.y * (ud + lift),
      p.z + s.z * halfW * sx + u.z * (ud + lift),
    ];
    const tl = corner(-1, 0), tr = corner(1, 0), br = corner(1, -thick), bl = corner(-1, -thick);
    [[tl, tr, u, 1], [tr, br, s, 1], [br, bl, u, -1], [bl, tl, s, -1]].forEach(([a, b, n, sg]) => {
      pos.push(...a, ...b);
      nor.push(n.x * sg, n.y * sg, n.z * sg, n.x * sg, n.y * sg, n.z * sg);
    });
  }
  for (let k = 0; k < segs; k++) {
    for (let f = 0; f < 4; f++) {
      const a = k * 8 + f * 2, b = a + 1, c = a + 8, d = a + 9;
      // wound counter-clockwise seen from outside each face, so lighting uses the true normal
      if (f === 1 || f === 3) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

const pierGeo = new THREE.CylinderGeometry(0.75, 0.9, 1, 10);
pierGeo.translate(0, 0.5, 0);

/** Instanced piers under a curve: one every `step` metres, from the ground to the deck underside. */
export function deckPiers(curve, deckThick, step, material) {
  const len = curve.getLength();
  const n = Math.max(2, Math.floor(len / step));
  const mesh = new THREE.InstancedMesh(pierGeo, material, n);
  const m = new THREE.Object3D();
  const p = new THREE.Vector3();
  let count = 0;
  for (let k = 0; k < n; k++) {
    curve.getPointAt((k + 0.5) / n, p);
    const h = p.y - deckThick;
    if (h < 1.2) continue; // where the ramp meets the ground there is nothing to hold up
    m.position.set(p.x, 0, p.z);
    m.scale.set(1, h, 1);
    m.updateMatrix();
    mesh.setMatrixAt(count++, m.matrix);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Elevated highway ramps from the network (h control points are [x, y, z]). */
export function buildHighwayRamps(concreteMat, asphaltMat) {
  const group = new THREE.Group();
  ROADS.filter((r) => r.kind === 'elevated').forEach((r) => {
    const curve = new THREE.CatmullRomCurve3(r.h.map((q) => new THREE.Vector3(q[0], q[1], q[2])), false, 'centripetal');
    const halfW = r.w / 2;
    const deck = new THREE.Mesh(deckRibbonGeometry(curve, 90, halfW, 0.9), concreteMat);
    deck.castShadow = true; deck.receiveShadow = true; deck.frustumCulled = false;
    const road = new THREE.Mesh(deckRibbonGeometry(curve, 90, halfW - 0.4, 0.06, 0.06), asphaltMat);
    road.receiveShadow = true; road.frustumCulled = false;
    group.add(deck, road, deckPiers(curve, 0.9, 16, concreteMat));
  });
  return group;
}

export { NODES };
