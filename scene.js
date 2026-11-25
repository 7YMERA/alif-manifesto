/* ==========================================================================
   ALIF MANIFESTO — Scroll-Driven 3D Malaysian Street & Skyline Engine
   Built with Three.js (r128). Transforms a car-centric Klang Valley road
   into a walkable, bus-first Malaysian boulevard as you scroll 2026 -> 2036.
   ========================================================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('scene-canvas');
  if (!canvas || typeof THREE === 'undefined') {
    window.ManifestoScene = {
      setScrollProgress: function () {},
      setPreviewMode: function () {},
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

  const scene = new THREE.Scene();

  // Palettes (No magenta/pink — strictly architectural daylight, golden hour, and slate dusk)
  const PALETTES = {
    day: {
      sky: new THREE.Color(0xe9e4d9),
      fog: new THREE.Color(0xe9e4d9),
      sun: new THREE.Color(0xfff6e5),
      sunInt: 1.25,
      hemiSky: new THREE.Color(0xf4f7fb),
      hemiGround: new THREE.Color(0xcbc4b4),
      hemiInt: 0.78
    },
    golden: {
      sky: new THREE.Color(0xe8d5bc),
      fog: new THREE.Color(0xe2c7a4),
      sun: new THREE.Color(0xffb566),
      sunInt: 1.45,
      hemiSky: new THREE.Color(0xffe0b5),
      hemiGround: new THREE.Color(0x8d7258),
      hemiInt: 0.72
    },
    dark: {
      sky: new THREE.Color(0x0b1218),
      fog: new THREE.Color(0x0b1218),
      sun: new THREE.Color(0x8eb8d9),
      sunInt: 0.75,
      hemiSky: new THREE.Color(0x274056),
      hemiGround: new THREE.Color(0x0c131a),
      hemiInt: 0.65
    }
  };

  scene.background = PALETTES.day.sky.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0085);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 420);
  camera.position.set(16, 14, 38);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xf4f7fb, 0xcbc4b4, 0.78);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.25);
  sunLight.position.set(36, 52, 28);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 180;
  const d = 55;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  // Helper: clamp & smoothstep
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

  // =========================================================================
  // 1. Ground, Roadway & Morphing Sidewalks (Kaki Lima)
  // =========================================================================

  const world = new THREE.Group();
  scene.add(world);

  // Base terrain plane
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  world.add(ground);

  // Asphalt Roadway
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.88 });
  const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 260), roadMat);
  road.position.set(0, 0, -40);
  road.receiveShadow = true;
  world.add(road);

  // Dashed lane lines (car-centric lanes)
  const laneDashGroup = new THREE.Group();
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xdfe4e8, transparent: true, opacity: 0.75 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 60; z >= -140; z -= 7.5) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.095, z);
      laneDashGroup.add(dash);
    }
  });
  world.add(laneDashGroup);

  // Dedicated Bus Lanes (Emerald painted corridor — reveals in Phase II+)
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0e7c59,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const busLaneLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 240), busLaneMat);
  busLaneLeft.rotation.x = -Math.PI / 2;
  busLaneLeft.position.set(-2.4, 0.105, -40);

  const busLaneRight = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 240), busLaneMat);
  busLaneRight.rotation.x = -Math.PI / 2;
  busLaneRight.position.set(2.4, 0.105, -40);

  world.add(busLaneLeft, busLaneRight);

  // Protected Bike Lanes (Terracotta strip along sidewalk edge — reveals in Phase III+)
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc9521e,
    roughness: 0.75,
    transparent: true,
    opacity: 0
  });
  const bikeLaneLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 240), bikeLaneMat);
  bikeLaneLeft.rotation.x = -Math.PI / 2;
  bikeLaneLeft.position.set(-7.2, 0.11, -40);

  const bikeLaneRight = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 240), bikeLaneMat);
  bikeLaneRight.rotation.x = -Math.PI / 2;
  bikeLaneRight.position.set(7.2, 0.11, -40);

  world.add(bikeLaneLeft, bikeLaneRight);

  // Sidewalks (Kaki Lima) — expand inward & brighten as street becomes walkable
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xbfb7a8, roughness: 0.85 });
  const sidewalkLeft = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.32, 260), sidewalkMat);
  sidewalkLeft.position.set(-12.2, 0.12, -40);
  sidewalkLeft.receiveShadow = true;

  const sidewalkRight = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.32, 260), sidewalkMat);
  sidewalkRight.position.set(12.2, 0.12, -40);
  sidewalkRight.receiveShadow = true;

  world.add(sidewalkLeft, sidewalkRight);

  // Raised Safe Zebra Crossings (reveals in Phase II/III+)
  const zebraGroup = new THREE.Group();
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf6f4ee,
    roughness: 0.6,
    transparent: true,
    opacity: 0
  });
  [14, -18, -52].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.2), zebraMat);
      stripe.position.set(x, 0.11, zPos);
      zebraGroup.add(stripe);
    }
  });
  world.add(zebraGroup);

  // =========================================================================
  // 2. Heavy Concrete Highway Overpass (Dominates Phase 0-1, Retracts Later)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7c8287, roughness: 0.92 });
  const deckGeo = new THREE.BoxGeometry(14, 1.35, 220);
  const deck = new THREE.Mesh(deckGeo, concreteMat);
  deck.position.set(-14, 9.5, -35);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const pillarGeo = new THREE.BoxGeometry(2.2, 9.5, 2.2);
  for (let z = 35; z >= -110; z -= 24) {
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(-14, 4.75, z);
    pillar.castShadow = true;
    highwayGroup.add(pillar);
  }
  world.add(highwayGroup);

  // =========================================================================
  // 3. Congested Cars (Phase 0-1) vs. RapidKL-style Buses & Cyclists (Phase 2-5)
  // =========================================================================

  const cars = [];
  const carColors = [0x4c5660, 0x76818c, 0x353c44, 0x9aa3ab, 0x5c4742, 0x394b59];
  const carBodyGeo = new THREE.BoxGeometry(1.75, 0.72, 3.6);
  const carCabinGeo = new THREE.BoxGeometry(1.45, 0.55, 1.85);
  const tailLightGeo = new THREE.BoxGeometry(1.5, 0.18, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xe6392e });

  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let i = 0; i < 34; i++) {
    const laneIdx = i % 4;
    const dir = laneIdx < 2 ? 1 : -1;
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: carColors[i % carColors.length],
      roughness: 0.45,
      metalness: 0.2
    });
    const body = new THREE.Mesh(carBodyGeo, bodyMat);
    body.position.y = 0.52;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(carCabinGeo, bodyMat);
    cabin.position.set(0, 1.05, dir > 0 ? -0.15 : 0.15);
    car.add(cabin);

    const tail = new THREE.Mesh(tailLightGeo, tailLightMat);
    tail.position.set(0, 0.58, dir > 0 ? -1.82 : 1.82);
    car.add(tail);

    const zStart = -115 + (i * 5.2) + ((i % 3) * 1.4);
    car.position.set(carLanes[laneIdx], 0.08, zStart);
    car.userData = {
      dir: dir,
      laneIdx: laneIdx,
      speed: 2.2 + (i % 4) * 0.45,
      keepInTransit: i < 5 && (laneIdx === 0 || laneIdx === 3) // Only a few cars remain in transit future
    };
    world.add(car);
    cars.push(car);
  }

  // Stylized Malaysian Transit Buses (Emerald & Crisp White)
  const buses = [];
  const busBodyMat = new THREE.MeshStandardMaterial({ color: 0xf7f8f6, roughness: 0.35, metalness: 0.1 });
  const busStripeMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.4 });
  const busGlassMat = new THREE.MeshStandardMaterial({ color: 0x1b2d3a, roughness: 0.2, metalness: 0.5 });
  const busHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });

  for (let b = 0; b < 6; b++) {
    const dir = b % 2 === 0 ? 1 : -1;
    const bus = new THREE.Group();

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.35, 9.6), busBodyMat);
    hull.position.y = 1.45;
    hull.castShadow = true;
    bus.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.65, 9.64), busStripeMat);
    stripe.position.y = 0.85;
    bus.add(stripe);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 8.8), busGlassMat);
    glass.position.y = 1.85;
    bus.add(glass);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.12), busHeadMat);
    head.position.set(0, 0.72, dir > 0 ? 4.82 : -4.82);
    bus.add(head);

    bus.position.set(dir > 0 ? -2.4 : 2.4, 0.08, -95 + b * 36);
    bus.scale.setScalar(0.001);
    bus.userData = { dir: dir, speed: 9.5 + (b % 2) * 1.5 };
    world.add(bus);
    buses.push(bus);
  }

  // Cyclists gliding on protected bike lanes
  const cyclists = [];
  const bikeMat = new THREE.MeshStandardMaterial({ color: 0x14222c, roughness: 0.5 });
  const riderMat = new THREE.MeshStandardMaterial({ color: 0xe68a2e, roughness: 0.6 });
  for (let c = 0; c < 8; c++) {
    const dir = c % 2 === 0 ? 1 : -1;
    const cyc = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 1.5), bikeMat);
    frame.position.y = 0.55;
    cyc.add(frame);

    const rider = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.95, 8), riderMat);
    rider.position.y = 1.25;
    cyc.add(rider);

    cyc.position.set(dir > 0 ? -7.2 : 7.2, 0.08, -80 + c * 22);
    cyc.scale.setScalar(0.001);
    cyc.userData = { dir: dir, speed: 5.5 + (c % 3) * 0.7 };
    world.add(cyc);
    cyclists.push(cyc);
  }

  // =========================================================================
  // 4. Shaded Tropical Trees (Angsana), Bus Shelters & Streetlamps
  // =========================================================================

  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2d7a4f, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3b8f5c, roughness: 0.85 });

  const treePositions = [];
  for (let z = 36; z >= -105; z -= 13.5) {
    treePositions.push([-10.4, z]);
    treePositions.push([10.4, z - 5]);
  }

  treePositions.forEach(function (pos, idx) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 7), trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.95 + (idx % 3) * 0.28, 1),
      idx % 2 === 0 ? canopyMat1 : canopyMat2
    );
    crown.position.y = 3.8;
    crown.scale.set(1.15, 0.78, 1.15);
    crown.castShadow = true;
    tree.add(crown);

    tree.position.set(pos[0], 0.25, pos[1]);
    tree.scale.setScalar(0.001);
    tree.userData = { delay: (idx % 6) * 0.035 };
    world.add(tree);
    trees.push(tree);
  });

  // Modern Shaded Bus Shelters
  const shelters = [];
  const shelterRoofMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.45 });
  const shelterPostMat = new THREE.MeshStandardMaterial({ color: 0x24313b, roughness: 0.5 });
  [
    [-9.8, 6],
    [9.8, -26],
    [-9.8, -62]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 6.2), shelterRoofMat);
    roof.position.y = 2.95;
    roof.castShadow = true;
    sh.add(roof);

    [-2.6, 2.6].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.95, 0.16), shelterPostMat);
      post.position.set(pos[0] < 0 ? -0.9 : 0.9, 1.48, pz);
      sh.add(post);
    });

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 4.2), trunkMat);
    bench.position.set(pos[0] < 0 ? -0.45 : 0.45, 0.35, 0);
    sh.add(bench);

    sh.position.set(pos[0], 0.26, pos[1]);
    sh.scale.setScalar(0.001);
    world.add(sh);
    shelters.push(sh);
  });

  // =========================================================================
  // 5. Stylized Kuala Lumpur & Selangor Skyline Backdrop
  // =========================================================================

  const skyline = new THREE.Group();
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0xb7c2cc, roughness: 0.72, metalness: 0.15 });
  const landmarkMat = new THREE.MeshStandardMaterial({ color: 0x99b3c4, roughness: 0.42, metalness: 0.35 });

  // Generic Klang Valley urban blocks along outer edges
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 7 + ((i * 7) % 18);
    const w = 5.5 + (i % 3) * 2;
    const dLen = 6 + (i % 4) * 2.2;
    const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), bldgMat);
    blk.position.set(side * (23 + (i % 3) * 6), h / 2 - 0.1, 35 - i * 6.5);
    blk.receiveShadow = true;
    skyline.add(blk);
  }

  // Distant KL Landmarks at z = -145
  const klGroup = new THREE.Group();
  klGroup.position.set(0, 0, -145);

  // Twin Towers silhouette (Petronas-inspired)
  [-6.5, 6.5].forEach(function (tx) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.0, 52, 8), landmarkMat);
    tower.position.set(tx, 26, 0);
    klGroup.add(tower);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.9, 14, 8), landmarkMat);
    spire.position.set(tx, 58, 0);
    klGroup.add(spire);
  });
  const skybridge = new THREE.Mesh(new THREE.BoxGeometry(11, 1.4, 1.4), landmarkMat);
  skybridge.position.set(0, 24, 0);
  klGroup.add(skybridge);

  // Merdeka 118-inspired faceted spire
  const m118 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 5.2, 62, 5), landmarkMat);
  m118.position.set(28, 31, -12);
  klGroup.add(m118);
  const m118Spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.5, 22, 6), landmarkMat);
  m118Spire.position.set(28, 72, -12);
  klGroup.add(m118Spire);

  // KL Tower-inspired telecom needle
  const klShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.35, 38, 10), landmarkMat);
  klShaft.position.set(-28, 19, -8);
  klGroup.add(klShaft);
  const klPod = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.2, 5.5, 10), landmarkMat);
  klPod.position.set(-28, 39, -8);
  klGroup.add(klPod);
  const klNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.35, 16, 6), landmarkMat);
  klNeedle.position.set(-28, 49, -8);
  klGroup.add(klNeedle);

  skyline.add(klGroup);
  world.add(skyline);

  // =========================================================================
  // 6. Camera Keyframes & State Machine
  // =========================================================================

  let scrollProgress = 0;
  let smoothScroll = 0;
  let previewMode = null; // null | 'highway' | 'transit'
  let lightingMode = 'day'; // 'day' | 'golden'
  let isDark = false;
  let pointerX = 0;
  let pointerY = 0;

  window.addEventListener('pointermove', function (e) {
    if (reducedMotion) return;
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const KEYFRAMES = [
    // 0.00 Opening: Elevated view of congested highway & skyline
    { t: 0.00, pos: [17, 13.5, 36], look: [0, 2.5, -24] },
    // 0.20 Chapter 01 (Frustration): Eye-level dangerous Selangor street crossing
    { t: 0.20, pos: [-11.5, 4.2, 24], look: [1, 2.2, -18] },
    // 0.40 Chapter 02 (Year 1 · Foundation & axrail.ai): KL skyline & grid alignment
    { t: 0.40, pos: [13, 10.5, 10], look: [0, 7.5, -65] },
    // 0.60 Chapter 03 (Year 3 · Master's & Bus NGOs): Low glide along emerging emerald bus lanes
    { t: 0.60, pos: [-8.5, 6.2, -4], look: [1.5, 2.5, -52] },
    // 0.80 Chapter 04 (Year 5 · Influence & Complete Streets): Human-scale tree-lined boulevard
    { t: 0.80, pos: [9.5, 5.8, -22], look: [0, 3.0, -72] },
    // 1.00 Chapter 05 (Year 10 · Age 32 · Public Office): Sweeping hero vista over walkable KL
    { t: 1.00, pos: [0, 17.5, 22], look: [0, 8.5, -90] }
  ];

  function sampleCamera(t) {
    const clamped = clamp(t, 0, 1);
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      const a = KEYFRAMES[i];
      const b = KEYFRAMES[i + 1];
      if (clamped >= a.t && clamped <= b.t) {
        const local = smoothstep(a.t, b.t, clamped);
        return {
          pos: [
            lerp(a.pos[0], b.pos[0], local),
            lerp(a.pos[1], b.pos[1], local),
            lerp(a.pos[2], b.pos[2], local)
          ],
          look: [
            lerp(a.look[0], b.look[0], local),
            lerp(a.look[1], b.look[1], local),
            lerp(a.look[2], b.look[2], local)
          ]
        };
      }
    }
    return KEYFRAMES[KEYFRAMES.length - 1];
  }

  function applyPalette() {
    const target = isDark ? PALETTES.dark : (lightingMode === 'golden' ? PALETTES.golden : PALETTES.day);
    scene.background.lerp(target.sky, 0.08);
    scene.fog.color.lerp(target.fog, 0.08);
    sunLight.color.lerp(target.sun, 0.08);
    sunLight.intensity = lerp(sunLight.intensity, target.sunInt, 0.08);
    hemiLight.color.lerp(target.hemiSky, 0.08);
    hemiLight.groundColor.lerp(target.hemiGround, 0.08);
    hemiLight.intensity = lerp(hemiLight.intensity, target.hemiInt, 0.08);

    // Subtle ground/building adaptation for dark mode
    const gCol = isDark ? 0x18222b : 0xd9d2c4;
    const bCol = isDark ? 0x263542 : 0xb7c2cc;
    const lCol = isDark ? 0x3b586e : 0x99b3c4;
    groundMat.color.lerp(new THREE.Color(gCol), 0.08);
    bldgMat.color.lerp(new THREE.Color(bCol), 0.08);
    landmarkMat.color.lerp(new THREE.Color(lCol), 0.08);
  }

  // Public API for app.js
  window.ManifestoScene = {
    setScrollProgress: function (p) {
      scrollProgress = clamp(p, 0, 1);
    },
    setPreviewMode: function (mode) {
      previewMode = mode; // 'highway' | 'transit' | null
    },
    setLighting: function (mode) {
      lightingMode = mode;
    },
    setDark: function (dark) {
      isDark = !!dark;
    }
  };

  // Resize handler
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // =========================================================================
  // 7. Animation Loop
  // =========================================================================

  let morphFactor = 0; // 0 = car-centric highway, 1 = complete walkable transit street
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Smooth scroll damping
    smoothScroll = lerp(smoothScroll, scrollProgress, reducedMotion ? 1 : 0.075);

    // Determine target street transformation (0 -> 1)
    let targetMorph = smoothstep(0.32, 0.82, smoothScroll);
    if (previewMode === 'highway') targetMorph = 0;
    if (previewMode === 'transit') targetMorph = 1;
    morphFactor = lerp(morphFactor, targetMorph, reducedMotion ? 1 : 0.07);

    // 1. Overpass retracts gracefully as transit vision takes over
    highwayGroup.position.y = lerp(0, 18, smoothstep(0.25, 0.78, morphFactor));
    highwayGroup.visible = highwayGroup.position.y < 17.2;

    // 2. Bus lanes, bike lanes, and zebra crossings fade in
    busLaneMat.opacity = smoothstep(0.15, 0.65, morphFactor) * 0.92;
    bikeLaneMat.opacity = smoothstep(0.42, 0.85, morphFactor) * 0.9;
    zebraMat.opacity = smoothstep(0.35, 0.80, morphFactor);
    dashMat.opacity = lerp(0.78, 0.22, morphFactor);

    // 3. Sidewalks widen slightly toward the street
    const swOffset = lerp(12.2, 11.4, morphFactor);
    sidewalkLeft.position.x = -swOffset;
    sidewalkRight.position.x = swOffset;

    // 4. Trees & bus shelters sprout up
    const treeGrowth = smoothstep(0.22, 0.82, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const s = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(s);
    }

    const shelterGrowth = smoothstep(0.35, 0.80, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    // 5. Move cars (jammed & slow in highway mode; mostly vanish in transit mode)
    const speedMult = reducedMotion ? 0 : 1;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const keep = car.userData.keepInTransit;
      const carVis = keep ? 1 : clamp(1 - morphFactor * 1.35, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;

      if (car.visible) {
        const jamSpeed = lerp(car.userData.speed * 0.45, car.userData.speed * 2.2, morphFactor);
        car.position.z += car.userData.dir * jamSpeed * dt * speedMult;
        if (car.position.z > 55) car.position.z = -125;
        if (car.position.z < -125) car.position.z = 55;
      }
    }

    // 6. Move buses smoothly along dedicated emerald lanes
    const busScale = smoothstep(0.18, 0.60, morphFactor);
    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];
      bus.scale.setScalar(Math.max(0.001, busScale));
      bus.visible = busScale > 0.04;
      if (bus.visible) {
        bus.position.z += bus.userData.dir * bus.userData.speed * dt * speedMult;
        if (bus.position.z > 65) bus.position.z = -130;
        if (bus.position.z < -130) bus.position.z = 65;
      }
    }

    // 7. Move cyclists along protected bike lanes
    const cycScale = smoothstep(0.45, 0.85, morphFactor);
    for (let i = 0; i < cyclists.length; i++) {
      const cyc = cyclists[i];
      cyc.scale.setScalar(Math.max(0.001, cycScale));
      cyc.visible = cycScale > 0.04;
      if (cyc.visible) {
        cyc.position.z += cyc.userData.dir * cyc.userData.speed * dt * speedMult;
        if (cyc.position.z > 55) cyc.position.z = -115;
        if (cyc.position.z < -115) cyc.position.z = 55;
      }
    }

    // 8. Camera glide + subtle parallax
    const camState = sampleCamera(smoothScroll);
    const px = pointerX * 1.6;
    const py = -pointerY * 0.9;
    camera.position.set(camState.pos[0] + px, camState.pos[1] + py, camState.pos[2]);
    camera.lookAt(camState.look[0], camState.look[1], camState.look[2]);

    applyPalette();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
