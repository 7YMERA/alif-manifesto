/* ==========================================================================
   ALIF MANIFESTO — Full Malaysian Metropolitan City & Landmark Fly-Through
   - Cars driving on the existing highway deck (utilized, not destroyed!)
   - Delayed highway greenery (zero early pop-in!)
   - Solid-column LRT stations + KL Sentral-style integrated transit hub
   - Real 3D Community Parks & Basketball Courts logically planned beside homes
   - Accurately colored KLCC, Menara KL (on green Bukit Nanas), Merdeka 118 & TRX
   - Long scroll flight weaving right through the city and all 4 KL landmarks!
   ========================================================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('scene-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    window.ManifestoScene = {
      setScrollProgress: function () {},
      setLighting: function () {},
      setDark: function () {}
    };
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();

  const PALETTES = {
    day: {
      skyTop: new THREE.Color(0x5a94cf),
      skyMid: new THREE.Color(0xc8def2),
      skyHorizon: new THREE.Color(0xebe6dc),
      fog: new THREE.Color(0xe6e3da),
      sun: new THREE.Color(0xfff7e8),
      sunInt: 1.44,
      hemiSky: new THREE.Color(0xe8f2fc),
      hemiGround: new THREE.Color(0xc5bfb0),
      hemiInt: 0.90
    },
    golden: {
      skyTop: new THREE.Color(0x366090),
      skyMid: new THREE.Color(0xdca66e),
      skyHorizon: new THREE.Color(0xf5cfa0),
      fog: new THREE.Color(0xe6c59c),
      sun: new THREE.Color(0xffb259),
      sunInt: 1.62,
      hemiSky: new THREE.Color(0xffdeb0),
      hemiGround: new THREE.Color(0x886c52),
      hemiInt: 0.78
    },
    dark: {
      skyTop: new THREE.Color(0x040914),
      skyMid: new THREE.Color(0x0b1629),
      skyHorizon: new THREE.Color(0x16263d),
      fog: new THREE.Color(0x0d1726),
      sun: new THREE.Color(0x8fb8de),
      sunInt: 0.90,
      hemiSky: new THREE.Color(0x233b59),
      hemiGround: new THREE.Color(0x0a111c),
      hemiInt: 0.72
    }
  };

  scene.background = PALETTES.day.fog.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0024);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 1900);
  camera.position.set(1.0, 5.2, 56);

  const hemiLight = new THREE.HemisphereLight(0xe8f2fc, 0xc5bfb0, 0.90);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff7e8, 1.44);
  sunLight.position.set(75, 105, 55);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 420;
  const d = 120;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function b64(str, TypedArr) {
    const bin = atob(str);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TypedArr(u.buffer);
  }

  // =========================================================================
  // 1. Sky Dome & 900 Twinkling 3D Stars
  // =========================================================================

  const skyUniforms = {
    uTop: { value: PALETTES.day.skyTop.clone() },
    uMid: { value: PALETTES.day.skyMid.clone() },
    uHorizon: { value: PALETTES.day.skyHorizon.clone() }
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader:
      'varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader:
      'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; varying vec3 vWorldPos;' +
      'void main() {' +
      '  float h = normalize(vWorldPos).y;' +
      '  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, max(h, 0.0)));' +
      '  col = mix(col, uTop, smoothstep(0.22, 0.78, max(h, 0.0)));' +
      '  gl_FragColor = vec4(col, 1.0);' +
      '}'
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), skyMat));

  const starCount = window.innerWidth <= 820 ? 450 : 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const elev = Math.acos(1 - Math.random() * 0.88);
    const r = 1200;
    starPositions[i * 3] = Math.sin(elev) * Math.cos(a) * r;
    starPositions[i * 3 + 1] = Math.cos(elev) * r * 0.78 + 60;
    starPositions[i * 3 + 2] = Math.sin(elev) * Math.sin(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe6f0ff,
    size: 2.8,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // =========================================================================
  // 2. Sculpted Klang Valley Basin & Titiwangsa Rim (Portfolio Terrain)
  // =========================================================================

  const world = new THREE.Group();
  scene.add(world);

  const texLoader = new THREE.TextureLoader();
  function wrapTex(t, rx, ry) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4;
    return t;
  }

  const terrColorTex = texLoader.load('./assets/city/terrain_color.jpg');
  const terrAOTex = texLoader.load('./assets/city/terrain_ao.jpg');
  const facadeDayTex = wrapTex(texLoader.load('./assets/city/facade_glass.jpg'), 2, 3);
  const facadeNightTex = wrapTex(texLoader.load('./assets/city/facade_night.jpg'), 2, 3);

  const terrGeo = new THREE.PlaneGeometry(1800, 1800, 92, 92);
  terrGeo.rotateX(-Math.PI / 2);
  const tPos = terrGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const dist = Math.hypot(vx, vz + 160);
    let y = -0.15;
    if (dist > 400) {
      const k = smoothstep(400, 820, dist);
      const ang = Math.atan2(vz + 160, vx);
      const ridge =
        Math.sin(ang * 3 + 0.6) * 26 +
        Math.cos(ang * 5 - 1.1) * 16 +
        Math.sin(vx * 0.01 + vz * 0.008) * 18;
      y += (48 + ridge) * k;
    }
    tPos.setY(i, y);
  }
  terrGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: terrColorTex,
    aoMap: terrAOTex,
    color: 0xd8d2c3,
    roughness: 0.94,
    metalness: 0.02
  });
  const terrain = new THREE.Mesh(terrGeo, groundMat);
  terrain.receiveShadow = true;
  world.add(terrain);

  // =========================================================================
  // 3. Long Stretching Boulevard (z = +80 -> -340) Through the Entire City!
  // =========================================================================

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.88 });
  const sideRoadMat = new THREE.MeshStandardMaterial({ color: 0x353c45, roughness: 0.9 });

  // Main boulevard stops cleanly at z = -255 and joins a curved KLCC Perimeter Ring Road!
  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 340), roadMat);
  mainRoad.position.set(0, 0, -85);
  mainRoad.receiveShadow = true;
  world.add(mainRoad);

  // Curved KLCC Perimeter Ring Road & Landscaped Park Loop around Petronas Twin Towers (18, -295)
  const ringRoad = new THREE.Mesh(new THREE.RingGeometry(30, 41, 48), roadMat);
  ringRoad.rotation.x = -Math.PI / 2;
  ringRoad.position.set(18, 0.08, -295);
  ringRoad.receiveShadow = true;
  world.add(ringRoad);

  const ringConnector = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 26), roadMat);
  ringConnector.position.set(6, 0, -258);
  ringConnector.rotation.y = -0.32;
  world.add(ringConnector);

  // 4 Major Cross-Streets weaving through the metropolis & downtown KL
  const crossZList = [-18, -84, -150, -220];
  crossZList.forEach(function (cz) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(300, 0.17, 14), roadMat);
    cr.position.set(0, -0.01, cz);
    cr.receiveShadow = true;
    world.add(cr);
  });

  // Parallel Neighborhood Avenues
  [-48, 48].forEach(function (ax) {
    const ave = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 320), sideRoadMat);
    ave.position.set(ax, -0.02, -90);
    ave.receiveShadow = true;
    world.add(ave);
  });

  // Traffic lights at first intersection (z = -18)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222c36, roughness: 0.5 });
  const redSignalMat = new THREE.MeshBasicMaterial({ color: 0xf0323e });
  const greenSignalMat = new THREE.MeshBasicMaterial({ color: 0x1ecb7c });
  const signalHeads = [];
  [
    [-10.2, -10.5],
    [10.2, -10.5],
    [-10.2, -25.5],
    [10.2, -25.5]
  ].forEach(function (pos) {
    const tl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.2, 8), poleMat);
    pole.position.y = 2.6;
    tl.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.45), poleMat);
    box.position.y = 4.6;
    tl.add(box);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), redSignalMat);
    lamp.position.set(0, 4.9, 0.22);
    tl.add(lamp);
    signalHeads.push(lamp);
    tl.position.set(pos[0], 0.1, pos[1]);
    world.add(tl);
  });

  // Lane dashes stretching all the way to KLCC
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3e7eb, transparent: true, opacity: 0.78 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 72; z >= -320; z -= 7.5) {
      if (crossZList.some(function (cz) { return Math.abs(z - cz) < 8.5; })) continue;
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.10, z);
      world.add(dash);
    }
  });

  // Dedicated RapidKL Cobalt-Blue Bus Lanes
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0047ab,
    roughness: 0.65,
    transparent: true,
    opacity: 0
  });
  const busLaneL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 420), busLaneMat);
  busLaneL.rotation.x = -Math.PI / 2;
  busLaneL.position.set(-2.4, 0.11, -130);
  const busLaneR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 420), busLaneMat);
  busLaneR.rotation.x = -Math.PI / 2;
  busLaneR.position.set(2.4, 0.11, -130);
  world.add(busLaneL, busLaneR);

  // Protected RapidKL Crimson-Red Cycling Lanes
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc92a37,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const bikeLaneL = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 420), bikeLaneMat);
  bikeLaneL.rotation.x = -Math.PI / 2;
  bikeLaneL.position.set(-7.25, 0.115, -130);
  const bikeLaneR = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 420), bikeLaneMat);
  bikeLaneR.rotation.x = -Math.PI / 2;
  bikeLaneR.position.set(7.25, 0.115, -130);
  world.add(bikeLaneL, bikeLaneR);

  // Wide Warm Sandstone Kaki Lima Sidewalks
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd6cbb8, roughness: 0.82 });
  [
    [35, 92],
    [-51, 52],
    [-117, 52],
    [-185, 56],
    [-280, 106]
  ].forEach(function (sp) {
    [-12.6, 12.6].forEach(function (sx) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.34, sp[1]), sidewalkMat);
      sw.position.set(sx, 0.12, sp[0]);
      sw.receiveShadow = true;
      world.add(sw);
    });
  });

  // Raised Safe Zebra Crossings at all 4 cross-streets
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf8f6f2,
    roughness: 0.58,
    transparent: true,
    opacity: 0
  });
  [-10, -26, -76, -92, -142, -158, -212, -228].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.0), zebraMat);
      stripe.position.set(x, 0.12, zPos);
      world.add(stripe);
    }
  });

  // =========================================================================
  // 4. Existing Concrete Highway Overpass — UTILIZED WITH CARS/TRUCKS ON TOP
  //    AND DECORATED WITH TROPICAL FLOWERS & GREENERY!
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b828a, roughness: 0.92 });
  const hwyRoadMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.88 });
  const warmParkLightMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });

  const HWY_Y = 7.6; // Clear sightline to traffic on top!
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 380), concreteMat);
  deck.position.set(-16.0, HWY_Y, -110);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const hwyTopAsphalt = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 378), hwyRoadMat);
  hwyTopAsphalt.rotation.x = -Math.PI / 2;
  hwyTopAsphalt.position.set(-16.0, HWY_Y + 0.62, -110);
  highwayGroup.add(hwyTopAsphalt);

  // Low sleek barrier rails so vehicles on top are clearly visible
  [-22.6, -9.4].forEach(function (gx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 378), concreteMat);
    rail.position.set(gx, HWY_Y + 0.84, -110);
    highwayGroup.add(rail);
  });

  // Highway center dashed line on top
  const hwyDashMat = new THREE.MeshBasicMaterial({ color: 0xe8edf2 });
  for (let z = 72; z >= -290; z -= 8) {
    const hd = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3.0), hwyDashMat);
    hd.rotation.x = -Math.PI / 2;
    hd.position.set(-16.0, HWY_Y + 0.64, z);
    highwayGroup.add(hd);
  }

  const pillarGeo = new THREE.BoxGeometry(2.2, HWY_Y, 2.2);
  const vineWrapMat = new THREE.MeshStandardMaterial({ color: 0x247346, roughness: 0.85 });
  const vineBrightMat = new THREE.MeshStandardMaterial({ color: 0x35915b, roughness: 0.82 });
  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b555e, roughness: 0.8 });

  // Vibrant Malaysian Tropical Flower Materials (Hibiscus Red, Golden Allamanda, Coral Ixora, White Frangipani)
  const flowerMats = [
    new THREE.MeshStandardMaterial({ color: 0xe83845, roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0xf26d35, roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: 0xfff4d9, roughness: 0.55 })
  ];
  const flowerGeo = new THREE.DodecahedronGeometry(0.36, 0);

  const overpassGreenery = [];
  const pillarGreeneryGeo = new THREE.BoxGeometry(2.58, HWY_Y - 1.2, 2.58);

  for (let z = 48; z >= -285; z -= 24) {
    if (crossZList.some(function (cz) { return Math.abs(z - cz) < 10; })) continue;
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(-16.0, HWY_Y / 2, z);
    pillar.castShadow = true;
    highwayGroup.add(pillar);

    const wrap = new THREE.Group();
    const mossSleeve = new THREE.Mesh(pillarGreeneryGeo, vineWrapMat);
    mossSleeve.position.y = (HWY_Y - 1.2) / 2 + 0.4;
    wrap.add(mossSleeve);

    // Foliage clusters + colorful tropical flowers climbing each pillar
    for (let k = 0; k < 4; k++) {
      const angle = (k * Math.PI) / 2 + 0.4;
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.92 + (k % 2) * 0.22, 1),
        k % 2 === 0 ? vineBrightMat : vineWrapMat
      );
      puff.position.set(Math.cos(angle) * 1.25, 1.6 + k * 1.45, Math.sin(angle) * 1.25);
      wrap.add(puff);

      const blossom = new THREE.Mesh(flowerGeo, flowerMats[(k + Math.abs(z)) % flowerMats.length]);
      blossom.position.set(Math.cos(angle) * 1.58, 1.7 + k * 1.45, Math.sin(angle) * 1.58);
      wrap.add(blossom);
    }

    // Under-highway flower bed at pillar base
    const baseShrub = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), vineBrightMat);
    baseShrub.scale.set(1.3, 0.55, 1.3);
    baseShrub.position.set(1.6, 0.55, 0);
    wrap.add(baseShrub);

    for (let f = 0; f < 3; f++) {
      const fl = new THREE.Mesh(flowerGeo, flowerMats[(f + Math.abs(z)) % flowerMats.length]);
      fl.position.set(1.1 + f * 0.55, 0.92, (f - 1) * 0.55);
      wrap.add(fl);
    }

    const underLight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.35), warmParkLightMat);
    underLight.position.set(0, HWY_Y - 0.65, 0);
    wrap.add(underLight);

    wrap.position.set(-16.0, 0.15, z);
    wrap.scale.setScalar(0.001);
    wrap.visible = false;
    highwayGroup.add(wrap);
    overpassGreenery.push(wrap);
  }

  // Deck-Edge Planter Boxes with Lush Hedges, Hanging Vines & Blooming Flower Clusters!
  [-9.05, -22.95].forEach(function (edgeX) {
    const edgeGroup = new THREE.Group();
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.68, 370), planterBoxMat);
    planter.position.set(0, HWY_Y + 0.52, -110);
    edgeGroup.add(planter);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 370), vineWrapMat);
    hedge.position.set(0, HWY_Y + 1.02, -110);
    edgeGroup.add(hedge);

    for (let z = 65; z >= -285; z -= 8) {
      const isRightEdge = edgeX > -16.0;
      const drape = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 1.35 + ((Math.abs(z) % 3) * 0.35), 3.2),
        z % 16 === 0 ? vineBrightMat : vineWrapMat
      );
      drape.position.set(isRightEdge ? 0.34 : -0.34, HWY_Y + 0.05, z);
      edgeGroup.add(drape);

      // Vibrant flower blooms perched along the highway planter hedge!
      const bloom = new THREE.Mesh(flowerGeo, flowerMats[Math.abs(z) % flowerMats.length]);
      bloom.scale.setScalar(1.15);
      bloom.position.set(isRightEdge ? 0.32 : -0.32, HWY_Y + 1.42, z);
      edgeGroup.add(bloom);
    }

    edgeGroup.position.set(edgeX, 0, 0);
    edgeGroup.scale.set(1, 0.001, 1);
    edgeGroup.visible = false;
    highwayGroup.add(edgeGroup);
    overpassGreenery.push(edgeGroup);
  });

  // 34 CLEARLY VISIBLE VEHICLES (Cars, SUVs, Box Trucks & Coaches) DRIVING ON TOP OF THE HIGHWAY!
  const carColors = [0x4c5866, 0x7a8591, 0x353e48, 0xe6ebf0, 0xd9383a, 0x25589c, 0xe8a838];
  const carBodyGeo = new THREE.BoxGeometry(1.78, 0.72, 3.7);
  const carCabinGeo = new THREE.BoxGeometry(1.48, 0.55, 1.9);
  const tailLightGeo = new THREE.BoxGeometry(1.54, 0.19, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xf02e38 });
  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfff0c4 });
  const truckCargoMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.45 });

  const highwayCars = [];
  for (let h = 0; h < 34; h++) {
    const dir = h % 2 === 0 ? -1 : 1;
    const isTruck = h % 5 === 0;
    const hCar = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({
      color: carColors[h % carColors.length],
      roughness: 0.38,
      metalness: 0.25
    });

    if (isTruck) {
      // Tall white box truck — unmistakable on the highway deck!
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.25, 5.2), truckCargoMat);
      cargo.position.set(0, 1.48, dir < 0 ? 0.5 : -0.5);
      hCar.add(cargo);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.65, 1.7), bMat);
      cab.position.set(0, 1.15, dir < 0 ? -2.9 : 2.9);
      hCar.add(cab);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 4.0), bMat);
      body.position.y = 0.6;
      hCar.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.68, 2.15), bMat);
      cabin.position.set(0, 1.24, dir < 0 ? 0.15 : -0.15);
      hCar.add(cabin);
      const tail = new THREE.Mesh(tailLightGeo, tailLightMat);
      tail.position.set(0, 0.68, dir < 0 ? 2.02 : -2.02);
      hCar.add(tail);
      const head = new THREE.Mesh(tailLightGeo, headLightMat);
      head.position.set(0, 0.66, dir < 0 ? -2.02 : 2.02);
      hCar.add(head);
    }

    const laneX = dir < 0 ? -12.6 - (h % 2) * 2.5 : -19.4 + (h % 2) * 2.5;
    hCar.position.set(laneX, HWY_Y + 0.64, 70 - h * 10.6);
    hCar.userData = { dir: dir, speed: isTruck ? 10.5 : 14.5 + (h % 4) * 2.0 };
    highwayGroup.add(hCar);
    highwayCars.push(hCar);
  }

  world.add(highwayGroup);

  // =========================================================================
  // 5. Ground Traffic Stream, Intersection Jam & RapidKL Red/Blue Buses
  // =========================================================================

  // Non-overlapping jammed cars (4 lanes x 12 rows = 48 cars, zero clipping!)
  const cars = [];
  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let row = 0; row < 12; row++) {
    for (let laneIdx = 0; laneIdx < 4; laneIdx++) {
      const zStart = 55 - row * 6.8 - (laneIdx % 2) * 1.6;
      // Leave clean space for rapidBus750 at (-2.4, 48.5) AND keep intersection box clear of clipping
      if (laneIdx === 1 && zStart > 39 && zStart < 58) continue;
      if (Math.abs(zStart - -18) < 5.2) continue;

      const dir = laneIdx < 2 ? -1 : 1;
      const car = new THREE.Group();
      const idx = row * 4 + laneIdx;
      const bMat = new THREE.MeshStandardMaterial({
        color: carColors[idx % carColors.length],
        roughness: 0.42,
        metalness: 0.25
      });
      const body = new THREE.Mesh(carBodyGeo, bMat);
      body.position.y = 0.52;
      body.castShadow = true;
      car.add(body);

      const cabin = new THREE.Mesh(carCabinGeo, bMat);
      cabin.position.set(0, 1.05, dir < 0 ? 0.15 : -0.15);
      car.add(cabin);

      const tail = new THREE.Mesh(tailLightGeo, tailLightMat);
      tail.position.set(0, 0.58, dir < 0 ? 1.86 : -1.86);
      car.add(tail);

      car.position.set(carLanes[laneIdx], 0.08, zStart);
      car.userData = {
        dir: dir,
        speed: 1.8 + (idx % 4) * 0.35,
        keepInTransit: row < 2 && (laneIdx === 0 || laneIdx === 3)
      };
      world.add(car);
      cars.push(car);
    }
  }

  const crossCars = [];
  for (let c = 0; c < 10; c++) {
    const cCar = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({
      color: carColors[(c + 2) % carColors.length],
      roughness: 0.45,
      metalness: 0.2
    });
    const body = new THREE.Mesh(carBodyGeo, bMat);
    body.position.y = 0.52;
    cCar.add(body);
    const cabin = new THREE.Mesh(carCabinGeo, bMat);
    cabin.position.set(0, 1.05, 0);
    cCar.add(cabin);
    cCar.rotation.y = Math.PI / 2;
    const xPos = c < 5 ? -44 + c * 6.4 : 15 + (c - 5) * 6.4;
    cCar.position.set(xPos, 0.08, c % 2 === 0 ? -15.5 : -20.5);
    world.add(cCar);
    crossCars.push(cCar);
  }

  // RapidKL Red & Blue Bus Factory (with detailed rear face for Click-the-Bus Opening!)
  const busWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.30, metalness: 0.14 });
  const rapidBlueMat = new THREE.MeshStandardMaterial({ color: 0x0047ab, roughness: 0.36, metalness: 0.18 });
  const rapidRedMat = new THREE.MeshStandardMaterial({ color: 0xd92332, roughness: 0.38, metalness: 0.15 });
  const busGlassMat = new THREE.MeshStandardMaterial({ color: 0x162433, roughness: 0.18, metalness: 0.58 });
  const busLedMat = new THREE.MeshBasicMaterial({ color: 0xffcc4d });
  const busBumperMat = new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.72 });
  const busRearTailMat = new THREE.MeshBasicMaterial({ color: 0xff2b38 });

  // Crisp glowing LED matrix canvas texture for the rear "750" route display
  function makeRouteSignTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0e141c';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffbf3f';
    ctx.font = '800 50px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('750 · KL SENTRAL', 256, 66, 456);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makePlateTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#11161d';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W 750 MY', 128, 34);
    return new THREE.CanvasTexture(c);
  }

  function makePressToGoTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 144;
    const ctx = c.getContext('2d');
    // Crisp RapidKL Blue rounded pill with Red left accent
    ctx.fillStyle = '#0047ab';
    ctx.fillRect(0, 0, 512, 144);
    ctx.fillStyle = '#d92332';
    ctx.fillRect(0, 0, 26, 144);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 136);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 54px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRESS TO GO  →', 266, 74, 452);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  const routeSignMat = new THREE.MeshBasicMaterial({ map: makeRouteSignTexture() });
  const plateMat = new THREE.MeshBasicMaterial({ map: makePlateTexture() });
  const pressToGoMat = new THREE.MeshBasicMaterial({ map: makePressToGoTexture() });

  function makeRapidKLBus(detailedRear) {
    const bus = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.52, 2.58, 10.6), busWhiteMat);
    hull.position.y = 1.54;
    hull.castShadow = true;
    bus.add(hull);

    // Roof AC pod
    const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 5.2), busWhiteMat);
    acPod.position.set(0, 2.94, 0);
    bus.add(acPod);

    const blueBand = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.58, 10.64), rapidBlueMat);
    blueBand.position.y = 0.72;
    bus.add(blueBand);

    const redStripe = new THREE.Mesh(new THREE.BoxGeometry(2.60, 0.24, 10.66), rapidRedMat);
    redStripe.position.y = 1.14;
    bus.add(redStripe);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.88, 9.6), busGlassMat);
    glass.position.y = 1.98;
    bus.add(glass);

    const ledF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.24, 0.12), busLedMat);
    ledF.position.set(0, 2.52, -5.32);
    bus.add(ledF);

    if (detailedRear) {
      // Rear window frame
      const rearWin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 0.1), busGlassMat);
      rearWin.position.set(0, 2.04, 5.31);
      bus.add(rearWin);

      // Glowing "750 · KL SENTRAL" rear LED matrix sign
      const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.42), routeSignMat);
      rearSign.position.set(0, 2.58, 5.37);
      bus.add(rearSign);

      // Bold "PRESS TO GO ->" logo painted right on the back of the bus!
      const pressBadge = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.48), pressToGoMat);
      pressBadge.position.set(0, 1.38, 5.38);
      bus.add(pressBadge);

      // Rear bumper + dual glowing red brake/tail lights + license plate
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.34, 0.24), busBumperMat);
      bumper.position.set(0, 0.44, 5.34);
      bus.add(bumper);

      [-0.96, 0.96].forEach(function (tx) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.12), busRearTailMat);
        tail.position.set(tx, 0.84, 5.35);
        bus.add(tail);
      });

      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.19), plateMat);
      plate.position.set(0, 0.80, 5.37);
      bus.add(plate);
    } else {
      const ledR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.12), busLedMat);
      ledR.position.set(0, 2.50, 5.32);
      bus.add(ledR);
    }

    return bus;
  }

  const rapidBus750 = makeRapidKLBus(true);
  rapidBus750.position.set(-2.4, 0.08, 48.5);
  world.add(rapidBus750);

  const extraBuses = [];
  for (let b = 0; b < 7; b++) {
    const dir = b % 2 === 0 ? -1 : 1;
    const eb = makeRapidKLBus();
    eb.position.set(dir < 0 ? -2.4 : 2.4, 0.08, -280 + b * 48);
    eb.scale.setScalar(0.001);
    eb.userData = { dir: dir, speed: 13.0 + (b % 2) * 1.8 };
    world.add(eb);
    extraBuses.push(eb);
  }

  // =========================================================================
  // 6. Logical Community Planning: Parks, 3D Basketball Court & RapidKL Stops!
  // =========================================================================

  const parkFeatures = [];
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3b9158, roughness: 0.9 });
  const courtBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e5799, roughness: 0.72 });
  const courtRedMat = new THREE.MeshStandardMaterial({ color: 0xc93b3b, roughness: 0.72 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8d5b34, roughness: 0.8 });

  // 6A. Community Park + Full 3D Basketball Court at (x = +26, z = -117)!
  const bballPark = new THREE.Group();
  const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(24, 0.22, 42), grassMat);
  parkLawn.position.y = 0.06;
  parkLawn.receiveShadow = true;
  bballPark.add(parkLawn);

  // Basketball court slab
  const courtBase = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.28, 22), courtBlueMat);
  courtBase.position.set(0, 0.14, 0);
  bballPark.add(courtBase);

  // Painted terracotta key zones & center circle
  [-7.8, 7.8].forEach(function (kz) {
    const key = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.6), courtRedMat);
    key.rotation.x = -Math.PI / 2;
    key.position.set(0, 0.295, kz);
    bballPark.add(key);

    // Basketball hoop + backboard + stanchion
    const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 0.24), poleMat);
    stanchion.position.set(0, 1.8, kz > 0 ? 10.6 : -10.6);
    bballPark.add(stanchion);

    const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.15, 0.1), whiteLineMat);
    backboard.position.set(0, 3.25, kz > 0 ? 10.1 : -10.1);
    bballPark.add(backboard);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 14), rapidRedMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.9, kz > 0 ? 9.75 : -9.75);
    bballPark.add(rim);
  });

  // White court boundary & center line
  const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 0.16), whiteLineMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, 0.30, 0);
  bballPark.add(centerLine);

  const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.78, 24), whiteLineMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(0, 0.30, 0);
  bballPark.add(centerRing);

  // Park benches & warm lanterns around the court
  [-8, 0, 8].forEach(function (bz) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 2.8), benchMat);
    bench.position.set(-8.2, 0.45, bz);
    bballPark.add(bench);
  });
  [-14, 14].forEach(function (lz) {
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.2, 6), poleMat);
    lp.position.set(-8.5, 2.1, lz);
    bballPark.add(lp);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), warmParkLightMat);
    gl.position.set(-8.5, 4.3, lz);
    bballPark.add(gl);
  });

  bballPark.position.set(27, 0, -117);
  bballPark.scale.setScalar(0.001);
  world.add(bballPark);
  parkFeatures.push(bballPark);

  // 6B. Green Neighborhood Pocket Parks (x = -27, z = -185 & x = +27, z = -185)
  [
    [-28, -185],
    [28, -51]
  ].forEach(function (pos) {
    const pk = new THREE.Group();
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.22, 34), grassMat);
    lawn.position.y = 0.06;
    pk.add(lawn);
    const path = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 32), sidewalkMat);
    path.position.y = 0.08;
    pk.add(path);
    [-9, 9].forEach(function (bz) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 2.8), benchMat);
      bench.position.set(3.2, 0.45, bz);
      pk.add(bench);
    });
    pk.position.set(pos[0], 0, pos[1]);
    pk.scale.setScalar(0.001);
    world.add(pk);
    parkFeatures.push(pk);
  });

  // 6C. Shade Trees along the Stretching Kaki Lima
  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2c7a4e, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3b9460, roughness: 0.85 });

  for (let z = 48; z >= -285; z -= 15) {
    if (crossZList.some(function (cz) { return Math.abs(z - cz) < 10; })) continue;
    [
      [-10.6, z],
      [10.6, z - 5]
    ].forEach(function (pos, idx) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8), trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.1 + (idx % 2) * 0.32, 1),
        idx % 2 === 0 ? canopyMat1 : canopyMat2
      );
      crown.position.y = 3.85;
      crown.scale.set(1.2, 0.78, 1.2);
      crown.castShadow = true;
      tree.add(crown);

      tree.position.set(pos[0], 0.25, pos[1]);
      tree.scale.setScalar(0.001);
      tree.userData = { delay: (Math.abs(z) % 5) * 0.04 };
      world.add(tree);
      trees.push(tree);
    });
  }

  // 6D. Prominent RapidKL Bus Stops (with Illuminated Route Totems!)
  const shelters = [];
  const totemSignMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const shelterGlassMat = new THREE.MeshStandardMaterial({
    color: 0xaad4f5,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.48
  });

  [
    [-10.2, -40],
    [10.2, -52],
    [-10.2, -108],
    [10.2, -124],
    [-10.2, -176],
    [10.2, -190],
    [-10.2, -248]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const isLeft = pos[0] < 0;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 8.2), rapidBlueMat);
    roof.position.y = 3.35;
    roof.castShadow = true;
    sh.add(roof);

    const redTrim = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.14, 8.28), rapidRedMat);
    redTrim.position.y = 3.16;
    sh.add(redTrim);

    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 7.2), warmParkLightMat);
    glowStrip.position.y = 3.18;
    sh.add(glowStrip);

    const backX = isLeft ? -1.25 : 1.25;
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 6.8), shelterGlassMat);
    backGlass.position.set(backX, 1.65, 0);
    sh.add(backGlass);

    [-3.5, 0, 3.5].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.35, 0.18), poleMat);
      post.position.set(backX, 1.68, pz);
      sh.add(post);
    });

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 5.2), benchMat);
    bench.position.set(isLeft ? -0.65 : 0.65, 0.42, 0);
    sh.add(bench);

    const totemPole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.2, 0.55), rapidBlueMat);
    totemPole.position.set(isLeft ? 1.1 : -1.1, 2.1, 4.4);
    sh.add(totemPole);

    const totemBadge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.62), rapidRedMat);
    totemBadge.position.set(isLeft ? 1.1 : -1.1, 3.65, 4.4);
    sh.add(totemBadge);

    const totemLight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.9, 0.48), totemSignMat);
    totemLight.position.set(isLeft ? 1.1 : -1.1, 2.65, 4.4);
    sh.add(totemLight);

    sh.position.set(pos[0], 0.26, pos[1]);
    sh.scale.setScalar(0.001);
    world.add(sh);
    shelters.push(sh);
  });

  // 6E. Subtle Strolling Walkers on Wide Kaki Lima & Parks
  const walkers = [];
  const walkerPalette = [0x0047ab, 0xd92332, 0x0e7c59, 0xd48a29, 0x3b4d61, 0x8f4c3d];
  const walkerHeadMat = new THREE.MeshStandardMaterial({ color: 0xe6d5c3, roughness: 0.7 });
  for (let w = 0; w < 26; w++) {
    const side = w % 2 === 0 ? -1 : 1;
    const wg = new THREE.Group();
    const wMat = new THREE.MeshStandardMaterial({ color: walkerPalette[w % walkerPalette.length], roughness: 0.75 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.15, 8), wMat);
    body.position.y = 0.62;
    wg.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), walkerHeadMat);
    head.position.y = 1.38;
    wg.add(head);

    const wx = side * (11.6 + (w % 3) * 1.1);
    const wz = -34 - w * 9.5;
    wg.position.set(wx, 0.28, wz);
    wg.scale.setScalar(0.001);
    wg.userData = {
      dir: w % 3 === 0 ? 1 : -1,
      speed: 1.1 + (w % 4) * 0.25,
      baseZ: wz
    };
    world.add(wg);
    walkers.push(wg);
  }

  // =========================================================================
  // 7. Solid-Column LRT/MRT Viaduct, KL Sentral-Style Transit Hub & 4-Car Train!
  //    (ZERO floating roofs — every canopy sits on full structural columns!)
  // =========================================================================

  const railGroup = new THREE.Group();
  const railViaductMat = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.72 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x4b5660, roughness: 0.35, metalness: 0.75 });

  // Elevated LRT viaduct ends cleanly at z = -196 (well before KLCC!) and dives underground into a tunnel portal!
  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.25, 256), railViaductMat);
  viaductBeam.position.set(17.8, 8.4, -68);
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.96, 0.28, 256), rapidBlueMat);
  viaductTrim.position.set(17.8, 8.95, -68);
  railGroup.add(viaductTrim);

  [-1.1, 1.1].forEach(function (rx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 256), railSteelMat);
    rail.position.set(17.8 + rx, 9.12, -68);
    railGroup.add(rail);
  });

  const railPierGeo = new THREE.BoxGeometry(1.5, 8.4, 1.8);
  for (let z = 48; z >= -196; z -= 26) {
    if (crossZList.some(function (cz) { return Math.abs(z - cz) < 10; })) continue;
    const pier = new THREE.Mesh(railPierGeo, railViaductMat);
    pier.position.set(17.8, 4.2, z);
    railGroup.add(pier);
  }

  // Downward LRT/MRT Ramp & Underground Tunnel Portal (z = -196 -> -236, diving smoothly under KLCC!)
  const tunnelRamp = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.25, 42), railViaductMat);
  tunnelRamp.position.set(17.8, 4.2, -216);
  tunnelRamp.rotation.x = 0.21;
  railGroup.add(tunnelRamp);

  const tunnelPortal = new THREE.Group();
  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(7.2, 5.2, 6.0), railViaductMat);
  portalArch.position.set(17.8, 2.6, -236);
  tunnelPortal.add(portalArch);
  const portalStripe = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.45, 6.2), rapidBlueMat);
  portalStripe.position.set(17.8, 5.05, -236);
  tunnelPortal.add(portalStripe);
  const portalDark = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 3.8, 6.2),
    new THREE.MeshBasicMaterial({ color: 0x090d14 })
  );
  portalDark.position.set(17.8, 1.9, -235.8);
  tunnelPortal.add(portalDark);
  railGroup.add(tunnelPortal);

  // Solid-Column Elevated LRT/MRT Stations + KL Sentral-Style Grand Concourse at z = -176!
  [-52, -176].forEach(function (sz, idx) {
    const isHub = idx === 1; // KL Sentral-inspired integrated transit hub!
    const stLen = isHub ? 38 : 28;
    const stWid = isHub ? 11.5 : 9.2;

    // Platform deck
    const stationDeck = new THREE.Mesh(new THREE.BoxGeometry(stWid - 0.6, 0.55, stLen), railViaductMat);
    stationDeck.position.set(17.8, 8.65, sz);
    railGroup.add(stationDeck);

    // Solid ground-to-platform concourse pier (no floating look!)
    const concourse = new THREE.Mesh(new THREE.BoxGeometry(stWid - 2.6, 8.4, stLen * 0.52), railViaductMat);
    concourse.position.set(17.8, 4.2, sz);
    railGroup.add(concourse);

    // Concourse glass entrance walls
    const concourseGlass = new THREE.Mesh(new THREE.BoxGeometry(stWid - 2.3, 4.2, stLen * 0.42), shelterGlassMat);
    concourseGlass.position.set(17.8, 2.3, sz);
    railGroup.add(concourseGlass);

    // Roof canopy + RapidKL red trim
    const roofY = isHub ? 14.4 : 13.8;
    const stationRoof = new THREE.Mesh(new THREE.BoxGeometry(stWid, 0.35, stLen), rapidBlueMat);
    stationRoof.position.set(17.8, roofY, sz);
    stationRoof.castShadow = true;
    railGroup.add(stationRoof);

    const stationAccent = new THREE.Mesh(new THREE.BoxGeometry(stWid + 0.14, 0.16, stLen + 0.14), rapidRedMat);
    stationAccent.position.set(17.8, roofY - 0.22, sz);
    railGroup.add(stationAccent);

    // SOLID STEEL COLUMNS connecting platform deck (8.8) -> roof canopy (roofY)!
    const colH = roofY - 8.7;
    const colX = stWid / 2 - 0.65;
    [-colX, colX].forEach(function (cx) {
      for (let cz = -stLen / 2 + 2.5; cz <= stLen / 2 - 2.5; cz += 6.5) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, colH, 8), railSteelMat);
        col.position.set(17.8 + cx, 8.7 + colH / 2, sz + cz);
        railGroup.add(col);
      }
      // Side glass wind-screens between columns
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, stLen - 4), shelterGlassMat);
      sideGlass.position.set(17.8 + cx, 10.1, sz);
      railGroup.add(sideGlass);
    });
  });

  // 4-Car RapidKL Electric LRT/MRT Train
  const train = new THREE.Group();
  const trainWindowMat = new THREE.MeshBasicMaterial({ color: 0xffe9ba });

  for (let carIdx = 0; carIdx < 4; carIdx++) {
    const coach = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.75, 2.75, 11.4), busWhiteMat);
    body.position.y = 1.45;
    coach.add(body);
    const livery = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.65, 11.44), rapidBlueMat);
    livery.position.y = 0.72;
    coach.add(livery);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.24, 11.46), rapidRedMat);
    accent.position.y = 1.14;
    coach.add(accent);
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 10.2), trainWindowMat);
    winBand.position.y = 1.92;
    coach.add(winBand);
    coach.position.z = -carIdx * 12.1;
    train.add(coach);
  }
  train.position.set(17.8, 9.2, -120);
  railGroup.add(train);

  railGroup.position.y = -18;
  railGroup.visible = false;
  world.add(railGroup);

  // =========================================================================
  // 8. Colorful Malaysian Metropolitan City (Shophouses, Homes & Towers)
  // =========================================================================

  const skyline = new THREE.Group();
  const roofGardens = [];
  const colorfulTowerMats = [];
  const shopColorMats = [];

  const shopWallColors = [0xefe2c9, 0xe4c68d, 0xc3d6c4, 0xd89378, 0xb6cde0, 0xf2e8d8];
  const awningColors = [0xd92332, 0x0047ab, 0x0e7c59, 0xd48a29];
  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x6f7479, roughness: 0.85 });
  const warmShopGlassMat = new THREE.MeshBasicMaterial({ color: 0x9aa3ab });

  // 8A. Street-Level Shophouses (start weathered grey -> bloom into vibrant Malaysian colors!)
  for (let i = 0; i < 36; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bz = 54 - i * 9.2;
    if (crossZList.some(function (cz) { return Math.abs(bz - cz) < 11; })) continue;
    if (side > 0 && Math.abs(bz - -51) < 20) continue;
    if (side > 0 && Math.abs(bz - -117) < 24) continue;
    if (side < 0 && Math.abs(bz - -185) < 20) continue;
    if (side > 0 && Math.abs(bz - -176) < 24) continue;

    const shop = new THREE.Group();
    const w = 7.4;
    const h = 5.4 + (i % 2) * 2.2;
    const dLen = 7.2;

    const targetWallHex = shopWallColors[i % shopWallColors.length];
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8e9399,
      roughness: 0.82
    });
    shopColorMats.push({ mat: wallMat, ugly: new THREE.Color(0x8e9399), pretty: new THREE.Color(targetWallHex) });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    shop.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.65, dLen + 0.5), roofTileMat);
    roof.position.y = h + 0.3;
    shop.add(roof);

    const targetAwningHex = awningColors[i % awningColors.length];
    const awningMat = new THREE.MeshStandardMaterial({
      color: 0x676d73,
      roughness: 0.74
    });
    shopColorMats.push({ mat: awningMat, ugly: new THREE.Color(0x676d73), pretty: new THREE.Color(targetAwningHex) });

    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, dLen - 0.8), awningMat);
    awning.position.set(side < 0 ? w / 2 + 0.75 : -w / 2 - 0.75, 2.75, 0);
    awning.rotation.z = side < 0 ? -0.25 : 0.25;
    shop.add(awning);

    const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, dLen - 1.8), warmShopGlassMat);
    win.position.set(side < 0 ? w / 2 + 0.04 : -w / 2 - 0.04, 1.45, 0);
    shop.add(win);

    shop.position.set(side * 22.0, 0, bz);
    skyline.add(shop);
  }

  // 8B. Colorful Multi-Tiered Malaysian Towers & Suburban Homes
  const towerColorPalette = [0xdccfb8, 0xb7d1e3, 0xe6c8a8, 0xb9d4c7, 0xd8b4a0, 0xc4d4e6];
  const podiumColorPalette = [0xc9b99f, 0x9eb2c4, 0xd4b698, 0xa8bfb3];
  const bldgTrimMat = new THREE.MeshStandardMaterial({ color: 0xefeae0, roughness: 0.55 });

  const ringConfigs = [
    { xOff: 38, count: 32, stepZ: 10.5, minH: 13, maxH: 28 },
    { xOff: 66, count: 26, stepZ: 12.5, minH: 9, maxH: 22 },
    { xOff: 92, count: 20, stepZ: 16.0, minH: 6, maxH: 14 }
  ];

  ringConfigs.forEach(function (ring, rIdx) {
    for (let i = 0; i < ring.count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bz = 58 - i * ring.stepZ;
      if (crossZList.some(function (cz) { return Math.abs(bz - cz) < 9.5; })) continue;
      // Keep landmark plots clear!
      if (Math.hypot(side * ring.xOff - -60, bz - -192) < 26) continue;
      if (Math.hypot(side * ring.xOff - 72, bz - -198) < 26) continue;
      if (Math.hypot(side * ring.xOff - -38, bz - -258) < 28) continue;

      const h = ring.minH + ((i * 7 + rIdx * 5) % (ring.maxH - ring.minH + 1));
      const w = 7.8 + (i % 3) * 2.4;
      const dLen = 7.8 + (i % 4) * 2.0;
      const bx = side * (ring.xOff + (i % 3) * 4.0);

      const tower = new THREE.Group();
      const baseColorHex = towerColorPalette[(i + rIdx) % towerColorPalette.length];

      const fMat = new THREE.MeshStandardMaterial({
        map: facadeDayTex,
        color: baseColorHex,
        roughness: 0.58,
        metalness: 0.22
      });
      colorfulTowerMats.push({ mat: fMat, dayHex: baseColorHex });

      const pMat = new THREE.MeshStandardMaterial({
        color: podiumColorPalette[(i + rIdx) % podiumColorPalette.length],
        roughness: 0.8
      });

      const podiumH = rIdx === 2 ? 2.2 : 3.2;
      const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, podiumH, dLen + 1.2), pMat);
      podium.position.y = podiumH / 2;
      tower.add(podium);

      const shaftH = h * 0.72;
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, dLen), fMat);
      shaft.position.y = podiumH + shaftH / 2;
      if (rIdx === 0) shaft.castShadow = true;
      tower.add(shaft);

      if (rIdx === 2) {
        const homeRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 2.4, 4), roofTileMat);
        homeRoof.rotation.y = Math.PI / 4;
        homeRoof.position.y = podiumH + shaftH + 1.2;
        tower.add(homeRoof);
      } else {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, dLen + 0.5), bldgTrimMat);
        ledge.position.y = podiumH + shaftH;
        tower.add(ledge);

        const upperH = h * 0.28;
        const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, upperH, dLen * 0.72), fMat);
        upper.position.y = podiumH + shaftH + upperH / 2;
        tower.add(upper);

        const terraceGreen = new THREE.Group();
        const g1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.55, dLen + 0.8), vineBrightMat);
        g1.position.y = podiumH + 0.3;
        const g2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.65, dLen * 0.9), vineWrapMat);
        g2.position.y = podiumH + shaftH + 0.45;
        terraceGreen.add(g1, g2);
        terraceGreen.scale.set(1, 0.001, 1);
        tower.add(terraceGreen);
        roofGardens.push(terraceGreen);
      }

      tower.position.set(bx, -0.1, bz);
      skyline.add(tower);
    }
  });

  // =========================================================================
  // 9. Accurately Colored, Map-Positioned Real 3D Kuala Lumpur Landmarks!
  //    Each landmark gets its true-to-life Malaysian architectural palette!
  // =========================================================================

  const klGroup = new THREE.Group();
  skyline.add(klGroup);
  world.add(skyline);

  // Lush Green Bukit Nanas Hill beneath Menara KL!
  const bukitNanas = new THREE.Mesh(
    new THREE.ConeGeometry(30, 13, 16),
    new THREE.MeshStandardMaterial({ color: 0x2d7a4a, roughness: 0.92 })
  );
  bukitNanas.position.set(-38, 5.5, -258);
  klGroup.add(bukitNanas);

  const LANDMARK_MATERIALS = {
    // Petronas Twin Towers: Gleaming brushed stainless steel silver + emerald-sky reflective glass
    klcc: {
      body: new THREE.MeshStandardMaterial({
        color: 0xe3ebf2,
        roughness: 0.28,
        metalness: 0.65,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x6cb5c9,
        roughness: 0.16,
        metalness: 0.72,
        emissive: new THREE.Color(0x1b4c5e),
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide
      })
    },
    // Menara KL: Crisp ivory-white concrete shaft + warm gold/champagne pod accents
    menara: {
      body: new THREE.MeshStandardMaterial({
        color: 0xf0ebe0,
        roughness: 0.6,
        metalness: 0.12,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xd4a962,
        roughness: 0.25,
        metalness: 0.55,
        emissive: new THREE.Color(0x4d3812),
        emissiveIntensity: 0.18,
        side: THREE.DoubleSide
      })
    },
    // Merdeka 118: Crisp silver-white diamond steel frame + crystalline sky-blue faceted glass
    merdeka: {
      body: new THREE.MeshStandardMaterial({
        color: 0xdde7f0,
        roughness: 0.32,
        metalness: 0.55,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x5c9fd6,
        roughness: 0.15,
        metalness: 0.68,
        emissive: new THREE.Color(0x163d66),
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      })
    },
    // The Exchange 106 (TRX): Deep royal-cobalt corporate glass + warm champagne-gold crown
    trx: {
      body: new THREE.MeshStandardMaterial({
        color: 0xe3c88d,
        roughness: 0.35,
        metalness: 0.5,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x2c5fa3,
        roughness: 0.18,
        metalness: 0.65,
        emissive: new THREE.Color(0x112a4f),
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      })
    }
  };

  const LANDMARK_SCALE = 86 / 444.138;
  function loadPortfolioModel(url, x, y, z, rotY, matPair) {
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (d) {
        const pos = b64(d.positions, Float32Array);
        const grp = new THREE.Group();
        [
          ['body', matPair.body],
          ['glass', matPair.glass]
        ].forEach(function (pair) {
          if (!d[pair[0]]) return;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          geo.setIndex(new THREE.BufferAttribute(b64(d[pair[0]], Uint16Array), 1));
          geo.computeVertexNormals();
          grp.add(new THREE.Mesh(geo, pair[1]));
        });
        grp.scale.setScalar(LANDMARK_SCALE);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        klGroup.add(grp);
      })
      .catch(function () {});
  }

  // Exact GPS-proportioned Kuala Lumpur landmarks:
  loadPortfolioModel('./assets/city/klcc.json', 18, 0, -295, 0.12, LANDMARK_MATERIALS.klcc);
  loadPortfolioModel('./assets/city/menara_kl.json', -38, 10, -258, 0.30, LANDMARK_MATERIALS.menara);
  loadPortfolioModel('./assets/city/merdeka118.json', -60, 0, -192, -0.32, LANDMARK_MATERIALS.merdeka);
  loadPortfolioModel('./assets/city/exchange106.json', 72, 0, -198, 0.22, LANDMARK_MATERIALS.trx);

  // =========================================================================
  // 10. Smooth, Straight-Axis Architectural Camera Glide (ZERO Sharp Angles!)
  // =========================================================================

  const camPosCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 7.2, 66.0),   // 0.00 Pulled-back view of horrible motionless jam + original KL skyline
    new THREE.Vector3(0.4, 7.8, 18.0),    // 0.16 Smooth forward glide over jammed corridor & intersection
    new THREE.Vector3(-0.8, 10.6, -24.0), // 0.32 Gentle rise seeing active highway traffic on top + blooming flowers
    new THREE.Vector3(1.2, 9.2, -74.0),   // 0.48 RapidKL blue bus lanes, bus stops & colorful shophouses
    new THREE.Vector3(2.2, 10.2, -124.0), // 0.64 Community park, 3D basketball court & elevated LRT station
    new THREE.Vector3(0.5, 13.5, -178.0), // 0.78 KL Sentral hub & LRT diving underground before KLCC!
    new THREE.Vector3(1.5, 22.0, -135.0), // 0.90 Smooth gentle pull-back revealing all 4 KL landmarks
    new THREE.Vector3(0.0, 34.0, -30.0)   // 1.00 Grand panoramic showcase of the entire KL metropolis
  ]);

  const camLookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.0, 3.2, -25.0),  // 0.00 Looking straight down the jam toward hazy KL skyline
    new THREE.Vector3(-1.2, 3.0, -50.0),  // 0.16
    new THREE.Vector3(-4.0, 6.5, -90.0),  // 0.32 Gentle sightline across highway & boulevard (no sharp snap!)
    new THREE.Vector3(1.0, 6.5, -165.0),  // 0.48
    new THREE.Vector3(4.0, 7.5, -205.0),  // 0.64
    new THREE.Vector3(4.0, 14.0, -265.0), // 0.78
    new THREE.Vector3(4.0, 18.0, -265.0), // 0.90
    new THREE.Vector3(4.0, 18.0, -265.0)  // 1.00
  ]);

  let scrollProgress = 0;
  let smoothScroll = 0;
  let compareRatio = null;
  let lightingMode = 'day';
  let isDark = false;

  // Interactive "Press to Go" Opening: Zoom-In -> Slow Pull-Back (Bus Stays Stuck!)
  let introState = 'waiting'; // 'waiting' | 'departing' | 'active'
  let introT = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const introCamPos = new THREE.Vector3(-2.4, 2.05, 61.2);
  const introZoomPos = new THREE.Vector3(-2.4, 1.98, 58.8);
  const introCamLook = new THREE.Vector3(-2.4, 1.72, 48.5);

  function triggerBusDeparture() {
    if (introState !== 'waiting') return;
    introState = 'departing';
    canvas.style.cursor = 'default';
    if (typeof window.onBusIntroStart === 'function') {
      window.onBusIntroStart();
    }
  }

  window.addEventListener('pointermove', function (e) {
    if (introState !== 'waiting') return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(rapidBus750, true);
    document.body.style.cursor = hits.length > 0 ? 'pointer' : 'default';
  }, { passive: true });

  window.addEventListener('click', function (e) {
    if (introState !== 'waiting') return;
    if (e.target && e.target.closest && e.target.closest('header, nav, button, a')) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(rapidBus750, true);
    if (hits.length > 0) {
      document.body.style.cursor = 'default';
      triggerBusDeparture();
    }
  });

  window.ManifestoScene = {
    setScrollProgress: function (p) {
      scrollProgress = clamp(p, 0, 1);
    },
    setCompareRatio: function (val) {
      compareRatio = val === null ? null : clamp(val, 0, 1);
    },
    triggerBusDeparture: triggerBusDeparture,
    setLighting: function (mode) {
      lightingMode = mode;
    },
    setDark: function (dark) {
      isDark = !!dark;
    }
  };

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // =========================================================================
  // 11. Silky-Smooth Animation Loop: Frozen Ugly Jam -> Vibrant Shared Spaces
  // =========================================================================

  let morphFactor = 0;
  let greenFactor = 0;
  let prettyFactor = 0;
  let lastTime = performance.now();
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const tmpIntroPos = new THREE.Vector3();
  const tmpIntroLook = new THREE.Vector3();

  const uglySidewalkCol = new THREE.Color(0x88857e);
  const prettySidewalkCol = new THREE.Color(0xe0d4be);
  const uglyRoofCol = new THREE.Color(0x6d7278);
  const prettyRoofCol = new THREE.Color(0xb3523a);
  const uglyShopWinCol = new THREE.Color(0x868f98);
  const prettyShopWinCol = new THREE.Color(0xffe6b3);
  const uglyTowerCol = new THREE.Color(0x8a9096);
  const uglySkyTop = new THREE.Color(0x9ca4ad);
  const uglySkyMid = new THREE.Color(0xc5c4be);
  const uglyFogCol = new THREE.Color(0xd2cfc7);
  const tmpColor = new THREE.Color();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    const elapsed = now * 0.001;
    lastTime = now;

    const damp = reducedMotion ? 1 : 1 - Math.exp(-5.0 * dt);
    smoothScroll = lerp(smoothScroll, scrollProgress, damp);
    const s = clamp(smoothScroll, 0, 1);
    const speedMult = reducedMotion ? 0 : 1;

    const lockedIntro = introState !== 'active';
    const targetGreen = lockedIntro ? 0 : (compareRatio !== null ? compareRatio : smoothstep(0.35, 0.56, s));
    const targetMorph = lockedIntro ? 0 : (compareRatio !== null ? compareRatio : smoothstep(0.37, 0.74, s));
    const targetPretty = lockedIntro ? 0 : (compareRatio !== null ? compareRatio : smoothstep(0.32, 0.70, s));

    greenFactor = lerp(greenFactor, targetGreen, damp);
    morphFactor = lerp(morphFactor, targetMorph, damp);
    prettyFactor = lerp(prettyFactor, targetPretty, damp);

    // 1. Existing highway stays utilized with cars & trucks driving smoothly on top!
    for (let h = 0; h < highwayCars.length; h++) {
      const hc = highwayCars[h];
      hc.position.z += hc.userData.dir * hc.userData.speed * dt * speedMult;
      if (hc.position.z < -260) hc.position.z = 75;
      if (hc.position.z > 75) hc.position.z = -260;
    }

    // Highway greenery & flowers bloom ONLY after scrolling past the intersection!
    for (let g = 0; g < overpassGreenery.length; g++) {
      const item = overpassGreenery[g];
      const gs = Math.max(0.001, greenFactor);
      item.visible = greenFactor > 0.02;
      if (item.visible) {
        if (g < overpassGreenery.length - 2) item.scale.set(gs, gs, gs);
        else item.scale.set(1, gs, 1);
      }
    }

    // 2. Full Ugliness -> Vibrant Malaysian Color Progression
    sidewalkMat.color.copy(uglySidewalkCol).lerp(prettySidewalkCol, prettyFactor);
    roofTileMat.color.copy(uglyRoofCol).lerp(prettyRoofCol, prettyFactor);
    warmShopGlassMat.color.copy(uglyShopWinCol).lerp(prettyShopWinCol, prettyFactor);

    for (let sc = 0; sc < shopColorMats.length; sc++) {
      const entry = shopColorMats[sc];
      entry.mat.color.copy(entry.ugly).lerp(entry.pretty, prettyFactor);
    }

    for (let m = 0; m < colorfulTowerMats.length; m++) {
      const entry = colorfulTowerMats[m];
      entry.mat.map = isDark ? facadeNightTex : facadeDayTex;
      entry.mat.emissive.setHex(isDark ? 0x263a52 : 0x000000);
      entry.mat.emissiveIntensity = isDark ? 0.55 : 0;
      if (isDark) {
        tmpColor.setHex(0x4b5663).lerp(new THREE.Color(0x627a99), prettyFactor);
      } else {
        tmpColor.copy(uglyTowerCol).lerp(new THREE.Color(entry.dayHex), prettyFactor);
      }
      entry.mat.color.lerp(tmpColor, 0.08);
    }
    for (let r = 0; r < roofGardens.length; r++) {
      roofGardens[r].scale.set(1, Math.max(0.001, prettyFactor), 1);
      roofGardens[r].visible = prettyFactor > 0.04;
    }

    // 3. Dedicated RapidKL Bus Lanes, Bike Lanes, Zebra Crossings & Signals
    busLaneMat.opacity = smoothstep(0.18, 0.62, morphFactor) * 0.92;
    bikeLaneMat.opacity = smoothstep(0.36, 0.80, morphFactor) * 0.90;
    zebraMat.opacity = smoothstep(0.28, 0.72, morphFactor);
    dashMat.opacity = lerp(0.78, 0.20, morphFactor);

    const sigMat = morphFactor > 0.42 ? greenSignalMat : redSignalMat;
    for (let k = 0; k < signalHeads.length; k++) {
      signalHeads[k].material = sigMat;
    }

    // 4. Shade Trees, RapidKL Bus Stops, Community Parks & Basketball Court, Strolling Walkers
    const treeGrowth = smoothstep(0.16, 0.74, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const sc = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(sc);
    }

    const shelterGrowth = smoothstep(0.22, 0.64, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    const parkGrowth = smoothstep(0.26, 0.68, morphFactor);
    for (let p = 0; p < parkFeatures.length; p++) {
      parkFeatures[p].scale.setScalar(Math.max(0.001, parkGrowth));
    }

    const walkerScale = smoothstep(0.32, 0.74, morphFactor);
    for (let w = 0; w < walkers.length; w++) {
      const wk = walkers[w];
      wk.scale.setScalar(Math.max(0.001, walkerScale));
      wk.visible = walkerScale > 0.05;
      if (wk.visible) {
        wk.position.z += wk.userData.dir * wk.userData.speed * dt * speedMult;
        if (Math.abs(wk.position.z - wk.userData.baseZ) > 14) {
          wk.userData.dir *= -1;
        }
      }
    }

    // 5. Elevated LRT/MRT Viaduct & Train Diving Cleanly Underground Before KLCC!
    const railLift = smoothstep(0.20, 0.66, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z -= 22 * dt * speedMult; // Heads north toward tunnel portal!
      if (train.position.z < -236) train.position.z = 78;
      // Smoothly dive down the tunnel ramp between z = -196 and z = -236!
      const diveT = smoothstep(-196, -234, train.position.z);
      train.position.y = lerp(9.2, 0.8, diveT);
      train.rotation.x = diveT * 0.20;
    }

    // 6. Ground Traffic: DEAD STILL Horrible Jam Until Congestion Clears on Scroll!
    const trafficFlow = smoothstep(0.18, 0.65, morphFactor);
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const carVis = car.userData.keepInTransit ? 1 : clamp(1 - morphFactor * 1.42, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;
      if (car.visible && trafficFlow > 0.02) {
        const spd = car.userData.speed * 2.6 * trafficFlow;
        car.position.z += car.userData.dir * spd * dt * speedMult;
        if (car.position.z < -245) car.position.z = 58;
        if (car.position.z > 58) car.position.z = -245;
      }
    }

    const crossVis = clamp(1 - morphFactor * 1.35, 0.001, 1);
    for (let c = 0; c < crossCars.length; c++) {
      crossCars[c].scale.setScalar(crossVis);
      crossCars[c].visible = crossVis > 0.03;
    }

    // 7. Hero RapidKL 750 Bus: STAYS STUCK IN PLACE When You Press Go! Only Moves Once Bus Lane Clears!
    if (introState === 'departing') {
      introT = Math.min(1, introT + dt / 2.2);
      if (introT >= 1) introState = 'active';
    }

    if (morphFactor < 0.22) {
      // Stuck dead still in the horrible morning jam — cannot move!
      rapidBus750.position.set(-2.4, 0.08, 48.5);
      busRearTailMat.color.setHex(0xff2b38);
    } else {
      rapidBus750.position.x = -2.4;
      rapidBus750.position.z -= lerp(2.5, 16.0, morphFactor) * dt * speedMult;
      busRearTailMat.color.setHex(0xaa1c24);
      if (rapidBus750.position.z < -248) rapidBus750.position.z = 58;
    }

    const extraBusScale = smoothstep(0.22, 0.62, morphFactor);
    for (let b = 0; b < extraBuses.length; b++) {
      extraBuses[b].scale.setScalar(Math.max(0.001, extraBusScale));
      extraBuses[b].visible = extraBusScale > 0.04;
      if (extraBuses[b].visible) {
        extraBuses[b].position.z += extraBuses[b].userData.dir * extraBuses[b].userData.speed * dt * speedMult;
        if (extraBuses[b].position.z > 64) extraBuses[b].position.z = -245;
        if (extraBuses[b].position.z < -245) extraBuses[b].position.z = 64;
      }
    }

    // 8. Camera: Behind Bus -> Zoom-In then Slow Pull-Back to Jam & Original Skyline -> Smooth Scroll Glide!
    camPosCurve.getPointAt(s, tmpPos);
    camLookCurve.getPointAt(s, tmpLook);

    if (introState === 'waiting') {
      camera.position.copy(introCamPos);
      camera.lookAt(introCamLook);
    } else if (introState === 'departing') {
      if (introT < 0.28) {
        // Subtle zoom-in on the stuck 750 bus first!
        const zt = smoothstep(0, 0.28, introT);
        tmpIntroPos.copy(introCamPos).lerp(introZoomPos, zt);
        camera.position.copy(tmpIntroPos);
        camera.lookAt(introCamLook);
      } else {
        // Smoothly pull back & rise to reveal the horrible motionless jam + original KL skyline!
        const pt = smoothstep(0.28, 1.0, introT);
        tmpIntroPos.copy(introZoomPos).lerp(tmpPos, pt);
        tmpIntroLook.copy(introCamLook).lerp(tmpLook, pt);
        camera.position.copy(tmpIntroPos);
        camera.lookAt(tmpIntroLook);
      }
    } else {
      if (s > 0.90 && !reducedMotion) {
        const orbitBlend = smoothstep(0.90, 1.0, s);
        tmpPos.x += Math.sin(elapsed * 0.20) * 20 * orbitBlend;
        tmpPos.y += Math.cos(elapsed * 0.16) * 1.8 * orbitBlend;
      }
      camera.position.copy(tmpPos);
      camera.lookAt(tmpLook);
    }

    // 9. Sky Dome, Exhaust Haze -> Clear Sky Transition, Stars & Landmark Night Glow
    const pal = isDark ? PALETTES.dark : (lightingMode === 'golden' ? PALETTES.golden : PALETTES.day);
    if (!isDark && lightingMode === 'day') {
      // Blend from smoggy exhaust haze (ugly 2026) -> crisp Malaysian blue sky (pretty 2036)!
      tmpColor.copy(uglySkyTop).lerp(pal.skyTop, prettyFactor);
      skyUniforms.uTop.value.lerp(tmpColor, 0.06);
      tmpColor.copy(uglySkyMid).lerp(pal.skyMid, prettyFactor);
      skyUniforms.uMid.value.lerp(tmpColor, 0.06);
      tmpColor.copy(uglyFogCol).lerp(pal.fog, prettyFactor);
      skyUniforms.uHorizon.value.lerp(tmpColor, 0.06);
      scene.background.lerp(tmpColor, 0.06);
      scene.fog.color.lerp(tmpColor, 0.06);
      scene.fog.density = lerp(scene.fog.density, lerp(0.0036, 0.0020, prettyFactor), 0.06);
    } else {
      skyUniforms.uTop.value.lerp(pal.skyTop, 0.06);
      skyUniforms.uMid.value.lerp(pal.skyMid, 0.06);
      skyUniforms.uHorizon.value.lerp(pal.skyHorizon, 0.06);
      scene.background.lerp(pal.fog, 0.06);
      scene.fog.color.lerp(pal.fog, 0.06);
      scene.fog.density = lerp(scene.fog.density, 0.0024, 0.06);
    }

    sunLight.color.lerp(pal.sun, 0.06);
    sunLight.intensity = lerp(sunLight.intensity, pal.sunInt, 0.06);
    hemiLight.color.lerp(pal.hemiSky, 0.06);
    hemiLight.groundColor.lerp(pal.hemiGround, 0.06);
    hemiLight.intensity = lerp(hemiLight.intensity, pal.hemiInt, 0.06);

    starMat.opacity = lerp(starMat.opacity, isDark ? 0.88 : 0.0, 0.06);
    stars.rotation.y = elapsed * 0.004;
    groundMat.color.lerp(new THREE.Color(isDark ? 0x223042 : 0xd8d2c3), 0.06);

    const lmEmissive = isDark ? 0.65 : (lightingMode === 'golden' ? 0.30 : 0.18);
    Object.keys(LANDMARK_MATERIALS).forEach(function (key) {
      LANDMARK_MATERIALS[key].glass.emissiveIntensity = lerp(
        LANDMARK_MATERIALS[key].glass.emissiveIntensity,
        lmEmissive,
        0.06
      );
    });

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
