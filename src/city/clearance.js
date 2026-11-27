/**
 * How much free space there is around a point, for placing buildings. Pure data, no DOM.
 * Roads, elevated ramps, landmark plots and the built-up corridor all count as obstacles.
 */
import { clearanceFromRoads, ROADS } from './network.js';
import { LANDMARKS, CORRIDOR } from './layout.js';

const RAMP_PATHS = ROADS.filter((r) => r.kind === 'elevated').map((r) => r.h.map((p) => [p[0], p[2]]));

function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/** Free space around (x, z): how far a footprint of radius r may reach before it hits something. */
export function freeSpace(x, z) {
  let free = clearanceFromRoads(x, z);
  RAMP_PATHS.forEach((p) => { free = Math.min(free, distToPolyline(x, z, p) - 4.2); });
  LANDMARKS.forEach(([, lx, lz, lr]) => { free = Math.min(free, Math.hypot(x - lx, z - lz) - lr); });
  // the built-up corridor (shop rows, highway, viaduct) and the rail portals
  if (z < CORRIDOR.zNear && z > CORRIDOR.zFar - 12) free = Math.min(free, Math.abs(x) - CORRIDOR.halfWidth);
  return free;
}
