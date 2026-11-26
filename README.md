# Alif Najmi — 10-Year Civic Manifesto (2026–2036)

An interactive, scroll-driven 3D Malaysian civic & political manifesto for **Muhammad Alif Najmi (`7YMERA`)** charting a personal 10-year roadmap (2026–2036) toward Malaysian public office — advocating for enforced RapidKL bus lanes, high-frequency railways, greened & flower-decorated existing highways, continuous shaded sidewalks (*kaki lima*), elderly-first crossings, and vibrant shared community spaces.

---

## Agent Handoff & Owner Rules (Read First!)

If you are an AI agent picking up this repo to polish or extend it, follow these non-negotiable rules from the owner:

1. **Privacy (Public Repo)**:
   - Personal manifesto only — never publish any employer or company names, client details, or colleagues' info.
   - Keep Shah Alam residence general as **"Section 13, Shah Alam"** — never publish exact apartment names or street numbers.
   - Do **not** link the public GitHub source code in the UI.
2. **Timeline & Copy**:
   - **Never mention age** — anchor all milestones strictly by **year** (`2026`, `2026–2027`, `2028–2029`, `2030–2031`, `2036`).
   - Emphasize pragmatism on highways: **do NOT destroy existing highways** — keep them utilized with traffic on top, stop building *new* urban mega-highways, and decorate existing concrete pillars/decks with **tropical greenery & flowers**.
   - Highlight the real **RapidKL 750** commute audit (**Section 13, Shah Alam → Mid Valley, KL · 18 km · 40 min · 2.22 min/km**): *"You can add a bus every second, but if it still shares congestion with cars, what's the point?"*
3. **Visual & UX Rules**:
   - **Theme**: Malaysian **RapidKL Cobalt Blue (`#0047AB`) + Signal Red (`#D92332`)** + tropical emerald green (`#0E7C59`). **Zero purple or magenta.**
   - **No mouse-following camera drift** and **no sharp zig-zag camera angles** — keep the camera gliding smoothly along a calm, straight forward axis.
   - **No early 3D spoiler toggle buttons** in Chapters 01–02 — let the ugliness-to-shared-spaces progression happen naturally as you scroll.
   - **No white footer bar at the bottom** — keep the end-of-scroll Kuala Lumpur city showcase full-bleed 3D with the floating **Before / After** slider (`progress > 88%`), floating **↑ Top** button, and subtle bottom-left copyright badge.
   - **Compact left/right cards** (`max-width: 455px`) with bold scannable headlines (`<mark class="hl">`) and a 6px accent ribbon so text is instantly readable without blocking the center 3D city.
   - **Logos in Top Bar**: GitHub avatar (`github-avatar.png`) for the brand mark, custom sidewalk/leaf SVG (`kakilima-logo.svg`) for **KakiLima**, and glossy mirror chrome `\7` (`portfolio-logo.svg`) for **Portfolio**.

---

## Project Architecture & File Map

Plain HTML5, Vanilla CSS, Vanilla JS + Three.js (`r128` via jsDelivr CDN). **Zero build step, zero bundler, zero npm dependencies** — deploys directly to Vercel.

| File | Responsibility |
|---|---|
| `index.html` | Semantic HTML5 structure, `Press to Go` opening pill, top nav with real logos, 7 scroll chapters (`00`–`06`) + full-bleed bottom `#city-showcase`, floating `Before / After` dock (`#compare-dock`), and `↑ Top` button. |
| `styles.css` | RapidKL Red & Blue light/dark design system, compact side-mounted cards with 6px accent ribbons & `<mark class="hl">` highlights, bottom chapter dock, top scroll hairline, kinetic year watermark, and responsive breakpoints. |
| `scene.js` | Complete Three.js 3D Malaysian metropolis engine (see breakdown below). |
| `app.js` | `Press to Go` opening handoff, scroll progress → `ManifestoScene.setScrollProgress()`, `IntersectionObserver` chapter rail & HUD sync, **Auto-Cruise** hands-free scroll mode, Daylight / Golden Hour & Light / Dark toggles, **End-of-Scroll Before / After** slider (`setCompareRatio`), and local **Witness This 10-Year Pledge** stamp. |
| `vercel.json` | Clean URLs and security headers for static Vercel deployment. |
| `assets/city/*` | Real 3D Kuala Lumpur landmark JSON models (`klcc.json`, `menara_kl.json`, `merdeka118.json`, `exchange106.json`), terrain textures (`terrain_color.jpg`, `terrain_ao.jpg`, `terrain_h.json`), and building facade textures (`facade_glass.jpg`, `facade_night.jpg`) imported from `7YMERA/7ymera.github.io`. |
| `assets/icons/*` | `github-avatar.png` (GitHub profile logo), `kakilima-logo.svg` (custom shaded sidewalk + tropical leaf emblem), `portfolio-logo.svg` (glossy mirror chrome `\7` monogram). |

---

## 3D Scene Architecture (`scene.js`)

1. **Interactive `Press to Go` Opening**:
   - Camera opens directly behind a detailed **RapidKL 750** bus (`W 750 MY`, glowing amber `750 · KL SENTRAL` canvas LED matrix, dual red brake lights, roof AC pod) parked in lane `-2.4` at `z = 48.5`.
   - Clicking **Press to Go** (or clicking directly on the 3D bus via `THREE.Raycaster`, or pressing `Enter`) performs a subtle **zoom-in → smooth pull-back & rise**, revealing the **frozen, motionless morning jam** (zero clipping) and the original hazy Kuala Lumpur skyline. The bus and jammed cars stay completely stuck until you scroll forward into the dedicated bus-lane vision.
2. **True "Ugliness (2026) → Shared Spaces (2036)" Scroll Progression**:
   - **Act 1 (`0.00 – 0.35`)**: Exhaust-haze grey sky, denser fog (`0.0036`), dark stained sidewalks, drab weathered grey shophouses & towers, bare concrete highway overpass, motionless jammed cars, red intersection lights, and stuck RapidKL 750 bus.
   - **Act 2–3 (`0.35 – 0.76`)**: Haze clears into crisp blue sky (`0.0020`), sidewalks brighten into warm sandstone, shophouses & towers bloom into authentic Malaysian heritage colors + glowing storefronts + rooftop gardens, highway pillars & deck planters bloom with **tropical vines and vibrant Malaysian flowers** (hibiscus red, golden Allamanda, coral Ixora, white frangipani), **34 cars & box trucks** actively cruise on top of the highway deck (`y = 7.6`), RapidKL cobalt-blue bus lanes & illuminated RapidKL bus stops activate, congestion clears, **RapidKL 750** glides freely, **community parks + a full 3D basketball court** and strolling scale walkers appear, and the **elevated LRT/MRT viaduct** (solid columns, KL Sentral-style concourse hub, gliding 4-car electric train) comes alive.
   - **Zero Clipping & Map-Accurate KL**:
     - The elevated LRT ends cleanly at `z = -196` and dives **underground** down a ramp into a tunnel portal (`z = -196 → -236`) well before Petronas Twin Towers.
     - The main boulevard ends at `z = -255` and connects into a **curved KLCC perimeter ring road** around Petronas Twin Towers.
     - All four real 3D KL landmarks sit at GPS-proportioned bearings looking northeast from Shah Alam / Mid Valley and are individually colored to match reality: **KLCC** (brushed silver + emerald-sky glass), **Menara KL** (ivory white + gold pod on green Bukit Nanas hill), **Merdeka 118** (silver diamond frame + crystalline blue glass), and **The Exchange 106 TRX** (royal-cobalt glass + champagne-gold crown).
3. **End-of-Scroll Before / After Showcase (`scroll > 88%`)**:
   - Smooth panoramic orbit over the entire transformed Kuala Lumpur metropolis, paired with the floating **`2026 · Before` ↔ `2036 · After`** slider (`ManifestoScene.setCompareRatio(0..1)`) that morphs the entire 3D city live.

---

## Iteration History (What Was Built & Refined)

1. **Initial Foundation (`77e641b`)**: Built the 6-chapter scroll manifesto, civic-editorial CSS, Three.js morphing street, and Vercel static config.
2. **Real KL Models & Year-Driven Timeline (`dc7f1a7`)**: Removed all age mentions in favor of pure years (`2026`–`2036`), imported the 4 real 3D KL models from `7YMERA/7ymera.github.io`, added kinetic year watermark & Auto-Cruise.
3. **Keep & Green Highways (`51f2c79`)**: Added Chapter `02` (*"Does this mean destroying highways? No."*), kept the 3D concrete overpass standing permanently, and wrapped it in living greenery.
4. **Steady Camera & Railway Advocacy (`abb2dba`)**: Removed mouse-follow camera parallax, added elevated railway viaduct + gliding 4-car electric train, and expanded the 2036 Charter to 6 pillars led by Railways.
5. **Real RapidKL 750 Commute Audit (`20266c4`)**: Added Alif's real **Section 13, Shah Alam → Mid Valley (18 km · 40 min · 2.22 min/km)** commute math while keeping his exact apartment private.
6. **RapidKL Red & Blue Showcase + Portfolio Assets (`65a95b6`, `cca9425`)**: Switched to RapidKL Red & Blue theme, imported portfolio terrain/facade textures, added gradient sky dome + 900 stars, fixed choppy Exchange 106 shading, removed white footer bar & source link, moved KakiLima & Portfolio to top nav, expanded into a sprawling colorful Malaysian metropolis with prominent RapidKL bus stops and map-accurate KL coordinates.
7. **Highway Traffic, Flowers, Parks, Basketball Court & Solid LRT (`d5d2a0b`, `6552cb5`)**: Added 34 visible vehicles on top of the highway deck, decorated highway pillars & planters with vibrant Malaysian flowers, fixed floating LRT station roofs with full columns + KL Sentral concourse, built a community park + 3D basketball court, colored all 4 KL landmarks accurately, and upgraded scroll cards with big highlighted headlines.
8. **Ugliness → Shared Spaces + End-of-Scroll Before/After (`f0aac9c`)**: Made sky haze, sidewalks, shophouses, awnings, and towers progressively transform from drab 2026 grey to vibrant 2036 colors, and added the end-of-scroll Before/After slider.
9. **`Press to Go` Opening, Underground LRT, KLCC Ring Road & Logos (`d7c87f9`, `dcb509d`, `a2c17da`)**: Replaced the opening modal with the interactive `Press to Go` behind-the-bus opening (zoom-in → pull-back with frozen zero-clipping jam), smoothed camera angles to a straight forward glide, routed the LRT underground into a tunnel portal before KLCC, added a curved KLCC perimeter ring road, and added the GitHub avatar, custom KakiLima SVG, and glossy mirror `\7` portfolio logo.

---

## Run Locally & Deploy to Vercel

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`.

**Deploy on Vercel**: Import `7YMERA/alif-manifesto` at [vercel.com/new](https://vercel.com/new) → Framework Preset: **Other** → Deploy (no build command required).
