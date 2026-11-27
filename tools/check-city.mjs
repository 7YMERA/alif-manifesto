// Oracle for the 3D city. Run: node tools/check-city.mjs  (or npm run check)
// Fails (exit 1) if any road stops in the middle of the city, a ramp misses its landing, a building
// overlaps a road / landmark / the corridor, or the camera turns too fast, reverses or clips a building.
import fs from 'node:fs';
import { validateNetwork } from '../src/city/network.js';
import { placeCity, selectBuildings } from '../src/city/osmCity.js';
import { freeSpace } from '../src/city/clearance.js';
import { validate as validateCamera } from '../src/camera/path.js';

let failed = 0;
const report = (name, problems) => {
  if (problems.length) { failed++; console.log(`FAIL ${name}`); problems.slice(0, 12).forEach((p) => console.log('   - ' + p)); }
  else console.log(`ok   ${name}`);
};

report('road network connectivity', validateNetwork());

// the real-KL city exactly as the browser filters it
const raw = JSON.parse(fs.readFileSync(new URL('../assets/city/kl_city.json', import.meta.url), 'utf8'));
const { pos, ix } = placeCity(raw);
const city = selectBuildings(pos, ix);
const cityProblems = [];
if (city.groundKept < 600) cityProblems.push(`only ${city.groundKept} buildings kept; skyline would look empty`);
city.boxes.forEach((b, i) => {
  const reach = Math.hypot(b.w, b.d) / 2;
  const free = freeSpace(b.x, b.z);
  // roofs are pieces of a building and may overhang its walls a little, so only grounded blocks are strict
  if (free < reach - 0.6) cityProblems.push(`piece ${i} at (${b.x.toFixed(0)}, ${b.z.toFixed(0)}) overlaps something by ${(reach - free).toFixed(1)} units`);
  if (b.h > 60) cityProblems.push(`piece ${i} is ${b.h.toFixed(0)} tall and would out-top the landmarks`);
});
report(`real-KL city (${city.groundKept} buildings kept, ${city.dropped} cleared off roads)`, cityProblems);

report('camera path', validateCamera(city.boxes));
process.exit(failed ? 1 : 0);
