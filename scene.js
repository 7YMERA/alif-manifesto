/* ==========================================================================
   ALIF MANIFESTO — Architectural 3D Malaysian City Showcase (RapidKL Theme)
   Pulls real 3D KL landmarks, terrain, facade textures, sky & stars from
   7ymera.github.io. Silky frame-rate-independent scroll damping, zero mouse drift.
   ========================================================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('scene-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    window.ManifestoScene = {
      setScrollProgress: function () {},
      setPreviewMode: function () {},
      setGreenOverpass: function () {},
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
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  // Palettes (Zero magenta/pink — crisp sky blue daylight, Malaysian golden hour, deep starry navy)
  const PALETTES = {
    day: {
      skyTop: new THREE.Color(0x6b9fd4),
      skyMid: new THREE.Color(0xcde0f2),
      skyHorizon: new THREE.Color(0xebe6dc),
      fog: new THREE.Color(0xe6e3da),
      sun: new THREE.Color(0xfff7e8),
      sunInt: 1.38,
      hemiSky: new THREE.Color(0xe8f2fc),
      hemiGround: new THREE.Color(0xc5bfb0),
      hemiInt: 0.86
    },
    golden: {
      skyTop: new THREE.Color(0x3a6494),
      skyMid: new THREE.Color(0xdba670),
      skyHorizon: new THREE.Color(0xf4cfa0),
      fog: new THREE.Color(0xe5c49c),
      sun: new THREE.Color(0xffb259),
      sunInt: 1.58,
      hemiSky: new THREE.Color(0xffdeb0),
      hemiGround: new THREE.Color(0x886c52),
      hemiInt: 0.76
    },
    dark: {
      skyTop: new THREE.Color(0x040914),
      skyMid: new THREE.Color(0x0b1629),
      skyHorizon: new THREE.Color(0x16263d),
      fog: new THREE.Color(0x0d1726),
      sun: new THREE.Color(0x8fb8de),
      sunInt: 0.85,
      hemiSky: new THREE.Color(0x233b59),
      hemiGround: new THREE.Color(0x0a111c),
      hemiInt: 0.68
    }
  };

  scene.background = PALETTES.day.fog.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0036);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 1600);
  camera.position.set(1.2, 5.2, 54);

  const hemiLight = new THREE.HemisphereLight(0xe8f2fc, 0xc5bfb0, 0.86);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff7e8, 1.38);
  sunLight.position.set(60, 86, 44);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 280;
  const d = 80;
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
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 20), skyMat);
  scene.add(skyDome);

  // 3D Starfield (inspired by 7ymera.github.io)
  const starCount = window.innerWidth <= 820 ? 450 : 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const elev = Math.acos(1 - Math.random() * 0.88);
    const r = 980;
    starPositions[i * 3] = Math.sin(elev) * Math.cos(a) * r;
    starPositions[i * 3 + 1] = Math.cos(elev) * r * 0.78 + 55;
    starPositions[i * 3 + 2] = Math.sin(elev) * Math.sin(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe6f0ff,
    size: 2.6,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // =========================================================================
  // 2. Sculpted Klang Valley Basin & Titiwangsa Rim (Portfolio Terrain Textures)
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

  // Sculpted basin: flat urban floor in center, rising into Titiwangsa mountain rim
  const terrGeo = new THREE.PlaneGeometry(1400, 1400, 84, 84);
  terrGeo.rotateX(-Math.PI / 2);
  const tPos = terrGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const dist = Math.hypot(vx, vz + 90);
    let y = -0.14;
    if (dist > 280) {
      const k = smoothstep(280, 620, dist);
      const ang = Math.atan2(vz + 90, vx);
      const ridge =
        Math.sin(ang * 3 + 0.6) * 22 +
        Math.cos(ang * 5 - 1.1) * 14 +
        Math.sin(vx * 0.012 + vz * 0.01) * 16;
      y += (42 + ridge) * k;
    }
    tPos.setY(i, y);
  }
  terrGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: terrColorTex,
    aoMap: terrAOTex,
    color: 0xdad4c6,
    roughness: 0.94,
    metalness: 0.02
  });
  const terrain = new THREE.Mesh(terrGeo, groundMat);
  terrain.receiveShadow = true;
  world.add(terrain);

  // =========================================================================
  // 3. Main Corridor Road, Cross-Street Intersection, Bus Lanes & Kaki Lima
  // =========================================================================

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.88 });
  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 300), roadMat);
  mainRoad.position.set(0, 0, -55);
  mainRoad.receiveShadow = true;
  world.add(mainRoad);

  // Busy Cross-Street Intersection at z = -18 (where cars & Bus 750 are jammed!)
  const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(120, 0.17, 15), roadMat);
  crossRoad.position.set(0, -0.01, -18);
  crossRoad.receiveShadow = true;
  world.add(crossRoad);

  // Traffic lights at the intersection corners
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222c36, roughness: 0.5 });
  const redSignalMat = new THREE.MeshBasicMaterial({ color: 0xf0323e });
  const greenSignalMat = new THREE.MeshBasicMaterial({ color: 0x1ecb7c });
  const signalHeads = [];
  [
    [-10.2, -10.2],
    [10.2, -10.2],
    [-10.2, -25.8],
    [10.2, -25.8]
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

  // Lane dashes
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3e7eb, transparent: true, opacity: 0.78 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 70; z >= -165; z -= 7.5) {
      if (Math.abs(z - -18) < 9) continue; // Keep intersection box clean
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.10, z);
      world.add(dash);
    }
  });

  // Dedicated RapidKL Cobalt-Blue Bus Lanes (Appear when vision activates!)
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0047ab,
    roughness: 0.65,
    transparent: true,
    opacity: 0
  });
  const busLaneL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 270), busLaneMat);
  busLaneL.rotation.x = -Math.PI / 2;
  busLaneL.position.set(-2.4, 0.11, -55);
  const busLaneR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 270), busLaneMat);
  busLaneR.rotation.x = -Math.PI / 2;
  busLaneR.position.set(2.4, 0.11, -55);
  world.add(busLaneL, busLaneR);

  // Protected RapidKL Crimson-Red Cycling Lanes
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc92a37,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const bikeLaneL = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 270), bikeLaneMat);
  bikeLaneL.rotation.x = -Math.PI / 2;
  bikeLaneL.position.set(-7.25, 0.115, -55);
  const bikeLaneR = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 270), bikeLaneMat);
  bikeLaneR.rotation.x = -Math.PI / 2;
  bikeLaneR.position.set(7.25, 0.115, -55);
  world.add(bikeLaneL, bikeLaneR);

  // Kaki Lima Sidewalks (split cleanly around the cross-street intersection)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc4bcb0, roughness: 0.84 });
  const sidewalks = [];
  [
    [-12.3, 35, 92],
    [12.3, 35, 92],
    [-12.3, -98, 146],
    [12.3, -98, 146]
  ].forEach(function (cfg) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, cfg[2]), sidewalkMat);
    sw.position.set(cfg[0], 0.12, cfg[1]);
    sw.receiveShadow = true;
    world.add(sw);
    sidewalks.push(sw);
  });

  // Raised Safe Zebra Crossings around the intersection & corridor
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf8f6f2,
    roughness: 0.58,
    transparent: true,
    opacity: 0
  });
  [-9.5, -26.5, -64, -104].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.0), zebraMat);
      stripe.position.set(x, 0.12, zPos);
      world.add(stripe);
    }
  });

  // =========================================================================
  // 4. Existing Concrete Highway Overpass (Bare Early -> Blooms Green Later!)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b828a, roughness: 0.92 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 250), concreteMat);
  deck.position.set(-15.5, 9.8, -50);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const pillarGeo = new THREE.BoxGeometry(2.2, 9.8, 2.2);
  const vineWrapMat = new THREE.MeshStandardMaterial({ color: 0x247346, roughness: 0.85 });
  const vineBrightMat = new THREE.MeshStandardMaterial({ color: 0x35915b, roughness: 0.82 });
  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b555e, roughness: 0.8 });
  const underLampMat = new THREE.MeshBasicMaterial({ color: 0xffe4ad });

  const overpassGreenery = [];
  const pillarGreeneryGeo = new THREE.BoxGeometry(2.58, 7.8, 2.58);

  for (let z = 44; z >= -135; z -= 24) {
    if (Math.abs(z - -18) < 10) continue; // Clear cross-street
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(-15.5, 4.9, z);
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

    const underLight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.35), underLampMat);
    underLight.position.set(0, 9.0, 0);
    wrap.add(underLight);

    wrap.position.set(-15.5, 0.15, z);
    wrap.scale.setScalar(0.001);
    highwayGroup.add(wrap);
    overpassGreenery.push(wrap);
  }

  [-8.55, -22.45].forEach(function (edgeX) {
    const edgeGroup = new THREE.Group();
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 240), planterBoxMat);
    planter.position.set(0, 10.55, -50);
    edgeGroup.add(planter);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 240), vineWrapMat);
    hedge.position.set(0, 11.15, -50);
    edgeGroup.add(hedge);

    for (let z = 60; z >= -145; z -= 10) {
      const drape = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 1.45 + ((Math.abs(z) % 3) * 0.4), 3.6),
        z % 20 === 0 ? vineBrightMat : vineWrapMat
      );
      drape.position.set(edgeX > -15.5 ? 0.32 : -0.32, 9.95, z);
      edgeGroup.add(drape);
    }

    edgeGroup.position.set(edgeX, 0, 0);
    edgeGroup.scale.set(1, 0.001, 1);
    highwayGroup.add(edgeGroup);
    overpassGreenery.push(edgeGroup);
  });

  world.add(highwayGroup);

  // =========================================================================
  // 5. Traffic Stream (Moving With Us) + RapidKL 750 Bus Stuck in Jam -> Free!
  // =========================================================================

  const cars = [];
  const carColors = [0x4c5866, 0x7a8591, 0x353e48, 0x9aa4ae, 0x5c4742, 0x2c4766, 0x8f333a];
  const carBodyGeo = new THREE.BoxGeometry(1.78, 0.72, 3.7);
  const carCabinGeo = new THREE.BoxGeometry(1.48, 0.55, 1.9);
  const tailLightGeo = new THREE.BoxGeometry(1.54, 0.19, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xf02e38 });

  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let i = 0; i < 40; i++) {
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

    let zStart = 42 - i * 4.7;
    // Leave clean slot for the Stuck RapidKL 750 Bus right before the intersection!
    if (laneIdx === 1 && zStart < -2 && zStart > -17) zStart -= 16;
    car.position.set(carLanes[laneIdx], 0.08, zStart);
    car.userData = {
      dir: dir,
      laneIdx: laneIdx,
      speed: 1.5 + (i % 4) * 0.35,
      keepInTransit: i < 5 && (laneIdx === 0 || laneIdx === 3)
    };
    world.add(car);
    cars.push(car);
  }

  // Cross-street jam cars at the intersection (z = -18)
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

    // Iconic RapidKL Blue lower band + Red accent stripe
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

  // Hero RapidKL 750 Bus — ALWAYS visible! Stuck in the jam early, then glides freely!
  const rapidBus750 = makeRapidKLBus();
  rapidBus750.position.set(-2.4, 0.08, -8);
  world.add(rapidBus750);

  // Additional RapidKL buses that enter once dedicated bus lanes open
  const extraBuses = [];
  for (let b = 0; b < 4; b++) {
    const dir = b % 2 === 0 ? -1 : 1;
    const eb = makeRapidKLBus();
    eb.position.set(dir < 0 ? -2.4 : 2.4, 0.08, -115 + b * 48);
    eb.scale.setScalar(0.001);
    eb.userData = { dir: dir, speed: 12.5 + (b % 2) * 1.8 };
    world.add(eb);
    extraBuses.push(eb);
  }

  // =========================================================================
  // 6. Shaded Tropical Trees & RapidKL Blue/Red Bus Shelters
  // =========================================================================

  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2c7a4e, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a915d, roughness: 0.85 });

  for (let z = 44; z >= -130; z -= 14) {
    if (Math.abs(z - -18) < 10) continue;
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
        new THREE.DodecahedronGeometry(2.05 + (idx % 2) * 0.3, 1),
        idx % 2 === 0 ? canopyMat1 : canopyMat2
      );
      crown.position.y = 3.85;
      crown.scale.set(1.18, 0.78, 1.18);
      crown.castShadow = true;
      tree.add(crown);

      tree.position.set(pos[0], 0.25, pos[1]);
      tree.scale.setScalar(0.001);
      tree.userData = { delay: (Math.abs(z) % 5) * 0.04 };
      world.add(tree);
      trees.push(tree);
    });
  }

  const shelters = [];
  [
    [-10.0, 2],
    [10.0, -36],
    [-10.0, -76],
    [10.0, -110]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 6.8), rapidBlueMat);
    roof.position.y = 2.95;
    roof.castShadow = true;
    sh.add(roof);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.1, 6.84), rapidRedMat);
    trim.position.y = 2.82;
    sh.add(trim);

    [-2.8, 2.8].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.95, 0.16), poleMat);
      post.position.set(pos[0] < 0 ? -0.95 : 0.95, 1.48, pz);
      sh.add(post);
    });

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 4.4), trunkMat);
    bench.position.set(pos[0] < 0 ? -0.45 : 0.45, 0.35, 0);
    sh.add(bench);

    sh.position.set(pos[0], 0.26, pos[1]);
    sh.scale.setScalar(0.001);
    world.add(sh);
    shelters.push(sh);
  });

  // =========================================================================
  // 7. Malaysian Elevated Railway Viaduct, Station & RapidKL 4-Car MRT/LRT Train
  // =========================================================================

  const railGroup = new THREE.Group();
  const railViaductMat = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.72 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x566068, roughness: 0.35, metalness: 0.75 });

  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 280), railViaductMat);
  viaductBeam.position.set(17.5, 8.2, -55);
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.28, 280), rapidBlueMat);
  viaductTrim.position.set(17.5, 8.75, -55);
  railGroup.add(viaductTrim);

  [-1.1, 1.1].forEach(function (rx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 280), railSteelMat);
    rail.position.set(17.5 + rx, 8.92, -55);
    railGroup.add(rail);
  });

  const railPierGeo = new THREE.BoxGeometry(1.5, 8.2, 1.8);
  for (let z = 44; z >= -145; z -= 26) {
    if (Math.abs(z - -18) < 10) continue;
    const pier = new THREE.Mesh(railPierGeo, railViaductMat);
    pier.position.set(17.5, 4.1, z);
    railGroup.add(pier);
  }

  // Modern Station Canopy
  const stationRoof = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.3, 28), rapidBlueMat);
  stationRoof.position.set(17.5, 13.6, -42);
  railGroup.add(stationRoof);
  const stationAccent = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.14, 28.1), rapidRedMat);
  stationAccent.position.set(17.5, 13.4, -42);
  railGroup.add(stationAccent);
  const stationDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 28), railViaductMat);
  stationDeck.position.set(17.5, 8.6, -42);
  railGroup.add(stationDeck);

  // 4-Car RapidKL Electric MRT/LRT Train
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
  train.position.set(17.5, 9.0, -70);
  railGroup.add(train);

  railGroup.position.y = -18;
  railGroup.visible = false;
  world.add(railGroup);

  // =========================================================================
  // 8. Higher-Polygon Multi-Tiered Architectural Buildings (Facade Textures!)
  // =========================================================================

  const skyline = new THREE.Group();
  const bldgFacadeMat = new THREE.MeshStandardMaterial({
    map: facadeDayTex,
    color: 0xb2bcc6,
    roughness: 0.62,
    metalness: 0.22
  });
  const bldgPodiumMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.82 });
  const bldgTrimMat = new THREE.MeshStandardMaterial({ color: 0xd9dfe6, roughness: 0.55 });
  const roofGardens = [];

  for (let i = 0; i < 24; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bz = 42 - i * 8.2;
    if (Math.abs(bz - -18) < 11) continue; // Keep intersection corners open

    const h = 11 + ((i * 9) % 22);
    const w = 7.5 + (i % 3) * 2.2;
    const dLen = 7.5 + (i % 4) * 2.0;
    const bx = side * (26.5 + (i % 3) * 7.5);

    const tower = new THREE.Group();

    // 1. Ground-floor podium base
    const podiumH = 3.2;
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, podiumH, dLen + 1.4), bldgPodiumMat);
    podium.position.y = podiumH / 2;
    podium.receiveShadow = true;
    tower.add(podium);

    // 2. Main textured glass shaft
    const shaftH = h * 0.74;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, dLen), bldgFacadeMat);
    shaft.position.y = podiumH + shaftH / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(shaft);

    // 3. Cornice ledge & upper setback tier
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.35, dLen + 0.6), bldgTrimMat);
    ledge.position.y = podiumH + shaftH;
    tower.add(ledge);

    const upperH = h * 0.26;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, upperH, dLen * 0.72), bldgFacadeMat);
    upper.position.y = podiumH + shaftH + upperH / 2;
    tower.add(upper);

    // 4. Mechanical crown parapet
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 1.1, dLen * 0.45), bldgTrimMat);
    crown.position.y = podiumH + shaftH + upperH + 0.55;
    tower.add(crown);

    // 5. Podium & setback rooftop greenery terraces (bloom when city gets pretty!)
    const terraceGreen = new THREE.Group();
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.55, dLen + 0.9), vineBrightMat);
    g1.position.y = podiumH + 0.3;
    const g2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.65, dLen * 0.92), vineWrapMat);
    g2.position.y = podiumH + shaftH + 0.45;
    terraceGreen.add(g1, g2);
    terraceGreen.scale.set(1, 0.001, 1);
    tower.add(terraceGreen);
    roofGardens.push(terraceGreen);

    tower.position.set(bx, -0.1, bz);
    skyline.add(tower);
  }

  // =========================================================================
  // 9. Real 3D Kuala Lumpur Landmarks (Smooth & Natural — TRX Fixed!)
  // =========================================================================

  const landmarkBodyMat = new THREE.MeshStandardMaterial({
    color: 0xc2ced8,
    roughness: 0.52,
    metalness: 0.24,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const landmarkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7ba5c7,
    roughness: 0.22,
    metalness: 0.58,
    emissive: new THREE.Color(0x163454),
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });

  const klGroup = new THREE.Group();
  skyline.add(klGroup);
  world.add(skyline);

  const LANDMARK_SCALE = 82 / 444.138;
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
          const mesh = new THREE.Mesh(geo, pair[1]);
          grp.add(mesh);
        });
        grp.scale.setScalar(LANDMARK_SCALE);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        klGroup.add(grp);
      })
      .catch(function () {});
  }

  // Balanced, natural KL skyline framing (KLCC center, Menara KL left, Merdeka 118 right, TRX Exchange 106 clean mid-left)
  loadPortfolioModel('./assets/city/klcc.json', 0, 0, -195, 0.12);
  loadPortfolioModel('./assets/city/menara_kl.json', -66, 8, -168, 0.3);
  loadPortfolioModel('./assets/city/merdeka118.json', 64, 0, -218, -0.32);
  loadPortfolioModel('./assets/city/exchange106.json', -34, 0, -238, 0.2);

  // =========================================================================
  // 10. Silky Catmull-Rom Architectural Camera Path + Grand End-of-Scroll Showcase
  // =========================================================================

  const camPosCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.8, 5.0, 52),    // 0.00 Opening: Moving forward with congested traffic, jams ahead
    new THREE.Vector3(3.4, 5.4, 14),    // 0.18 Approaching congested intersection + RapidKL 750 stuck in jam!
    new THREE.Vector3(-4.2, 6.8, -6),   // 0.36 Existing highway stays & blooms green, buildings warm up
    new THREE.Vector3(4.5, 6.2, -32),   // 0.54 Transition into vision: RapidKL Blue bus lane opens, rail viaduct rises
    new THREE.Vector3(-3.8, 5.6, -64),  // 0.72 Envisioned Malaysia: free-flowing RapidKL 750, train & trees
    new THREE.Vector3(16, 22, -26),     // 0.88 Rising out of the corridor into grand city vista
    new THREE.Vector3(0, 29, 26)        // 1.00 Grand Portfolio-Style City Showcase overlooking entire KL skyline!
  ]);

  const camLookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 2.2, -16),  // 0.00 Looking straight down the morning jam
    new THREE.Vector3(-2.4, 2.0, -20),  // 0.18 Looking directly at RapidKL 750 stuck at the intersection!
    new THREE.Vector3(-13.5, 6.2, -28), // 0.36 Admiring the greened highway overpass & warm buildings
    new THREE.Vector3(2.0, 6.0, -105),  // 0.54 Bus lane + elevated railway + KL skyline opening ahead
    new THREE.Vector3(0.0, 7.5, -150),  // 0.72 Thriving complete boulevard leading to KLCC
    new THREE.Vector3(0.0, 15.0, -195), // 0.88
    new THREE.Vector3(0.0, 18.0, -195)  // 1.00 Full panoramic KL skyline showcase
  ]);

  let scrollProgress = 0;
  let smoothScroll = 0;
  let previewMode = null;
  let greenOverride = null;
  let lightingMode = 'day';
  let isDark = false;

  window.ManifestoScene = {
    setScrollProgress: function (p) {
      scrollProgress = clamp(p, 0, 1);
    },
    setPreviewMode: function (mode) {
      previewMode = mode;
    },
    setGreenOverpass: function (mode) {
      greenOverride = mode;
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
  // 11. Butter-Smooth Animation Loop (Frame-Rate Independent Exponential Damper)
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

    // Frame-rate-independent exponential smoothing -> ultra-smooth at 60/120/144Hz
    const damp = reducedMotion ? 1 : 1 - Math.exp(-5.2 * dt);
    smoothScroll = lerp(smoothScroll, scrollProgress, damp);
    const s = clamp(smoothScroll, 0, 1);
    const speedMult = reducedMotion ? 0 : 1;

    // Act 1 (0.00 - 0.30): ZERO greenery, full jam, RapidKL 750 stuck at intersection!
    // Act 2+ (0.32 - 0.78): Greenery blooms, jam clears, bus lanes & rail activate!
    let targetMorph = smoothstep(0.36, 0.76, s);
    if (previewMode === 'highway') targetMorph = 0;
    if (previewMode === 'transit') targetMorph = 1;
    morphFactor = lerp(morphFactor, targetMorph, damp);

    let targetGreen = smoothstep(0.30, 0.52, s);
    if (previewMode === 'transit') targetGreen = 1;
    if (previewMode === 'highway') targetGreen = 0;
    if (greenOverride === 'bare') targetGreen = 0;
    if (greenOverride === 'green') targetGreen = 1;
    greenFactor = lerp(greenFactor, targetGreen, damp);

    // 1. Existing concrete highway stays standing — greenery ONLY blooms after Act 1!
    for (let g = 0; g < overpassGreenery.length; g++) {
      const item = overpassGreenery[g];
      const gs = Math.max(0.001, greenFactor);
      item.visible = greenFactor > 0.02;
      if (g < overpassGreenery.length - 2) item.scale.set(gs, gs, gs);
      else item.scale.set(1, gs, 1);
    }

    // 2. Multi-tiered buildings warm up & rooftop gardens bloom
    const bldgPretty = smoothstep(0.32, 0.68, s);
    bldgFacadeMat.map = isDark ? facadeNightTex : facadeDayTex;
    bldgFacadeMat.emissive.setHex(isDark ? 0x263a52 : 0x000000);
    bldgFacadeMat.emissiveIntensity = isDark ? 0.55 : 0;
    const targetBldgHex = isDark ? 0x5c7594 : (bldgPretty > 0.5 ? 0xd9d2c7 : 0xa3adb7);
    bldgFacadeMat.color.lerp(new THREE.Color(targetBldgHex), 0.05);

    for (let r = 0; r < roofGardens.length; r++) {
      roofGardens[r].scale.set(1, Math.max(0.001, bldgPretty), 1);
      roofGardens[r].visible = bldgPretty > 0.04;
    }

    // 3. Dedicated RapidKL Bus Lanes, Bike Lanes, Zebra Crossings & Intersection Signals
    busLaneMat.opacity = smoothstep(0.22, 0.65, morphFactor) * 0.92;
    bikeLaneMat.opacity = smoothstep(0.42, 0.85, morphFactor) * 0.90;
    zebraMat.opacity = smoothstep(0.32, 0.78, morphFactor);
    dashMat.opacity = lerp(0.78, 0.20, morphFactor);

    const sigMat = morphFactor > 0.45 ? greenSignalMat : redSignalMat;
    for (let k = 0; k < signalHeads.length; k++) {
      signalHeads[k].material = sigMat;
    }

    // 4. Trees & RapidKL Shelters sprout AFTER Act 1
    const treeGrowth = smoothstep(0.18, 0.78, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const sc = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(sc);
    }
    const shelterGrowth = smoothstep(0.28, 0.72, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    // 5. Elevated Railway Viaduct & RapidKL 4-Car Train
    const railLift = smoothstep(0.26, 0.72, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z += 22 * dt * speedMult;
      if (train.position.z > 110) train.position.z = -160;
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
        if (car.position.z < -150) car.position.z = 60;
        if (car.position.z > 60) car.position.z = -150;
      }
    }

    const crossVis = clamp(1 - morphFactor * 1.35, 0.001, 1);
    for (let c = 0; c < crossCars.length; c++) {
      crossCars[c].scale.setScalar(crossVis);
      crossCars[c].visible = crossVis > 0.03;
    }

    // 7. Hero RapidKL 750 Bus: Stuck in the jam early -> Glides freely once bus lane opens!
    if (morphFactor < 0.25) {
      // Crawl painfully slowly right behind the intersection jam
      rapidBus750.position.z = lerp(rapidBus750.position.z, -7.5 + Math.sin(elapsed * 0.8) * 0.6, 0.06);
    } else {
      rapidBus750.position.z -= lerp(2.5, 14.5, morphFactor) * dt * speedMult;
      if (rapidBus750.position.z < -148) rapidBus750.position.z = 58;
    }

    // Extra RapidKL buses once dedicated bus lanes are active
    const extraBusScale = smoothstep(0.28, 0.68, morphFactor);
    for (let b = 0; b < extraBuses.length; b++) {
      extraBuses[b].scale.setScalar(Math.max(0.001, extraBusScale));
      extraBuses[b].visible = extraBusScale > 0.04;
      if (extraBuses[b].visible) {
        extraBuses[b].position.z += extraBuses[b].userData.dir * extraBuses[b].userData.speed * dt * speedMult;
        if (extraBuses[b].position.z > 68) extraBuses[b].position.z = -145;
        if (extraBuses[b].position.z < -145) extraBuses[b].position.z = 68;
      }
    }

    // 8. Silky Camera Flight + Gentle Panoramic Orbit at End-of-Scroll Showcase!
    camPosCurve.getPointAt(s, tmpPos);
    camLookCurve.getPointAt(s, tmpLook);

    if (s > 0.90 && !reducedMotion) {
      const orbitBlend = smoothstep(0.90, 1.0, s);
      tmpPos.x += Math.sin(elapsed * 0.22) * 18 * orbitBlend;
      tmpPos.y += Math.cos(elapsed * 0.18) * 1.8 * orbitBlend;
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

    starMat.opacity = lerp(starMat.opacity, isDark ? 0.85 : 0.0, 0.06);
    stars.rotation.y = elapsed * 0.004;

    groundMat.color.lerp(new THREE.Color(isDark ? 0x223042 : 0xdad4c6), 0.06);
    landmarkBodyMat.color.lerp(new THREE.Color(isDark ? 0x354b63 : 0xc2ced8), 0.06);
    landmarkGlassMat.color.lerp(new THREE.Color(isDark ? 0x4b7ea8 : 0x7ba5c7), 0.06);
    landmarkGlassMat.emissiveIntensity = lerp(
      landmarkGlassMat.emissiveIntensity,
      isDark ? 0.58 : (lightingMode === 'golden' ? 0.28 : 0.16),
      0.06
    );

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
