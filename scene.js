/* ==========================================================================
   ALIF MANIFESTO — Scroll-Driven 3D Malaysian Street & Real KL Landmarks
   Uses Alif's real 3D models (Petronas Twin Towers, Menara KL, Merdeka 118,
   Exchange 106) + Catmull-Rom cinematic drone camera flight (2026 -> 2036).
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

  const scene = new THREE.Scene();

  // Palettes (Zero magenta/pink — strictly architectural daylight, golden hour, slate dusk)
  const PALETTES = {
    day: {
      sky: new THREE.Color(0xeae5da),
      fog: new THREE.Color(0xeae5da),
      sun: new THREE.Color(0xfff6e5),
      sunInt: 1.32,
      hemiSky: new THREE.Color(0xf4f8fc),
      hemiGround: new THREE.Color(0xcbc3b2),
      hemiInt: 0.80
    },
    golden: {
      sky: new THREE.Color(0xe8d3b5),
      fog: new THREE.Color(0xe1c39a),
      sun: new THREE.Color(0xffb45e),
      sunInt: 1.55,
      hemiSky: new THREE.Color(0xffdfad),
      hemiGround: new THREE.Color(0x886c52),
      hemiInt: 0.74
    },
    dark: {
      sky: new THREE.Color(0x0a1118),
      fog: new THREE.Color(0x0a1118),
      sun: new THREE.Color(0x9ac4e2),
      sunInt: 0.85,
      hemiSky: new THREE.Color(0x28435a),
      hemiGround: new THREE.Color(0x0c141c),
      hemiInt: 0.70
    }
  };

  scene.background = PALETTES.day.sky.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0054);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 620);
  camera.position.set(24, 22, 52);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xf4f8fc, 0xcbc3b2, 0.80);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.32);
  sunLight.position.set(48, 72, 34);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 240;
  const d = 65;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  // Helpers
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
  // 1. Ground, Roadway & Morphing Sidewalks (Kaki Lima)
  // =========================================================================

  const world = new THREE.Group();
  scene.add(world);

  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd9d1c2, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  world.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.88 });
  const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 280), roadMat);
  road.position.set(0, 0, -45);
  road.receiveShadow = true;
  world.add(road);

  // Dashed lane markings
  const laneDashGroup = new THREE.Group();
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3e7eb, transparent: true, opacity: 0.78 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 65; z >= -150; z -= 7.5) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.095, z);
      laneDashGroup.add(dash);
    }
  });
  world.add(laneDashGroup);

  // Dedicated Emerald Bus Lanes (Reveals in Year 3+)
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0e7c59,
    roughness: 0.68,
    transparent: true,
    opacity: 0
  });
  const busLaneLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 250), busLaneMat);
  busLaneLeft.rotation.x = -Math.PI / 2;
  busLaneLeft.position.set(-2.4, 0.105, -45);

  const busLaneRight = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 250), busLaneMat);
  busLaneRight.rotation.x = -Math.PI / 2;
  busLaneRight.position.set(2.4, 0.105, -45);
  world.add(busLaneLeft, busLaneRight);

  // Protected Terracotta Bike Lanes (Reveals in Year 5+)
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc9521e,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const bikeLaneLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 250), bikeLaneMat);
  bikeLaneLeft.rotation.x = -Math.PI / 2;
  bikeLaneLeft.position.set(-7.25, 0.11, -45);

  const bikeLaneRight = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 250), bikeLaneMat);
  bikeLaneRight.rotation.x = -Math.PI / 2;
  bikeLaneRight.position.set(7.25, 0.11, -45);
  world.add(bikeLaneLeft, bikeLaneRight);

  // Sidewalks (Kaki Lima)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc2b9a8, roughness: 0.84 });
  const sidewalkLeft = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 280), sidewalkMat);
  sidewalkLeft.position.set(-12.3, 0.12, -45);
  sidewalkLeft.receiveShadow = true;

  const sidewalkRight = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 280), sidewalkMat);
  sidewalkRight.position.set(12.3, 0.12, -45);
  sidewalkRight.receiveShadow = true;
  world.add(sidewalkLeft, sidewalkRight);

  // Raised Safe Zebra Crossings
  const zebraGroup = new THREE.Group();
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf7f5ef,
    roughness: 0.58,
    transparent: true,
    opacity: 0
  });
  [16, -16, -50, -86].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.2), zebraMat);
      stripe.position.set(x, 0.11, zPos);
      zebraGroup.add(stripe);
    }
  });
  world.add(zebraGroup);

  // Glowing Transit Route Ribbons (subtle architectural light guide along bus corridor)
  const ribbonMat = new THREE.MeshBasicMaterial({
    color: 0x2ec994,
    transparent: true,
    opacity: 0
  });
  const ribbonL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 240), ribbonMat);
  ribbonL.position.set(-4.15, 0.14, -45);
  const ribbonR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 240), ribbonMat);
  ribbonR.position.set(4.15, 0.14, -45);
  world.add(ribbonL, ribbonR);

  // =========================================================================
  // 2. Existing Concrete Highway Overpass (Remains — Transformed with Greenery!)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b8187, roughness: 0.92 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 230), concreteMat);
  deck.position.set(-14.5, 9.6, -40);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const pillarGeo = new THREE.BoxGeometry(2.2, 9.6, 2.2);
  const vineWrapMat = new THREE.MeshStandardMaterial({ color: 0x267347, roughness: 0.85 });
  const vineBrightMat = new THREE.MeshStandardMaterial({ color: 0x38945d, roughness: 0.82 });
  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b555c, roughness: 0.8 });
  const underLampMat = new THREE.MeshBasicMaterial({ color: 0xffe4ad });

  const overpassGreenery = [];
  const pillarGreeneryGeo = new THREE.BoxGeometry(2.58, 7.6, 2.58);

  for (let z = 38; z >= -118; z -= 24) {
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(-14.5, 4.8, z);
    pillar.castShadow = true;
    highwayGroup.add(pillar);

    // Living vertical greenery wrap around each concrete pillar
    const wrap = new THREE.Group();
    const mossSleeve = new THREE.Mesh(pillarGreeneryGeo, vineWrapMat);
    mossSleeve.position.y = 4.2;
    wrap.add(mossSleeve);

    // Organic foliage clusters climbing the pillar
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.95 + (k % 2) * 0.25, 0),
        k % 2 === 0 ? vineBrightMat : vineWrapMat
      );
      const angle = (k * Math.PI) / 2 + 0.4;
      puff.position.set(Math.cos(angle) * 1.25, 2.0 + k * 1.85, Math.sin(angle) * 1.25);
      wrap.add(puff);
    }

    // Cool shaded underpass planter shrub at pillar base
    const baseShrub = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 1), vineBrightMat);
    baseShrub.scale.set(1.3, 0.55, 1.3);
    baseShrub.position.set(1.6, 0.55, 0);
    wrap.add(baseShrub);

    // Warm under-deck lighting strip
    const underLight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.35), underLampMat);
    underLight.position.set(0, 8.82, 0);
    wrap.add(underLight);

    wrap.position.set(-14.5, 0.15, z);
    wrap.scale.setScalar(0.001);
    highwayGroup.add(wrap);
    overpassGreenery.push(wrap);
  }

  // Continuous Deck-Edge Planter Boxes & Cascading Greenery along the Highway
  [-7.55, -21.45].forEach(function (edgeX) {
    const edgeGroup = new THREE.Group();
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 224), planterBoxMat);
    planter.position.set(0, 10.35, -40);
    edgeGroup.add(planter);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 224), vineWrapMat);
    hedge.position.set(0, 10.95, -40);
    edgeGroup.add(hedge);

    // Trailing hanging vines cascading down the concrete fascia
    for (let z = 55; z >= -135; z -= 10) {
      const drape = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 1.45 + ((Math.abs(z) % 3) * 0.4), 3.6),
        z % 20 === 0 ? vineBrightMat : vineWrapMat
      );
      drape.position.set(edgeX > -14.5 ? 0.32 : -0.32, 9.75, z);
      edgeGroup.add(drape);
    }

    edgeGroup.position.set(edgeX, 0, 0);
    edgeGroup.scale.set(1, 0.001, 1);
    highwayGroup.add(edgeGroup);
    overpassGreenery.push(edgeGroup);
  });

  world.add(highwayGroup);

  // =========================================================================
  // 3. Congested Cars vs. RapidKL-style Buses & Cyclists
  // =========================================================================

  const cars = [];
  const carColors = [0x4c5660, 0x76818c, 0x353c44, 0x9aa3ab, 0x5c4742, 0x394b59];
  const carBodyGeo = new THREE.BoxGeometry(1.75, 0.72, 3.6);
  const carCabinGeo = new THREE.BoxGeometry(1.45, 0.55, 1.85);
  const tailLightGeo = new THREE.BoxGeometry(1.5, 0.18, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xe6392e });

  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let i = 0; i < 36; i++) {
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

    const zStart = -125 + i * 5.2 + (i % 3) * 1.4;
    car.position.set(carLanes[laneIdx], 0.08, zStart);
    car.userData = {
      dir: dir,
      speed: 2.2 + (i % 4) * 0.45,
      keepInTransit: i < 5 && (laneIdx === 0 || laneIdx === 3)
    };
    world.add(car);
    cars.push(car);
  }

  // Articulated RapidKL-inspired Buses
  const buses = [];
  const busBodyMat = new THREE.MeshStandardMaterial({ color: 0xf7f8f6, roughness: 0.34, metalness: 0.12 });
  const busStripeMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.4 });
  const busGlassMat = new THREE.MeshStandardMaterial({ color: 0x1a2c39, roughness: 0.2, metalness: 0.5 });
  const busHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });

  for (let b = 0; b < 7; b++) {
    const dir = b % 2 === 0 ? 1 : -1;
    const bus = new THREE.Group();

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.38, 10.2), busBodyMat);
    hull.position.y = 1.45;
    hull.castShadow = true;
    bus.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.68, 10.24), busStripeMat);
    stripe.position.y = 0.85;
    bus.add(stripe);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 9.3), busGlassMat);
    glass.position.y = 1.86;
    bus.add(glass);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.12), busHeadMat);
    head.position.set(0, 0.72, dir > 0 ? 5.12 : -5.12);
    bus.add(head);

    bus.position.set(dir > 0 ? -2.4 : 2.4, 0.08, -110 + b * 32);
    bus.scale.setScalar(0.001);
    bus.userData = { dir: dir, speed: 10.5 + (b % 2) * 1.6 };
    world.add(bus);
    buses.push(bus);
  }

  // Cyclists
  const cyclists = [];
  const bikeMat = new THREE.MeshStandardMaterial({ color: 0x14222c, roughness: 0.5 });
  const riderMat = new THREE.MeshStandardMaterial({ color: 0xe68a2e, roughness: 0.6 });
  for (let c = 0; c < 9; c++) {
    const dir = c % 2 === 0 ? 1 : -1;
    const cyc = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 1.5), bikeMat);
    frame.position.y = 0.55;
    cyc.add(frame);

    const rider = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.95, 8), riderMat);
    rider.position.y = 1.25;
    cyc.add(rider);

    cyc.position.set(dir > 0 ? -7.25 : 7.25, 0.08, -95 + c * 21);
    cyc.scale.setScalar(0.001);
    cyc.userData = { dir: dir, speed: 5.8 + (c % 3) * 0.75 };
    world.add(cyc);
    cyclists.push(cyc);
  }

  // =========================================================================
  // 4. Shaded Tropical Trees (Angsana), Bus Shelters & Warm Streetlamps
  // =========================================================================

  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2c7a4e, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a915d, roughness: 0.85 });

  const treePositions = [];
  for (let z = 38; z >= -118; z -= 13) {
    treePositions.push([-10.5, z]);
    treePositions.push([10.5, z - 5]);
  }

  treePositions.forEach(function (pos, idx) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 7), trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.0 + (idx % 3) * 0.28, 1),
      idx % 2 === 0 ? canopyMat1 : canopyMat2
    );
    crown.position.y = 3.85;
    crown.scale.set(1.18, 0.78, 1.18);
    crown.castShadow = true;
    tree.add(crown);

    tree.position.set(pos[0], 0.25, pos[1]);
    tree.scale.setScalar(0.001);
    tree.userData = { delay: (idx % 6) * 0.035 };
    world.add(tree);
    trees.push(tree);
  });

  // Shaded Bus Shelters
  const shelters = [];
  const shelterRoofMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.45 });
  const shelterPostMat = new THREE.MeshStandardMaterial({ color: 0x24313b, roughness: 0.5 });
  [
    [-9.8, 8],
    [9.8, -24],
    [-9.8, -60],
    [9.8, -94]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 6.4), shelterRoofMat);
    roof.position.y = 2.95;
    roof.castShadow = true;
    sh.add(roof);

    [-2.7, 2.7].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.95, 0.16), shelterPostMat);
      post.position.set(pos[0] < 0 ? -0.9 : 0.9, 1.48, pz);
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

  // Warm Human-Scale Streetlamps
  const lamps = [];
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6b3 });
  for (let z = 30; z >= -110; z -= 22) {
    [-9.4, 9.4].forEach(function (xPos) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.8, 6), shelterPostMat);
      pole.position.y = 2.4;
      lamp.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.1), shelterPostMat);
      arm.position.set(xPos < 0 ? 0.5 : -0.5, 4.75, 0);
      lamp.add(arm);

      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.26), lampBulbMat);
      bulb.position.set(xPos < 0 ? 0.85 : -0.85, 4.65, 0);
      lamp.add(bulb);

      lamp.position.set(xPos, 0.25, z);
      lamp.scale.setScalar(0.001);
      world.add(lamp);
      lamps.push(lamp);
    });
  }

  // =========================================================================
  // 4B. Malaysian Elevated Railway Viaduct, Station Canopy & 4-Car MRT/LRT Train
  // =========================================================================

  const railGroup = new THREE.Group();
  const railViaductMat = new THREE.MeshStandardMaterial({ color: 0xc9cfd4, roughness: 0.72 });
  const railTrimMat = new THREE.MeshStandardMaterial({ color: 0x1d4e78, roughness: 0.45 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x566068, roughness: 0.35, metalness: 0.75 });

  // Elevated sleek box-girder viaduct along the right corridor (x = 17.5)
  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 260), railViaductMat);
  viaductBeam.position.set(17.5, 8.2, -45);
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  // Architectural cobalt/emerald transit trim along viaduct fascia
  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.28, 260), railTrimMat);
  viaductTrim.position.set(17.5, 8.75, -45);
  railGroup.add(viaductTrim);

  // Dual steel rails
  [-1.1, 1.1].forEach(function (rx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 260), railSteelMat);
    rail.position.set(17.5 + rx, 8.92, -45);
    railGroup.add(rail);
  });

  // Slender sculpted viaduct piers
  const railPierGeo = new THREE.BoxGeometry(1.5, 8.2, 1.8);
  for (let z = 42; z >= -130; z -= 26) {
    const pier = new THREE.Mesh(railPierGeo, railViaductMat);
    pier.position.set(17.5, 4.1, z);
    pier.castShadow = true;
    railGroup.add(pier);
  }

  // Modern Elevated Rail Station Canopy (connecting rail -> bus -> kaki lima)
  const stationCanopy = new THREE.Group();
  const stationRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.28, 28), railTrimMat);
  stationRoof.position.set(17.5, 13.6, -24);
  stationRoof.castShadow = true;
  stationCanopy.add(stationRoof);

  const stationDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 28), railViaductMat);
  stationDeck.position.set(17.5, 8.6, -24);
  stationCanopy.add(stationDeck);

  [-3.8, 3.8].forEach(function (sx) {
    [-11, 0, 11].forEach(function (sz) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.0, 8), railSteelMat);
      col.position.set(17.5 + sx, 11.1, -24 + sz);
      stationCanopy.add(col);
    });
  });
  railGroup.add(stationCanopy);

  // Sleek 4-Car Malaysian MRT/LRT Electric Train
  const train = new THREE.Group();
  const trainHullMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.28, metalness: 0.22 });
  const trainLiveryMat = new THREE.MeshStandardMaterial({ color: 0x1d4e78, roughness: 0.35, metalness: 0.2 });
  const trainAccentMat = new THREE.MeshStandardMaterial({ color: 0x0e7c59, roughness: 0.4 });
  const trainWindowMat = new THREE.MeshBasicMaterial({ color: 0xffe9ba });
  const trainHeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let carIdx = 0; carIdx < 4; carIdx++) {
    const coach = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.75, 2.75, 11.4), trainHullMat);
    body.position.y = 1.45;
    body.castShadow = true;
    coach.add(body);

    const livery = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.65, 11.44), trainLiveryMat);
    livery.position.y = 0.72;
    coach.add(livery);

    const accent = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.22, 11.46), trainAccentMat);
    accent.position.y = 1.12;
    coach.add(accent);

    const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 10.2), trainWindowMat);
    winBand.position.y = 1.92;
    coach.add(winBand);

    if (carIdx === 0) {
      const headLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.14), trainHeadMat);
      headLight.position.set(0, 0.9, 5.75);
      coach.add(headLight);
    }

    coach.position.z = -carIdx * 12.1;
    train.add(coach);
  }

  train.position.set(17.5, 9.0, -70);
  railGroup.add(train);

  railGroup.position.y = -18;
  railGroup.visible = false;
  world.add(railGroup);

  // =========================================================================
  // 5. Real 3D Kuala Lumpur Landmarks (from Alif's 7YMERA Portfolio!)
  // =========================================================================

  const skyline = new THREE.Group();
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0xbac4cd, roughness: 0.72, metalness: 0.15 });
  const landmarkBodyMat = new THREE.MeshStandardMaterial({
    color: 0xb7c6d1,
    roughness: 0.55,
    metalness: 0.25,
    side: THREE.DoubleSide
  });
  const landmarkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x89aec4,
    roughness: 0.25,
    metalness: 0.55,
    emissive: new THREE.Color(0x1b374a),
    emissiveIntensity: 0.18,
    side: THREE.DoubleSide
  });

  // Flanking urban blocks
  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 7 + ((i * 7) % 19);
    const w = 5.5 + (i % 3) * 2.1;
    const dLen = 6 + (i % 4) * 2.2;
    const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), bldgMat);
    blk.position.set(side * (24 + (i % 3) * 6.5), h / 2 - 0.1, 40 - i * 6.8);
    blk.receiveShadow = true;
    skyline.add(blk);
  }

  // Real-scale KL Landmarks container
  const klGroup = new THREE.Group();
  skyline.add(klGroup);
  world.add(skyline);

  // Unified real-world scale (Petronas Towers = 444.138m -> 76 world units)
  const LANDMARK_SCALE = 76 / 444.138;
  const nightEdges = [];
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xffe4aa,
    transparent: true,
    opacity: 0
  });

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
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          grp.add(mesh);

          if (pair[0] === 'body') {
            const eg = new THREE.EdgesGeometry(geo, 38);
            const lines = new THREE.LineSegments(eg, edgeMat);
            lines.scale.set(1.004, 1, 1.004);
            grp.add(lines);
            nightEdges.push(lines);
          }
        });

        grp.scale.setScalar(LANDMARK_SCALE);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        klGroup.add(grp);
      })
      .catch(function () {
        // Silent graceful fallback if offline
      });
  }

  // Load all four real 3D Kuala Lumpur landmarks from Alif's portfolio assets!
  loadPortfolioModel('./assets/city/klcc.json', 0, 0, -172, 0.12);
  loadPortfolioModel('./assets/city/menara_kl.json', -58, 6, -152, 0.3);
  loadPortfolioModel('./assets/city/merdeka118.json', 56, 0, -196, -0.35);
  loadPortfolioModel('./assets/city/exchange106.json', -28, 0, -212, 0.18);

  // =========================================================================
  // 6. Catmull-Rom Cinematic Drone Camera Flight & State Machine
  // =========================================================================

  const camPosCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(24, 21, 52),     // 0.00 Opening: Dramatic high approach toward highway & KL skyline
    new THREE.Vector3(-12.5, 4.4, 26), // 0.16 The Street: Eye-level at broken Selangor crossing
    new THREE.Vector3(-3.5, 6.4, 10),  // 0.32 Highways Reimagined: Close sweep alongside concrete overpass pillars blooming green
    new THREE.Vector3(14, 11.5, -2),   // 0.48 Year 1: Framing Petronas Twin Towers & KL corridor
    new THREE.Vector3(-6.2, 5.2, -26), // 0.65 Year 3: Low drone glide along emerging emerald bus lanes
    new THREE.Vector3(10.5, 6.2, -54), // 0.82 Year 5: Sweeping across complete street, trees & bike lane
    new THREE.Vector3(0, 20.5, 16)     // 1.00 Year 10 (2036): Grand hero vista over greened overpass & walkable KL
  ]);

  const camLookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 5, -35),      // 0.00
    new THREE.Vector3(1.5, 2.2, -22),  // 0.16
    new THREE.Vector3(-14.5, 5.8, -18),// 0.32 Looking directly at the concrete overpass pillars & greenery
    new THREE.Vector3(0, 14, -140),    // 0.48
    new THREE.Vector3(1, 5, -120),     // 0.65
    new THREE.Vector3(0, 8, -155),     // 0.82
    new THREE.Vector3(-2, 16, -175)    // 1.00
  ]);

  let scrollProgress = 0;
  let smoothScroll = 0;
  let prevSmoothScroll = 0;
  let previewMode = null;
  let greenOverride = null; // null | 'bare' | 'green'
  let lightingMode = 'day';
  let isDark = false;

  function applyPalette() {
    const target = isDark ? PALETTES.dark : (lightingMode === 'golden' ? PALETTES.golden : PALETTES.day);
    scene.background.lerp(target.sky, 0.08);
    scene.fog.color.lerp(target.fog, 0.08);
    sunLight.color.lerp(target.sun, 0.08);
    sunLight.intensity = lerp(sunLight.intensity, target.sunInt, 0.08);
    hemiLight.color.lerp(target.hemiSky, 0.08);
    hemiLight.groundColor.lerp(target.hemiGround, 0.08);
    hemiLight.intensity = lerp(hemiLight.intensity, target.hemiInt, 0.08);

    const gCol = isDark ? 0x16202a : 0xd9d1c2;
    const bCol = isDark ? 0x22313f : 0xbac4cd;
    const lmBodyCol = isDark ? 0x2b3e4f : 0xb7c6d1;
    const lmGlassCol = isDark ? 0x457596 : 0x89aec4;

    groundMat.color.lerp(new THREE.Color(gCol), 0.08);
    bldgMat.color.lerp(new THREE.Color(bCol), 0.08);
    landmarkBodyMat.color.lerp(new THREE.Color(lmBodyCol), 0.08);
    landmarkGlassMat.color.lerp(new THREE.Color(lmGlassCol), 0.08);
    landmarkGlassMat.emissiveIntensity = lerp(
      landmarkGlassMat.emissiveIntensity,
      isDark ? 0.55 : (lightingMode === 'golden' ? 0.28 : 0.14),
      0.08
    );
    edgeMat.opacity = lerp(edgeMat.opacity, isDark ? 0.28 : 0.0, 0.08);
  }

  window.ManifestoScene = {
    setScrollProgress: function (p) {
      scrollProgress = clamp(p, 0, 1);
    },
    setPreviewMode: function (mode) {
      previewMode = mode;
    },
    setGreenOverpass: function (mode) {
      greenOverride = mode; // 'bare' | 'green' | null
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
  // 7. Animation Loop
  // =========================================================================

  let morphFactor = 0;
  let greenFactor = 0;
  let lastTime = performance.now();
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Smooth cinematic scroll damping
    prevSmoothScroll = smoothScroll;
    smoothScroll = lerp(smoothScroll, scrollProgress, reducedMotion ? 1 : 0.068);
    const scrollVel = (smoothScroll - prevSmoothScroll) / Math.max(dt, 0.008);

    // Street transformation (0 = car-centric highway, 1 = complete walkable transit street)
    let targetMorph = smoothstep(0.38, 0.84, smoothScroll);
    if (previewMode === 'highway') targetMorph = 0;
    if (previewMode === 'transit') targetMorph = 1;
    morphFactor = lerp(morphFactor, targetMorph, reducedMotion ? 1 : 0.075);

    // 1. Existing highway overpass STAYS standing — wrapped in living greenery to cool & beautify!
    let targetGreen = smoothstep(0.22, 0.44, smoothScroll);
    if (previewMode === 'transit') targetGreen = 1;
    if (previewMode === 'highway') targetGreen = 0;
    if (greenOverride === 'bare') targetGreen = 0;
    if (greenOverride === 'green') targetGreen = 1;
    greenFactor = lerp(greenFactor, targetGreen, reducedMotion ? 1 : 0.08);

    for (let g = 0; g < overpassGreenery.length; g++) {
      const item = overpassGreenery[g];
      const gs = Math.max(0.001, greenFactor);
      item.visible = greenFactor > 0.02;
      if (g < overpassGreenery.length - 2) {
        item.scale.set(gs, gs, gs);
      } else {
        item.scale.set(1, gs, 1);
      }
    }

    // 2. Bus lanes, bike lanes, zebra crossings & light ribbons
    busLaneMat.opacity = smoothstep(0.14, 0.62, morphFactor) * 0.94;
    bikeLaneMat.opacity = smoothstep(0.40, 0.84, morphFactor) * 0.92;
    zebraMat.opacity = smoothstep(0.32, 0.78, morphFactor);
    ribbonMat.opacity = smoothstep(0.18, 0.65, morphFactor) * (isDark ? 0.75 : 0.45);
    dashMat.opacity = lerp(0.78, 0.18, morphFactor);

    // 3. Kaki Lima sidewalks widen
    const swOffset = lerp(12.3, 11.45, morphFactor);
    sidewalkLeft.position.x = -swOffset;
    sidewalkRight.position.x = swOffset;

    // 4. Trees, bus shelters & streetlamps grow smoothly
    const treeGrowth = smoothstep(0.20, 0.82, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const s = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(s);
    }

    const shelterGrowth = smoothstep(0.32, 0.78, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    const lampGrowth = smoothstep(0.38, 0.82, morphFactor);
    for (let i = 0; i < lamps.length; i++) {
      lamps[i].scale.setScalar(Math.max(0.001, lampGrowth));
    }

    // 5. Move cars
    const speedMult = reducedMotion ? 0 : 1;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const keep = car.userData.keepInTransit;
      const carVis = keep ? 1 : clamp(1 - morphFactor * 1.38, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;

      if (car.visible) {
        const jamSpeed = lerp(car.userData.speed * 0.42, car.userData.speed * 2.2, morphFactor);
        car.position.z += car.userData.dir * jamSpeed * dt * speedMult;
        if (car.position.z > 62) car.position.z = -132;
        if (car.position.z < -132) car.position.z = 62;
      }
    }

    // 6. Move RapidKL-style buses
    const busScale = smoothstep(0.16, 0.58, morphFactor);
    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];
      bus.scale.setScalar(Math.max(0.001, busScale));
      bus.visible = busScale > 0.04;
      if (bus.visible) {
        bus.position.z += bus.userData.dir * bus.userData.speed * dt * speedMult;
        if (bus.position.z > 70) bus.position.z = -138;
        if (bus.position.z < -138) bus.position.z = 70;
      }
    }

    // 7. Move cyclists
    const cycScale = smoothstep(0.42, 0.84, morphFactor);
    for (let i = 0; i < cyclists.length; i++) {
      const cyc = cyclists[i];
      cyc.scale.setScalar(Math.max(0.001, cycScale));
      cyc.visible = cycScale > 0.04;
      if (cyc.visible) {
        cyc.position.z += cyc.userData.dir * cyc.userData.speed * dt * speedMult;
        if (cyc.position.z > 60) cyc.position.z = -120;
        if (cyc.position.z < -120) cyc.position.z = 60;
      }
    }

    // 7B. Elevated Railway Viaduct rises & 4-Car MRT/LRT Electric Train glides along track
    const railLift = smoothstep(0.24, 0.72, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z += 22 * dt * speedMult;
      if (train.position.z > 105) train.position.z = -155;
    }

    // 8. Smooth Catmull-Rom Drone Camera + Dynamic FOV Momentum (Strictly Scroll-Driven)
    camPosCurve.getPointAt(clamp(smoothScroll, 0, 1), tmpPos);
    camLookCurve.getPointAt(clamp(smoothScroll, 0, 1), tmpLook);

    const targetFov = reducedMotion ? 45 : clamp(45 + Math.abs(scrollVel) * 9.5, 45, 52);
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov = lerp(camera.fov, targetFov, 0.08);
      camera.updateProjectionMatrix();
    }

    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);

    // Subtle cinema roll when scrolling fast
    if (!reducedMotion) {
      camera.rotation.z += clamp(-scrollVel * 0.035, -0.04, 0.04);
    }

    applyPalette();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
