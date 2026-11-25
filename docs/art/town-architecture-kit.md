# Hollowmere architecture kit: asset sheet

The building shells of Act I's town: houses (three sizes), St. Aldric's chapel, the Wardens' mausoleum and the crypt gate. They replace the box-and-prism buildings in `godot/scripts/world/town.gd`. Detail pieces that already exist (`house_door`, `house_window_lit`/`_dark`, `chimney`, `rose_window`, `well`) still hang on them where they hang today.

Rules come from [art-bible.md](../../art-bible.md) (pillars, architecture rules, colour script, budgets) and the build process from [assets.md](../../assets.md). Script: `scripts/assets/blender/props/town_buildings.py`.

## Shared kit specification (KIT)

Fields marked "see KIT" in the sheets below use this section.

- **Grid and footprints.** The town is a 2 m grid (`LevelGrid.CELL`). A building fills its map region minus a margin:

  | Building | Margin |
  | --- | --- |
  | Houses | 0.2 m on every side |
  | Chapel | 0.3 m |
  | Mausoleum | 0.3 m on the sides, 0.2 m front and back |

  The front face therefore sits exactly where `town.gd` already hangs doors and windows (`s.z / 2 - margin`).
- **Axes and pivot.** The pivot is at floor level in the centre of the region, Z up in Blender. The front faces -Y in Blender (+Z in Godot, toward the camera). Metres throughout.
- **Construction language** (art bible §4):
  - every building stands on a stone plinth;
  - houses are timber-framed plaster under slate roofs;
  - the chapel and mausoleum are ashlar stone;
  - roofs overhang by 0.3–0.4 m;
  - wall tops are always capped (a wall plate or a ridge), because the camera sees them.
- **Wear, which follows physics:**
  - the plinth is darker and damp-stained (it is the stone material, which carries damp in its texture);
  - timber is darker than plaster;
  - roof slates have a sag in long roofs (ridge displacement ≤ 4 cm);
  - nothing is perfectly square: posts and braces lean up to 1.5°.
- **Shared materials:** `stone_wall`, `plaster`, `timber`, `roof_slate` and `steel` from `materials.py`. There are no unique textures. Glass is the only emissive surface (the chapel's lancets).
- **Colour roles** (art bible §12):

  | Surface | Swatch | Coverage | Value |
  | --- | --- | --- | --- |
  | Plaster | `#9E8F85` | 40% of a house | Mid |
  | Timber | `#4A3B33` | 15% | Low |
  | Slate | `#57505C` | 35% | Low-mid |
  | Stone | `#6E6A70` | Chapel and mausoleum | Mid |
  | Glass | `#5A2A5C`, glowing `#B34073` | Small accent | — |

  Buildings stay lower in value than the lantern pools and the heroes.
- **Budgets** (art bible §15): a house shell is ≤ 3 k triangles, the chapel ≤ 8 k, the mausoleum and the gate ≤ 4 k each. There are 1–4 material slots per building.
- **LOD.** The play camera sits at a fixed high angle 18–30 m away, so a building is never seen from closer than about 15 m. No LOD is needed at these counts; Godot's automatic mesh LOD on import is left on.
- **Textures.** Shared 1024² world sets for stone and plaster, 512² for timber and slate. Albedo is sRGB; normal and roughness are linear. PNG, stored in LFS. There are no bakes: the shapes are real geometry, and detail comes from the tiling sets.
- **UV.** `ddk.uv_unwrap` (smart project at 60°, 0.02 margin), scaled so the texel density matches the floors (about 512 px/m on stone and plaster). Every piece is unwrapped; there are no unique islands.
- **Blender workflow.** Each building is a Python function in `town_buildings.py`, built from `ddk` primitives and helper panels, at metric scale.
  1. Run `bun run assets:build -- town_buildings --previews <dir>` for a 3/4 preview.
  2. Check it in game from the play camera.
  3. Export through `ddk.export("props", name)`, which writes the `.gltf` and `.bin` plus a `.blend` in `source-assets/Models/props/`.
- **Godot import.** The exported glTF lands in `godot/assets/models/props/`, and `town.gd` instances it through `props_model.gd asset()`. There is no collision mesh: the level grid marks building cells as solid (`LevelGrid.PROP`). The code-built building stays as a fallback when the model is missing.
- **Tests.** `asset_test` loads every piece. The smoke test plays the town with the pieces in. `tests/screenshots.tscn` gives the in-camera review.

---

## 1. House shells: `house_small`, `house_medium`, `house_large`

1. **Asset name.** Hollowmere house: `house_small` (6×4 m), `house_medium` (8×6 m), `house_large` (10×6 m).
2. **Category.** Environment, Act I town kit, gameplay variant only.
3. **Gameplay purpose.** These are the walls of the town's streets. They frame the square and the paths, and they must read as *solid and not enterable* from 25 m. They compete with lantern pools and townsfolk, and must stay quieter than both.
4. **Visual description.**
   - **Height:** a one-storey hall house, 3.2 m to the eaves (the game varies it between 3.0 and 3.8 m), with a steep 45° slate roof about 2.6 m tall whose ridge runs the long way.
   - **Walls:** a stone plinth 0.5 m high, then timber-framed plaster: corner posts, a sill beam, a mid rail, a wall plate, studs at about 1.2 m, and corner braces.
   - **Clear zones:** the door and window positions used by `town.gd` (door at -0.2 × width, window at +0.22 × width) are left free of framing.
   - **Story-bearing detail:** the gable ends have a king post. The roof sags slightly, because these houses are old and poor.
5. **Shape language.**
   - **Primary mass:** a long box under a triangle.
   - **Repeated forms:** vertical studs and diagonal braces.
   - **Intentional exception:** the braces lean the "wrong" way on one corner, as an old repair.
6. **Artistic intent.** "People live here, frightened": modest, closed, weathered homes around a square that should feel like refuge but doesn't.
7. **Silhouette.** From the play camera, the roofs carry it: a dark triangle-topped block with a pale band of plaster under it. The negative space is the street between houses. Thumbnail test: at 64 px tall, a greyscale crop must read as "roofed house", not a crate.
8. **Materials.**
   - **Stone plinth:** damp, chipped at the corners.
   - **Lime plaster:** stained low down and paler under the eaves.
   - **Oak frame:** dark and pegged, with a slight lean.
   - **Slate roof:** cool, low-value grey with a slight sag.
   - **Ridge:** a timber ridge board.
9. **Colour palette.** See KIT. Coverage: plaster 40%, slate 35%, timber 15%, stone 10%.
10. **Poly budget.** ≤ 3 k triangles. Geometry goes to the frame members (they read at distance) and the roof overhang. Nothing goes to slate courses: the texture carries them.
11. **LOD strategy.** None needed (see KIT). If later acts show houses at range, a LOD1 would drop the studs and keep the posts, plates and roof.
12. **Texture requirements.** Shared `plaster`, `timber`, `roof_slate` and `stone_wall` sets (see KIT).
13. **PBR breakdown.**

    | Surface | Roughness | Metallic | Notes |
    | --- | --- | --- | --- |
    | Plaster | 0.85 | 0 | — |
    | Timber | 0.8 | 0 | — |
    | Slate | 0.6 | 0 | Slightly glossier, so it reads wet under the moon |
    | Stone | 0.85 | 0 | — |

    No emission (window light comes from the window pieces).
14. **UV recommendations.** See KIT. Frame members unwrap along their length so the grain runs the right way.
15. **Blender workflow.** See KIT, using `house(name, width, depth)`.
16. **Tripo AI prompts.**
    - **A) Tripo AI prompt:** "A small medieval timber-framed house for a dark fantasy town, 8 m wide, 6 m deep, 3.2 m walls and a steep 45-degree grey slate roof about 2.6 m tall with its ridge along the long side. A low stone plinth 0.5 m high, pale lime plaster between dark oak posts, rails and diagonal corner braces. Plain block model, no door or windows, isolated, neutral grey background, game-ready scale."
    - **B) Enhanced Tripo AI prompt:** "A medieval timber-framed hall house for a dark fantasy town, 8 m wide, 6 m deep, 3.2 m to the eaves, a 45-degree slate roof 2.6 m tall with a 0.35 m overhang and a timber ridge board. Clear part boundaries:
      - a stone plinth 0.5 m high;
      - a sill beam on top of it;
      - oak corner posts, a mid rail at 1.5 m and a wall plate at 3.1 m;
      - studs every 1.2 m and diagonal braces at the corners;
      - lime plaster infill set 3 cm behind the timber;
      - gable ends with a king post.

      Leave a 1.2 m gap in the framing at 20% from the left of the front for a door, and a 1 m gap at 22% from the right at 1.6–2.4 m height for a window. The surface changes from stone to timber at the sill and from plaster to timber at every member edge."
    - **C) Ultra quality Tripo AI prompt:** "A weathered medieval timber-framed hall house, 8 m wide, 6 m deep, 3.2 m to the eaves, a steep 45-degree grey slate roof 2.6 m tall with a 0.35 m overhang, the same silhouette as a simple long block under a triangle. Craftsmanship visible up close:
      - pegged oak joints and slightly leaning posts;
      - braces repaired with a newer timber on one corner;
      - plaster stained dark at the base and pale under the eaves;
      - a damp stone plinth with chipped corners;
      - slates with a gentle sag along the 8 m ridge, and a timber ridge board.

      The rear and the gable ends continue the same framing. The underside of the eaves shows rafter ends. Keep the door and window gaps clear. Bake only the slate courses and plaster cracks into the normal map; the framing stays geometry."
17. **Concept art prompt.** "Orthographic sheet of a medieval timber-framed house for a dark gothic ARPG: front, side and top views, plus a high three-quarter game-camera view at 25 m. A 1.8 m human silhouette for scale. Swatches for slate `#57505C`, lime plaster `#9E8F85`, oak `#4A3B33` and stone `#6E6A70`. Cold moonlight from the upper right, a warm lantern glow at street level. Dark neutral background. Callouts for the plinth, framing, the door and window gaps, the roof overhang and the sag."
18. **Production notes.**
    - **Depends on:** the shared material sets.
    - **Names:** `house_small`, `house_medium`, `house_large`.
    - **Placement:** `town.gd` picks a variant by region size (3×2, 4×3 or 5×3 cells) and scales the shell in Y by `wall_h / 3.2` to keep today's variety. The door, window and chimney pieces stay separate.
    - **Handoff check:** the door and window sit in the framing gaps.
19. **Optimization notes.** 8 houses on screen, 4 material slots each. Godot merges surfaces by material per mesh, so about 32 draw calls. MultiMesh is not worth it at 8 instances. Measure the draw calls with the area in view before adding detail.
20. **Godot import setup.** See KIT. Target scene: `world.tscn`, built by `town.gd`. Check from the play camera at the default zoom and fully zoomed in.

## 2. St. Aldric's chapel: `chapel`

1. **Asset name.** St. Aldric's chapel, `chapel`.
2. **Category.** Environment, Act I landmark, gameplay variant.
3. **Gameplay purpose.**
   - **Landmark:** it is the town's landmark, seen from most of the map (art bible §3).
   - **Quest hub:** its door is where Maud stands and where the undercroft stair opens.
   - **Read:** it must read as *holy, old, the centre of the town* from anywhere in town.
   - **Competition:** it competes with nothing; it *is* the backdrop.
4. **Visual description.**
   - **Nave:** a stone nave 15.4 × 11.4 m with 6 m walls and buttresses along the long sides. A steep slate roof (ridge 9.5 m) runs front to back.
   - **Tower:** a square bell tower, 3.4 m on each side, centred on the front and flush with it, rising 11 m. It has open belfry arches at 8.4–10.2 m and an octagonal slate spire to 16.5 m with small corner pinnacles.
   - **Front:** pointed lancet windows (glass) either side of the tower on the front, and a pointed door arch at the tower's base.
   - **Story detail:** the belfry is dark and empty. The bell is gone: it is below, in Hask.
5. **Shape language.**
   - **Primary mass:** a tall vertical (the tower and spire) on a long body.
   - **Repeated forms:** pointed arches and buttress wedges.
   - **Exception:** the empty belfry, a black gap.
6. **Artistic intent.** Faith standing firm, but silent: the one building that should ring, and doesn't.
7. **Silhouette.** The spire is the tallest shape in Act I and readable from every corner of town. The negative space is the belfry openings, which show the sky. Thumbnail: at 48 px, a spike on a block, unmistakably a church.
8. **Materials.**
   - **Ashlar stone:** soot above the door; darker damp courses at the base.
   - **Slate:** for the roof and spire.
   - **Leaded glass:** dark violet, glowing faintly from candles inside.
   - **Door:** an iron-banded oak door, set into the arch.
9. **Colour palette.** Stone 60%, slate 30%, glass 3% (violet-magenta accent, the only saturated note in town), timber 2%.
10. **Poly budget.** ≤ 8 k triangles. Geometry goes to buttresses, arches, the belfry openings, the spire and the pinnacles.
11. **LOD strategy.** None (see KIT). Keep the spire silhouette at every distance.
12. **Texture requirements.** See KIT, plus a glass material with no texture.
13. **PBR breakdown.**
    - **Stone:** roughness 0.85.
    - **Slate:** roughness 0.6.
    - **Glass:** base `#5A2A5C`, roughness 0.3, emission `#B34073` at 0.7. Justified: a lit interior.
    - **Door:** timber at roughness 0.8, with iron bands (metallic 1, roughness 0.5).
14. **UV recommendations.** See KIT. The spire unwraps radially.
15. **Blender workflow.** See KIT, using `chapel()`.
16. **Tripo AI prompts.**
    - **A) Tripo AI prompt:** "A small gothic stone chapel for a dark fantasy town: a nave 15 m wide and 11 m deep with 6 m walls and a steep slate roof whose ridge runs front to back, and a square bell tower 3.4 m wide centred on the front rising 11 m with an octagonal slate spire to 16.5 m. Plain block model, isolated, grey background."
    - **B) Enhanced Tripo AI prompt:** "A gothic stone chapel: a nave 15.4 × 11.4 m with 6 m ashlar walls, four stepped buttresses on each long side, and a steep slate roof whose ridge (9.5 m) runs front to back with gable ends. A square bell tower 3.4 m wide, flush with the centre of the front, 11 m tall, with pointed open belfry arches on all four sides at 8.4–10.2 m, a corbelled parapet, small corner pinnacles, and an octagonal slate spire to 16.5 m. A pointed door arch 1.6 m wide at the tower base, and two tall pointed lancet windows on the front either side of the tower. Part boundaries: plinth, wall, buttress, tower stages, parapet, spire."
    - **C) Ultra quality Tripo AI prompt:** "An old gothic village chapel, the same silhouette (a 15.4 × 11.4 m nave, a 3.4 m square front tower to 11 m, an octagonal slate spire to 16.5 m). Craftsmanship:
      - tooled ashlar with damp-darkened lower courses;
      - soot above the pointed oak door with iron bands;
      - leaded violet lancet glass, faintly lit from inside;
      - buttress offsets with sloped weatherings;
      - an empty dark belfry with no bell;
      - weathered slate with lead flashing at the tower.

      The rear gable and both long sides continue the buttress rhythm. Bake only the stone joints and slate courses; arches, buttresses and pinnacles stay geometry."
17. **Concept art prompt.** "A gothic village chapel for a dark ARPG: orthographic front and side views plus the high game-camera three-quarter view. A 1.8 m human for scale. Swatches for stone `#6E6A70`, slate `#57505C` and violet glass `#5A2A5C` / `#B34073`. Moonlight from the upper right and candlelight through the glass. Callouts for the empty belfry, the buttress rhythm and the door arch. Dark neutral background."
18. **Production notes.**
    - **Existing pieces:** `town.gd` keeps the `rose_window` piece (on the tower front at 6 m), the two door torches and the violet light. It drops its code-built walls, roof, tower, glass and door when `chapel` exists.
    - **Handoff check:** the rose window sits on the tower face and the torches flank the door.
19. **Optimization notes.** One instance, four material slots, about 4 draw calls. It never moves, so occlusion doesn't matter.
20. **Godot import setup.** See KIT. Pivot at the region centre. The tower front is at +5.7 m in Godot Z.

## 3. Wardens' mausoleum: `mausoleum`

1. **Asset name.** Mausoleum of the Wardens, `mausoleum`.
2. **Category.** Environment, Act I graveyard set piece (quest location: the Wardens' Oath).
3. **Gameplay purpose.** Marks the graveyard's important tomb, next to the crypt gate and the wardens' plinth. It must read as *a tomb of honour* from 25 m and pull the eye toward the gate beside it.
4. **Visual description.** A classical stone tomb 7.4 × 3.6 m on a two-step plinth with 3.4 m walls, under a low gable roof whose ridge runs along X.
   - **Front:** a portico of four columns (bases and capitals) under an entablature with a blank inscription band, and a triangular pediment. Recessed bronze doors sit between the middle columns.
   - **Story detail:** stone urns at the front corners, one broken.
5. **Shape language.**
   - **Primary mass:** a squat box with a triangle on top.
   - **Repeated forms:** the column rhythm.
   - **Exception:** the broken urn.
6. **Artistic intent.** Old honour, disturbed: the wardens were great once.
7. **Silhouette.** A low pediment over a row of verticals, distinct from the houses' steep roofs and the chapel's spire.
8. **Materials.**
   - **Pale limestone ashlar:** greyer than the chapel's stone.
   - **Columns:** turned stone.
   - **Doors:** bronze, verdigris in the recesses (the steel material darkened).
   - **Roof:** slate.
9. **Colour palette.** Stone 75%, slate 20%, bronze 5%.
10. **Poly budget.** ≤ 4 k triangles. The columns get 12 sides; the fluting is left to texture.
11. **LOD strategy.** None (see KIT).
12. **Texture requirements.** See KIT.
13. **PBR breakdown.** Stone roughness 0.85. Bronze doors: metallic 1, roughness 0.5. Slate roughness 0.6.
14. **UV recommendations.** See KIT.
15. **Blender workflow.** See KIT, using `mausoleum()`.
16. **Tripo AI prompts.**
    - **A) Tripo AI prompt:** "A small classical stone mausoleum, 7.4 m wide and 3.6 m deep, 3.4 m walls on a two-step plinth, a low gable slate roof along the width, and four columns across the front under a triangular pediment. Plain block model, isolated, grey background."
    - **B) Enhanced Tripo AI prompt:** "A classical limestone mausoleum, 7.4 × 3.6 m, on a two-step plinth (each step 0.15 m). 3.4 m ashlar walls. A front portico of four 0.4 m columns with square bases and simple capitals, an entablature 0.5 m deep with a blank inscription band, a triangular pediment, and a low slate gable roof along the width. Recessed bronze double doors between the middle columns. Stone urns on the front corners. Part boundaries: steps, wall, columns, entablature, pediment, roof, doors."
    - **C) Ultra quality Tripo AI prompt:** "The same classical mausoleum (7.4 × 3.6 m, four front columns, a pediment, a low slate roof), weathered:
      - lichen on the north side;
      - worn step edges;
      - verdigris in the bronze door panels;
      - the left urn broken off at the neck;
      - the inscription band worn smooth.

      The rear and sides continue with pilasters. Bake only the masonry joints."
17. **Concept art prompt.** "A classical graveyard mausoleum for a dark ARPG: front, side and game-camera views, with a 1.8 m human for scale. Swatches: limestone `#7D7A80`, slate `#57505C`, bronze `#6B4A2C`. Moonlight from the upper right. Callouts for the portico, the inscription band and the broken urn."
18. **Production notes.** `town.gd` keeps its "Mausoleum of the Wardens" label and drops its code-built walls, roof and columns when `mausoleum` exists.
19. **Optimization notes.** One instance, three slots.
20. **Godot import setup.** See KIT.

## 4. Crypt gate: `crypt_gate`

1. **Asset name.** Mausoleum gate (the stair down to the Sunken Crypt), `crypt_gate`.
2. **Category.** Environment, Act I transition (an interactable: `kind = "gate"`).
3. **Gameplay purpose.** The way into the dungeon. It must read as *an entrance going down* and invite a click. Its ember glow from below is the tell (art bible §9: light pools at exits).
4. **Visual description.**
   - **Frame:** a stone frame 4 m wide, with two square piers 0.5 m on a side and 3 m tall, capped with pyramids, and a lintel.
   - **Gate:** iron double gates with spear-tipped bars, two rails and ring handles. They stand slightly ajar (the left leaf turned 18°).
   - **Steps:** behind the gate, six worn steps go down 1.2 m into a dark pit.
   - **Story detail:** a broken chain hangs from the right leaf; someone forced it.
5. **Shape language.**
   - **Primary mass:** two verticals and a lintel.
   - **Repeated forms:** the bars.
   - **Exception:** the open leaf.
6. **Artistic intent.** Forbidden, and already opened: "something went down here, or came up".
7. **Silhouette.** The gate frame against the dark pit. The negative space is the gap of the open leaf and the steps descending into black.
8. **Materials.**
   - **Piers and lintel:** stone ashlar.
   - **Gates:** wrought iron, rust in the joints (the steel material, dark).
   - **Steps:** worn stone, dished in the middle.
9. **Colour palette.** Stone 50%, iron 35%, void 15%. The ember light comes from the game's light, not from the model.
10. **Poly budget.** ≤ 4 k triangles. Geometry goes to the bars (6 sides) and the spear tips.
11. **LOD strategy.** None (see KIT).
12. **Texture requirements.** See KIT.
13. **PBR breakdown.** Iron: metallic 1, roughness 0.55. Stone roughness 0.85. Pit floor: roughness 1, near black.
14. **UV recommendations.** See KIT.
15. **Blender workflow.** See KIT, using `crypt_gate()`.
16. **Tripo AI prompts.**
    - **A) Tripo AI prompt:** "A graveyard crypt entrance: two stone piers 3 m tall, 4 m apart, with a stone lintel, iron double gates with vertical bars, and stone steps going down behind them. Plain block model, isolated, grey background."
    - **B) Enhanced Tripo AI prompt:** "A crypt entrance 4 m wide: two square stone piers 0.5 m wide and 3 m tall with pyramid caps, and a stone lintel. Wrought-iron double gates with eleven spear-tipped bars each 2.6 m tall, a top rail and a bottom rail, and ring handles; the left leaf stands open about 18 degrees. Behind them, six stone steps descend 1.2 m into a dark pit. Part boundaries: piers, caps, lintel, gate leaves, hinges, steps."
    - **C) Ultra quality Tripo AI prompt:** "The same crypt entrance (4 m wide, 3 m piers, iron double gates, steps down). Up close:
      - rust bleeding from the hinge pins onto the stone;
      - a broken chain hanging from the right leaf;
      - steps dished smooth in the middle;
      - moss on the shaded pier.

      The rear shows the gate's back rails and the stairwell walls. Bake only the masonry joints and rust staining."
17. **Concept art prompt.** "A crypt entrance in a graveyard for a dark ARPG: front, side and game-camera views, with a 1.8 m human for scale. Swatches: stone `#6E6A70`, iron `#2E2B30`, ember `#D9542B`. An ember glow from the stair below and moonlight from above. Callouts for the open leaf, the broken chain and the worn steps."
18. **Production notes.** `town.gd` `_gate` keeps the Interactable, the ember light and the label, and drops its code-built bars and steps when `crypt_gate` exists. The model's origin is the gate's centre at ground level. It is placed at the region's centre, and the Interactable stays at -0.6 m Z.
19. **Optimization notes.** One instance, three slots.
20. **Godot import setup.** See KIT. No collision; the cells are PROP.

---

## Acceptance check (in camera)

- [ ] The screenshot tour's town shot reads as a town of houses around a square, with the chapel the tallest and darkest landmark.
- [ ] The door and window pieces sit in the framing gaps on every house variant.
- [ ] The crypt gate pulls the eye: the ember glow reads through the open leaf.
- [ ] Greyscale: buildings are mid-to-low value, below the lantern pools and the hero.
- [ ] `bun run test` passes, and the asset test lists the six new pieces.
