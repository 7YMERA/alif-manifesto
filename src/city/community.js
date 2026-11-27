import * as THREE from 'three';

/**
 * Planned community spaces that appear as the street is transformed: a pocket park with a
 * basketball court, and a KL Sentral-style transit hub beside the LRT station. Both sit in the
 * gaps between shophouse rows, right next to the boulevard, so the camera passes them.
 */

function courtTexture() {
  const c = document.createElement('canvas');
  c.width = 560; c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = '#0a3f8f'; g.fillRect(0, 0, 560, 300);              // RapidKL blue court
  g.fillStyle = '#c92433';                                           // painted keys
  g.fillRect(0, 100, 110, 100); g.fillRect(450, 100, 110, 100);
  g.strokeStyle = '#f4f1e8'; g.lineWidth = 4;
  g.strokeRect(8, 8, 544, 284);                                      // boundary
  g.beginPath(); g.moveTo(280, 8); g.lineTo(280, 292); g.stroke();   // halfway line
  g.beginPath(); g.arc(280, 150, 42, 0, Math.PI * 2); g.stroke();    // centre circle
  g.strokeRect(8, 100, 110, 100); g.strokeRect(442, 100, 110, 100);  // keys
  g.beginPath(); g.arc(118, 150, 40, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.beginPath(); g.arc(442, 150, 40, Math.PI / 2, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.arc(46, 150, 128, -1.15, 1.15); g.stroke();       // three-point arcs
  g.beginPath(); g.arc(514, 150, 128, Math.PI - 1.15, Math.PI + 1.15); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.encoding = THREE.sRGBEncoding;
  return t;
}

function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 176;
  const g = c.getContext('2d');
  g.fillStyle = '#0047ab'; g.fillRect(0, 0, 1024, 176);
  g.fillStyle = '#d92332'; g.fillRect(0, 150, 1024, 26);
  g.fillStyle = '#ffffff';
  g.font = '800 96px "Bricolage Grotesque", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 78);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.encoding = THREE.sRGBEncoding;
  return t;
}

const std = (color, rough = 0.7, metal = 0.1) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function hoop(x, dir) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 8), std(0x2a3340, 0.5, 0.5));
  post.position.set(x + dir * 0.9, 1.7, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), std(0x2a3340, 0.5, 0.5));
  arm.position.set(x + dir * 0.45, 3.3, 0);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.8), std(0xf4f1e8, 0.3, 0.1));
  board.position.set(x, 3.3, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 16), std(0xd92332, 0.4, 0.3));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x - dir * 0.38, 3.0, 0);
  g.add(post, arm, board, ring);
  return g;
}

export function buildCommunity() {
  const park = new THREE.Group();
  const hub = new THREE.Group();

  // ── Pocket park + basketball court, left of the boulevard in the gap between shop rows ──
  park.position.set(-36, 0, -79);   // court x -50..-22: clear of the highway deck and its piers
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(34, 0.16, 22), std(0x4aa05f, 0.95, 0));
  lawn.position.y = 0.08;
  lawn.receiveShadow = true;
  const court = new THREE.Mesh(new THREE.PlaneGeometry(28, 15), new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.55 }));
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.19;
  court.receiveShadow = true;
  park.add(lawn, court, hoop(-13.6, 1), hoop(13.6, -1));
  // tree line along the lawn's far edges
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const trunk = new THREE.CylinderGeometry(0.22, 0.3, 1, 6);
  [[-15.5, -9], [-5, -10], [6, -10], [15.5, -9], [-15.5, 9], [-5, 10], [6, 10], [15.5, 9]].forEach(([tx, tz], i) => {
    const t = new THREE.Mesh(trunk, std(0x6b4a2f, 0.9));
    t.scale.set(1, 2.4, 1); t.position.set(tx, 1.2, tz);
    const crown = new THREE.Mesh(blob, std(i % 2 ? 0x1f7a45 : 0x2c9a55, 0.85));
    crown.scale.set(2.3, 2.1, 2.3); crown.position.set(tx, 3.6, tz);
    crown.castShadow = true;
    park.add(t, crown);
  });

  // ── Transit hub (KL Sentral style): terminal with a vaulted glass roof beside the LRT station ──
  hub.position.set(41, 0, -79);
  const body = new THREE.Mesh(new THREE.BoxGeometry(35, 7, 22), std(0xe9e2d0, 0.6, 0.1));
  body.position.y = 3.5; body.castShadow = true; body.receiveShadow = true;
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 11, 35, 20, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xb9d7e8, roughness: 0.18, metalness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.82 })
  );
  vault.rotation.z = Math.PI / 2;   // axis along x; the half-pipe's open side then faces up
  vault.position.y = 7;
  vault.castShadow = true;
  const ribMat = std(0xd92332, 0.4, 0.4);
  for (let x = -16; x <= 16; x += 4) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(11, 0.18, 6, 20, Math.PI), ribMat);
    rib.rotation.y = Math.PI / 2;       // the arch spans the hub's width (z), repeated along x
    rib.position.set(x, 7, 0);
    hub.add(rib);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.6), new THREE.MeshBasicMaterial({ map: signTexture('KL SENTRAL'), toneMapped: false }));
  sign.position.set(-17.6, 5.2, 0);
  sign.rotation.y = -Math.PI / 2;
  const bays = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 20), std(0x0047ab, 0.5, 0.2));
  bays.position.set(-19.5, 3.6, 0);                    // bus bay canopy along the street frontage
  const bayStripe = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.12, 20.05), std(0xd92332, 0.5, 0.2));
  bayStripe.position.set(-19.5, 3.4, 0);
  hub.add(body, vault, sign, bays, bayStripe);

  const group = new THREE.Group();
  group.add(park, hub);
  group.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = false; });
  return {
    group,
    /** 0 = not built, 1 = finished. Grows each piece out of the ground. */
    setGrowth(g) {
      const k = Math.max(0.001, g);
      group.visible = g > 0.02;
      park.scale.set(1, k, 1);
      hub.scale.set(1, k, 1);
    },
  };
}
