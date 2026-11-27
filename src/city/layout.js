/**
 * Shared layout constants for the 3D Klang Valley corridor. Pure data, no DOM and no
 * three.js import, so tools/check-city.mjs can run it in Node.
 *
 * Axes: the story runs along -z (Shah Alam at +z, KL at -z). The boulevard is x = 0.
 */

export const MAIN = { width: 17.6, zStart: 330, zEnd: -255 };

/** KLCC ring road (centre of the Petronas Twin Towers site). */
export const RING = { cx: 18, cz: -295, r: 31, width: 14 };

/** Landmarks and other things a building must never overlap. [id, x, z, clearance radius] */
export const LANDMARKS = [
  ['klcc', 18, -295, 40],
  ['menara_kl', -62, -262, 40],
  ['merdeka118', -66, -186, 24],
  ['exchange106', 72, -198, 24],
];

/** The built-up corridor where shop rows, the highway and the viaduct live. */
export const CORRIDOR = { halfWidth: 38, zNear: 340, zFar: -250 };

/** Basin centre and the radius inside which the ground is flat enough for roads. */
export const BASIN = { cx: 0, cz: -160, flatRadius: 520, maxRoadRadius: 500 };

/** Landmark models are authored in metres (KLCC is 444 units tall); this puts KLCC at 86 scene units.
 *  The real-KL building mesh uses the same factor so every tower keeps its true proportion. */
export const MODEL_SCALE = 86 / 444.138;
