/* ==========================================================================
   ALIF MANIFESTO — Follow-Car -> Exit Car -> Bus 750 -> Weekend Bike 3D Story
   Uses Alif's 4 real 3D KL models (KLCC, Menara KL, Merdeka 118, Exchange 106).
   Strictly scroll-driven (zero mouse camera drift), center stage wide open.
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

  // Palettes (Zero magenta/pink — warm daylight, golden hour, slate twilight)
  const PALETTES = {
    day: {
      sky: new THREE.Color(0xeae5da),
      fog: new THREE.Color(0xeae5da),
      sun: new THREE.Color(0xfff6e5),
      sunInt: 1.32,
      hemiSky: new THREE.Color(0xf4f8fc),
      hemiGround: new THREE.Color(0xcbc3b2),
      hemiInt: 0.82
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
      hemiInt: 0.72
    }
  };

  scene.background = PALETTES.day.sky.clone();
  scene.fog = new THREE.FogExp2(PALETTES.day.fog.getHex(), 0.0052);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.4, 640);
  camera.position.set(-2.4, 3.2, 50.5);

  const hemiLight = new THREE.HemisphereLight(0xf4f8fc, 0xcbc3b2, 0.82);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.32);
  sunLight.position.set(48, 74, 38);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 260;
  const d = 75;
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

  const world = new THREE.Group();
  scene.add(world);

  // =========================================================================
  // 1. Ground, Roadway, Bus Lanes, Bike Lanes & Shaded Kaki Lima
  // =========================================================================

  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd9d1c2, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(780, 780), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  world.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.88 });
  const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 300), roadMat);
  road.position.set(0, 0, -55);
  road.receiveShadow = true;
  world.add(road);

  // Lane dashes
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3e7eb, transparent: true, opacity: 0.78 });
  const dashGeo = new THREE.PlaneGeometry(0.18, 2.8);
  [-4.5, 0, 4.5].forEach(function (xPos) {
    for (let z = 70; z >= -165; z -= 7.5) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(xPos, 0.095, z);
      world.add(dash);
    }
  });

  // Dedicated Emerald Bus Lanes
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0e7c59,
    roughness: 0.68,
    transparent: true,
    opacity: 0
  });
  const busLaneL = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 270), busLaneMat);
  busLaneL.rotation.x = -Math.PI / 2;
  busLaneL.position.set(-2.4, 0.105, -55);
  const busLaneR = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 270), busLaneMat);
  busLaneR.rotation.x = -Math.PI / 2;
  busLaneR.position.set(2.4, 0.105, -55);
  world.add(busLaneL, busLaneR);

  // Protected Terracotta Cycling Lanes
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0xc9521e,
    roughness: 0.72,
    transparent: true,
    opacity: 0
  });
  const bikeLaneL = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 270), bikeLaneMat);
  bikeLaneL.rotation.x = -Math.PI / 2;
  bikeLaneL.position.set(-7.25, 0.11, -55);
  const bikeLaneR = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 270), bikeLaneMat);
  bikeLaneR.rotation.x = -Math.PI / 2;
  bikeLaneR.position.set(7.25, 0.11, -55);
  world.add(bikeLaneL, bikeLaneR);

  // Sidewalks (Kaki Lima)
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc2b9a8, roughness: 0.84 });
  const sidewalkL = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 300), sidewalkMat);
  sidewalkL.position.set(-12.3, 0.12, -55);
  sidewalkL.receiveShadow = true;
  const sidewalkR = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 300), sidewalkMat);
  sidewalkR.position.set(12.3, 0.12, -55);
  sidewalkR.receiveShadow = true;
  world.add(sidewalkL, sidewalkR);

  // Raised Zebra Crossings
  const zebraMat = new THREE.MeshStandardMaterial({
    color: 0xf7f5ef,
    roughness: 0.58,
    transparent: true,
    opacity: 0
  });
  [12, -20, -56, -94].forEach(function (zPos) {
    for (let x = -7.2; x <= 7.2; x += 1.45) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.2), zebraMat);
      stripe.position.set(x, 0.11, zPos);
      world.add(stripe);
    }
  });

  // =========================================================================
  // 2. Existing Concrete Highway Overpass (Stays Standing — Blooms Green!)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b8187, roughness: 0.92 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 250), concreteMat);
  deck.position.set(-15.5, 9.8, -50);
  deck.castShadow = true;
  highwayGroup.add(deck);

  const pillarGeo = new THREE.BoxGeometry(2.2, 9.8, 2.2);
  const vineWrapMat = new THREE.MeshStandardMaterial({ color: 0x267347, roughness: 0.85 });
  const vineBrightMat = new THREE.MeshStandardMaterial({ color: 0x38945d, roughness: 0.82 });
  const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b555c, roughness: 0.8 });
  const underLampMat = new THREE.MeshBasicMaterial({ color: 0xffe4ad });

  const overpassGreenery = [];
  const pillarGreeneryGeo = new THREE.BoxGeometry(2.58, 7.8, 2.58);

  for (let z = 44; z >= -135; z -= 24) {
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
        new THREE.DodecahedronGeometry(0.95 + (k % 2) * 0.25, 0),
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
  // 3. HERO ACTORS: His Car -> Himself Walking -> RapidKL 750 -> Weekend Bike
  // =========================================================================

  // 3A. HERO CAR (The Car He Starts Stuck Inside)
  const heroCar = new THREE.Group();
  const heroCarBodyMat = new THREE.MeshStandardMaterial({ color: 0x3b556b, roughness: 0.32, metalness: 0.45 });
  const heroCarGlassMat = new THREE.MeshStandardMaterial({ color: 0x14222c, roughness: 0.15, metalness: 0.65 });
  const heroBrakeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const heroHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1e22, roughness: 0.8 });

  const hcLower = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.72, 4.15), heroCarBodyMat);
  hcLower.position.y = 0.56;
  hcLower.castShadow = true;
  heroCar.add(hcLower);

  const hcCabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.58, 2.05), heroCarGlassMat);
  hcCabin.position.set(0, 1.14, 0.15);
  heroCar.add(hcCabin);

  const hcRoof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 1.8), heroCarBodyMat);
  hcRoof.position.set(0, 1.45, 0.15);
  heroCar.add(hcRoof);

  // Glowing brake lights facing the camera behind the car (+Z)
  const hcBrakeL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.1), heroBrakeMat);
  hcBrakeL.position.set(-0.62, 0.66, 2.09);
  const hcBrakeR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.1), heroBrakeMat);
  hcBrakeR.position.set(0.62, 0.66, 2.09);
  heroCar.add(hcBrakeL, hcBrakeR);

  const hcHead = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 0.1), heroHeadMat);
  hcHead.position.set(0, 0.58, -2.09);
  heroCar.add(hcHead);

  [
    [-0.95, 1.25], [0.95, 1.25], [-0.95, -1.25], [0.95, -1.25]
  ].forEach(function (wp) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12), wheelMat);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(wp[0], 0.32, wp[1]);
    heroCar.add(wh);
  });

  heroCar.position.set(-2.4, 0.08, 42);
  world.add(heroCar);

  // 3B. HERO MAN (Steps out of his car, walks on kaki lima, boards Bus 750!)
  const heroMan = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a679, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0e7c59, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e2a36, roughness: 0.75 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0xc9521e, roughness: 0.7 });

  const manTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.66, 0.28), shirtMat);
  manTorso.position.y = 1.15;
  manTorso.castShadow = true;
  heroMan.add(manTorso);

  const manHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), skinMat);
  manHead.position.y = 1.66;
  manHead.castShadow = true;
  heroMan.add(manHead);

  const manPack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), packMat);
  manPack.position.set(0, 1.18, 0.2);
  heroMan.add(manPack);

  const manLegL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.18), pantsMat);
  manLegL.position.set(-0.13, 0.42, 0);
  const manLegR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.18), pantsMat);
  manLegR.position.set(0.13, 0.42, 0);
  const manArmL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.14), shirtMat);
  manArmL.position.set(-0.33, 1.12, 0);
  const manArmR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.14), shirtMat);
  manArmR.position.set(0.33, 1.12, 0);
  heroMan.add(manLegL, manLegR, manArmL, manArmR);

  heroMan.position.set(-7.6, 0.28, -14);
  heroMan.visible = false;
  world.add(heroMan);

  // 3C. HERO RAPIDKL 750 BUS (Glides down dedicated emerald bus lane!)
  const heroBus750 = new THREE.Group();
  const busBodyMat = new THREE.MeshStandardMaterial({ color: 0xf7f8f6, roughness: 0.34, metalness: 0.12 });
  const busStripeMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.38 });
  const busGlassMat = new THREE.MeshStandardMaterial({ color: 0x1a2c39, roughness: 0.18, metalness: 0.55 });
  const busLedMat = new THREE.MeshBasicMaterial({ color: 0xffc857 });

  const hbHull = new THREE.Mesh(new THREE.BoxGeometry(2.48, 2.48, 10.6), busBodyMat);
  hbHull.position.y = 1.5;
  hbHull.castShadow = true;
  heroBus750.add(hbHull);

  const hbStripe = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.72, 10.64), busStripeMat);
  hbStripe.position.y = 0.88;
  heroBus750.add(hbStripe);

  const hbGlass = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.88, 9.6), busGlassMat);
  hbGlass.position.y = 1.92;
  heroBus750.add(hbGlass);

  // Glowing "750" route LED strip at front (-Z) & rear (+Z)
  const hbLedF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.24, 0.12), busLedMat);
  hbLedF.position.set(0, 2.45, -5.32);
  const hbLedR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.12), busLedMat);
  hbLedR.position.set(0, 2.45, 5.32);
  heroBus750.add(hbLedF, hbLedR);

  heroBus750.position.set(-2.4, 0.08, 10);
  heroBus750.visible = false;
  world.add(heroBus750);

  // 3D. HERO WEEKEND CYCLIST (Same Man Riding His Bicycle on Protected Bike Lane!)
  const heroBike = new THREE.Group();
  const bikeFrameMat = new THREE.MeshStandardMaterial({ color: 0xc9521e, roughness: 0.4, metalness: 0.4 });
  const hbWheelF = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 8, 18), wheelMat);
  hbWheelF.rotation.y = Math.PI / 2;
  hbWheelF.position.set(0, 0.38, -0.68);
  const hbWheelR = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 8, 18), wheelMat);
  hbWheelR.rotation.y = Math.PI / 2;
  hbWheelR.position.set(0, 0.38, 0.68);
  const hbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 1.32), bikeFrameMat);
  hbFrame.position.set(0, 0.66, 0);
  const hbHandle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.08), wheelMat);
  hbHandle.position.set(0, 1.05, -0.52);
  heroBike.add(hbWheelF, hbWheelR, hbFrame, hbHandle);

  // Rider torso + head + backpack + pedaling legs
  const rTorso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), shirtMat);
  rTorso.position.set(0, 1.34, 0.08);
  rTorso.rotation.x = -0.32;
  const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
  rHead.position.set(0, 1.78, -0.06);
  const rPack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.16), packMat);
  rPack.position.set(0, 1.38, 0.28);
  rPack.rotation.x = -0.32;
  const rLegL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.15), pantsMat);
  rLegL.position.set(-0.15, 0.78, 0.06);
  const rLegR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.15), pantsMat);
  rLegR.position.set(0.15, 0.78, 0.06);
  heroBike.add(rTorso, rHead, rPack, rLegL, rLegR);

  heroBike.position.set(7.25, 0.12, -52);
  heroBike.visible = false;
  world.add(heroBike);

  // =========================================================================
  // 4. Congestion Jam Cars in Front + Background Buses
  // =========================================================================

  const cars = [];
  const carColors = [0x4c5660, 0x76818c, 0x353c44, 0x9aa3ab, 0x5c4742, 0x455666];
  const carBodyGeo = new THREE.BoxGeometry(1.75, 0.72, 3.6);
  const carCabinGeo = new THREE.BoxGeometry(1.45, 0.55, 1.85);
  const tailLightGeo = new THREE.BoxGeometry(1.52, 0.19, 0.1);
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xe6392e });

  const carLanes = [-6.4, -2.4, 2.4, 6.4];
  for (let i = 0; i < 34; i++) {
    const laneIdx = i % 4;
    const dir = laneIdx < 2 ? -1 : 1; // Left two lanes head toward KL (-Z) right in front of heroCar!
    const car = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({
      color: carColors[i % carColors.length],
      roughness: 0.45,
      metalness: 0.2
    });
    const body = new THREE.Mesh(carBodyGeo, bMat);
    body.position.y = 0.52;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(carCabinGeo, bMat);
    cabin.position.set(0, 1.05, dir < 0 ? 0.15 : -0.15);
    car.add(cabin);

    const tail = new THREE.Mesh(tailLightGeo, tailLightMat);
    tail.position.set(0, 0.58, dir < 0 ? 1.82 : -1.82);
    car.add(tail);

    let zStart = 32 - i * 4.9;
    // Keep a clear slot right where heroCar starts so they never overlap
    if (laneIdx === 1 && Math.abs(zStart - 42) < 7) zStart -= 10;
    car.position.set(carLanes[laneIdx], 0.08, zStart);
    car.userData = {
      dir: dir,
      laneIdx: laneIdx,
      speed: 1.8 + (i % 4) * 0.4,
      keepInTransit: i < 4 && (laneIdx === 0 || laneIdx === 3)
    };
    world.add(car);
    cars.push(car);
  }

  // Background RapidKL buses (opposite direction on right bus lane)
  const bgBuses = [];
  for (let b = 0; b < 3; b++) {
    const bus = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.38, 10.0), busBodyMat);
    hull.position.y = 1.45;
    bus.add(hull);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.68, 10.04), busStripeMat);
    stripe.position.y = 0.85;
    bus.add(stripe);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 9.1), busGlassMat);
    glass.position.y = 1.86;
    bus.add(glass);

    bus.position.set(2.4, 0.08, -120 + b * 62);
    bus.scale.setScalar(0.001);
    world.add(bus);
    bgBuses.push(bus);
  }

  // =========================================================================
  // 5. Shaded Tropical Trees, Bus Shelters (incl. Hero Stop at z = -24), Lamps
  // =========================================================================

  const trees = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4938, roughness: 0.95 });
  const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2c7a4e, roughness: 0.82 });
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a915d, roughness: 0.85 });

  for (let z = 44; z >= -130; z -= 14) {
    [
      [-10.6, z],
      [10.6, z - 5]
    ].forEach(function (pos, idx) {
      // Leave clean space at the Hero Bus 750 Shelter (x = -10, z = -24)
      if (pos[0] < 0 && Math.abs(pos[1] - -24) < 6) return;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.2, 7), trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.0 + (idx % 2) * 0.3, 1),
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
  const shelterRoofMat = new THREE.MeshStandardMaterial({ color: 0x0c6b4d, roughness: 0.45 });
  const shelterPostMat = new THREE.MeshStandardMaterial({ color: 0x24313b, roughness: 0.5 });
  [
    [-10.0, -24], // Hero's Bus 750 boarding shelter!
    [10.0, -24],
    [-10.0, -76],
    [10.0, -76]
  ].forEach(function (pos) {
    const sh = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 6.8), shelterRoofMat);
    roof.position.y = 2.95;
    roof.castShadow = true;
    sh.add(roof);

    [-2.8, 2.8].forEach(function (pz) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.95, 0.16), shelterPostMat);
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
  // 6. Elevated Malaysian Railway Viaduct, Station Canopy & 4-Car Electric Train
  // =========================================================================

  const railGroup = new THREE.Group();
  const railViaductMat = new THREE.MeshStandardMaterial({ color: 0xc9cfd4, roughness: 0.72 });
  const railTrimMat = new THREE.MeshStandardMaterial({ color: 0x1d4e78, roughness: 0.45 });
  const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x566068, roughness: 0.35, metalness: 0.75 });

  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 280), railViaductMat);
  viaductBeam.position.set(17.5, 8.2, -55);
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.28, 280), railTrimMat);
  viaductTrim.position.set(17.5, 8.75, -55);
  railGroup.add(viaductTrim);

  [-1.1, 1.1].forEach(function (rx) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 280), railSteelMat);
    rail.position.set(17.5 + rx, 8.92, -55);
    railGroup.add(rail);
  });

  const railPierGeo = new THREE.BoxGeometry(1.5, 8.2, 1.8);
  for (let z = 44; z >= -145; z -= 26) {
    const pier = new THREE.Mesh(railPierGeo, railViaductMat);
    pier.position.set(17.5, 4.1, z);
    railGroup.add(pier);
  }

  // Modern Station Canopy
  const stationRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.28, 28), railTrimMat);
  stationRoof.position.set(17.5, 13.6, -24);
  railGroup.add(stationRoof);
  const stationDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 28), railViaductMat);
  stationDeck.position.set(17.5, 8.6, -24);
  railGroup.add(stationDeck);

  // 4-Car Electric MRT/LRT Train
  const train = new THREE.Group();
  const trainHullMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.28, metalness: 0.22 });
  const trainWindowMat = new THREE.MeshBasicMaterial({ color: 0xffe9ba });

  for (let carIdx = 0; carIdx < 4; carIdx++) {
    const coach = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.75, 2.75, 11.4), trainHullMat);
    body.position.y = 1.45;
    coach.add(body);
    const livery = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.65, 11.44), railTrimMat);
    livery.position.y = 0.72;
    coach.add(livery);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.22, 11.46), busStripeMat);
    accent.position.y = 1.12;
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
  // 7. Transforming Buildings (Grey Concrete -> Warm Pretty + Rooftop Gardens)
  //    & Real 3D Kuala Lumpur Landmarks from Alif's Portfolio!
  // =========================================================================

  const skyline = new THREE.Group();
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.82, metalness: 0.1 });
  const roofGardens = [];

  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 8 + ((i * 7) % 19);
    const w = 6 + (i % 3) * 2.1;
    const dLen = 6.5 + (i % 4) * 2.2;
    const bx = side * (25 + (i % 3) * 6.5);
    const bz = 44 - i * 7.0;

    const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), bldgMat);
    blk.position.set(bx, h / 2 - 0.1, bz);
    blk.receiveShadow = true;
    skyline.add(blk);

    // Rooftop greenery cap that blooms as the city becomes prettier!
    const roofGreen = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.9, dLen * 0.86), vineBrightMat);
    roofGreen.position.set(bx, h + 0.35, bz);
    roofGreen.scale.set(1, 0.001, 1);
    skyline.add(roofGreen);
    roofGardens.push(roofGreen);
  }

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
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffe4aa, transparent: true, opacity: 0 });
  const klGroup = new THREE.Group();
  skyline.add(klGroup);
  world.add(skyline);

  const LANDMARK_SCALE = 78 / 444.138;
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
          if (pair[0] === 'body') {
            const eg = new THREE.EdgesGeometry(geo, 38);
            const lines = new THREE.LineSegments(eg, edgeMat);
            lines.scale.set(1.004, 1, 1.004);
            grp.add(lines);
          }
        });
        grp.scale.setScalar(LANDMARK_SCALE);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        klGroup.add(grp);
      })
      .catch(function () {});
  }

  loadPortfolioModel('./assets/city/klcc.json', 0, 0, -185, 0.12);
  loadPortfolioModel('./assets/city/menara_kl.json', -62, 6, -162, 0.3);
  loadPortfolioModel('./assets/city/merdeka118.json', 58, 0, -210, -0.35);
  loadPortfolioModel('./assets/city/exchange106.json', -28, 0, -225, 0.18);

  // =========================================================================
  // 8. State & Public API (Strictly Scroll-Driven — Zero Mouse Drift!)
  // =========================================================================

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
  // 9. Animation Loop — The Man's Journey (Car -> Exit -> Bus 750 -> Bike)
  // =========================================================================

  let morphFactor = 0;
  let greenFactor = 0;
  let lastTime = performance.now();
  const camTargetPos = new THREE.Vector3(-2.4, 3.2, 50.5);
  const camTargetLook = new THREE.Vector3(-2.4, 1.8, 0);

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    const elapsed = now * 0.001;
    lastTime = now;

    smoothScroll = lerp(smoothScroll, scrollProgress, reducedMotion ? 1 : 0.075);
    const s = clamp(smoothScroll, 0, 1);
    const speedMult = reducedMotion ? 0 : 1;

    // City beautification & congestion reduction
    let targetMorph = smoothstep(0.28, 0.72, s);
    if (previewMode === 'highway') targetMorph = 0;
    if (previewMode === 'transit') targetMorph = 1;
    morphFactor = lerp(morphFactor, targetMorph, reducedMotion ? 1 : 0.08);

    // Highway greenery (overpass stays standing, wraps in tropical vines!)
    let targetGreen = smoothstep(0.22, 0.44, s);
    if (previewMode === 'transit') targetGreen = 1;
    if (previewMode === 'highway') targetGreen = 0;
    if (greenOverride === 'bare') targetGreen = 0;
    if (greenOverride === 'green') targetGreen = 1;
    greenFactor = lerp(greenFactor, targetGreen, reducedMotion ? 1 : 0.08);

    for (let g = 0; g < overpassGreenery.length; g++) {
      const item = overpassGreenery[g];
      const gs = Math.max(0.001, greenFactor);
      item.visible = greenFactor > 0.02;
      if (g < overpassGreenery.length - 2) item.scale.set(gs, gs, gs);
      else item.scale.set(1, gs, 1);
    }

    // Buildings become warmer & prettier with rooftop gardens!
    const bldgPretty = smoothstep(0.26, 0.65, s);
    const targetBldgHex = isDark ? 0x263847 : (bldgPretty > 0.5 ? 0xd8cfc0 : 0x9aa2a8);
    bldgMat.color.lerp(new THREE.Color(targetBldgHex), 0.05);
    for (let r = 0; r < roofGardens.length; r++) {
      roofGardens[r].scale.set(1, Math.max(0.001, bldgPretty), 1);
      roofGardens[r].visible = bldgPretty > 0.04;
    }

    // Road markings, bus lanes, bike lanes, zebra crossings
    busLaneMat.opacity = smoothstep(0.32, 0.62, morphFactor) * 0.94;
    bikeLaneMat.opacity = smoothstep(0.55, 0.85, morphFactor) * 0.92;
    zebraMat.opacity = smoothstep(0.35, 0.75, morphFactor);
    dashMat.opacity = lerp(0.78, 0.18, morphFactor);

    // Sidewalks widen, trees & bus shelters sprout
    const swOffset = lerp(12.3, 11.45, morphFactor);
    sidewalkL.position.x = -swOffset;
    sidewalkR.position.x = swOffset;

    const treeGrowth = smoothstep(0.20, 0.75, morphFactor);
    for (let i = 0; i < trees.length; i++) {
      const tr = trees[i];
      const sc = clamp((treeGrowth - tr.userData.delay) / (1 - tr.userData.delay), 0.001, 1);
      tr.scale.setScalar(sc);
    }
    const shelterGrowth = smoothstep(0.32, 0.65, morphFactor);
    for (let i = 0; i < shelters.length; i++) {
      shelters[i].scale.setScalar(Math.max(0.001, shelterGrowth));
    }

    // Elevated Railway Viaduct + 4-Car MRT/LRT Electric Train
    const railLift = smoothstep(0.36, 0.72, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z += 22 * dt * speedMult;
      if (train.position.z > 105) train.position.z = -155;
    }

    // Background traffic jam cars (jammed early, thin out dramatically later!)
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const carVis = car.userData.keepInTransit ? 1 : clamp(1 - morphFactor * 1.42, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;
      if (car.visible) {
        const jamSpd = lerp(car.userData.speed * 0.45, car.userData.speed * 2.4, morphFactor);
        car.position.z += car.userData.dir * jamSpd * dt * speedMult;
        if (car.position.z < -145) car.position.z = 58;
        if (car.position.z > 58) car.position.z = -145;
      }
    }

    // Background opposite-lane buses
    const bgBusVis = smoothstep(0.38, 0.68, morphFactor);
    for (let b = 0; b < bgBuses.length; b++) {
      bgBuses[b].scale.setScalar(Math.max(0.001, bgBusVis));
      bgBuses[b].visible = bgBusVis > 0.04;
      if (bgBuses[b].visible) {
        bgBuses[b].position.z += 11 * dt * speedMult;
        if (bgBuses[b].position.z > 65) bgBuses[b].position.z = -140;
      }
    }

    // =======================================================================
    // HERO STORY CHOREOGRAPHY (Scroll 0.00 -> 1.00)
    // =======================================================================

    if (s < 0.48) {
      // ACT 1 & 2 (0.00 - 0.48): Follow Hero's Car stuck in jam -> City gets prettier!
      const driveT = s / 0.48;
      const carZ = lerp(42, -6, driveT);
      heroCar.position.set(-2.4, 0.08, carZ);
      heroCar.rotation.y = 0;
      heroBrakeMat.color.setHex(0xff3b30);
      heroMan.visible = false;
      heroBus750.visible = false;
      heroBike.visible = false;

      // Follow right behind heroCar, seeing the jams ahead & transforming corridor
      camTargetPos.set(-2.4, lerp(3.0, 4.4, driveT), carZ + lerp(8.2, 10.5, driveT));
      camTargetLook.set(-2.0, lerp(1.7, 3.2, driveT), carZ - 36);

    } else if (s < 0.64) {
      // ACT 3 (0.48 - 0.64): Logical Transition — Car parks, Man exits & walks to Bus 750 Shelter!
      const t = (s - 0.48) / 0.16; // 0 -> 1
      const parkT = smoothstep(0, 0.38, t);
      const walkT = smoothstep(0.38, 1.0, t);

      // Car pulls cleanly into curbside bay & stops
      heroCar.position.set(lerp(-2.4, -6.9, parkT), 0.08, lerp(-6, -14, parkT));
      heroCar.rotation.y = Math.sin(parkT * Math.PI) * 0.28;
      heroBrakeMat.color.setHex(parkT > 0.9 ? 0x552222 : 0xff3b30);

      // Man steps out of parked car & walks along shaded kaki lima to Bus 750 shelter (z = -24)
      heroMan.visible = t > 0.34;
      heroMan.position.set(lerp(-8.1, -9.8, walkT), 0.28, lerp(-14, -23.5, walkT));
      heroMan.rotation.y = 0;

      // Animated walking stride
      const swing = Math.sin(elapsed * 7.5) * (walkT > 0.02 && walkT < 0.96 ? 0.55 : 0);
      manLegL.rotation.x = swing;
      manLegR.rotation.x = -swing;
      manArmL.rotation.x = -swing * 0.7;
      manArmR.rotation.x = swing * 0.7;

      // RapidKL 750 approaches the shelter smoothly
      heroBus750.visible = t > 0.45;
      heroBus750.position.set(-2.4, 0.08, lerp(6, -22, smoothstep(0.45, 1.0, t)));
      heroBike.visible = false;

      // Camera frames the car parking -> man stepping out -> walking to bus shelter!
      camTargetPos.set(lerp(-1.2, -3.6, t), lerp(4.2, 3.5, t), lerp(-4, -12.5, t));
      camTargetLook.set(lerp(-6.5, -8.5, t), 1.6, lerp(-16, -24, t));

    } else if (s < 0.82) {
      // ACT 4 (0.64 - 0.82): Riding RapidKL 750 Bus — Chilled, Dedicated Emerald Lane!
      const t = (s - 0.64) / 0.18;
      heroCar.position.set(-6.9, 0.08, -14); // Parked car stays behind!
      heroMan.visible = false; // He's now riding comfortably inside Bus 750!
      heroBus750.visible = true;
      const busZ = lerp(-22, -74, t);
      heroBus750.position.set(-2.4, 0.08, busZ);
      heroBike.visible = false;

      // Smooth follow behind Bus 750 gliding down the emerald lane!
      camTargetPos.set(lerp(-0.5, 1.2, t), lerp(4.4, 5.0, t), busZ + 14.5);
      camTargetLook.set(-1.0, 2.8, busZ - 35);

    } else {
      // ACT 5 (0.82 - 1.00): Weekends on a Bicycle + Sweeping 2036 Walkable KL Skyline Vista!
      const t = (s - 0.82) / 0.18;
      heroCar.position.set(-6.9, 0.08, -14);
      heroMan.visible = false;
      heroBus750.visible = true;
      heroBus750.position.set(-2.4, 0.08, lerp(-74, -112, t));

      heroBike.visible = true;
      const bikeZ = lerp(-58, -96, t);
      heroBike.position.set(7.25, 0.12, bikeZ);

      // Animated pedaling
      const pedal = Math.sin(elapsed * 9.0) * 0.45;
      rLegL.rotation.x = pedal;
      rLegR.rotation.x = -pedal;

      // Follow weekend cyclist first (0 - 0.55), then rise into 2036 KL skyline vista (0.55 - 1.0)!
      const vistaT = smoothstep(0.52, 1.0, t);
      camTargetPos.set(
        lerp(4.2, 0.0, vistaT),
        lerp(3.2, 19.5, vistaT),
        lerp(bikeZ + 9.5, -18, vistaT)
      );
      camTargetLook.set(
        lerp(6.5, 0.0, vistaT),
        lerp(1.5, 16.5, vistaT),
        lerp(bikeZ - 26, -185, vistaT)
      );
    }

    // Smooth camera glide (zero mouse drift!)
    camera.position.lerp(camTargetPos, reducedMotion ? 1 : 0.085);
    camera.lookAt(camTargetLook);

    // Palette & Dark Mode adaptation
    const targetPal = isDark ? PALETTES.dark : (lightingMode === 'golden' ? PALETTES.golden : PALETTES.day);
    scene.background.lerp(targetPal.sky, 0.08);
    scene.fog.color.lerp(targetPal.fog, 0.08);
    sunLight.color.lerp(targetPal.sun, 0.08);
    sunLight.intensity = lerp(sunLight.intensity, targetPal.sunInt, 0.08);
    hemiLight.color.lerp(targetPal.hemiSky, 0.08);
    hemiLight.groundColor.lerp(targetPal.hemiGround, 0.08);
    hemiLight.intensity = lerp(hemiLight.intensity, targetPal.hemiInt, 0.08);

    groundMat.color.lerp(new THREE.Color(isDark ? 0x16202a : 0xd9d1c2), 0.08);
    landmarkBodyMat.color.lerp(new THREE.Color(isDark ? 0x2b3e4f : 0xb7c6d1), 0.08);
    landmarkGlassMat.color.lerp(new THREE.Color(isDark ? 0x457596 : 0x89aec4), 0.08);
    landmarkGlassMat.emissiveIntensity = lerp(
      landmarkGlassMat.emissiveIntensity,
      isDark ? 0.55 : (lightingMode === 'golden' ? 0.28 : 0.14),
      0.08
    );
    edgeMat.opacity = lerp(edgeMat.opacity, isDark ? 0.28 : 0.0, 0.08);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
