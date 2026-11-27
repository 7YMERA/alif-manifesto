// Oracle for the 3D city. Run: node tools/check-city.mjs
// Fails (exit 1) if any road stops in the middle of the city, a ramp misses its landing,
// or (later checks) a building overlaps a road or the camera path has a sharp turn.
import { validateNetwork } from '../src/city/network.js';

let failed = 0;
const report = (name, problems) => {
  if (problems.length) { failed++; console.log(`FAIL ${name}`); problems.forEach((p) => console.log('   - ' + p)); }
  else console.log(`ok   ${name}`);
};

report('road network connectivity', validateNetwork());

for (const mod of ['../src/city/skylineLayout.js', '../src/camera/path.js']) {
  try {
    const m = await import(mod);
    if (m.validate) report(mod.split('/').pop(), m.validate());
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') { failed++; console.log(`FAIL ${mod}: ${e.message}`); }
  }
}
process.exit(failed ? 1 : 0);
