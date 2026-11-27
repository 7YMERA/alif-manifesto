import * as THREE from 'three';
import { MODEL_SCALE } from './layout.js';

/**
 * A 24 m x 13.6 m facade tile: four floors of four windows, some lit, a slab band under each
 * floor. The bottom slab band doubles as the solid colour sampled by roofs (uv v = 0.03).
 */
function facadeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ddd8cc';
  g.fillRect(0, 0, 256, 256);
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 4; row++) {
    const y0 = row * 64;
    g.fillStyle = '#b4ae9f';
    g.fillRect(0, y0 + 52, 256, 12);   // floor slab
    for (let col = 0; col < 4; col++) {
      const x = col * 64 + 8;
      const lit = rnd() < 0.14;
      const grad = g.createLinearGradient(0, y0 + 8, 0, y0 + 48);
      if (lit) { grad.addColorStop(0, '#f7d98f'); grad.addColorStop(1, '#eab96a'); }
      else { grad.addColorStop(0, '#6e8aa4'); grad.addColorStop(1, '#3f566d'); }
      g.fillStyle = grad;
      g.fillRect(x, y0 + 8, 48, 40);
      if (!lit) {
        g.fillStyle = 'rgba(255,255,255,0.22)';   // sky reflection on the glass
        g.beginPath(); g.moveTo(x, y0 + 8); g.lineTo(x + 26, y0 + 8); g.lineTo(x, y0 + 30); g.fill();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.encoding = THREE.sRGBEncoding;
  return t;
}

// One facade tile is 24 m wide and 13.6 m tall (four floors); the city is in scene units.
const M_U = 1 / (24 * MODEL_SCALE), M_V = 1 / (13.6 * MODEL_SCALE);
const DAY_COLOURS = [0x3b6e9c, 0xc77d3b, 0x2c6e58, 0x456b8c, 0xb8523e, 0x9e7d56];

/**
 * The real-KL city (from osmCity.js) as six flat-shaded meshes, one per palette. Walls get
 * window UVs in world units, roofs sample the solid slab colour. Returns the group and the
 * material list used by the 2026 -> 2036 colour morph in the animation loop.
 */
export function buildSkyline(uglyColour, pos, indices, palettes) {
  const tex = facadeTexture();
  const bufs = DAY_COLOURS.map(() => ({ pos: [], nor: [], uv: [] }));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < indices.length / 3; t++) {
    const buf = bufs[palettes[t]];
    a.fromArray(pos, indices[t * 3] * 3);
    b.fromArray(pos, indices[t * 3 + 1] * 3);
    c.fromArray(pos, indices[t * 3 + 2] * 3);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.lengthSq() < 1e-12) continue;
    n.normalize();
    const roof = Math.abs(n.y) > 0.6;
    const alongZ = Math.abs(n.x) > Math.abs(n.z);
    [a, b, c].forEach((v) => {
      buf.pos.push(v.x, v.y, v.z);
      buf.nor.push(n.x, n.y, n.z);
      if (roof) buf.uv.push(0.5, 0.03);
      else buf.uv.push((alongZ ? v.z : v.x) * M_U, v.y * M_V);
    });
  }
  const group = new THREE.Group();
  const mats = [];
  bufs.forEach((buf, i) => {
    if (!buf.pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: uglyColour.clone(), roughness: 0.45, metalness: 0.28 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    mats.push({ mat, dayCol: new THREE.Color(DAY_COLOURS[i]) });
  });
  return { group, mats };
}

/** Bukit Nanas: a real hill with a tree canopy, so Menara KL stands on something. */
export function buildBukitNanas(cx, cz, radius = 46, peak = 10.4) {
  const group = new THREE.Group();
  const seg = 44;
  const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const height = (x, z) => {
    const r = Math.hypot(x, z) / radius;
    const base = Math.pow(Math.max(0, 1 - r * r), 1.35) * peak;
    return base + (base > 0.2 ? Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.9 * Math.min(1, base / 4) : 0);
  };
  for (let i = 0; i < p.count; i++) {
    const h = height(p.getX(i), p.getZ(i));
    // outside the hill the plane sinks below the terrain, so no square edge is ever visible
    const outside = Math.hypot(p.getX(i), p.getZ(i)) > radius;
    p.setY(i, outside ? -0.8 : h - 0.12);
    c.setHex(0x2a6a3d).lerp(new THREE.Color(0x173f26), Math.min(1, h / peak));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const hill = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  hill.receiveShadow = true;
  group.add(hill);

  // canopy: squashed blobs, deterministic
  const N = 150;
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const trees = new THREE.InstancedMesh(blob, new THREE.MeshStandardMaterial({ roughness: 0.9 }), N);
  const m = new THREE.Object3D();
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let placed = 0;
  for (let i = 0; i < N * 3 && placed < N; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * radius * 0.92;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.hypot(x, z) < 5) continue;       // keep the tower's base clear
    const h = height(x, z);
    const sc = 1.7 + rnd() * 1.5;
    m.position.set(x, h + sc * 0.8, z);
    m.scale.set(sc, sc * 0.95, sc);
    m.rotation.y = rnd() * 6;
    m.updateMatrix();
    trees.setMatrixAt(placed, m.matrix);
    c.setHex(rnd() < 0.5 ? 0x174f2f : 0x226a3b).offsetHSL(0, 0, (rnd() - 0.5) * 0.05);
    trees.setColorAt(placed, c);
    placed++;
  }
  trees.count = placed;
  trees.castShadow = true;
  group.add(trees);
  group.position.set(cx, 0, cz);
  return group;
}
