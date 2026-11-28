# alif-manifesto handoff & agent log

> Read this first alongside `7YMERA/skills/project-skills/alif-manifesto/SKILL.md`. Update it in the same commit as any change. Keep under ~200 lines.

## 2026-11-28 · Blender 5.3 Real-World KL OSM Map & Hero Asset Package (`2d5a756`, `d3573b0`)

- **Standalone Real-World KL OSM Map (`2d5a756`):**
  - `assets/city/kl_real_roads.json` (`151.1 KB`) — OpenStreetMap Overpass geometry (`roads.motorway` 317, `primary` 146, `secondary` 765, `roundabout` 27, `river` 18, `rail` 106, `parks` 13) projected into the exact `+Y`-up scene frame (`scale = 0.065937`, `rot = -3.56°`, aligned to KLCC `(18, 0, -295)`, Menara KL `(-62, 10, -262)`, Merdeka 118 `(-66, 0, -186)`, Exchange 106 `(72, 0, -198)`).
  - `assets/models/kl_city_map.glb` (`997.7 KB`, `440m × 8.23m × 570m`) — 13 batched Golden Hour PBR meshes (`KL_Terrain`, `KL_River_SungaiKlang`, `KL_Parks`, curved `KL_Roads_*`, `KL_Roads_BusLanes`, `KL_Rail_ViaductDeck`, `KL_Rail_Corridors`); source in `blender/kl_city_map.blend`.
  - `assets/models/road_paths.json` — exact 3D centerline splines (`bus_routes` 6 corridors, `car_lanes` 8 arteries) + `plaza_anchors` (`shared_spaces` 6, `bus_shelters` 8, `tree_clusters` 24) + `viaduct_anchors` (10).
- **11 Sculpted Blender 5.3 Hero `.glb` Assets (`d3573b0`, source in `blender/alif_mirage_assets.blend`):**
  - `rapidkl_750_bus.glb`, `lrt_train.glb`, `kl_sedan.glb`, `kl_bus_shelter.glb`, `kl_shoplot_row.glb`, `kl_covered_walkway.glb`, `kl_jejantas_bridge.glb`, `green_viaduct_module.glb`, `roadside_flower_planter.glb`, `shared_space_plaza.glb`, `tropical_tree_cluster.glb`.
  - Full dimensions, pivots (`+Y` up, `y=0`, `+Z` forward), and material slots documented in `assets/models/CATALOG.md`.

## 2026-11-28 · Claude handoff: real landmark colours, drone-HUD simulator, road-widening step (branch `claude/optimistic-allen-qal8zv`, not yet on `main`)

**Done this session (all on the branch, unmerged; owner said "merge" only for earlier work):**
- Pulled Gemini's 7 commits (Lenis, GSAP, route drawer, whimsy, OSM map package). `npm run check`, `node --check`, `npm run build` all pass on top of them.
- Landmark colours set from sources (stainless steel + laminated glass for Petronas; crystalline glass for Merdeka 118; metallic-coated glass, clear low-iron crown, **no gold** for Exchange 106; white concrete shaft for Menara KL). Menara's bronze pod is a guess (no source). Sources: Otis, Pelli write-ups, CIDB, Fender Katsalidis. Owner has not yet seen the new colours.
- Simulator rebuilt as a drone-HUD (as in `7ymera.github.io`): corner brackets, numbered step list left, live readout right with "vs today" chips, caption bottom, tags pinned to the 3D city (`ManifestoScene.project`), "Play the story" autoplay (7.5 s/step). Phone/tablet (<=980 px): one stacked panel, no pins.
- New step 2 **Widen the road**: shophouses demolish, 8 new lanes grow out and fill with cars. Order now: base, widen, bypass2, bypass3, rail.

**Open / next (in priority order):**
1. Check the widen step and HUD on a real laptop (900 px high) and a phone; the footnote is hidden under 900 px high. Tag pins on widen were re-anchored but not re-screenshotted.
2. Merge when the owner says so. Commit as `git -c user.name=Claude -c user.email=noreply@anthropic.com`. Run `git pull` first (Gemini pushes to `main`).
3. Gemini's `assets/models/kl_city_map.glb` and `kl_real_roads.json` (real OSM roads) are **not wired into the scene**. Decide: replace `src/city/network.js` roads with them, or leave.
4. Merdeka 118 glass still looks patchy up close (flipped faces); TRX has faint triangle marks on its glass.
5. Replace SKILL.md in `7YMERA/skills` (`alif-manifesto/SKILL.md` still describes the old 2D simulator and camera). Not edited yet.
6. KakiLima merge question (owner asked my opinion; see chat): recommendation is **keep separate repos, link them**; KakiLima's own log says 3D effects were rejected for slow phones and it is Next.js 16 with four languages.

**Gotchas added:** road-widen group scales on x about the road edge (x = +-8.8); sidewalks and shop rows are hidden/scaled by `widenT` in `animate()`; tag anchors live in `SCENARIOS[*].tags` in `src/simulator.js`.

## Current state (2026-11-27)

- **Branch / deploy**: `main` builds with Vite (`npm run build` → `dist/`, split `three` `524.20 kB` + `motion` `93.92 kB` vendor chunks) and deploys automatically to Vercel with immutable `/assets/*` caching and hardened security headers (`vercel.json`).
- **Stack**: Vanilla HTML/CSS/ES modules + Three.js `0.128.0` + `lenis` + `gsap` (`ScrollTrigger`) + Web Audio API. (Per the Vercel experiment rule in `7YMERA/skills`, focused bundled libraries are allowed here even though `7ymera.github.io` stays zero-bundler.)
- **Checks**: `npm run check` passes (`road network connectivity`, `real-KL city: 1100 buildings kept / 214 cleared`, `camera path: max turn rate 238, 0 backwards steps`), `node --check src/*.js` and `vite.config.js` pass, `npm run build` succeeds in `1.34s` with 0 errors, `dist/assets/og-card.png` verified (`1200×630`).
- **Browser audit (2026-11-27)**: Verified in headless Chrome across Desktop `1300×820`, Mobile `390×844`, and `prefers-reduced-motion: reduce` (24/24 assertions, 0 console/page errors, `overflowX: 0`) — interactive Klang Valley Route Map drawer (9 stops, all `>= 44px`), route jumps to `#phase-4`, Charter Grid keyboard `Enter`/`Space` + 3D Deck `ArrowRight` & `44×44px` dots, Witness Pledge stamp + 28-piece RapidKL-palette confetti cleanup (disabled under reduced motion), Share Manifesto toast floating clear of `#compare-dock`, and `H` jam-horn easter egg all verified visually.

## Handoff

Nothing in progress. Both `7YMERA/alif-manifesto` (`main` at `ebe6b4a`, plus this log refresh) and `7YMERA/skills` (`main` at `d486afa`, syncing `project-skills/alif-manifesto/SKILL.md`) are clean and pushed.

## Owner to-dos (not code)

- Visual & UX spot-check on a real GPU and an iPhone: Lenis wheel/touch feel, portrait FOV framing, HDR bloom + MSAA 2× on HiDPI, sunlit 2036 breeze motes, and native `navigator.share` sheet on `#share-btn` (Mobile Safari).
- Real audio spot-check: toggle Sound on and verify comfortable volume balance for LRT pledge chime (`C5→E5→G5`), transit control `'tick'`, and `H` Bus 750 jam horn.
- Post-Vercel deploy check: confirm `/assets/*` returns `Cache-Control: public, max-age=31536000, immutable` and `assets/og-card.png` renders cleanly in social link preview debuggers.
- Optional branch cleanup on GitHub once no longer needed:
  - `7YMERA/alif-manifesto` → `claude/optimistic-allen-qal8zv` (0 commits ahead of `main`, fully included).
  - `7YMERA/skills` → `claude/bold-mayer-ia1sl2` (merged into `main` at `d749267`).

## Map (path → what)

- `index.html` — `Press to Go` intro gate, top bar, OG/Twitter `1200×630` card meta, interactive `#year-hud` + 9-stop `#route-drawer`, 7 chapters (`00`–`06`), keyboard-accessible Charter cards & 3D Deck, `.creed-actions` (`#pledge-btn` + `#share-btn`), `#share-toast`, 3D Induced Demand simulator panel, full-bleed `#city-showcase`, Before/After timelapse dock.
- `styles.css` — RapidKL Cobalt Blue (`#0047AB`), Signal Red (`#D92332`), Tropical Emerald (`#0E7C59`) design system; compact alternating 455 px cards; rail-map connectors; Klang Valley Route Drawer; `>= 44px` tap targets (`.view-pill`, `.btn`, `.deck-dot`, `.route-stop`); high-contrast `:focus-visible`; staggered `.animate-on-scroll`; mobile compositing trim; `.no-webgl` fallback.
- `src/main.js` — Boots `createManifestoScene`, `initApp`, `initWhimsy`, `initSimulator`.
- `src/scene.js` — Three.js KL corridor, intro bus departure, traffic/train/walkers, bypass spaghetti stacks, sunlit 2036 breeze motes, portrait FOV pullback, reactive reduced motion, `webglcontextlost`/`restored`, true RAF cancel/restart.
- `src/camera/path.js` — Pure `cameraPose(s)` curve + turn-rate & collision oracle.
- `src/post.js` — Desktop HDR bloom, NaN sanitizer, ACES filmic grade, vignette, HiDPI MSAA scaling (`dpr > 1.25 ? 2 : 4`), slow-frame auto-fallback.
- `src/app.js` — Lenis smooth scroll, scroll → scene bridge, interactive Route Drawer jump/keyboard/scroll-sync + `dataset.realStage` hook, Charter Grid/Deck keyboard nav, SVG rail-map connectors, `.animate-on-scroll` observer, timelapse/Before-After slider, localStorage pledge stamp, `.no-webgl` un-gate fallback.
- `src/audio.js` — Scroll-driven Web Audio soundscape (`cancelScheduledValues` before `setTargetAtTime`, pauses timers & suspends context when muted or tab hidden), plus `playChime('pledge' | 'tick')` and `playHorn()`.
- `src/whimsy.js` & `src/whimsy.css` — Witness Pledge LRT chime + 28-piece self-cleaning RapidKL confetti burst (respects reduced motion), `#share-btn` mobile Web Share / desktop clipboard + `#share-toast` (clears `#compare-dock`), tactile CTA sheen sweep, transit control `'tick'` wiring, and `H` key Bus 750 jam-horn easter egg.
- `src/simulator.js` — Induced Demand Test UI driving `ManifestoScene.setSimScenario` + `'tick'` micro-SFX on scenario change.
- `src/city/{layout,network,roadMesh,clearance,osmCity,skyline,community}.js` — Checked KL road graph, 1,100 real OSM buildings, Bukit Nanas, pocket park + basketball court, KL Sentral-style glass hub.
- `src/mirage/env.js` — Procedural golden-hour PMREM environment map.
- `assets/og-card.png` — `1200×630` RapidKL-palette Klang Valley social share OG/Twitter card.
- `vercel.json` — Clean URLs, immutable `/assets/*` cache header, and hardened security headers (`X-Frame-Options`, `Permissions-Policy`, `X-Content-Type-Options`, `Referrer-Policy`).
- `vite.config.js` — Vite build config splitting `three` and `motion` (`gsap`, `lenis`) vendor chunks + static `assets/` copy plugin.
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
- Never call `navigator.share(...)` unconditionally on Desktop Chrome (Windows Chrome exposes it and hangs indefinitely); keep it gated to mobile/coarse-pointer contexts so Desktop copies cleanly and shows `#share-toast`.
- When `body.is-compare` is active (`progress > 0.86`, including `.creed-box` in `#phase-4`), `#compare-dock` sits bottom-center — keep `.share-toast` raised above it (`bottom: 104px` desktop / `152px` mobile).
- Never use `scale(<1)` in `@keyframes drawer-rise` on `#route-drawer` (it shrinks `.route-stop` hit boxes below `44px` during entry); animate `opacity` + `translateY` only.
- `#year-hud-stage` uses `dataset.realStage` and `dataset.honkActive` so scroll updates in `src/app.js` do not clobber the 1.6s `H` jam-horn toast in `src/whimsy.js`.

## Log (newest first)

- **2026-11-27** · `ebe6b4a` (Antigravity swarm · `skills` synced at `d486afa`) — Iteration 17 polish, a11y, perf & civic whimsy pass across 4 tracks:
  - **Perf/SEO/Security**: `vercel.json` immutable `/assets/*` cache (`max-age=31536000, immutable`) + `X-Frame-Options: DENY` + `Permissions-Policy`; `vite.config.js` `motion` (`gsap`, `lenis`) vendor chunk split (`524.20 kB` `three`, `93.92 kB` `motion`); generated `1200×630` RapidKL-palette `assets/og-card.png` wired to `og:image`/`twitter:card="summary_large_image"`; verified Google Fonts `&display=swap`.
  - **HUD & Charter A11y**: removed `aria-live` spam from `#year-hud`, upgraded to clickable `>= 44px` button opening 9-stop Klang Valley Route Map drawer (`#route-drawer`, all stops `>= 44px`, Escape/Arrow/outside-click, focus transfer, live `aria-current="location"`); added Charter Grid `Enter`/`Space` + `aria-pressed`, 3D Deck `ArrowLeft`/`ArrowRight` + `aria-live="polite"` `#deck-count`, `44×44px` `.deck-dot`, `>= 44px` `.view-pill`/`.btn`, and RapidKL Blue/Gold `:focus-visible`.
  - **Whimsy & Web Audio**: added `ManifestoAudio.playChime('pledge'|'tick')` & `playHorn()` (`src/audio.js`), scenario `'tick'` in `src/simulator.js`, and modular `src/whimsy.js` + `src/whimsy.css` (pledge LRT chime + 28-piece self-cleaning RapidKL confetti skipped under reduced motion, `#share-btn` + `#share-toast`, CTA sheen/press microinteractions, and `H` Bus 750 jam-horn easter egg).
  - **QA Finish-Gate (24/24 PASS)**: real headless Chrome (`1300×820`, `390×844`, `prefers-reduced-motion: reduce`), `0` console/page errors, `overflowX: 0`, 5 screenshots + `og-card.png` inspected; caught and fixed Desktop `navigator.share` hang, `.share-toast` vs `#compare-dock` overlap, and `drawer-rise` `scale(0.98)` sub-44px shrink before push.
- **2026-11-27** · `21b6590` (Antigravity) — High-visibility cinematic & 21st.dev upgrade: added GSAP ScrollTrigger masked word-by-word headlines, staggered station cascades, RapidKL 750 rolling stat tickers, scroll-drawn rail-map SVG beams with glowing interchange pulses, floating Kinetic Year & Transit Line HUD (`2026 → 2036`), 21st.dev border-spotlight + 3D tilt + interactive Grid ↔ 3D Deck Charter switcher, and stronger 2026 overcast smog → 2036 golden-hour 3D sky/sun-halo/motes/bloom contrast.
- **2026-11-27** · `94c121c` (Antigravity) — Created `docs/CLAUDE-LOG.md` handoff log; merged `7YMERA/skills` branch `claude/bold-mayer-ia1sl2` (reorganized `agent-skills/`, `project-skills/`, `exported/` obsidian + 21st.dev ports) into `7YMERA/skills` `main` (`d749267`) and synced `alif-manifesto` handoff pointers; verified `claude/optimistic-allen-qal8zv` had 0 unmerged commits.
- **2026-11-27** · `afd774c` (Antigravity) — Applied `7YMERA/skills` upgrades: added Lenis smooth scroll (gated on intro/visibility/reduced-motion), wired `.animate-on-scroll` onto chapters/charter/creed, true RAF cancel/restart + `webglcontextlost`/`restored`, portrait FOV pullback, reactive reduced motion, mobile resize DPR cap, sunlit 2036 breeze motes (`cloud-pass`), Web Audio `cancelScheduledValues` + timer pause, HiDPI MSAA scaling, hidden scroll-cue pause, mobile `backdrop-filter` trim + opaque topbar + flush mobile `.rail-link`, and `.no-webgl` fallback. Updated `7YMERA/skills` with Vercel experiment bypass rule (`d42ca9c`).
- **2026-11-27** · `5fe418b` (Claude) — Fixed green road depth-bleed (road draws first, lane overlays `depthWrite: false`), made landmark materials `DoubleSide`, flat-shaded Exchange 106 TRX.
- **2026-11-27** · `3dd3eca` (Claude · `claude/optimistic-allen-qal8zv`) — Brief audit fixes: alternating 455 px side cards, bigger `<mark class="hl">`, rail-map phase flowcharts + 3-line fan into 2036, updated acoustic copy, delayed highway greening (47–62%) and frozen opening highway jam, amber `750 / KL SENTRAL` rear bus LED, new `src/city/community.js` (pocket park + basketball court + KL Sentral hub), Before/After labels, glass `\7` portfolio logo.
- **2026-11-27** · `099efd8` / `389ae4d` / `c0fca66` / `03f46d2` (Claude) — Fixed doubled render loop after off-screen RAF gate + scroll-reveal merge.
- **2026-11-27** · `5f7fc09` / `24176d3` (Claude) — Real KL towers from portfolio, 1,100 OSM KL buildings (`kl_city.json`), checked road graph, smooth camera rig + oracle (`tools/check-city.mjs`), desktop HDR bloom/ACES post (`src/post.js`), flyovers that dim/empty the street beneath.
- **2026-11-27** · `7ca7a29` / `93d1f89` / `a6b2ff5` (Claude) — Moved Induced Demand Test from 2D canvas into the live 3D city with spaghetti flyovers; fixed simulator crash, reduced-motion, 44 px tap targets, and contrast.
