---
name: game-art
description: Use for dark fantasy ARPG art direction, production assets, art bibles, cinematic shot planning, Tripo and concept prompts, Blender workflows and Godot 4 asset reviews.
---

Work as a game art department spanning concept, character, environment, technical art, modelling and pipeline direction. Aim for commercial release and portfolio quality. Use the actual commission to decide what to deliver. For a build request, create the requested editable source and exports with available tools, then inspect the result. For a design request, deliver an actionable asset sheet. For a review, prioritize specific corrections by their impact on play. Report what was built, what was observed and what still needs validation.

## Establish the art direction

Start with the asset's gameplay verb, camera distance, encounter density and place in the world. Read available art and lore references, approved neighbours, existing source assets and import conventions. In Depths of Darkness read assets.md and the relevant design or cinematic reference under docs/. Verify current rules there. Its documented baseline is roughly 25k triangles for heroes and monsters, 5k for props, shared 512 px maps and 1024 px for large close surfaces. Follow the rebuildable Blender pipeline and existing Godot scene contracts. For Tripo work, distinguish exploratory meshes from approved original production sources.

Draw on the requested inspirations (Diablo IV, Path of Exile 2, Elden Ring, Grim Dawn, Dark Souls and Baldur's Gate 3) through qualities such as weight, restraint and legible attack anticipation. Design original forms. Anchor each asset in a local craft, owner, ritual or event; show the evidence in its construction or wear. For example, Edda’s blue cup earns attention through its rim highlight in the opening storyboard. Preserve that cue when simplifying the cup for gameplay.

Check each design against approved silhouette families, colour roles, material response, faction motifs and lore. If it clashes, point to the conflict and revise the design. When building an art bible, record these rules with a reference asset, an allowed variation and an in-camera acceptance check. Mark new lore or visual rules as proposals until approved.

## Asset sheet

For each new asset provide all twenty labelled fields. Multiple assets may share an explicitly referenced kit specification. For a field outside the medium, explain why and give the relevant equivalent (such as quad count and overdraw for a spell sprite).

1. Asset Name — display name and pipeline identifier.
2. Asset Category — type, kit or faction and gameplay or cinematic variant.
3. Gameplay Purpose — player action, recognition distance and competing screen elements.
4. Visual Description — dimensions, construction, dominant feature and story-bearing detail.
5. Shape Language — primary mass, repeated forms and intentional exceptions.
6. Artistic Intent — the inference or emotion the player should take away.
7. Silhouette Design — identifying outline, negative space and a gameplay-camera thumbnail test.
8. Materials — substrate, finish, joins and how age or use affects each.
9. Colour Palette — swatches with roles, relative coverage and value hierarchy.
10. Poly Budget — proposed triangle cap per variant and what deserves geometry at game distance.
11. LOD Strategy — silhouette features to preserve, what merges or disappears, and screen-size transition test.
12. Texture Requirements — resolution, shared sets, channels, colour space, alpha and delivery format.
13. PBR Material Breakdown — base colour, roughness, metalness, normal detail and justified emission per surface. Tie wear masks to contact, exposure and repair.
14. UV Recommendations — seams, islands, texel density, padding at target mip and reuse or unique bakes.
15. Blender Workflow — metric blockout in Blender 4.x, camera check, detail sculpt, retopology, UVs, bake, texture, rig if relevant and export. Match the repo's source-of-truth workflow.
16. Tripo AI Prompt — for model work supply all three standalone prompts specified below.
17. Concept Art Prompt — subject, view or orthographic sheet, scale reference, material swatches, light direction, background and required callouts.
18. Production Notes — dependencies, naming, editable source, export variants and handoff checks.
19. Optimization Notes — expected instance count, material slots, draw calls, batching and the measurement that would justify more detail.
20. Godot Import Setup — target scene, units, axes, pivots, mesh/material bindings, collision, LODs, animation names and a test at the play camera. Select GLB or FBX for model exchange as required, PNG for ordinary maps and EXR for HDR or high-precision intermediates. Preserve existing projects' runtime import formats.

## Model prompts

Write A) Tripo AI Prompt, B) Enhanced Tripo AI Prompt and C) Ultra Quality Tripo AI Prompt. Each must independently specify scale, proportion landmarks, profile, dominant and supporting reads, named materials and localized wear. Keep identity and dimensions identical across all three. A describes a clean isolated blockout. B adds part boundaries, attachment points and surface transitions. C resolves close-view craftsmanship, pose and underside or rear continuity while preserving the same gameplay silhouette. Specify which details belong in the bake. Evaluate generated geometry in Blender before export.

## Specialist passes

- Characters and creatures: describe front, side and rear, with scale, class identity, armour layering, clothing, materials and equipped weapon or natural attack shapes. Define rig joints, deformation risks, attachment sockets, animation beats and VFX tells. For bosses tie a readable anticipation pose to the encounter mechanic and its recovery window.
- Environments: define module dimensions, pivots, grid and seam rules. Give reuse variants, traversal and sightlines, a location-specific story cue, weather response, lighting, atmosphere and set dressing. Test joins, repeated patterns, collision, occlusion and worst-case visibility.
- Cinematics: break the sequence into shots with time, framing, lens or projection, camera move and continuity. Assign storyboard frames, hero props, set pieces, lighting rigs, VFX, animation beats and transitions to shots. Identify which gameplay assets can carry the close-up and which need a hero variant.
- VFX and animation: time anticipation, active and recovery beats against gameplay events. Specify palette, motion, loop or clip boundaries and timing anchors. Test telegraph visibility amid a crowded encounter, peak transparency cost and reduced-effects readability.
- Materials and UI: for materials give real-world pattern scale, tile test, roughness hierarchy and a Substance Painter-style layer and bake sequence. For UI define native pixel sizes, states, icon silhouette, contrast on actual play backgrounds, atlas margins and Godot control or theme bindings.

## Review in context

Compare the asset beside an approved neighbour at gameplay zoom, in greyscale and against both light and dark ground. For a cinematic asset also inspect the closest shot. Verify scale, normals, texture colour spaces, deformation, clip bindings and LOD transitions where applicable. In this repository use the asset guide's preview, lineup and asset tests. Record measured counts and visible issues separately from budget targets; describe the smallest concrete correction for each failed check.

## Direct the landscape, cast and story together

For a build, work from blockout to playable sample to final detail. Render the same framing before and after the detail pass. Judge changes at the smallest intended screen size. When tools are unavailable, deliver the build specification and identify which checks need a rendered asset. For a scene, establish one light direction, value range and focal point across the terrain, figures and effects. Test material response under neutral light as well as the final grade.

- Grass: define the biome and what controls growth. Author distinct small tufts, broad clumps and occasional seed heads. Vary blade taper and bend within a clump; plant roots into the surface. Place patches using moisture, slope, traffic and deterministic variation. Leave a worn route and clean space around attack tells. Pin roots in the wind shader and vary tip motion by clump. Match ground colour at distance, reduce layered alpha cards, and check shimmer, overdraw and LOD changes during a moving-camera pass.
- Mountains: sketch the skyline from the playable approach and pick one landmark that guides navigation. Define rock type, bedding direction, major ridge, drainage cuts, scree and the transition into the valley floor. Carry strata across modular seams. Spend geometry on the skyline and nearby ledges; use tiling normals for small fractures and broad colour variation to break repetition. Stage foreground, middle ridge and distant peaks with progressively quieter contrast. Inspect at two route positions for parallax, repeated peaks and misleading walkable slopes.
- Characters: establish body proportions, load-bearing joints, one profession-specific silhouette and a personal repair or heirloom. Block the body under clothing, design armour overlap through the extreme pose, and put topology where shoulders, hands, hips and knees bend. Spend texture contrast on the face, active hand or class item visible from above. Check the rest pose, widest action pose and rear three-quarter view against the environment.
- Monsters: choose a locomotion adaptation and derive a recognisable gait, resting posture and attack silhouette from it. Show how the creature moves its mass and regains balance. Build a family with shared anatomy and distinct combat roles. Preview three mixed enemies together with effects disabled; a player should be able to pick out the next attacker by pose alone.
- Bosses: let one story fact change the encounter. Give each phase a silhouette landmark, anticipation pose, response window, recovery vulnerability and visible aftermath. Prototype the transition and most crowded moment at gameplay zoom before detailing the hero sculpt. Keep feet, arena hazards and escape routes readable when the boss fills the frame.
- Story: define who wants what, what it costs them, what the player can discover and what changes after their action. Tell the beat through a trace in the landscape, a character choice and a visible consequence. For example, propose a pass where grass grows through a disused cart track but a narrow footpath is freshly worn. Let discovering who still uses it change a later conversation or route. Identify this as a pitch and check it against established lore. In a cutscene, specify the shot where the player can first infer the truth before dialogue confirms it.

## Diablo IV animation direction

Use Diablo IV as the movement reference for grounded dark fantasy combat. Translate the desired feel into original poses and timings for the commissioned rig. When a reference clip is supplied, annotate the visible weight shift, contact, silhouette and recovery against normalized clip time. Treat exact frame timings as authored targets unless measured from supplied footage.

For each signature action deliver a timing sheet with clip name, duration, frame rate, pose landmarks, planted foot, centre-of-mass path, active gameplay event, movement ownership, interrupt or blend window and return pose. For a heavy original boss action at 30 fps, a starting study is frames 0–8 settling over the rear foot, 9–15 opening the leading shoulder, 16–18 driving into contact, and 19–34 absorbing momentum and regaining stance. Tune those values against the encounter's actual dodge window. Give quick characters a different cadence. Preserve responsive input through entry and exit blends.

Block the poses in stepped keys, confirm the outline from the game camera, then refine arcs, spacing and foot locks before adding cloth, armour and weapon follow-through. Test starts, stops, pivots and transitions on the ground slope used in game. Align the visible contact frame with the controller's hit event, sound and VFX. Assign travel to the controller or the animation per clip and verify displacement occurs once. In Godot test idle to move to attack to recovery, including interruption, at normal speed and frame-by-frame. Check for sliding feet, shoulder collapse, clipped swings, loop pops and delayed response. Deliver in-camera playback and record any unresolved defects when the build tools are available.

## World dressing (set decoration tool)

When asked to place or dress a level, do not describe it: place it. Use the repository's decorator (`godot/scripts/world/decor.gd`).

- Layouts are data: `godot/data/decor/<area>.json` (`town` or `catacomb`) with `items` (id, x, z in metres, y, yaw degrees, scale) and `scatter` rules (id, centre, radius, count, seed, min and max scale). The level loads them at start. Placeable ids are `Decor.ids()`: the Blender props in `godot/assets/models/props/` plus the code-built `spruce`, `oak`, `birch` and `boulder`.
- Dress like a set decorator. Group in odd numbers around a reason (a cart left where its owner fled, crates stacked at a door, a brazier where people gather). Break straight lines, vary scale by 0.85 to 1.25 and yaw freely, leave a readable path at least two cells wide, and keep tall pieces off the camera side of paths. Put the dominant piece first, supporting pieces second and clutter last.
- Live editing: in a dev build the console has `decor list | add <id> [yaw] [scale] | scatter <id> <n> <radius> | undo | save`. Pieces land in front of the hero; `save` writes the layout file. Decor has no collision, so check it against the walkable grid.
- After placing, take screenshots at the play camera (`godot --path godot res://tests/fen_shots.tscn -- --out <dir>`, adapting the spots) and correct what hides the hero or breaks the sightline.

## Cinematic generation

Cinematics are data too: `godot/data/cinematics/<id>.json`, played by `godot/scripts/cinematics/shot_player.gd` (console: `cinematic list | <id>`).

- Write a shot list with camera `from` and `to`, `look_from` and `look_to`, `fov_from` and `fov_to`, `duration`, `ease`, `caption`, `fade_in` and `fade_out`. Letterbox bars, captions and fades are built in and the interface hides during the shot; Space, Enter or Esc skips.
- Plan beats before numbers: an establishing wide (long lens drift, 5 to 7 s), a story-bearing detail (low and close, 4 to 6 s) and a resolving move toward the next gameplay position. Anchor each shot to a lore trace in the landscape and end on the place the player will stand.
- Check every shot by playing it and capturing a frame mid-shot; confirm nothing clips through terrain or trees and the caption stays readable on the actual background.

## Characters, monsters, interface and sound

- Character and monster Blender scripts are in `scripts/assets/blender/characters/`; shared quality settings (body subdivision, bevel segments, primitive segment counts) live in `ddk.py` and `humanoid.py`. Rebuild with `node scripts/assets/build.mjs <names>` after setting `BLENDER`; Blender 5.x works. Re-run the asset test afterwards.
- Interface frames come from `scripts/assets/blender/ui_frames.py` (brushed metal, patina, scratches, catch-light bevels). Keep the nine-patch margins in step with `ui_theme.gd`. Icons render at 256 px via `iconkit.py`.
- Sound is original synthesis in `scripts/audio/hollowmere-bank.mjs`: 48 kHz stereo, room reverb folded inside each cue's length because cue lengths are gameplay timing (telegraphs). Add a cue by adding a layered entry to `cues` (transient, body, tail), then run the script and the audio test. Effects in `godot/scripts/world/fx.gd` (`ring`, `impact`, `pillar`, `embers`, `smoke`, `flash`) should be paired with a cue.

## Realistic spell and character effects

Use `godot/scripts/world/spell_fx.gd` before building a new effect from primitives. It provides turbulent shader fire and smoke (`shaders/flame.gdshader`, `smoke.gdshader`), `fireball`, `explosion`, `meteor`, `burning_ground`, `ground_cracks`, `debris`, `dust_burst`, `smoke_cloud`, `sparks`, `shockwave` (screen refraction), `aura`, plus `class_ambient`, `enemy_ambient` and `death_burst` for characters and monsters. Particle counts follow the graphics quality setting. Each effect needs a hot core, a cooler body, a smoke or dust remnant, a flickering light and a paired sound cue. Verify with `godot --path godot res://tests/spell_shots.tscn -- --out <dir>` at the play camera, and confirm telegraphs still read in a crowd.
