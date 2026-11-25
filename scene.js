/* ==========================================================================
   ALIF MANIFESTO — Sprawling Colorful Malaysian Metropolis & Map-Accurate KL
   Real GPS-proportioned KL landmarks (KLCC, Menara KL, Merdeka 118, TRX),
   colorful Malaysian shophouses, homes, towers, prominent RapidKL bus stops,
   shared plazas with strolling walkers, elevated LRT & RapidKL 750 corridor.
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
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();

  // Palettes (Zero magenta/pink — crisp Malaysian daylight, golden hour, starry navy)
  const PALETTES = {
    day: {
      skyTop: new THREE.Color(0x5e97d1),
      skyMid: new THREE.Color(0xc8def2),
      skyHorizon: new THREE.Color(0xebe6dc),
      fog: new THREE.Color(0xe6e3da),
      sun: new THREE.Color(0xfff7e8),
      sunInt: 1.42,
      hemiSky: new THREE.Color(0xe8f2fc),
      hemiGround: new THREE.Color(0xc5bfb0),
      hemiInt: 0.88
    },
    golden: {
      skyTop: new THREE.Color(0x366090),
      skyMid: new THREE.Color(0xdca66e),
      skyHorizon: new THREE.Color(0xf5cfa0),
      fog: new THREE.Color(0xe6c59c),
      sun: new THREE.Color(0xffb259),
      sunInt: 1.60,
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
      sunInt: 0.88,
      hemiSky: new THREE.Color(0x233b59),
      hemiGround: new THREE.Color(0x0a111c),
      hemiInt: 0.70
    }
  };

  scene.background = PALETTES.day.fog.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0028);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 1800);
  camera.position.set(1.2, 5.4, 56);

  const hemiLight = new THREE.HemisphereLight(0xe8f2fc, 0xc5bfb0, 0.88);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff7e8, 1.42);
  sunLight.position.set(70, 96, 52);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 340;
  const d = 100;
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
  // 1. Portfolio Sky Dome & 900 Twinkling 3D Stars
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
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1250, 32, 20), skyMat));

  const starCount = window.innerWidth <= 820 ? 450 : 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const elev = Math.acos(1 - Math.random() * 0.88);
    const r = 1080;
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

  const terrGeo = new THREE.PlaneGeometry(1600, 1600, 88, 88);
  terrGeo.rotateX(-Math.PI / 2);
  const tPos = terrGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const dist = Math.hypot(vx, vz + 120);
    let y = -0.15;
    if (dist > 340) {
      const k = smoothstep(340, 720, dist);
      const ang = Math.atan2(vz + 120, vx);
      const ridge =
        Math.sin(ang * 3 + 0.6) * 24 +
        Math.cos(ang * 5 - 1.1) * 16 +
        Math.sin(vx * 0.011 + vz * 0.009) * 18;
      y += (46 + ridge) * k;
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
  // 3. Sprawling Metropolitan Road Grid, Stretching Bus Lanes & Shared Plazas
  // =========================================================================

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.88 });
  const sideRoadMat = new THREE.MeshStandardMaterial({ color: 0x353c45, roughness: 0.9 });

  // Long stretching main RapidKL avenue (z = +80 to -260)
  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 360), roadMat);
  mainRoad.position.set(0, 0, -90);
  mainRoad.receiveShadow = true;
  world.add(mainRoad);

  // 3 Major Cross-Streets connecting neighborhoods across the metropolis
  const crossZList = [-18, -84, -150];
  crossZList.forEach(function (cz) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(260, 0.17, 14), roadMat);
    cr.position.set(0, -0.01, cz);
    cr.receiveShadow = true;
    world.add(cr);
  });

  // Parallel Neighborhood Avenues (x = -46 and x = +46) for real metropolitan scale
  [-46, 46].forEach(function (ax) {
    const ave = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 300), sideRoadMat);
    ave.position.set(ax, -0.02, -85);
    ave.receiveShadow = true;
    world.add(ave);
  });

  // Traffic lights at the first busy intersection (z = -18)
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

  // Lane dashes stretching along the whole route
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3e7eb, transparent: true, opacity: 0.78 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 72; z >= -240; z -= 7.5) {
      if (crossZList.some(function (cz) { return Math.abs(z - cz) < 8.5; })) continue;
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.10, z);
      world.add(dash);
    }
  });

  // Stretching Dedicated RapidKL Cobalt-Blue Bus Lanes (grow forward as you scroll!)
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0047ab,
    roughness: 0.65,
    transparent: true,
    opacity: 0
  });
  const busLaneL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 340), busLaneMat);
  busLaneL.rotation.x = -Math.PI / 2;
  busLaneL.position.set(-2.4, 0.11, -90);
  const busLaneR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 340), busLaneMat);
  busLaneR.rotation.x = -Math.PI / 2;
  busLaneR.position.set(2.4, 0.11, -90);
  world.add(busLaneL, busLaneR);

  // Protected RapidKL Crimson-Red Cycling Lanes
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc92a37,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const bikeLaneL = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 340), bikeLaneMat);
  bikeLaneL.rotation.x = -Math.PI / 2;
  bikeLaneL.position.set(-7.25, 0.115, -90);
  const bikeLaneR = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 340), bikeLaneMat);
  bikeLaneR.rotation.x = -Math.PI / 2;
  bikeLaneR.position.set(7.25, 0.115, -90);
  world.add(bikeLaneL, bikeLaneR);

  // Wide Warm Sandstone Kaki Lima Sidewalks & Shared Plazas (split cleanly at cross-streets)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd6cbb8, roughness: 0.82 });
  const plazaTileMat = new THREE.MeshStandardMaterial({ color: 0xe3d6be, roughness: 0.78 });
  const blockSpans = [
    [35, 92],   // z = +81 .. -11
    [-51, 52],  // z = -25 .. -77
    [-117, 52], // z = -91 .. -143
    [-198, 82]  // z = -157 .. -239
  ];
  blockSpans.forEach(function (sp) {
    [-12.6, 12.6].forEach(function (sx) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.34, sp[1]), sidewalkMat);
      sw.position.set(sx, 0.12, sp[0]);
      sw.receiveShadow = true;
      world.add(sw);
    });
  });

  // Shared Community Pocket Plazas beside the kaki lima (safe spaces for families & kids!)
  const sharedPlazas = [];
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8d5b34, roughness: 0.8 });
  const warmParkLightMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  [
    [22.5, -51],
    [-22.5, -117],
    [22.5, -182]
  ].forEach(function (pos) {
    const plaza = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.28, 22), plazaTileMat);
    pad.position.y = 0.1;
    pad.receiveShadow = true;
    plaza.add(pad);

    // Park benches & warm lanterns
    [-6, 0, 6].forEach(function (bz) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 2.8), benchMat);
      bench.position.set(pos[0] > 0 ? -3.2 : 3.2, 0.45, bz);
      plaza.add(bench);
    });
    [-7, 7].forEach(function (lz) {
      const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.8, 6), poleMat);
      pPole.position.set(0, 1.9, lz);
      plaza.add(pPole);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), warmParkLightMat);
      globe.position.set(0, 3.9, lz);
      plaza.add(globe);
    });

    plaza.position.set(pos[0], 0, pos[1]);
    plaza.scale.setScalar(0.001);
    world.add(plaza);
    sharedPlazas.push(plaza);
  });

  // Raised Safe Zebra Crossings at all 3 cross-streets
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf8f6f2,
    roughness: 0.58,
    transparent: true,
    opacity: 0
  });
  [-10, -26, -76, -92, -142, -158].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.0), zebraMat);
      stripe.position.set(x, 0.12, zPos);
      world.add(stripe);
    }
  });

  // =========================================================================
  // 4. Existing Concrete Highway Overpass (Bare Early -> Blooms Green!)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b828a, roughness: 0.92 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 330), concreteMat);
  deck.position.set(-16.0, 9.8, -85);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const pillarGeo = new THREE.BoxGeometry(2.2, 9.8, 2.2);
  const vineWrapMat = new THREE.MeshStandardMaterial({ color: 0x247346, roughness: 0.85 });
  const vineBrightMat = new THREE.MeshStandardMaterial({ color: 0x35915b, roughness: 0.82 });
  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b555e, roughness: 0.8 });

  const overpassGreenery = [];
  const pillarGreeneryGeo = new THREE.BoxGeometry(2.58, 7.8, 2.58);

  for (let z = 48; z >= -220; z -= 24) {
    if (crossZList.some(function (cz) { return Math.abs(z - cz) < 10; })) continue;
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(-16.0, 4.9, z);
    pillar.castShadow = true;
    highwayGroup.add(pillar);

    const wrap = new THREE.Group();
    const mossSleeve = new THREE.Mesh(pillarGreeneryGeo, vineWrapMat);
    mossSleeve.position.y = 4.2;
    wrap.add(mossSleeve);

    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.95 + (k % 2) * 0.25, 1),
        k % 2 === 0 ? vineBrightMat : vineWrapMat
      );
      const angle = (k * Math.PI) / 2 + 0.4;
      puff.position.set(Math.cos(angle) * 1.25, 2.0 + k * 1.85, Math.sin(angle) * 1.25);
      wrap.add(puff);
    }

    const baseShrub = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), vineBrightMat);
    baseShrub.scale.set(1.3, 0.55, 1.3);
    baseShrub.position.set(1.6, 0.55, 0);
    wrap.add(baseShrub);

    const underLight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.35), warmParkLightMat);
    underLight.position.set(0, 9.0, 0);
    wrap.add(underLight);

    wrap.position.set(-16.0, 0.15, z);
    wrap.scale.setScalar(0.001);
    highwayGroup.add(wrap);
    overpassGreenery.push(wrap);
  }

  [-9.05, -22.95].forEach(function (edgeX) {
    const edgeGroup = new THREE.Group();
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 320), planterBoxMat);
    planter.position.set(0, 10.55, -85);
    edgeGroup.add(planter);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 320), vineWrapMat);
    hedge.position.set(0, 11.15, -85);
    edgeGroup.add(hedge);

    for (let z = 65; z >= -230; z -= 12) {
      const drape = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 1.45 + ((Math.abs(z) % 3) * 0.4), 3.6),
        z % 24 === 0 ? vineBrightMat : vineWrapMat
      );
      drape.position.set(edgeX > -16.0 ? 0.32 : -0.32, 9.95, z);
      edgeGroup.add(drape);
    }

    edgeGroup.position.set(edgeX, 0, 0);
    edgeGroup.scale.set(1, 0.001, 1);
    highwayGroup.add(edgeGroup);
    overpassGreenery.push(edgeGroup);
  });

  world.add(highwayGroup);

  // =========================================================================
  // 5. Traffic Stream, Intersection Jam & RapidKL Red/Blue Buses
  // =========================================================================

  const cars = [];
  const carColors = [0x4c5866, 0x7a8591, 0x353e48, 0xa8b1ba, 0x6e4742, 0x2c4766, 0x99353c];
  const carBodyGeo = new THREE.BoxGeometry(1.78, 0.72, 3.7);
  const carCabinGeo = new THREE.BoxGeometry(1.48, 0.55, 1.9);
  const tailLightGeo = new THREE.BoxGeometry(1.54, 0.19, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xf02e38 });

  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let i = 0; i < 44; i++) {
    const laneIdx = i % 4;
    const dir = laneIdx < 2 ? -1 : 1;
    const car = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({
      color: carColors[i % carColors.length],
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

    let zStart = 44 - i * 5.2;
    if (laneIdx === 1 && zStart < -2 && zStart > -17) zStart -= 16;
    car.position.set(carLanes[laneIdx], 0.08, zStart);
    car.userData = {
      dir: dir,
      speed: 1.6 + (i % 4) * 0.35,
      keepInTransit: i < 6 && (laneIdx === 0 || laneIdx === 3)
    };
    world.add(car);
    cars.push(car);
  }

  // Cross-street jam cars at intersection z = -18
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

  // RapidKL Red & Blue Bus Factory
  const busWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.32, metalness: 0.14 });
  const rapidBlueMat = new THREE.MeshStandardMaterial({ color: 0x0047ab, roughness: 0.36, metalness: 0.18 });
  const rapidRedMat = new THREE.MeshStandardMaterial({ color: 0xd92332, roughness: 0.38, metalness: 0.15 });
  const busGlassMat = new THREE.MeshStandardMaterial({ color: 0x162433, roughness: 0.18, metalness: 0.58 });
  const busLedMat = new THREE.MeshBasicMaterial({ color: 0xffcc4d });

  function makeRapidKLBus() {
    const bus = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.48, 10.6), busWhiteMat);
    hull.position.y = 1.5;
    hull.castShadow = true;
    bus.add(hull);

    const blueBand = new THREE.Mesh(new THREE.BoxGeometry(2.51, 0.56, 10.64), rapidBlueMat);
    blueBand.position.y = 0.72;
    bus.add(blueBand);

    const redStripe = new THREE.Mesh(new THREE.BoxGeometry(2.53, 0.24, 10.66), rapidRedMat);
    redStripe.position.y = 1.12;
    bus.add(redStripe);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.49, 0.88, 9.6), busGlassMat);
    glass.position.y = 1.92;
    bus.add(glass);

    const ledF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.24, 0.12), busLedMat);
    ledF.position.set(0, 2.46, -5.32);
    const ledR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.12), busLedMat);
    ledR.position.set(0, 2.46, 5.32);
    bus.add(ledF, ledR);
    return bus;
  }

  const rapidBus750 = makeRapidKLBus();
  rapidBus750.position.set(-2.4, 0.08, -8);
  world.add(rapidBus750);

  const extraBuses = [];
  for (let b = 0; b < 6; b++) {
    const dir = b % 2 === 0 ? -1 : 1;
    const eb = makeRapidKLBus();
    eb.position.set(dir < 0 ? -2.4 : 2.4, 0.08, -210 + b * 46);
    eb.scale.setScalar(0.001);
    eb.userData = { dir: dir, speed: 12.5 + (b % 2) * 1.8 };
    world.add(eb);
    extraBuses.push(eb);
  }

  // =========================================================================
  // 6. Prominent RapidKL Bus Stops, Shade Trees & Subtle Strolling Walkers
  // =========================================================================

  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2c7a4e, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3b9460, roughness: 0.85 });

  for (let z = 48; z >= -220; z -= 15) {
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

  // Prominent, Unmistakable RapidKL Bus Stops (with Glowing Route Totem + Glass Back + Warm Canopy Light!)
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
    [10.2, -190]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const isLeft = pos[0] < 0;

    // Bold RapidKL Blue cantilevered canopy + Red stripe + warm under-light
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

    // Glass wind-screen back panel + structural posts
    const backX = isLeft ? -1.25 : 1.25;
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 6.8), shelterGlassMat);
    backGlass.position.set(backX, 1.65, 0);
    sh.add(backGlass);

    [-3.5, 0, 3.5].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.35, 0.18), poleMat);
      post.position.set(backX, 1.68, pz);
      sh.add(post);
    });

    // Warm wooden waiting bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 5.2), benchMat);
    bench.position.set(isLeft ? -0.65 : 0.65, 0.42, 0);
    sh.add(bench);

    // Tall illuminated RapidKL Bus Stop Totem Sign standing at the curb edge
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

  // Subtle Strolling Architectural Scale Figures on Wide Kaki Lima & Shared Plazas
  const walkers = [];
  const walkerPalette = [0x0047ab, 0xd92332, 0x0e7c59, 0xd48a29, 0x3b4d61, 0x8f4c3d];
  const walkerHeadMat = new THREE.MeshStandardMaterial({ color: 0xe6d5c3, roughness: 0.7 });
  for (let w = 0; w < 22; w++) {
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
    const wz = -30 - w * 8.5;
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
  // 7. Malaysian Elevated LRT/MRT Viaduct, Station & RapidKL 4-Car Electric Train
  // =========================================================================

  const railGroup = new THREE.Group();
  const railViaductMat = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.72 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x566068, roughness: 0.35, metalness: 0.75 });

  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 340), railViaductMat);
  viaductBeam.position.set(17.8, 8.4, -90);
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.28, 340), rapidBlueMat);
  viaductTrim.position.set(17.8, 8.95, -90);
  railGroup.add(viaductTrim);

  [-1.1, 1.1].forEach(function (rx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 340), railSteelMat);
    rail.position.set(17.8 + rx, 9.12, -90);
    railGroup.add(rail);
  });

  const railPierGeo = new THREE.BoxGeometry(1.5, 8.4, 1.8);
  for (let z = 48; z >= -230; z -= 26) {
    if (crossZList.some(function (cz) { return Math.abs(z - cz) < 10; })) continue;
    const pier = new THREE.Mesh(railPierGeo, railViaductMat);
    pier.position.set(17.8, 4.2, z);
    railGroup.add(pier);
  }

  // Two Elevated LRT/MRT Station Canopies along the stretching corridor
  [-52, -176].forEach(function (sz) {
    const stationRoof = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.3, 28), rapidBlueMat);
    stationRoof.position.set(17.8, 13.8, sz);
    railGroup.add(stationRoof);
    const stationAccent = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.14, 28.1), rapidRedMat);
    stationAccent.position.set(17.8, 13.6, sz);
    railGroup.add(stationAccent);
    const stationDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 28), railViaductMat);
    stationDeck.position.set(17.8, 8.8, sz);
    railGroup.add(stationDeck);
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
  train.position.set(17.8, 9.2, -100);
  railGroup.add(train);

  railGroup.position.y = -18;
  railGroup.visible = false;
  world.add(railGroup);

  // =========================================================================
  // 8. Colorful Malaysian Metropolitan City: Shophouses, Homes & Towers!
  // =========================================================================

  const skyline = new THREE.Group();
  const roofGardens = [];
  const colorfulTowerMats = [];

  // Authentic Malaysian Shophouse & Kopitiam Heritage Palette (Warm, Vibrant, Lived-In!)
  const shopWallColors = [0xefe2c9, 0xe4c68d, 0xc3d6c4, 0xd89378, 0xb6cde0, 0xf2e8d8];
  const awningColors = [0xd92332, 0x0047ab, 0x0e7c59, 0xd48a29];
  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0xb3523a, roughness: 0.82 });
  const warmShopGlassMat = new THREE.MeshBasicMaterial({ color: 0xffe6b3 });

  // 8A. Street-Level Malaysian Shophouse Rows (2-3 storey with colorful awnings!)
  for (let i = 0; i < 32; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bz = 54 - i * 8.6;
    if (crossZList.some(function (cz) { return Math.abs(bz - cz) < 11; })) continue;
    // Leave clean space for the 3 shared community pocket plazas
    if (side > 0 && Math.abs(bz - -51) < 13) continue;
    if (side < 0 && Math.abs(bz - -117) < 13) continue;
    if (side > 0 && Math.abs(bz - -182) < 13) continue;

    const shop = new THREE.Group();
    const w = 7.4;
    const h = 5.4 + (i % 2) * 2.2;
    const dLen = 7.2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: shopWallColors[i % shopWallColors.length],
      roughness: 0.78
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    shop.add(body);

    // Warm pitched terracotta Malaysian shophouse roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.65, dLen + 0.5), roofTileMat);
    roof.position.y = h + 0.3;
    shop.add(roof);

    // Colorful canvas shop awning facing the kaki lima
    const awningMat = new THREE.MeshStandardMaterial({
      color: awningColors[i % awningColors.length],
      roughness: 0.7
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, dLen - 0.8), awningMat);
    awning.position.set(side < 0 ? w / 2 + 0.75 : -w / 2 - 0.75, 2.75, 0);
    awning.rotation.z = side < 0 ? -0.25 : 0.25;
    shop.add(awning);

    // Warm glowing kopitiam / shopfront window band
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, dLen - 1.8), warmShopGlassMat);
    win.position.set(side < 0 ? w / 2 + 0.04 : -w / 2 - 0.04, 1.45, 0);
    shop.add(win);

    shop.position.set(side * 21.5, 0, bz);
    skyline.add(shop);
  }

  // 8B. Colorful Multi-Tiered Malaysian Commercial Towers & Residential Homes
  const towerColorPalette = [
    0xdccfb8, // Warm Sandstone
    0xb7d1e3, // Sky Glass Blue
    0xe6c8a8, // Champagne Peach
    0xb9d4c7, // Tropical Mint Glass
    0xd8b4a0, // Terracotta Cream
    0xc4d4e6  // Crisp Cobalt Tint
  ];
  const podiumColorPalette = [0xc9b99f, 0x9eb2c4, 0xd4b698, 0xa8bfb3];
  const bldgTrimMat = new THREE.MeshStandardMaterial({ color: 0xefeae0, roughness: 0.55 });

  // Outer metropolitan grid rings (x = ±36, ±60, ±86) — sprawling city!
  const ringConfigs = [
    { xOff: 35, count: 28, stepZ: 9.5, minH: 13, maxH: 28 },
    { xOff: 62, count: 24, stepZ: 11.5, minH: 9, maxH: 22 },
    { xOff: 88, count: 18, stepZ: 15.0, minH: 6, maxH: 14 } // Suburban homes & mid-rise condos
  ];

  ringConfigs.forEach(function (ring, rIdx) {
    for (let i = 0; i < ring.count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bz = 58 - i * ring.stepZ;
      if (crossZList.some(function (cz) { return Math.abs(bz - cz) < 9.5; })) continue;

      const h = ring.minH + ((i * 7 + rIdx * 5) % (ring.maxH - ring.minH + 1));
      const w = 7.8 + (i % 3) * 2.4;
      const dLen = 7.8 + (i % 4) * 2.0;
      const bx = side * (ring.xOff + (i % 3) * 4.2);

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
        // Warm terracotta pitched roof for residential homes / condos
        const homeRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 2.4, 4), roofTileMat);
        homeRoof.rotation.y = Math.PI / 4;
        homeRoof.position.y = podiumH + shaftH + 1.2;
        tower.add(homeRoof);
      } else {
        // Setback upper tier + cornice + rooftop garden terrace
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
  // 9. Map-Accurate 3D Kuala Lumpur Landmarks (Real GPS Bearings from SW!)
  //    KLCC: 3.1579N, 101.7116E  | Menara KL: 3.1528N, 101.7038E
  //    Merdeka 118: 3.1413N, 101.7007E | Exchange 106 (TRX): 3.1422N, 101.7186E
  // =========================================================================

  const landmarkBodyMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4de,
    roughness: 0.5,
    metalness: 0.26,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const landmarkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7ba8cc,
    roughness: 0.22,
    metalness: 0.58,
    emissive: new THREE.Color(0x163454),
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });

  const klGroup = new THREE.Group();
  skyline.add(klGroup);
  world.add(skyline);

  const LANDMARK_SCALE = 84 / 444.138;
  function loadPortfolioModel(url, x, y, z, rotY) {
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (d) {
        const pos = b64(d.positions, Float32Array);
        const grp = new THREE.Group();
        [
          ['body', landmarkBodyMat],
          ['glass', landmarkGlassMat]
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

  // Exact GPS-proportioned Kuala Lumpur skyline looking Northeast from Shah Alam / Mid Valley:
  loadPortfolioModel('./assets/city/klcc.json', 18, 0, -295, 0.12);         // Petronas Twin Towers (N-NE)
  loadPortfolioModel('./assets/city/menara_kl.json', -38, 10, -258, 0.30);  // Menara KL on Bukit Nanas (SW of KLCC)
  loadPortfolioModel('./assets/city/merdeka118.json', -62, 0, -192, -0.32); // Merdeka 118 (W-SW, closer to Mid Valley)
  loadPortfolioModel('./assets/city/exchange106.json', 72, 0, -198, 0.22);  // The Exchange 106 TRX (E-SE of KLCC)

  // =========================================================================
  // 10. Stretching Catmull-Rom Scroll Route + Unobstructed Bottom Showcase
  // =========================================================================

  const camPosCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.0, 5.2, 54),     // 0.00 Moving forward with morning congestion
    new THREE.Vector3(3.4, 5.4, 14),     // 0.16 Congested intersection + RapidKL 750 stuck!
    new THREE.Vector3(-4.2, 6.8, -14),   // 0.32 Keep & Green existing concrete highway
    new THREE.Vector3(4.5, 6.2, -52),    // 0.48 Stretching RapidKL bus lane + prominent bus stop + plaza
    new THREE.Vector3(-3.8, 6.0, -96),   // 0.64 LRT train gliding overhead + free-flowing buses & walkers
    new THREE.Vector3(3.2, 7.2, -138),   // 0.78 Deep into the thriving colorful metropolitan corridor
    new THREE.Vector3(24, 28, -58),      // 0.90 Rising smoothly above the sprawling city
    new THREE.Vector3(0, 36, 18)         // 1.00 Full-bleed panoramic Kuala Lumpur metropolitan showcase!
  ]);

  const camLookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 2.2, -16),   // 0.00
    new THREE.Vector3(-2.4, 2.0, -22),   // 0.16
    new THREE.Vector3(-14.0, 6.2, -38),  // 0.32
    new THREE.Vector3(2.0, 5.5, -130),   // 0.48
    new THREE.Vector3(1.0, 7.0, -180),   // 0.64
    new THREE.Vector3(0.0, 10.0, -230),  // 0.78
    new THREE.Vector3(4.0, 16.0, -245),  // 0.90
    new THREE.Vector3(4.0, 18.0, -255)   // 1.00
  ]);

  let scrollProgress = 0;
  let smoothScroll = 0;
  let lightingMode = 'day';
  let isDark = false;

  window.ManifestoScene = {
    setScrollProgress: function (p) {
      scrollProgress = clamp(p, 0, 1);
    },
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
  // 11. Silky-Smooth Animation Loop (100% Scroll-Driven Immersion)
  // =========================================================================

  let morphFactor = 0;
  let greenFactor = 0;
  let lastTime = performance.now();
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    const elapsed = now * 0.001;
    lastTime = now;

    const damp = reducedMotion ? 1 : 1 - Math.exp(-5.0 * dt);
    smoothScroll = lerp(smoothScroll, scrollProgress, damp);
    const s = clamp(smoothScroll, 0, 1);
    const speedMult = reducedMotion ? 0 : 1;

    // Pure scroll-driven transformation (no early spoiler buttons!)
    morphFactor = lerp(morphFactor, smoothstep(0.34, 0.74, s), damp);
    greenFactor = lerp(greenFactor, smoothstep(0.28, 0.48, s), damp);

    // 1. Existing concrete highway stays standing — greenery blooms naturally as you scroll
    for (let g = 0; g < overpassGreenery.length; g++) {
      const item = overpassGreenery[g];
      const gs = Math.max(0.001, greenFactor);
      item.visible = greenFactor > 0.02;
      if (g < overpassGreenery.length - 2) item.scale.set(gs, gs, gs);
      else item.scale.set(1, gs, 1);
    }

    // 2. Colorful towers switch cleanly to glowing night facades in dark mode + rooftop gardens bloom
    const bldgPretty = smoothstep(0.30, 0.65, s);
    for (let m = 0; m < colorfulTowerMats.length; m++) {
      const entry = colorfulTowerMats[m];
      entry.mat.map = isDark ? facadeNightTex : facadeDayTex;
      entry.mat.emissive.setHex(isDark ? 0x263a52 : 0x000000);
      entry.mat.emissiveIntensity = isDark ? 0.55 : 0;
      entry.mat.color.lerp(new THREE.Color(isDark ? 0x627a99 : entry.dayHex), 0.05);
    }
    for (let r = 0; r < roofGardens.length; r++) {
      roofGardens[r].scale.set(1, Math.max(0.001, bldgPretty), 1);
      roofGardens[r].visible = bldgPretty > 0.04;
    }

    // 3. Dedicated RapidKL Bus Lanes, Bike Lanes, Zebra Crossings & Intersection Signals
    busLaneMat.opacity = smoothstep(0.20, 0.62, morphFactor) * 0.92;
    bikeLaneMat.opacity = smoothstep(0.38, 0.82, morphFactor) * 0.90;
    zebraMat.opacity = smoothstep(0.30, 0.75, morphFactor);
    dashMat.opacity = lerp(0.78, 0.20, morphFactor);

    const sigMat = morphFactor > 0.45 ? greenSignalMat : redSignalMat;
    for (let k = 0; k < signalHeads.length; k++) {
      signalHeads[k].material = sigMat;
    }

    // 4. Shade Trees, Prominent RapidKL Bus Stops, Shared Plazas & Strolling Walkers
    const treeGrowth = smoothstep(0.18, 0.76, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const sc = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(sc);
    }

    const shelterGrowth = smoothstep(0.24, 0.66, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    const plazaGrowth = smoothstep(0.30, 0.72, morphFactor);
    for (let p = 0; p < sharedPlazas.length; p++) {
      sharedPlazas[p].scale.setScalar(Math.max(0.001, plazaGrowth));
    }

    const walkerScale = smoothstep(0.36, 0.78, morphFactor);
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

    // 5. Elevated LRT/MRT Viaduct & RapidKL 4-Car Electric Train
    const railLift = smoothstep(0.24, 0.70, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z += 24 * dt * speedMult;
      if (train.position.z > 110) train.position.z = -230;
    }

    // 6. Traffic Stream Cars & Cross-Street Intersection Jam
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const carVis = car.userData.keepInTransit ? 1 : clamp(1 - morphFactor * 1.42, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;
      if (car.visible) {
        const spd = lerp(car.userData.speed * 0.45, car.userData.speed * 2.5, morphFactor);
        car.position.z += car.userData.dir * spd * dt * speedMult;
        if (car.position.z < -225) car.position.z = 62;
        if (car.position.z > 62) car.position.z = -225;
      }
    }

    const crossVis = clamp(1 - morphFactor * 1.35, 0.001, 1);
    for (let c = 0; c < crossCars.length; c++) {
      crossCars[c].scale.setScalar(crossVis);
      crossCars[c].visible = crossVis > 0.03;
    }

    // 7. Hero RapidKL 750 Bus: Stuck in Jam Early -> Glides Freely Down Bus Lane!
    if (morphFactor < 0.25) {
      rapidBus750.position.z = lerp(rapidBus750.position.z, -7.5 + Math.sin(elapsed * 0.8) * 0.6, 0.06);
    } else {
      rapidBus750.position.z -= lerp(2.5, 15.0, morphFactor) * dt * speedMult;
      if (rapidBus750.position.z < -230) rapidBus750.position.z = 60;
    }

    const extraBusScale = smoothstep(0.24, 0.65, morphFactor);
    for (let b = 0; b < extraBuses.length; b++) {
      extraBuses[b].scale.setScalar(Math.max(0.001, extraBusScale));
      extraBuses[b].visible = extraBusScale > 0.04;
      if (extraBuses[b].visible) {
        extraBuses[b].position.z += extraBuses[b].userData.dir * extraBuses[b].userData.speed * dt * speedMult;
        if (extraBuses[b].position.z > 68) extraBuses[b].position.z = -230;
        if (extraBuses[b].position.z < -230) extraBuses[b].position.z = 68;
      }
    }

    // 8. Silky Camera Flight + Gentle Panoramic Orbit at Bottom Full-Bleed Showcase
    camPosCurve.getPointAt(s, tmpPos);
    camLookCurve.getPointAt(s, tmpLook);

    if (s > 0.88 && !reducedMotion) {
      const orbitBlend = smoothstep(0.88, 1.0, s);
      tmpPos.x += Math.sin(elapsed * 0.20) * 22 * orbitBlend;
      tmpPos.y += Math.cos(elapsed * 0.16) * 2.0 * orbitBlend;
    }

    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);

    // 9. Sky Dome, Twinkling Stars & Lighting Palette
    const pal = isDark ? PALETTES.dark : (lightingMode === 'golden' ? PALETTES.golden : PALETTES.day);
    skyUniforms.uTop.value.lerp(pal.skyTop, 0.06);
    skyUniforms.uMid.value.lerp(pal.skyMid, 0.06);
    skyUniforms.uHorizon.value.lerp(pal.skyHorizon, 0.06);
    scene.background.lerp(pal.fog, 0.06);
    scene.fog.color.lerp(pal.fog, 0.06);
    sunLight.color.lerp(pal.sun, 0.06);
    sunLight.intensity = lerp(sunLight.intensity, pal.sunInt, 0.06);
    hemiLight.color.lerp(pal.hemiSky, 0.06);
    hemiLight.groundColor.lerp(pal.hemiGround, 0.06);
    hemiLight.intensity = lerp(hemiLight.intensity, pal.hemiInt, 0.06);

    starMat.opacity = lerp(starMat.opacity, isDark ? 0.88 : 0.0, 0.06);
    stars.rotation.y = elapsed * 0.004;

    groundMat.color.lerp(new THREE.Color(isDark ? 0x223042 : 0xd8d2c3), 0.06);
    landmarkBodyMat.color.lerp(new THREE.Color(isDark ? 0x354b63 : 0xc8d4de), 0.06);
    landmarkGlassMat.color.lerp(new THREE.Color(isDark ? 0x4b7ea8 : 0x7ba8cc), 0.06);
    landmarkGlassMat.emissiveIntensity = lerp(
      landmarkGlassMat.emissiveIntensity,
      isDark ? 0.58 : (lightingMode === 'golden' ? 0.28 : 0.16),
      0.06
    );

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
