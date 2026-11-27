import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Final grade: ACES filmic tone mapping (same curve the renderer used before), a touch of
 * contrast and saturation, and a soft vignette. Runs after bloom so highlights above 1.0 in
 * the HDR buffer glow instead of clipping.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 0.95 },
    uContrast: { value: 1.1 },
    uSat: { value: 1.14 },
    uVig: { value: 0.24 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uExposure, uContrast, uSat, uVig; varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 color) {
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= uExposure / 0.6;
      return clamp(outM * RRTAndODTFit(inM * color), 0.0, 1.0);
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = aces(texture2D(tDiffuse, vUv).rgb);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 d = (vUv - 0.5) * vec2(1.15, 1.0);
      c *= mix(1.0 - uVig, 1.0, smoothstep(0.80, 0.22, length(d)));
      c += (hash(gl_FragCoord.xy) - 0.5) / 255.0; // dither: no banding in the haze
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/**
 * Runs before bloom. A single NaN or infinite pixel (a degenerate normal, a blown specular on
 * metal) would smear into a black or white blotch through the blur, so clamp them first.
 */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (isnan(c.r) || isnan(c.g) || isnan(c.b) || isinf(c.r) || isinf(c.g) || isinf(c.b)) {
        // repair from the neighbours rather than leaving a black speck
        vec2 px = 1.0 / vec2(textureSize(tDiffuse, 0));
        vec3 acc = vec3(0.0); float n = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(px.x, 0.0) : i == 1 ? vec2(-px.x, 0.0) : i == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
          vec3 t = texture2D(tDiffuse, vUv + o * 2.0).rgb;
          if (!(isnan(t.r) || isnan(t.g) || isnan(t.b) || isinf(t.r) || isinf(t.g) || isinf(t.b))) { acc += t; n += 1.0; }
        }
        c = vec4(n > 0.0 ? acc / n : vec3(0.0), 1.0);
      }
      gl_FragColor = vec4(min(c.rgb, vec3(24.0)), 1.0);
    }`,
};

/**
 * Optional post-processing. Returns null when it should not run (phones, reduced motion off-switch,
 * no float render targets), and the caller then renders straight to the screen.
 * `?post=off` forces it off, `?post=on` keeps it on whatever the frame rate.
 */
export function createPost(renderer, scene, camera) {
  const flag = new URLSearchParams(window.location.search).get('post');
  const small = window.innerWidth <= 820;
  if (flag === 'off' || (small && flag !== 'on')) return null;
  if (!renderer.capabilities.isWebGL2) return null;

  const w = window.innerWidth, h = window.innerHeight, pr = renderer.getPixelRatio();
  let target;
  try {
    target = new THREE.WebGLMultisampleRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });
    target.samples = 4;
  } catch {
    return null;
  }

  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(SanitizeShader));
  // Only genuinely hot pixels (sun glints on glass and metal, brake lights, the bus LED) glow.
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.5, 1.7);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  let on = true;
  let slow = 0, frames = 0;
  return {
    get enabled() { return on; },
    setExposure(v) { grade.uniforms.uExposure.value = v; },
    setSize(width, height, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    },
    /** Returns true if post-processing is still active after this frame. */
    render(frameMs) {
      if (!on) return false;
      composer.render();
      // If the machine cannot keep up, drop the effects for good rather than stutter.
      if (flag !== 'on' && ++frames > 30) {
        slow = frameMs > 38 ? slow + 1 : Math.max(0, slow - 2);
        if (slow > 90) { on = false; return false; }
      }
      return true;
    },
  };
}
