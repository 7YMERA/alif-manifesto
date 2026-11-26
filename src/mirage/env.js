import * as THREE from 'three';

/**
 * Warm Golden Hour Kuala Lumpur PMREM environment for rich, natural PBR
 * reflections on the Blender .glb transit models (cobalt/red paint, aluminium, glass).
 */
export function createGoldenHourPMREM(renderer) {
  const sc = new THREE.Scene();
  const geo = new THREE.SphereGeometry(40, 48, 24);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const horizonCol = new THREE.Color(0xf6cfa0);
  const zenithCol = new THREE.Color(0x3a6494);
  const groundCol = new THREE.Color(0x524232);

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 40;
    if (y < 0) {
      c.copy(horizonCol).lerp(groundCol, Math.pow(-y, 0.55) * 0.9);
    } else {
      c.copy(horizonCol).lerp(zenithCol, Math.pow(y, 0.55));
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  function panel(w, h, color, p) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    m.position.set(p[0], p[1], p[2]);
    m.lookAt(0, 0, 0);
    sc.add(m);
  }

  // Warm late-afternoon sun key + golden rim + soft sky fill + warm ground bounce
  panel(14, 10, new THREE.Color(15, 10.5, 5.8), [26, 16, 12]);
  panel(32, 6, new THREE.Color(4.5, 3.2, 1.8), [-24, 6, -18]);
  panel(30, 10, new THREE.Color(1.2, 1.6, 2.3), [0, 24, 12]);
  panel(24, 12, new THREE.Color(1.1, 0.85, 0.6), [0, -26, 6]);

  const pm = new THREE.PMREMGenerator(renderer);
  pm.compileEquirectangularShader();
  const rt = pm.fromScene(sc, 0.03);
  pm.dispose();
  geo.dispose();
  return rt.texture;
}
