import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGoldenHourPMREM } from './mirage/env.js';
import { buildGroundRoads, buildHighwayRamps, applyHorizonFade, deckRibbonGeometry } from './city/roadMesh.js';
import { BASIN } from './city/layout.js';
import { buildSkyline, buildBukitNanas } from './city/skyline.js';
import { cameraPose } from './camera/path.js';
import { createPost } from './post.js';

export function createManifestoScene() {
  const canvas = document.getElementById('scene-canvas');
  if (!canvas) {
    return {
      setScrollProgress: () => {},
      setCompareRatio: () => {},
      triggerBusDeparture: () => {}
    };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
  } catch {
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 820 ? 1.0 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = window.innerWidth <= 820
    ? THREE.PCFShadowMap
    : THREE.PCFSoftShadowMap;
  renderer.toneMappingExposure = 1.12;
  // With post-processing the filmic curve runs after bloom (src/post.js); without it the renderer does it.
  let post = null;

  const scene = new THREE.Scene();
  scene.environment = createGoldenHourPMREM(renderer);

  const GOLDEN_PALETTE = {
    skyTop: new THREE.Color(0x3b6799),
    skyMid: new THREE.Color(0xe6ad72),
    skyHorizon: new THREE.Color(0xf8d7ab),
    fog: new THREE.Color(0xedd0a8),
    sun: new THREE.Color(0xffbe73),
    sunInt: 1.72,
    hemiSky: new THREE.Color(0xffe4bc),
    hemiGround: new THREE.Color(0x9c7e5c),
    hemiInt: 0.86
  };

  scene.background = GOLDEN_PALETTE.fog.clone();
  scene.fog = new THREE.FogExp2(GOLDEN_PALETTE.fog.getHex(), 0.0020);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1.5, 2000);
  camera.position.set(-2.4, 2.05, 61.2);

  post = createPost(renderer, scene, camera);
  renderer.toneMapping = post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;

  const hemiLight = new THREE.HemisphereLight(
    GOLDEN_PALETTE.hemiSky,
    GOLDEN_PALETTE.hemiGround,
    GOLDEN_PALETTE.hemiInt
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(GOLDEN_PALETTE.sun, GOLDEN_PALETTE.sunInt);
  sunLight.position.set(85, 78, 55);
  sunLight.castShadow = true;
  const shadowRes = window.innerWidth <= 820 ? 1024 : 2048;
  sunLight.shadow.mapSize.width = shadowRes;
  sunLight.shadow.mapSize.height = shadowRes;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 450;
  const shadowExtent = 140;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  scene.add(sunLight.target);
  const SUN_OFFSET = new THREE.Vector3(85, 78, 55);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function b64(str, TypedArr) {
    const bin = atob(str);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TypedArr(u.buffer);
  }

  // =========================================================================
  // 1. Golden Hour Sky Dome & Sculpted Klang Valley Basin Terrain
  // =========================================================================

  const skyUniforms = {
    uTop: { value: GOLDEN_PALETTE.skyTop.clone() },
    uMid: { value: GOLDEN_PALETTE.skyMid.clone() },
    uHorizon: { value: GOLDEN_PALETTE.skyHorizon.clone() }
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
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), skyMat));

  const world = new THREE.Group();
  scene.add(world);

  const texLoader = new THREE.TextureLoader();
  const terrColorTex = texLoader.load('./assets/city/terrain_color.jpg');
  const terrAOTex = texLoader.load('./assets/city/terrain_ao.jpg');

  const terrGeo = new THREE.PlaneGeometry(1800, 1800, 48, 48);
  terrGeo.rotateX(-Math.PI / 2);
  const tPos = terrGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const dist = Math.hypot(vx, vz + 160);
    let y = -0.15;
    if (dist > BASIN.flatRadius) {
      const k = smoothstep(BASIN.flatRadius, BASIN.flatRadius + 380, dist);
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
    color: 0xd8d0c0,
    roughness: 0.94,
    metalness: 0.02
  });
  const terrain = new THREE.Mesh(terrGeo, groundMat);
  terrain.receiveShadow = true;
  world.add(terrain);

  // =========================================================================
  // 2. Shah Alam -> KL Corridor Boulevard & KLCC Perimeter Ring Road
  // =========================================================================

  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333a44, roughness: 0.88 });
  const farAsphaltMat = applyHorizonFade(asphaltMat.clone(), 385, 480); // boulevard and cross streets melt into the haze
  const roadSlab = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.12, 585), farAsphaltMat);
  roadSlab.position.set(0, 0.06, 37.5); // z 330 (horizon) to -255 (KLCC junction)
  roadSlab.receiveShadow = true;
  world.add(roadSlab);

  // KLCC ring road, the arterials that leave it, and the connector from the boulevard.
  // All defined in src/city/network.js; tools/check-city.mjs proves none of them dead-ends.
  world.add(buildGroundRoads());

  const uglySidewalkCol = new THREE.Color(0x88857e);
  const prettySidewalkCol = new THREE.Color(0xe6d8c0);
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: uglySidewalkCol.clone(), roughness: 0.86 });

  [-11.2, 11.2].forEach((sx) => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 562), sidewalkMat);
    sw.position.set(sx, 0.14, 49); // z 330 to -232
    sw.receiveShadow = true;
    world.add(sw);
  });

  // Cross-streets
  [-12, -96, -182].forEach((cz) => {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(940, 0.10, 11.5), farAsphaltMat);
    cross.position.set(0, 0.05, cz);
    cross.receiveShadow = true;
    world.add(cross);
  });

  // Enforced RapidKL Cobalt Bus Lanes (x = ±2.4) & Emerald Bike Lanes (x = ±7.1)
  const busLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0047ab,
    roughness: 0.52,
    transparent: true,
    opacity: 0
  });
  const bikeLaneMat = new THREE.MeshStandardMaterial({
    color: 0x0e7c59,
    roughness: 0.6,
    transparent: true,
    opacity: 0
  });
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf7f5ef, transparent: true, opacity: 0 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe3dfd5, transparent: true, opacity: 0.82 });

  [-2.4, 2.4].forEach((bx) => {
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 326), busLaneMat);
    bl.rotation.x = -Math.PI / 2;
    bl.position.set(bx, 0.13, -90);
    world.add(bl);
  });

  [-7.1, 7.1].forEach((kx) => {
    const kl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 326), bikeLaneMat);
    kl.rotation.x = -Math.PI / 2;
    kl.position.set(kx, 0.13, -90);
    world.add(kl);
  });

  for (let z = 68; z >= -248; z -= 8) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3.6), dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(0, 0.132, z);
    world.add(d);
  }

  [-12, -96, -182].forEach((zz) => {
    for (let x = -7.6; x <= 7.6; x += 1.35) {
      const zbar = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 3.2), zebraMat);
      zbar.rotation.x = -Math.PI / 2;
      zbar.position.set(x, 0.135, zz);
      world.add(zbar);
    }
  });

  // =========================================================================
  // 3. Left Elevated Highway Overpass (Active & Greened in Ch 02)
  // =========================================================================

  const highwayGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.86 });
  const hwyDeck = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.05, 316), concreteMat);
  hwyDeck.position.set(-16.5, 7.2, -84);
  hwyDeck.castShadow = true;
  hwyDeck.receiveShadow = true;
  highwayGroup.add(hwyDeck);

  const hwyAsphalt = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.12, 316), asphaltMat);
  hwyAsphalt.position.set(-16.5, 7.75, -84);
  hwyAsphalt.receiveShadow = true;
  highwayGroup.add(hwyAsphalt);

  [-20.6, -12.4].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 316), concreteMat);
    rail.position.set(rx, 8.05, -84);
    highwayGroup.add(rail);
  });

  for (let pz = 64; pz >= -232; pz -= 28) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 7.2, 12), concreteMat);
    pier.position.set(-16.5, 3.6, pz);
    pier.castShadow = true;
    highwayGroup.add(pier);
  }
  // Both ends of the elevated highway come down and land on roads instead of stopping in mid-air.
  const rampConcrete = concreteMat.clone();
  rampConcrete.side = THREE.DoubleSide;
  const rampAsphalt = asphaltMat.clone();
  rampAsphalt.side = THREE.DoubleSide;
  highwayGroup.add(buildHighwayRamps(rampConcrete, rampAsphalt));
  world.add(highwayGroup);

  // -------------------------------------------------------------------------
  // 3b. Induced-demand stack: bypass 2 and bypass 3 built on top of bypass 1.
  //     Only shown while the simulator section is active (see setSimScenario).
  // -------------------------------------------------------------------------
  const SEDAN_COLORS = [
    0xdadfe5, 0x3b4856, 0x9aa5b1, 0x1e4c8a, 0xb8352e,
    0xc4a46c, 0x2b333d, 0x4b7466, 0xe8e4dc
  ];
  const HWY_X = -16.5;
  const JAM_LANES = [-2.4, 0, 2.4];          // lane offsets from the deck centre
  const JAM_Z_FROM = 52, JAM_Z_TO = -128, JAM_STEP = 5.6;
  const JAM_ROWS = Math.floor((JAM_Z_FROM - JAM_Z_TO) / JAM_STEP) + 1;
  const JAM_COUNT = JAM_ROWS * JAM_LANES.length;

  const jamBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.15 });
  const jamCabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 });
  const jamTailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const jamBodyGeo = new THREE.BoxGeometry(1.7, 0.7, 4.1);
  const jamCabinGeo = new THREE.BoxGeometry(1.45, 0.55, 2.0);
  const jamTailGeo = new THREE.BoxGeometry(1.45, 0.16, 0.08);
  const jamTmp = new THREE.Object3D();
  const jamCol = new THREE.Color();

  // One bumper-to-bumper block of cars on a deck. Three instanced draws per deck,
  // ordered row by row so a growing `count` reads as a queue filling up.
  function makeJamTraffic(parent, deckTopY, seed) {
    const body = new THREE.InstancedMesh(jamBodyGeo, jamBodyMat, JAM_COUNT);
    const cabin = new THREE.InstancedMesh(jamCabinGeo, jamCabinMat, JAM_COUNT);
    const tail = new THREE.InstancedMesh(jamTailGeo, jamTailMat, JAM_COUNT);
    let i = 0;
    for (let row = 0; row < JAM_ROWS; row++) {
      JAM_LANES.forEach((lx, lane) => {
        const oncoming = lane === 2;
        const z = JAM_Z_FROM - row * JAM_STEP + ((row * 7 + lane * 3 + seed) % 5) * 0.12;
        const flip = oncoming ? -1 : 1;
        jamTmp.rotation.set(0, 0, 0);
        jamTmp.position.set(HWY_X + lx, deckTopY + 0.55, z);
        jamTmp.updateMatrix(); body.setMatrixAt(i, jamTmp.matrix);
        jamTmp.position.set(HWY_X + lx, deckTopY + 1.18, z - 0.1 * flip);
        jamTmp.updateMatrix(); cabin.setMatrixAt(i, jamTmp.matrix);
        jamTmp.position.set(HWY_X + lx, deckTopY + 0.62, z + 2.06 * flip);
        jamTmp.updateMatrix(); tail.setMatrixAt(i, jamTmp.matrix);
        jamCol.setHex(SEDAN_COLORS[(i * 5 + seed) % SEDAN_COLORS.length]);
        body.setColorAt(i, jamCol);
        cabin.setColorAt(i, jamCol.multiplyScalar(0.62)); // darker glass-and-roof tone of the same car
        i++;
      });
    }
    [body, cabin, tail].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
      m.count = 0;
      parent.add(m);
    });
    body.instanceColor.needsUpdate = true;
    cabin.instanceColor.needsUpdate = true;
    return {
      meshes: [body, cabin, tail],
      setFill(f) {
        const n = Math.floor(JAM_COUNT * clamp(f, 0, 1));
        body.count = cabin.count = tail.count = n;
        body.visible = cabin.visible = tail.visible = n > 0;
      }
    };
  }

  const hwyJam = makeJamTraffic(highwayGroup, 7.81, 0);

  // Malaysian-style interchange spaghetti: flyovers that loop, cross and stack for no
  // visible reason. Each ribbon is a curved elevated road with piers and its own jam.
  const RIBBON_W = 2.3;          // half width: two lanes
  const RIBBON_T = 0.9;          // deck thickness
  const RIBBON_SEGS = 120;
  const RIBBON_CAR_STEP = 5.4;
  const PIER_STEP = 15;
  const ribbonMat = concreteMat.clone();
  // own material so the bypass decks can be tinted without touching the highway
  const ribbonUp = new THREE.Vector3(0, 1, 0);
  const rbA = new THREE.Vector3(), rbT = new THREE.Vector3(), rbS = new THREE.Vector3(), rbU = new THREE.Vector3();
  const rbQ = new THREE.Matrix4(), rbLocal = new THREE.Matrix4();
  const rbPier = new THREE.CylinderGeometry(0.7, 0.85, 1, 8);
  rbPier.translate(0, 0.5, 0);

  function helixPoints(cx, cz, R, turns, dir, drift, y0, y1, a0 = 0) {
    const pts = [];
    for (let k = 0; k <= 44; k++) {
      const t = k / 44;
      const a = a0 + dir * Math.PI * 2 * turns * t;
      const y = y0 + (y1 - y0) * t * t * (3 - 2 * t);
      pts.push(new THREE.Vector3(cx + R * Math.cos(a), y, cz + drift * t + R * Math.sin(a)));
    }
    return pts;
  }

  function weavePoints(zFrom, zTo, xAt, y0, y1) {
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const z = zFrom + (zTo - zFrom) * t;
      pts.push(new THREE.Vector3(xAt(z), y0 + (y1 - y0) * t, z));
    }
    return pts;
  }

  function makeRibbon(points, seed) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const len = curve.getLength();

    const geo = deckRibbonGeometry(curve, RIBBON_SEGS, RIBBON_W, RIBBON_T);
    const deck = new THREE.Mesh(geo, ribbonMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    deck.frustumCulled = false;

    // Piers, one every PIER_STEP along the road.
    const pierCount = Math.max(2, Math.floor(len / PIER_STEP));
    const piers = new THREE.InstancedMesh(rbPier, concreteMat, pierCount);
    for (let k = 0; k < pierCount; k++) {
      curve.getPointAt((k + 0.5) / pierCount, rbA);
      const h = Math.max(0.5, rbA.y - RIBBON_T);
      jamTmp.position.set(rbA.x, 0, rbA.z);
      jamTmp.rotation.set(0, 0, 0);
      jamTmp.scale.set(1, h, 1);
      jamTmp.updateMatrix();
      piers.setMatrixAt(k, jamTmp.matrix);
    }
    jamTmp.scale.set(1, 1, 1);
    piers.instanceMatrix.needsUpdate = true;
    piers.castShadow = true;
    piers.frustumCulled = false;
    piers.count = 0;

    // Jam: two lanes of cars nose to tail along the whole road.
    const rows = Math.max(2, Math.floor(len / RIBBON_CAR_STEP));
    const n = rows * 2;
    const body = new THREE.InstancedMesh(jamBodyGeo, jamBodyMat, n);
    const cabin = new THREE.InstancedMesh(jamCabinGeo, jamCabinMat, n);
    const tail = new THREE.InstancedMesh(jamTailGeo, jamTailMat, n);
    let ci = 0;
    for (let r = 0; r < rows; r++) {
      const u = Math.min(0.999, (r + 0.5) / rows);
      curve.getPointAt(u, rbA);
      curve.getTangentAt(u, rbT);
      rbS.crossVectors(ribbonUp, rbT).normalize();
      for (let lane = 0; lane < 2; lane++) {
        const off = lane === 0 ? -1.15 : 1.15;
        jamTmp.position.set(rbA.x + rbS.x * off, rbA.y + rbS.y * off, rbA.z + rbS.z * off);
        jamTmp.up.copy(ribbonUp);
        jamTmp.lookAt(jamTmp.position.x + rbT.x, jamTmp.position.y + rbT.y, jamTmp.position.z + rbT.z);
        jamTmp.updateMatrix();
        rbQ.copy(jamTmp.matrix);
        // front is +z after lookAt, so the brake lights sit at -z
        rbLocal.makeTranslation(0, 0.5, 0); body.setMatrixAt(ci, rbLocal.premultiply(rbQ));
        rbLocal.makeTranslation(0, 1.13, -0.1); cabin.setMatrixAt(ci, rbLocal.premultiply(rbQ));
        rbLocal.makeTranslation(0, 0.57, -2.06); tail.setMatrixAt(ci, rbLocal.premultiply(rbQ));
        jamCol.setHex(SEDAN_COLORS[(ci * 7 + seed) % SEDAN_COLORS.length]);
        body.setColorAt(ci, jamCol);
        cabin.setColorAt(ci, jamCol.multiplyScalar(0.62));
        ci++;
      }
    }
    [body, cabin, tail].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
      m.count = 0;
    });
    body.instanceColor.needsUpdate = true;
    cabin.instanceColor.needsUpdate = true;
    jamTmp.position.set(0, 0, 0);
    jamTmp.quaternion.identity();

    const group = new THREE.Group();
    group.add(deck, piers, body, cabin, tail);
    return {
      group,
      // grown: 0..1 of the road built; filled: 0..1 of its cars present
      set(grown, filled) {
        const segs = Math.floor(RIBBON_SEGS * clamp(grown, 0, 1));
        geo.setDrawRange(0, segs * 24);
        deck.visible = segs > 0;
        piers.count = Math.floor(pierCount * clamp(grown, 0, 1));
        const c = Math.floor(n * clamp(grown, 0, 1) * clamp(filled, 0, 1));
        body.count = cabin.count = tail.count = c;
        body.visible = cabin.visible = tail.visible = c > 0;
      }
    };
  }

  // Bypass 2 and Bypass 3. Deliberately illogical: loops that return to where they started,
  // roads that cross over each other at three heights, ramps that end in the sky.
  const SPAGHETTI = [
    [
      helixPoints(-14, 32, 10, 1.25, 1, -35, 13, 22),
      helixPoints(-6, -22, 12, 1.5, -1, -40, 15, 25, 1.2),
      weavePoints(56, -118, (z) => -12 + 12 * Math.sin(z / 16), 17, 21),
      helixPoints(-20, -72, 9, 1.3, 1, -30, 14, 24, 2.4),
    ],
    [
      weavePoints(52, -112, (z) => -4 + 14 * Math.sin(z / 12 + 1.2), 27, 31),
      helixPoints(-10, 10, 13, 1.6, -1, -50, 26, 36, 0.6),
      helixPoints(-18, -45, 11, 1.4, 1, -30, 28, 38, 3.4),
      helixPoints(2, -80, 10, 1.5, -1, -25, 27, 37, 2.0),
      weavePoints(42, -100, (z) => -20 + 9 * Math.cos(z / 10), 35, 29),
    ],
  ];

  const bypassTiers = SPAGHETTI.map((paths, k) => {
    const grp = new THREE.Group();
    const ribbons = paths.map((pts, j) => {
      const rb = makeRibbon(pts, k * 13 + j * 5);
      grp.add(rb.group);
      return rb;
    });
    grp.visible = false;
    world.add(grp);
    return { grp, ribbons, built: 0, fill: 0 };
  });

  // =========================================================================
  // 4. Right Elevated LRT/MRT Viaduct, Station & Underground Tunnel Portal
  // =========================================================================

  const railGroup = new THREE.Group();
  const viaductMat = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.72 });
  const rapidBlueMat = new THREE.MeshStandardMaterial({ color: 0x0047ab, roughness: 0.45 });
  const rapidRedMat = new THREE.MeshStandardMaterial({ color: 0xd92332, roughness: 0.45 });

  const viaductBeam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.25, 446), viaductMat);
  viaductBeam.position.set(17.8, 8.4, 27); // z 250 to -196
  viaductBeam.castShadow = true;
  railGroup.add(viaductBeam);

  const viaductTrim = new THREE.Mesh(new THREE.BoxGeometry(5.96, 0.26, 446), rapidBlueMat);
  viaductTrim.position.set(17.8, 8.95, 27);
  railGroup.add(viaductTrim);

  for (let rz = 244; rz >= -188; rz -= 24) {
    const rPier = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 8.4, 10), viaductMat);
    rPier.position.set(17.8, 4.2, rz);
    rPier.castShadow = true;
    railGroup.add(rPier);
  }

  // Underground tunnel portal before KLCC (z = -196 -> -236)
  const tunnelRamp = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.25, 42), viaductMat);
  tunnelRamp.position.set(17.8, 4.2, -216);
  tunnelRamp.rotation.x = 0.207;
  railGroup.add(tunnelRamp);

  const portalArch = new THREE.Mesh(new THREE.BoxGeometry(7.4, 5.2, 6.0), viaductMat);
  portalArch.position.set(17.8, 2.5, -236);
  railGroup.add(portalArch);

  // Shah Alam end: the viaduct dives underground too (z 250 -> 292), so it never just stops
  const tunnelRampNear = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.25, 42), viaductMat);
  tunnelRampNear.position.set(17.8, 4.2, 271);
  tunnelRampNear.rotation.x = -0.207;
  railGroup.add(tunnelRampNear);
  const portalNear = new THREE.Mesh(new THREE.BoxGeometry(7.4, 5.2, 6.0), viaductMat);
  portalNear.position.set(17.8, 2.5, 292);
  railGroup.add(portalNear);

  // LRT Station Canopy at z = -102
  const stRoof = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 0.45, 34),
    new THREE.MeshStandardMaterial({ color: 0xeaf0f6, roughness: 0.38, metalness: 0.4 })
  );
  stRoof.position.set(17.8, 12.6, -102);
  stRoof.castShadow = true;
  railGroup.add(stRoof);
  const stAccent = new THREE.Mesh(new THREE.BoxGeometry(8.75, 0.16, 34.1), rapidRedMat);
  stAccent.position.set(17.8, 12.35, -102);
  railGroup.add(stAccent);
  [-3.6, 3.6].forEach((cx) => {
    for (let cz = -116; cz <= -88; cz += 7) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.8, 8), viaductMat);
      col.position.set(17.8 + cx, 10.6, cz);
      railGroup.add(col);
    }
  });

  // 4-Car Elevated LRT Train (lrt_train.glb)
  const train = new THREE.Group();
  const trainCoaches = [];
  for (let i = 0; i < 4; i++) {
    const coach = new THREE.Group();
    coach.position.z = i * 12.1;
    coach.userData = { zOff: i * 12.1 };
    train.add(coach);
    trainCoaches.push(coach);
  }
  train.position.set(17.8, 9.05, -20);
  railGroup.add(train);
  railGroup.visible = false;
  world.add(railGroup);

  // =========================================================================
  // 5. Real Kuala Lumpur Skyline Landmarks & Neighborhood Context
  // =========================================================================

  const klGroup = new THREE.Group();
  klGroup.add(buildBukitNanas(-62, -262));

  const LANDMARK_MATERIALS = {
    klcc: {
      body: new THREE.MeshStandardMaterial({ color: 0xe6edf5, roughness: 0.24, metalness: 0.88 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x3b8ea5,
        emissive: 0x164a5c,
        emissiveIntensity: 0.24,
        roughness: 0.16,
        metalness: 0.72
      })
    },
    menara_kl: {
      body: new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.42, metalness: 0.24 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xd4a24c,
        emissive: 0x704e18,
        emissiveIntensity: 0.28,
        roughness: 0.24,
        metalness: 0.75
      })
    },
    merdeka118: {
      body: new THREE.MeshStandardMaterial({ color: 0xd4dce6, roughness: 0.30, metalness: 0.72 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x3e7ab8,
        emissive: 0x1a426e,
        emissiveIntensity: 0.26,
        roughness: 0.18,
        metalness: 0.80
      })
    },
    exchange106: {
      body: new THREE.MeshStandardMaterial({ color: 0xdfb86c, roughness: 0.28, metalness: 0.78 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x245694,
        emissive: 0x14335c,
        emissiveIntensity: 0.28,
        roughness: 0.16,
        metalness: 0.82
      })
    }
  };

  // glass sits on the same surface as the body in the source meshes: pull it forward so it stops z-fighting
  Object.values(LANDMARK_MATERIALS).forEach(({ glass }) => {
    glass.polygonOffset = true;
    glass.polygonOffsetFactor = -2;
    glass.polygonOffsetUnits = -2;
  });

  const LANDMARK_SCALE = 86 / 444.138;
  function loadPortfolioModel(url, x, y, z, rotY, matPair) {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => {
        const pos = b64(d.positions, Float32Array);
        const grp = new THREE.Group();
        [
          ['body', matPair.body],
          ['glass', matPair.glass]
        ].forEach(([key, mat]) => {
          if (!d[key]) return;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          geo.setIndex(new THREE.BufferAttribute(b64(d[key], Uint16Array), 1));
          geo.computeVertexNormals();
          // degenerate triangles in the source meshes leave NaN normals: those render as black specks
          const nrm = geo.attributes.normal;
          for (let i = 0; i < nrm.count; i++) {
            if (!Number.isFinite(nrm.getX(i) + nrm.getY(i) + nrm.getZ(i))) nrm.setXYZ(i, 0, 1, 0);
          }
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          grp.add(mesh);
        });
        grp.scale.setScalar(LANDMARK_SCALE);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        klGroup.add(grp);
      })
      .catch(() => {});
  }

  loadPortfolioModel('./assets/city/klcc.json', 18, 0, -295, 0.12, LANDMARK_MATERIALS.klcc);
  loadPortfolioModel('./assets/city/menara_kl.json', -62, 10, -262, 0.30, LANDMARK_MATERIALS.menara_kl);
  loadPortfolioModel('./assets/city/merdeka118.json', -66, 0, -186, Math.PI / 2, LANDMARK_MATERIALS.merdeka118);
  loadPortfolioModel('./assets/city/exchange106.json', 72, 0, -198, 0.22, LANDMARK_MATERIALS.exchange106);
  world.add(klGroup);

  // Background skyline: rule-placed buildings (src/city/skylineLayout.js proves none sits on a road).
  // 2026 drab grey -> 2036 warm colours through the same material colour morph as before.
  const uglyTowerCol = new THREE.Color(0x8a9096);
  const colorfulTowerMats = [];
  const skyline = buildSkyline(uglyTowerCol);
  world.add(skyline.group);
  skyline.mats.forEach((m) => colorfulTowerMats.push(m));

  // =========================================================================
  // 6. Hero Blender .glb Assets (Vehicles, Viaduct Greenery, Shelters, Trees)
  // =========================================================================

  const heroBus = new THREE.Group();
  heroBus.position.set(-2.4, 0.12, 48.5);
  heroBus.rotation.y = Math.PI;
  world.add(heroBus);

  const jamCars = [];
  const highwayCars = [];
  const corridorBuses = [];
  const busShelters = [];
  const treeClusters = [];
  const viaductModules = [];
  const coveredWalkways = [];
  const jejantasBridges = [];
  const flowerPlanters = [];
  let sharedPlaza = null;

  function prepGLB(sceneRoot, targetLen, rotY = 0) {
    const root = sceneRoot.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.z, 0.001);
    if (targetLen) root.scale.setScalar(targetLen / maxDim);
    root.rotation.y = rotY;
    root.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(root);
    root.position.y -= scaledBox.min.y;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m && m.isMeshStandardMaterial) m.envMapIntensity = 1.25;
        });
      }
    });
    return root;
  }

  function makeTintedSedan(sedanScene, colHex, rotY = 0) {
    const car = prepGLB(sedanScene, 4.3, rotY);
    car.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m, mi) => {
          if (m && m.name && m.name.toLowerCase().includes('car_paint')) {
            const cloned = m.clone();
            cloned.color.setHex(colHex);
            if (Array.isArray(obj.material)) obj.material[mi] = cloned;
            else obj.material = cloned;
          }
        });
      }
    });
    return car;
  }

  const gltfLoader = new GLTFLoader();

  function loadGLB(url) {
    return new Promise((resolve) => {
      gltfLoader.load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }

  Promise.all([
    loadGLB('./assets/models/rapidkl_750_bus.glb'),
    loadGLB('./assets/models/lrt_train.glb'),
    loadGLB('./assets/models/kl_sedan.glb'),
    loadGLB('./assets/models/kl_bus_shelter.glb'),
    loadGLB('./assets/models/green_viaduct_module.glb'),
    loadGLB('./assets/models/tropical_tree_cluster.glb'),
    loadGLB('./assets/models/shared_space_plaza.glb'),
    loadGLB('./assets/models/kl_shoplot_row.glb'),
    loadGLB('./assets/models/kl_covered_walkway.glb'),
    loadGLB('./assets/models/kl_jejantas_bridge.glb'),
    loadGLB('./assets/models/roadside_flower_planter.glb')
  ]).then(([
    busScene, lrtScene, sedanScene, shelterScene, viaductScene,
    treeScene, plazaScene, shoplotScene, walkwayScene, jejantasScene, planterScene
  ]) => {
    if (lrtScene) {
      trainCoaches.forEach((coach) => {
        coach.add(prepGLB(lrtScene, 11.6, Math.PI));
      });
    }

    if (busScene) {
      heroBus.add(prepGLB(busScene, 11.8, 0));
      for (let b = 0; b < 6; b++) {
        const dir = b % 2 === 0 ? -1 : 1;
        const eb = prepGLB(busScene, 11.4, dir < 0 ? Math.PI : 0);
        eb.position.set(dir < 0 ? -2.4 : 2.4, 0.12, -210 + b * 46);
        eb.scale.setScalar(0.001);
        eb.visible = false;
        eb.userData = { dir, speed: 14 + (b % 2) * 2 };
        world.add(eb);
        corridorBuses.push(eb);
      }
    }

    if (sedanScene) {
      const jamLanes = [-5.4, -2.4, 2.4, 5.4];
      let carIdx = 0;
      for (let z = 58; z >= -220; z -= 8.8) {
        jamLanes.forEach((lx) => {
          if (Math.abs(lx - -2.4) < 0.5 && z > 39 && z < 57) return;
          if (Math.abs(z + 12) < 6 || Math.abs(z + 96) < 6 || Math.abs(z + 182) < 6) return;
          const dir = lx < 0 ? -1 : 1;
          const car = makeTintedSedan(
            sedanScene,
            SEDAN_COLORS[carIdx % SEDAN_COLORS.length],
            dir < 0 ? Math.PI : 0
          );
          car.position.set(lx, 0.12, z + (carIdx % 3) * 0.6);
          car.userData = { dir, speed: 8.5 + (carIdx % 3) * 1.4, keepIn2036: carIdx % 5 === 0 };
          world.add(car);
          jamCars.push(car);
          carIdx++;
        });
      }

      // Active vehicles cruising on top of the left elevated highway
      for (let h = 0; h < 22; h++) {
        const dir = h % 2 === 0 ? -1 : 1;
        const hCar = makeTintedSedan(
          sedanScene,
          SEDAN_COLORS[(h + 2) % SEDAN_COLORS.length],
          dir < 0 ? Math.PI : 0
        );
        hCar.position.set(dir < 0 ? -18.4 : -14.6, 7.81, -230 + h * 13.5);
        hCar.userData = { dir, speed: 16 + (h % 3) * 3 };
        highwayGroup.add(hCar);
        highwayCars.push(hCar);
      }
    }

    if (viaductScene) {
      for (let vz = 52; vz >= -208; vz -= 18) {
        const mod = prepGLB(viaductScene, 18.0, Math.PI / 2);
        mod.position.set(-16.5, 0.7, vz);
        mod.visible = false;
        highwayGroup.add(mod);
        viaductModules.push(mod);
      }
    }

    if (shoplotScene) {
      [44, 16, -28, -56, -112, -140, -168, -204].forEach((sz) => {
        const leftShop = prepGLB(shoplotScene, 24.0, 0);
        leftShop.position.set(-27.2, 0.0, sz);
        world.add(leftShop);

        const rightShop = prepGLB(shoplotScene, 24.0, Math.PI);
        rightShop.position.set(27.2, 0.0, sz);
        world.add(rightShop);
      });
    }

    if (walkwayScene) {
      for (let wz = 48; wz >= -220; wz -= 12) {
        if (Math.abs(wz + 12) < 8 || Math.abs(wz + 96) < 8 || Math.abs(wz + 182) < 8) continue;
        [-10.4, 10.4].forEach((wx) => {
          const wk = prepGLB(walkwayScene, 12.0, wx < 0 ? Math.PI : 0);
          wk.position.set(wx, 0.24, wz);
          wk.scale.setScalar(0.001);
          wk.visible = false;
          world.add(wk);
          coveredWalkways.push(wk);
        });
      }
    }

    if (jejantasScene) {
      [-46, -142].forEach((jz) => {
        const jBridge = prepGLB(jejantasScene, 31.0, 0);
        jBridge.position.set(0, 0.0, jz);
        jBridge.scale.setScalar(0.001);
        jBridge.visible = false;
        world.add(jBridge);
        jejantasBridges.push(jBridge);
      });
    }

    if (planterScene) {
      for (let pz = 52; pz >= -216; pz -= 12) {
        if (Math.abs(pz + 12) < 7 || Math.abs(pz + 96) < 7 || Math.abs(pz + 182) < 7) continue;
        [-8.6, 8.6].forEach((px) => {
          const pl = prepGLB(planterScene, 8.2, 0);
          pl.position.set(px, 0.16, pz);
          pl.scale.setScalar(0.001);
          pl.visible = false;
          world.add(pl);
          flowerPlanters.push(pl);
        });
      }
    }

    if (shelterScene) {
      [
        [-10.4, 0.24, 18, Math.PI / 2],
        [10.4, 0.24, -36, -Math.PI / 2],
        [-10.4, 0.24, -76, Math.PI / 2],
        [10.4, 0.24, -124, -Math.PI / 2],
        [-10.4, 0.24, -162, Math.PI / 2]
      ].forEach(([sx, sy, sz, rotY]) => {
        const sh = prepGLB(shelterScene, 6.2, rotY);
        sh.position.set(sx, sy, sz);
        sh.scale.setScalar(0.001);
        sh.visible = false;
        world.add(sh);
        busShelters.push(sh);
      });
    }

    if (treeScene) {
      for (let tz = 38; tz >= -220; tz -= 24) {
        if (Math.abs(tz + 12) < 9 || Math.abs(tz + 96) < 9 || Math.abs(tz + 182) < 9) continue;
        [-12.4, 12.4].forEach((tx, sideIdx) => {
          const tr = prepGLB(treeScene, 8.8, (tz + sideIdx) * 0.4);
          tr.position.set(tx, 0.24, tz);
          tr.scale.setScalar(0.001);
          tr.visible = false;
          world.add(tr);
          treeClusters.push(tr);
        });
      }
    }

    if (plazaScene) {
      const plaza = prepGLB(plazaScene, 28.0, Math.PI / 2);
      plaza.position.set(-28, 0.05, -132);
      plaza.scale.setScalar(0.001);
      plaza.visible = false;
      world.add(plaza);
      sharedPlaza = plaza;
    }
  });

  // =========================================================================
  // 7. Calm Straight-Axis Camera Choreography & Press-to-Go Opening
  // =========================================================================

  // Camera path, gaze highlights and field of view live in src/camera/path.js (checked by tools/check-city.mjs).

  let scrollProgress = 0;
  let smoothScroll = 0;
  let compareRatio = null;
  let simKey = null; // 'base' | 'bypass2' | 'bypass3' | 'rail' while the simulator is on screen
  let simBlend = 0;
  let hwyFill = 0;
  // Simulator camera: high and to the right of the stack, looking down the corridor,
  // so every deck's traffic is visible between the title card and the control panel.
  const simPos = new THREE.Vector3(32, 44, 92);
  const simLook = new THREE.Vector3(-12, 20, -55);
  let introState = 'waiting';
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

  window.addEventListener('pointermove', (e) => {
    if (introState !== 'waiting') return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(heroBus, true);
    document.body.style.cursor = hits.length > 0 ? 'pointer' : 'default';
  }, { passive: true });

  window.addEventListener('click', (e) => {
    if (introState !== 'waiting') return;
    if (e.target && e.target.closest && e.target.closest('header, nav, button, a')) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(heroBus, true);
    if (hits.length > 0) {
      document.body.style.cursor = 'default';
      triggerBusDeparture();
    }
  });

  // ?debug exposes a free camera for screenshots and the layout checks (see tools/check-city.mjs)
  let debugCam = null;
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.__stage = { scene, camera, renderer, setCam: (a) => { debugCam = a; } };
  }

  const api = {
    setScrollProgress(p) {
      scrollProgress = clamp(p, 0, 1);
    },
    setCompareRatio(val) {
      compareRatio = val === null ? null : clamp(val, 0, 1);
    },
    setSimScenario(key) {
      simKey = key || null;
    },
    triggerBusDeparture
  };
  window.ManifestoScene = api;

  window.addEventListener('resize', () => {
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(nextDpr);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (post) post.setSize(window.innerWidth, window.innerHeight, nextDpr);
  });

  // =========================================================================
  // 8. Animation Loop (Golden Hour Atmosphere + Corridor Transformation)
  // =========================================================================

  let morphFactor = 0;
  let greenFactor = 0;
  let prettyFactor = 0;
  let lastTime = performance.now();
  let _lastCamZ = 999;
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const tmpIntroPos = new THREE.Vector3();
  const tmpIntroLook = new THREE.Vector3();

  const uglySkyTop = new THREE.Color(0x9ca0a4);
  const uglySkyMid = new THREE.Color(0xc9bfb2);
  const uglyFogCol = new THREE.Color(0xd2c7b8);
  const tmpColor = new THREE.Color();

  function animate(now) {
    requestAnimationFrame(animate);
    const wallDt = Math.min((now - lastTime) / 1000, 0.5); // real elapsed time, for the simulator's timed steps
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    const elapsed = now * 0.001;
    lastTime = now;

    const damp = reducedMotion ? 1 : 1 - Math.exp(-5.0 * dt);
    smoothScroll = lerp(smoothScroll, scrollProgress, damp);
    const s = clamp(smoothScroll, 0, 1);
    const speedMult = reducedMotion ? 0 : 1;

    const lockedIntro = introState !== 'active';
    const simOn = simKey !== null && !lockedIntro;
    const simRail = simOn && simKey === 'rail';
    const ratio = simOn ? (simRail ? 1 : 0) : compareRatio;
    const targetGreen = lockedIntro ? 0 : (ratio !== null ? ratio : smoothstep(0.12, 0.50, s));
    const targetMorph = lockedIntro ? 0 : (ratio !== null ? ratio : smoothstep(0.15, 0.80, s));
    const targetPretty = lockedIntro ? 0 : (ratio !== null ? ratio : smoothstep(0.10, 0.82, s));

    // Induced-demand stack: each bypass rises, opens, then floods with traffic.
    const jamMode = simOn && !simRail;
    const wantTier = [
      jamMode && (simKey === 'bypass2' || simKey === 'bypass3'),
      jamMode && simKey === 'bypass3'
    ];
    const fillRate = reducedMotion ? 1 : 1 - Math.exp(-0.7 * wallDt);
    let stackMoving = false;
    bypassTiers.forEach((t, i) => {
      const prev = t.built;
      const goal = wantTier[i] ? 1 : 0;
      // Roads are laid at a steady pace (about 4 s per bypass); removal is quicker.
      const step = reducedMotion ? 1 : wallDt * (goal ? 0.26 : 0.9);
      t.built = t.built < goal ? Math.min(goal, t.built + step) : Math.max(goal, t.built - step);
      t.grp.visible = t.built > 0.001;
      t.fill = lerp(t.fill, goal && t.built >= 1 ? 1 : 0, goal ? fillRate : 1);
      const n = t.ribbons.length;
      t.ribbons.forEach((rb, j) => {
        // ribbons start one after another with some overlap
        const grown = clamp((t.built * (n + 1.2) - j) / 1.2, 0, 1);
        rb.set(grown, t.fill > 0.01 ? t.fill : 0);
      });
      if (t.built !== prev) stackMoving = true;
    });
    hwyFill = lerp(hwyFill, jamMode ? 1 : 0, jamMode ? fillRate : 1);
    hwyJam.setFill(hwyFill > 0.01 ? hwyFill : 0);
    if (stackMoving) sunLight.shadow.needsUpdate = true;

    greenFactor = lerp(greenFactor, targetGreen, damp);
    morphFactor = lerp(morphFactor, targetMorph, damp);
    prettyFactor = lerp(prettyFactor, targetPretty, damp);

    sidewalkMat.color.copy(uglySidewalkCol).lerp(prettySidewalkCol, prettyFactor);
    colorfulTowerMats.forEach((entry) => {
      tmpColor.copy(uglyTowerCol).lerp(entry.dayCol, prettyFactor);
      entry.mat.color.lerp(tmpColor, 0.08);
    });

    busLaneMat.opacity = smoothstep(0.16, 0.56, morphFactor) * 0.92;
    bikeLaneMat.opacity = smoothstep(0.30, 0.72, morphFactor) * 0.90;
    zebraMat.opacity = smoothstep(0.24, 0.66, morphFactor);
    dashMat.opacity = lerp(0.82, 0.20, morphFactor);

    highwayCars.forEach((hc) => {
      hc.visible = hwyFill < 0.02;
      hc.position.z += hc.userData.dir * hc.userData.speed * dt * speedMult;
      if (hc.position.z < -240) hc.position.z = 74;
      if (hc.position.z > 74) hc.position.z = -240;
    });

    const vScale = Math.max(0.001, greenFactor);
    viaductModules.forEach((mod) => {
      mod.visible = greenFactor > 0.02;
      if (mod.visible) mod.scale.setScalar(vScale);
    });

    const flowerGrowth = smoothstep(0.14, 0.56, morphFactor);
    flowerPlanters.forEach((pl) => {
      pl.visible = flowerGrowth > 0.02;
      if (pl.visible) pl.scale.setScalar(Math.max(0.001, flowerGrowth));
    });

    const walkwayGrowth = smoothstep(0.22, 0.62, morphFactor);
    coveredWalkways.forEach((wk) => {
      wk.visible = walkwayGrowth > 0.02;
      if (wk.visible) wk.scale.setScalar(Math.max(0.001, walkwayGrowth));
    });

    const bridgeGrowth = smoothstep(0.26, 0.64, morphFactor);
    jejantasBridges.forEach((jb) => {
      jb.visible = bridgeGrowth > 0.02;
      if (jb.visible) jb.scale.setScalar(Math.max(0.001, bridgeGrowth));
    });

    const shelterGrowth = smoothstep(0.20, 0.58, morphFactor);
    busShelters.forEach((sh) => {
      sh.visible = shelterGrowth > 0.02;
      if (sh.visible) sh.scale.setScalar(Math.max(0.001, shelterGrowth));
    });

    const treeGrowth = smoothstep(0.16, 0.65, morphFactor);
    treeClusters.forEach((tr) => {
      tr.visible = treeGrowth > 0.02;
      if (tr.visible) tr.scale.setScalar(Math.max(0.001, treeGrowth));
    });

    if (sharedPlaza) {
      const plazaGrowth = smoothstep(0.32, 0.70, morphFactor);
      sharedPlaza.visible = plazaGrowth > 0.02;
      if (sharedPlaza.visible) sharedPlaza.scale.setScalar(Math.max(0.001, plazaGrowth));
    }

    const trafficFlow = smoothstep(0.20, 0.65, morphFactor);
    jamCars.forEach((car) => {
      const carVis = car.userData.keepIn2036 ? 1 : clamp(1 - morphFactor * 1.4, 0.001, 1);
      car.scale.setScalar(carVis);
      car.visible = carVis > 0.03;
      if (car.visible && trafficFlow > 0.02) {
        car.position.z += car.userData.dir * car.userData.speed * 2.4 * trafficFlow * dt * speedMult;
        if (car.position.z < -245) car.position.z = 58;
        if (car.position.z > 58) car.position.z = -245;
      }
    });

    if (morphFactor < 0.22) {
      heroBus.position.set(-2.4, 0.12, 48.5);
    } else {
      heroBus.position.z -= lerp(3.0, 16.0, morphFactor) * dt * speedMult;
      if (heroBus.position.z < -248) heroBus.position.z = 58;
    }

    const extraBusScale = smoothstep(0.20, 0.58, morphFactor);
    corridorBuses.forEach((eb) => {
      eb.visible = extraBusScale > 0.04;
      if (eb.visible) {
        eb.scale.setScalar(extraBusScale);
        eb.position.z += eb.userData.dir * eb.userData.speed * dt * speedMult;
        if (eb.position.z > 64) eb.position.z = -245;
        if (eb.position.z < -245) eb.position.z = 64;
      }
    });

    const railLift = smoothstep(0.20, 0.64, morphFactor);
    railGroup.visible = railLift > 0.02;
    if (railGroup.visible) {
      railGroup.position.y = lerp(-16, 0, railLift);
      train.position.z -= 22 * dt * speedMult;
      if (train.position.z + trainCoaches[trainCoaches.length - 1].userData.zOff + 6 < -236) {
        train.position.z = 24;
      }
      trainCoaches.forEach((coach) => {
        const wz = train.position.z + coach.userData.zOff;
        const run = clamp((-196 - wz) / 40, 0, 1);
        coach.position.y = -run * 8.4;
        coach.rotation.x = run > 0 && run < 1 ? -0.207 : 0;
        coach.visible = wz > -233;
      });
    }

    if (introState === 'departing') {
      introT = Math.min(1, introT + dt / (reducedMotion ? 0.4 : 2.2));
      if (introT >= 1) introState = 'active';
    }

    const pathFov = cameraPose(s, tmpPos, tmpLook);
    if (Math.abs(camera.fov - pathFov) > 0.02) { camera.fov = pathFov; camera.updateProjectionMatrix(); }
    simBlend = lerp(simBlend, simOn ? 1 : 0, reducedMotion ? 1 : 1 - Math.exp(-4.0 * wallDt));
    if (simBlend > 0.002) {
      tmpPos.lerp(simPos, simBlend);
      tmpLook.lerp(simLook, simBlend);
    }

    if (introState === 'waiting') {
      camera.position.copy(introCamPos);
      camera.lookAt(introCamLook);
    } else if (introState === 'departing') {
      if (introT < 0.28) {
        const zt = smoothstep(0, 0.28, introT);
        tmpIntroPos.copy(introCamPos).lerp(introZoomPos, zt);
        camera.position.copy(tmpIntroPos);
        camera.lookAt(introCamLook);
      } else {
        const pt = smoothstep(0.28, 1.0, introT);
        tmpIntroPos.copy(introZoomPos).lerp(tmpPos, pt);
        tmpIntroLook.copy(introCamLook).lerp(tmpLook, pt);
        camera.position.copy(tmpIntroPos);
        camera.lookAt(tmpIntroLook);
      }
    } else {
      camera.position.copy(tmpPos);
      camera.lookAt(tmpLook);
    }

    tmpColor.copy(uglySkyTop).lerp(GOLDEN_PALETTE.skyTop, prettyFactor);
    skyUniforms.uTop.value.lerp(tmpColor, 0.06);
    tmpColor.copy(uglySkyMid).lerp(GOLDEN_PALETTE.skyMid, prettyFactor);
    skyUniforms.uMid.value.lerp(tmpColor, 0.06);
    tmpColor.copy(uglyFogCol).lerp(GOLDEN_PALETTE.fog, prettyFactor);
    skyUniforms.uHorizon.value.lerp(tmpColor, 0.06);
    scene.background.lerp(tmpColor, 0.06);
    scene.fog.color.lerp(tmpColor, 0.06);
    scene.fog.density = lerp(scene.fog.density, lerp(0.0032, 0.0018, prettyFactor), 0.06);

    const sunZ = Math.round((camera.position.z - 45) / 6) * 6;
    sunLight.target.position.set(0, 0, sunZ);
    sunLight.position.copy(sunLight.target.position).add(SUN_OFFSET);

    // Skip shadow-map update when camera is barely moving (saves ~4 ms/frame at idle)
    const camMoved = Math.abs(camera.position.z - _lastCamZ) > 0.4;
    if (camMoved) { sunLight.shadow.needsUpdate = true; _lastCamZ = camera.position.z; }

    if (debugCam) {
      scene.fog.density = 0.0003; // clear air so overhead frames show the whole layout
      camera.position.set(debugCam[0], debugCam[1], debugCam[2]);
      camera.lookAt(debugCam[3], debugCam[4], debugCam[5]);
      if (debugCam[6]) { camera.fov = debugCam[6]; camera.updateProjectionMatrix(); }
    }

    const frameMs = wallDt * 1000;
    if (!(post && post.render(frameMs))) {
      if (post && renderer.toneMapping === THREE.NoToneMapping) {
        // post-processing gave up (slow machine): hand the filmic curve back to the renderer
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
      }
      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(animate);
  return api;
}
