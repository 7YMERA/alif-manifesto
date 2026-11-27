# 3D Hero Asset Catalog (`assets/models/`)

All showcase-grade hero models are sculpted in **Blender 5.3.0** and exported as **glTF 2.0 binary (`.glb`)** with `+Y` up, base grounded strictly at `y = 0`, centered in `X/Z`, authored for warm **Golden Hour PBR lighting** (zero purple/magenta).  
Master Blender source: [`blender/alif_mirage_assets.blend`](../../blender/alif_mirage_assets.blend) (all 10 core hero collections arranged cleanly).

---

## Core Hero `.glb` Assets

| File | Size | Dimensions (`W × H × L`, X×Y×Z) | Orientation / Notes | Key Material Slots |
| :--- | :--- | :--- | :--- | :--- |
| `rapidkl_750_bus.glb` | `507.8 KB` | `2.99m × 3.26m × 12.10m` | `y=0`, facing `+Z` | `paint_blue`, `paint_red`, `paint_white`, `metal_silver`, `metal_dark`, `tire_rubber`, `glass_dark`, `emissive_headlight`, `emissive_tail`, `emissive_amber`, `emissive_cabin` |
| `lrt_train.glb` | `440.4 KB` | `2.93m × 4.26m × 16.04m` | `y=0`, facing `+Z` | `paint_blue`, `paint_red`, `paint_white`, `foliage_emerald`, `metal_silver`, `metal_dark`, `glass_dark`, `emissive_headlight`, `emissive_tail`, `emissive_amber`, `emissive_cabin` |
| `kl_sedan.glb` | `210.7 KB` | `2.20m × 1.46m × 4.37m` | `y=0`, facing `+Z`, tintable `car_paint` | `car_paint`, `glass_dark`, `metal_dark`, `metal_silver`, `tire_rubber`, `emissive_headlight`, `emissive_tail` |
| `kl_bus_shelter.glb` | `174.6 KB` | `6.16m × 3.04m × 2.53m` | `y=0`, facing `+Z` | `concrete`, `paving_terracotta`, `timber_warm`, `metal_silver`, `metal_dark`, `paint_blue`, `paint_red`, `glass_dark`, `emissive_amber`, `foliage_emerald`, `flower_gold` |
| `green_viaduct_module.glb` | `424.2 KB` | `10.58m × 4.15m × 6.29m` | `y=0`, 10m span along `X`; `2.5m–3.6m` draping vines + pier wraps | `concrete`, `asphalt_road`, `metal_silver`, `metal_dark`, `emissive_amber`, `bark_warm`, `foliage_emerald`, `foliage_bright`, `flower_crimson`, `flower_coral`, `flower_gold`, `flower_white` |
| `tropical_tree_cluster.glb` | `60.2 KB` | `12.20m × 6.65m × 6.85m` | `y=0`, centered `X/Z` | `bark_warm`, `foliage_emerald`, `flower_gold` |
| `kl_shoplot_row.glb` | `481.5 KB` | `10.32m × 13.75m × 24.09m` | `y=0`, 4-bay 24m row along `Z`, front Kaki Lima facing `+X` (rotate `0` or `180°` for both street sides) | `concrete`, `paving_terracotta`, `stucco_cream`, `stucco_sand`, `stucco_ochre`, `stucco_sage`, `timber_warm`, `metal_dark`, `metal_silver`, `glass_dark`, `emissive_cabin`, `emissive_amber`, `paint_blue`, `foliage_emerald` |
| `kl_covered_walkway.glb` | `139.0 KB` | `3.55m × 3.24m × 12.00m` | `y=0`, seamless `12.0m` end-to-end tiling along `Z`, planter kerb on `-X` | `concrete`, `paving_terracotta`, `timber_warm`, `metal_silver`, `metal_dark`, `paint_blue`, `emissive_amber`, `foliage_emerald`, `foliage_bright`, `flower_crimson`, `flower_coral`, `flower_gold`, `flower_white` |
| `kl_jejantas_bridge.glb` | `703.1 KB` | `33.80m × 9.81m × 9.63m` | `y=0`, spans along `X`, **clear roadway span `~26.4m`** (`x=-13.2..+13.2`), **bottom deck clearance `y >= 5.75m`** | `concrete`, `paving_terracotta`, `timber_warm`, `metal_silver`, `metal_dark`, `paint_blue`, `glass_dark`, `emissive_cabin`, `emissive_amber`, `bark_warm`, `foliage_emerald`, `foliage_bright`, `flower_crimson`, `flower_coral`, `flower_gold`, `flower_white` |
| `roadside_flower_planter.glb` | `107.1 KB` | `1.79m × 1.45m × 8.15m` | `y=0`, modular `8.0m` length along `Z` for roadsides & medians | `concrete`, `timber_warm`, `metal_dark`, `bark_warm`, `foliage_emerald`, `foliage_bright`, `flower_crimson`, `flower_coral`, `flower_gold`, `flower_white` |
| `shared_space_plaza.glb` *(optional Ch 05)* | `269.4 KB` | `28.00m × 6.45m × 22.00m` | `y=0`, centered `X/Z`, facing `+Z` | `concrete`, `paving_terracotta`, `timber_warm`, `metal_dark`, `metal_silver`, `emissive_amber`, `bark_warm`, `foliage_emerald`, `flower_gold` |
| `kl_city_map.glb` *(Real KL OSM Map)* | `997.7 KB` | `440.00m × 8.23m × 570.00m` | `y≈0`, bounds `X: -220..220`, `Z: -430..140`; aligned to KLCC/Menara KL/Merdeka 118/Exchange 106 | `terrain_grass`, `asphalt_road`, `concrete`, `road_marking`, `paint_blue`, `water_river`, `foliage_emerald`, `metal_silver` |

---

## Real-World Kuala Lumpur OSM Map & Routing Data (Standalone Reference Package)
Built from real OpenStreetMap Kuala Lumpur geometry in the exact `+Y`-up scene coordinate frame (`origin: 3.1500°N, 101.7090°E`, `scale: 0.065937`, `rot: -3.56°`, aligned to `klcc`, `menara_kl`, `merdeka118`, and `exchange106`) so external agents (e.g. Claude) can inspect or build directly on real KL roads:

- **`assets/models/kl_city_map.glb`** (`997.7 KB`) & **`blender/kl_city_map.blend`** (dedicated Blender 5.3 source, kept separate from `blender/alif_mirage_assets.blend`):
  - 13 batched architectural meshes: `KL_Terrain`, `KL_River_Embankment`, `KL_River_SungaiKlang`, `KL_Parks` (KLCC Park, Bukit Nanas, etc.), `KL_Roads_Motorway`, `KL_Roads_Primary`, `KL_Roads_Secondary`, `KL_Roads_Roundabouts`, `KL_Sidewalks_Primary`, `KL_Roads_BusLanes` (cobalt priority strips), `KL_Road_Markings`, `KL_Rail_ViaductDeck`, `KL_Rail_Corridors`.
- **`assets/models/road_paths.json`**:
  - `bus_routes`: 6 continuous stitched real KL corridors (`jalan_ampang_corridor`, `jalan_tun_razak_loop`, `jalan_sultan_ismail_corridor`, `jalan_syed_putra_corridor`, `akleh_express_corridor`, `kl_central_loop`), each `[[x, y, z], ...]` at `y = 0.07`.
  - `car_lanes`: 8 bidirectional multi-lane splines (`kl_lane_1`..`kl_lane_8`).
  - `plaza_anchors`: `shared_spaces` (6 `[x, y, z, rotY]`), `bus_shelters` (8 `[x, y, z, rotY]`), `tree_clusters` (24 `[x, y, z, rotY]`).
  - `viaduct_anchors`: 10 `[x, y, z, rotY]` anchors along the elevated AKLEH corridor.
- **`assets/city/kl_real_roads.json`** (`151.1 KB`): Raw projected OpenStreetMap polylines (`roads.motorway`, `roads.primary`, `roads.secondary`, `roads.roundabout`, `river`, `rail`, `parks`).

---

## Vibrant Tropical Floral Palette (Zero Purple/Magenta)
- **Hibiscus Crimson:** `#E63946` (`flower_crimson`)
- **Warm Coral-Orange:** `#FB8500` (`flower_coral`)
- **Golden-Yellow:** `#FFB703` (`flower_gold`)
- **Sunlit Tropical White:** `#FFF6E0` (`flower_white`)
- **Lush Two-Tone Emerald:** `#0E7C59` (`foliage_emerald`) & `#2D9E5F` (`foliage_bright`)
