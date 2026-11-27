import * as THREE from 'three';
import { BUILDINGS } from './skylineLayout.js';

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

const M_U = 1 / 24, M_V = 1 / 13.6;

/** Append an axis-aligned box (no bottom face) with UVs in metres so windows never stretch. */
function addBox(buf, cx, y0, cz, w, h, d) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
  const quad = (p, n, uvs) => {
    const base = buf.pos.length / 3;
    p.forEach((v, i) => { buf.pos.push(...v); buf.nor.push(...n); buf.uv.push(...uvs[i]); });
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const v0 = y0 * M_V, v1 = y1 * M_V;
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[x0 * M_U, v0], [x1 * M_U, v0], [x1 * M_U, v1], [x0 * M_U, v1]]);
  quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[x1 * M_U, v0], [x0 * M_U, v0], [x0 * M_U, v1], [x1 * M_U, v1]]);
  quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[z1 * M_U, v0], [z0 * M_U, v0], [z0 * M_U, v1], [z1 * M_U, v1]]);
  quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[z0 * M_U, v0], [z1 * M_U, v0], [z1 * M_U, v1], [z0 * M_U, v1]]);
  const roof = [0.5, 0.03]; // inside the slab band: solid colour
  quad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], [roof, roof, roof, roof]);
}

const DAY_COLOURS = [0x3b6e9c, 0xc77d3b, 0x2c6e58, 0x456b8c, 0xb8523e, 0x9e7d56];

/**
 * The background skyline as six merged meshes (one per palette). Returns the group and the
 * material list used by the 2026 -> 2036 colour morph in the animation loop.
 */
export function buildSkyline(uglyColour) {
  const tex = facadeTexture();
  const bufs = DAY_COLOURS.map(() => ({ pos: [], nor: [], uv: [], idx: [] }));
  BUILDINGS.forEach((b) => {
    const buf = bufs[b.palette];
    if (b.podium) {
      addBox(buf, b.x, 0, b.z, b.w + 5, b.podium, b.d + 5);
      addBox(buf, b.x, b.podium, b.z, b.w, b.h - b.podium, b.d);
    } else {
      addBox(buf, b.x, 0, b.z, b.w, b.h, b.d);
    }
    if (b.crown) {
      const ch = b.h * b.crown;
      addBox(buf, b.x, b.h, b.z, b.w * 0.62, ch, b.d * 0.62);
      addBox(buf, b.x, b.h + ch, b.z, b.w * 0.3, ch * 0.5, b.d * 0.3);
    }
  });
  const group = new THREE.Group();
  const mats = [];
  bufs.forEach((buf, i) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    geo.setIndex(buf.idx);
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: uglyColour.clone(), roughness: 0.42, metalness: 0.32 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
