# alif-manifesto handoff & agent log

> Read this first alongside `7YMERA/skills/project-skills/alif-manifesto/SKILL.md`. Update it in the same commit as any change. Keep under ~200 lines.

## Current state (2026-11-27)

- **Branch / deploy**: `main` builds with Vite (`npm run build` → `dist/`) and deploys automatically to Vercel.
- **Stack**: Vanilla HTML/CSS/ES modules + Three.js `0.128.0` + `lenis` smooth scroll + Web Audio API. (Per the Vercel experiment rule in `7YMERA/skills`, focused bundled libraries are allowed here even though `7ymera.github.io` stays zero-bundler.)
- **Checks**: `npm run check` passes (`road network connectivity`, `real-KL city: 1100 buildings kept / 214 cleared`, `camera path: max turn rate 238, 0 backwards steps`), `node --check src/*.js` passes, `npm run build` succeeds with 0 errors.
- **Browser audit (2026-11-27)**: Verified in headless Chromium at `1300×820` and `390×844` — 0 console/page errors, `overflowX: 0`, Lenis active, `14/14` `.animate-on-scroll` reveals fire cleanly, `.scroll-cue-chevron` pauses once scrolled, mobile `backdrop-filter: none` + opaque mobile topbar + flush mobile `.rail-link` connector verified visually, WebGL boot/intro verified (`hasScene: true`, `animActive: 'true'`).

## Handoff

Nothing in progress. Both `alif-manifesto` (`main`) and `7YMERA/skills` (`main`, merged with `claude/bold-mayer-ia1sl2`) are clean and pushed.

## Owner to-dos (not code)

- Visual spot-check on a real GPU and an iPhone (especially Lenis wheel feel, portrait FOV framing, HDR bloom + MSAA 2× on HiDPI, and the sunlit 2036 breeze motes).
- Optional branch cleanup on GitHub once no longer needed:
  - `7YMERA/alif-manifesto` → `claude/optimistic-allen-qal8zv` (0 commits ahead of `main`, fully included).
  - `7YMERA/skills` → `claude/bold-mayer-ia1sl2` (merged into `main` at `d749267`).

## Map (path → what)

- `index.html` — `Press to Go` intro gate, top bar, 7 chapters (`00`–`06`), 3D Induced Demand simulator panel, full-bleed `#city-showcase`, Before/After timelapse dock.
- `styles.css` — RapidKL Cobalt Blue (`#0047AB`), Signal Red (`#D92332`), Tropical Emerald (`#0E7C59`) design system; compact alternating 455 px cards; rail-map connectors; staggered `.animate-on-scroll`; mobile compositing trim; `.no-webgl` fallback.
- `src/main.js` — Boots `createManifestoScene`, `initApp`, `initSimulator`.
- `src/scene.js` — Three.js KL corridor, intro bus departure, traffic/train/walkers, bypass spaghetti stacks, sunlit 2036 breeze motes, portrait FOV pullback, reactive reduced motion, `webglcontextlost`/`restored`, true RAF cancel/restart.
- `src/camera/path.js` — Pure `cameraPose(s)` curve + turn-rate & collision oracle.
- `src/post.js` — Desktop HDR bloom, NaN sanitizer, ACES filmic grade, vignette, HiDPI MSAA scaling (`dpr > 1.25 ? 2 : 4`), slow-frame auto-fallback.
- `src/app.js` — Lenis smooth scroll, scroll → scene bridge, SVG rail-map connectors, `.animate-on-scroll` observer, timelapse/Before-After slider, localStorage pledge stamp, `.no-webgl` un-gate fallback.
- `src/audio.js` — Scroll-driven Web Audio soundscape (`cancelScheduledValues` before `setTargetAtTime`, pauses timers & suspends context when muted or tab hidden).
- `src/simulator.js` — Induced Demand Test UI driving `ManifestoScene.setSimScenario`.
- `src/city/{layout,network,roadMesh,clearance,osmCity,skyline,community}.js` — Checked KL road graph, 1,100 real OSM buildings, Bukit Nanas, pocket park + basketball court, KL Sentral-style glass hub.
- `src/mirage/env.js` — Procedural golden-hour PMREM environment map.
- `tools/{check-city,camera-report}.mjs` — `npm run check` oracle.

## Decisions (don't re-litigate)

- **Privacy**: Personal manifesto only — zero employer/company names, zero client/colleague details, residence general as "Section 13, Shah Alam", never mention age (years only), never link GitHub source in UI.
- **Highway policy**: Do **not** destroy existing highways — keep them active with traffic on top, stop building *new* urban mega-highways, decorate existing concrete with tropical greenery & flowers that absorb/reflect/disperse traffic noise.
- **Theme**: RapidKL Cobalt Blue + Signal Red + Tropical Emerald + Warm Sandstone + Golden Sky. Zero purple or magenta. No white footer bar.
- **Camera**: Straight calm forward glide — no mouse-follow camera drift, no zig-zags, no early spoiler toggles in chapters `00`–`01`.
- **Vercel experiment bypass**: Because this repo builds on Vercel (not static GitHub Pages), focused bundled libraries (like `lenis`) are permitted when they serve the story and respect the frame-time budget.

## Gotchas

- Never allocate `new THREE.Color()` or `new THREE.Vector3()` inside `animate()`.
- Landmark glass meshes using `DoubleSide` must keep `polygonOffset` (`-2, -2`) to avoid z-fighting; TRX stays flat-shaded for SketchUp flipped faces.
- Road lane overlays must have `depthWrite: false` and draw after the boulevard road so terrain doesn't bleed through as green patches.
- Always call `param.cancelScheduledValues(now)` before `AudioParam.setTargetAtTime(...)` on scroll.
- Keep `mobile <= 820px` DPR capped at `1.0` on **both** init and `resize`, and keep `.rail-link` mobile `margin-top: -12vh` matched to `.blog-section` mobile `margin-bottom: 12vh`.

## Log (newest first)

- **2026-11-27** · `main` (Antigravity) — Created `docs/CLAUDE-LOG.md` handoff log; merged `7YMERA/skills` branch `claude/bold-mayer-ia1sl2` (reorganized `agent-skills/`, `project-skills/`, `exported/` obsidian + 21st.dev ports) into `7YMERA/skills` `main` (`d749267`) and synced `alif-manifesto` handoff pointers; verified `claude/optimistic-allen-qal8zv` had 0 unmerged commits.
- **2026-11-27** · `afd774c` (Antigravity) — Applied `7YMERA/skills` upgrades: added Lenis smooth scroll (gated on intro/visibility/reduced-motion), wired `.animate-on-scroll` onto chapters/charter/creed, true RAF cancel/restart + `webglcontextlost`/`restored`, portrait FOV pullback, reactive reduced motion, mobile resize DPR cap, sunlit 2036 breeze motes (`cloud-pass`), Web Audio `cancelScheduledValues` + timer pause, HiDPI MSAA scaling, hidden scroll-cue pause, mobile `backdrop-filter` trim + opaque topbar + flush mobile `.rail-link`, and `.no-webgl` fallback. Updated `7YMERA/skills` with Vercel experiment bypass rule (`d42ca9c`).
- **2026-11-27** · `5fe418b` (Claude) — Fixed green road depth-bleed (road draws first, lane overlays `depthWrite: false`), made landmark materials `DoubleSide`, flat-shaded Exchange 106 TRX.
- **2026-11-27** · `3dd3eca` (Claude · `claude/optimistic-allen-qal8zv`) — Brief audit fixes: alternating 455 px side cards, bigger `<mark class="hl">`, rail-map phase flowcharts + 3-line fan into 2036, updated acoustic copy, delayed highway greening (47–62%) and frozen opening highway jam, amber `750 / KL SENTRAL` rear bus LED, new `src/city/community.js` (pocket park + basketball court + KL Sentral hub), Before/After labels, glass `\7` portfolio logo.
- **2026-11-27** · `099efd8` / `389ae4d` / `c0fca66` / `03f46d2` (Claude) — Fixed doubled render loop after off-screen RAF gate + scroll-reveal merge.
- **2026-11-27** · `5f7fc09` / `24176d3` (Claude) — Real KL towers from portfolio, 1,100 OSM KL buildings (`kl_city.json`), checked road graph, smooth camera rig + oracle (`tools/check-city.mjs`), desktop HDR bloom/ACES post (`src/post.js`), flyovers that dim/empty the street beneath.
- **2026-11-27** · `7ca7a29` / `93d1f89` / `a6b2ff5` (Claude) — Moved Induced Demand Test from 2D canvas into the live 3D city with spaghetti flyovers; fixed simulator crash, reduced-motion, 44 px tap targets, and contrast.
