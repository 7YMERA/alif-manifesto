// Compares the camera before and after: node tools/camera-report.mjs
import * as THREE from 'three';
import { cameraPose, turnStats } from '../src/camera/path.js';

// The camera from before this rework (git a6b2ff5..7ca7a29, src/scene.js section 7), for comparison.
const oldPos = new THREE.CatmullRomCurve3([
  [-0.6, 7.2, 66], [0.4, 7.8, 18], [-0.8, 11.4, -24], [1.2, 11.0, -74],
  [2.2, 11.4, -124], [0.5, 14.5, -178], [1.5, 24, -135], [0, 38, -35],
].map((p) => new THREE.Vector3(...p)));
const oldLook = new THREE.CatmullRomCurve3([
  [-1, 3.2, -25], [-1.2, 3, -50], [-4.5, 6.5, -90], [1, 6.5, -165],
  [4, 7.5, -205], [4, 14, -265], [4, 18, -265], [4, 18, -265],
].map((p) => new THREE.Vector3(...p)));
const oldPose = (s, p, l) => { oldPos.getPointAt(s, p); oldLook.getPointAt(s, l); };

const f = (x) => x.toFixed(0).padStart(7);
const a = turnStats(oldPose), b = turnStats(cameraPose);
console.log('                    max turn rate   max abrupt change   backwards steps');
console.log(`before (old curves)  ${f(a.maxRate)}         ${f(a.maxAccel)}            ${a.reversals}`);
console.log(`after  (new rig)     ${f(b.maxRate)}         ${f(b.maxAccel)}            ${b.reversals}`);
