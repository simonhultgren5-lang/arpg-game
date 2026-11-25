# Developing assets

How the game's 3D models, animations and material textures are made, and how to add or change one.
For the folder layout, Git LFS and file locks, see [dev.md](dev.md#6-assets-git-lfs-and-locks). For sound, see `scripts/audio/`.

## Contents

1. [The short version](#1-the-short-version)
2. [Setup](#2-setup)
3. [How the pipeline works](#3-how-the-pipeline-works)
4. [Materials and textures](#4-materials-and-textures)
5. [Characters](#5-characters)
6. [Animation](#6-animation)
7. [Props](#7-props)
8. [Icons and interface frames](#8-icons-and-interface-frames)
9. [How the game uses them](#9-how-the-game-uses-them)
10. [Conventions and budgets](#10-conventions-and-budgets)
11. [Checking your work](#11-checking-your-work)
12. [Working by hand in Blender](#12-working-by-hand-in-blender)
13. [Troubleshooting](#13-troubleshooting)

## 1. The short version

Every model and texture is **made by a Python script that Blender runs**. Nothing is clicked together by hand, so anyone can rebuild everything, tweak a number and rebuild, or read exactly how an asset was made.

```powershell
bun run assets:build                    # every texture and model (about a minute)
bun run assets:build -- warrior         # just the scripts whose names contain "warrior"
bun run assets:build -- hollow --previews C:\temp\previews   # also render a preview picture
```

Each run writes:

| Output | What it is | Where |
| --- | --- | --- |
| `<name>.gltf` + `<name>.bin` | The game-ready model, with skeleton and animations | `godot/assets/models/<group>/` |
| `<name>.blend` | The editable source scene | `source-assets/Models/<group>/` |
| `<set>_albedo/_normal/_roughness.png` | Tileable PBR texture sets | `godot/assets/textures/materials/` |
| `<icon>.png` (128 px) | Item, skill and passive icons | `godot/assets/textures/icons/{items,skills}/` |
| `<frame>.png` | Nine-patch interface frames | `godot/assets/textures/ui/` |

Then open Godot (or run `godot --headless --path godot --import`) so it imports the new files, and `bun run test` to check them.

## 2. Setup

- **Blender 4.5 LTS** (or newer): <https://www.blender.org/download/lts/>. The portable `.zip` works.
- Tell the scripts where it is, once:

  ```powershell
  [Environment]::SetEnvironmentVariable("BLENDER", "C:\Tools\blender-4.5.17-windows-x64\blender.exe", "User")
  ```

  Without `BLENDER`, the build looks for `blender` on your PATH, then a `blender-*` folder in your Downloads.
- Godot 4.7 and Git LFS as in [dev.md](dev.md#2-first-time-setup).

## 3. How the pipeline works

```
scripts/assets/
├── build.mjs            runs Blender headless on each script below (bun run assets:build)
└── blender/
    ├── ddk.py           the kit: scene helpers, texture synthesis, materials, parts,
    │                    armatures, skinning, animation clips, export, preview renders
    ├── materials.py     the texture recipes (stone_wall, flagstone, cobble, steel, cloth, ...)
    ├── humanoid.py      the shared two-legged body and skeleton, and helpers for armour and cloth
    ├── characters/      one script per character (warrior.py, hollow.py, boss.py, ...)
    └── props/           props (act1_props.py makes the torch sconce, barrel, pillar, gravestones, ...)
```

A script is plain Python against Blender's `bpy` API plus the kit. `build.mjs` starts Blender with `--background --factory-startup`, puts `scripts/assets/blender/` on Python's path (so `import ddk, materials, humanoid` works), and runs the script. Scripts are **deterministic**: the same script always makes the same model.

The scripts are code, so they live in `scripts/` and diff normally. What they produce (`.blend`, `.png`, `.bin`) is binary and lives in Git LFS.

## 4. Materials and textures

Textures are **synthesized** with numpy in `materials.py`: value noise and fBm for grain and wear, Worley cells for cobbles, pebbles and cracks, and simple patterns for bricks, slabs, planks and weaves. Every set **tiles seamlessly** and has three maps:

| Map | Meaning | Format |
| --- | --- | --- |
| `_albedo` | Colour without lighting | sRGB PNG |
| `_normal` | Surface detail for lighting, made from a height field | OpenGL (green up), linear |
| `_roughness` | 0 = mirror, 1 = matt | linear, grey |

The sets today:

| Set | Used by | Size |
| --- | --- | --- |
| `stone_wall` | Walls in town and the crypt (wall shader), pillars, tombs | 1024 |
| `flagstone` | The crypt floor, slabs | 1024 |
| `cobble` | Hollowmere's paved streets | 1024 |
| `earth` | Unpaved ground, grave mounds | 1024 |
| `timber`, `plaster`, `roof_slate` | Wood, houses, roofs | 512 |
| `steel`, `leather`, `cloth`, `skin`, `bone` | Characters and props | 512 |

**Changing a material:** edit its recipe function in `materials.py` and run `bun run assets:build -- materials --rebuild-textures`. Sets are only made when missing, unless `--rebuild-textures` is passed.

**Adding a material:** write a function returning `(albedo, height, roughness, normal_strength)` (numpy arrays, values 0 to 1, square, tileable), add it to `RECIPES`, and use it with `materials.get("my_set")`.

To keep a texture tileable, build it only from the kit's wrapping helpers (`value_noise`, `fbm`, `cells`, `blur`, `np.roll`) and from patterns with whole repeats across the image.

**In a model**, a material is made with:

```python
steel = ddk.material("steel_dark", (0.42, 0.42, 0.46), rough=0.45, metal=0.9,
                     textures=materials.get("steel"), scale=2.0)
```

The colour multiplies the albedo texture, so one grey-ish set (steel, cloth, leather) serves many colours. `scale` repeats the texture more (bigger number = finer detail). Materials whose name starts with **`tint_`** are recoloured by the game: the hero's armour colour from the launcher.

## 5. Characters

A character is three things: a **skeleton**, a **body** skinned to it, and **parts** (armour, clothes, weapons) bound rigidly to bones.

```python
import ddk, humanoid, materials

ddk.reset()
cloth = ddk.material("tint_robe", (0.5, 0.14, 0.1), 0.9, 0.0, materials.get("cloth"), scale=3.0)
arm, body = humanoid.build("pyromancer", cloth, build=0.95)   # skeleton + smooth skinned body

hood = ddk.lathe("hood", [(0.0, -0.1), (0.15, -0.08), (0.16, 0.08), (0.06, 0.28), (0.0, 0.33)], 24, cloth)
hood.location = humanoid.bone_point(arm, "head", 0.0)
humanoid.open_face(hood)                 # cut the face opening
humanoid.finish(hood, arm, "head")       # UVs, then bind to the head bone

ddk.humanoid_clips(arm, "staff")         # idle, walk, attack, cast, hit, death
ddk.export("characters", "pyromancer")   # .gltf for the game, .blend source
ddk.preview("pyromancer")                # only with --previews
```

**The body** comes from the skin modifier: a stick figure of joints with a radius each (`humanoid.JOINTS`), wrapped in a skin and subdivided into a smooth, closed mesh. Change the build with `build=` (bulk) and `height=` (scale), or pass your own `joints` for a different silhouette (the Hollow leans its chest and head forward and has longer arms; the archer uses thin radii for a skeleton).

**The skeleton** is `ddk.HUMANOID_BONES` (bones ending in `.L` are mirrored to `.R`):

```
root ─ hips ─ spine ─ chest ─ neck ─ head
               │        └ shoulder.L/R ─ upper_arm.L/R ─ forearm.L/R ─ hand.L/R
               └ thigh.L/R ─ shin.L/R ─ foot.L/R
```

Keep these names: the clips animate them, and the game finds `hand.R` and `head`. For a differently shaped humanoid, move bones with `humanoid.leaned_bones({...})`. For something that isn't two-legged, write its own bone list (see `crawler.py`: a body, a head and three pairs of two-part legs).

**Parts** are built with the kit's shape makers:

| Maker | Makes | Good for |
| --- | --- | --- |
| `ddk.lathe(name, [(radius, height), ...])` | A shape spun around Z | Helmets, pauldrons, robes, greaves, barrels, bells, pillars |
| `ddk.prim("box"/"cyl"/"cone"/"sphere"/"torus", ...)` | A primitive, with optional bevel and subdivision | Gauntlets, boots, buckles, spikes, chains |
| `ddk.blade(name, length, width, thickness)` | A diamond-section blade with a point | Swords, daggers, knives |
| `humanoid.cloth_panel(name, width, length, top, lean)` | A hanging cloth with folds and a ragged hem | Tabards, cloaks, aprons, rags |
| `humanoid.heater_shield(...)` | A shield with a rim and a boss | Shields |
| `ddk.displace(obj, strength, scale)` | Organic unevenness | Old stone, worn cloth, bark |

Place parts with `humanoid.bone_point(arm, bone, t)` (a point along a bone in rest pose) and `humanoid.bone_rotation(arm, bone)` (turns +Z along a bone), then call `humanoid.finish(part, arm, bone)`. It applies the transform, unwraps UVs and binds the part to that bone, so it follows the animation exactly.

The character faces **-Y** in Blender (that becomes +Z in Godot, which is where the game expects the front), stands on Z = 0, and is in metres: a hero is about 1.85 m tall.

## 6. Animation

`ddk.clip(arm, name, seconds, keys, loop=False)` keys bone rotations (degrees, in each bone's own space) and locations (`"bone@loc"`, metres):

```python
ddk.clip(arm, "hit", 0.4, {
    "chest": [(0.0, (0, 0, 0)), (0.1, (-18, 0, 8)), (0.4, (0, 0, 0))],
    "hips@loc": [(0.0, (0, 0, 0)), (0.1, (0, 0.06, 0)), (0.4, (0, 0, 0))],
})
```

`ddk.sine_track(seconds, steps, fn)` samples a cyclic motion (fn gets the phase 0 to 2π), which is how the walk cycle is written. `ddk.humanoid_clips(arm, weapon, heavy)` makes all six standard clips; `weapon` shapes the attack (`sword`, `mace`, `daggers`, `claws`, `bow`, `staff`) and `heavy` slows everything for big creatures.

**Every character needs these six clips**, with these names (the game plays them and `bun run test` checks for them):

| Clip | Loops | Played when |
| --- | --- | --- |
| `idle` | yes | Standing still |
| `walk` | yes | Moving (speed follows the actual movement) |
| `attack` | no | Basic attacks and melee skills; a monster's wind-up |
| `cast` | no | Spells, wards, war cries; Hask's toll |
| `hit` | no | Taking damage |
| `death` | no (holds the last frame) | Dying |

A looping clip repeats its first key at the end automatically. Clips are exported as glTF animations of the same name, and Godot puts them in the model's `AnimationPlayer`.

## 7. Props

A prop is any static model: no skeleton, origin on the floor at its centre (a wall fixture like the torch sconce has its origin on the wall, facing -Y). Several props can share one script; call `ddk.reset()` before each and `ddk.export("props", name)` after. See `props/act1_props.py`.

## 8. Icons and interface frames

The interface art is made the same way, by scripts.

- **Item icons:** `icons/item_icons.py` has one function per icon id. The ids come from `godot/scripts/data/items.gd`: each base in `CLASS_BASES` and `BASES` is `[name, icon]`, and each unique has an `icon`. A function builds a small model standing along +Z, and `iconkit.render()` frames it with an orthographic camera and renders a 128 px PNG with a transparent background. Weapons call `iconkit.diagonal()` to lie across the frame, and worn things set `fn.view = FRONT` for a front-on view.
- **Skill and passive icons:** `icons/skill_icons.py` draws a stone disc with an iron rim (passives get a gold one) and a glowing glyph. The glyph is picked by the skill's kind in `SKILLS`, or by the passive's effect in `PASSIVES`. Keep those tables in step with `classes.gd` and `passives.gd`.
- **Frames:** `ui_frames.py` draws nine-patch PNGs with numpy: panel, header, slot well, rarity border, buttons, tabs, tooltip and the skill-bar tray. The margins in its `MARGINS` table must match `FRAME_MARGINS` in `godot/scripts/ui/ui_theme.gd`. Keep the middle of each frame plain, because it gets stretched.

To add an item base, add `["Name", "icon_id"]` in `items.gd` and a function `icon_id(m)` in `item_icons.py` (listed in `ICONS`), then run `bun run assets:build -- item_icons`. Set `DDK_ONLY=icon_id` to render just that one. The asset test fails if any base, skill or passive has no icon.

Glyph glow is kept low (`_glow` strength under 1) on purpose. Brighter glows clip to white and lose the class colour.

## 9. How the game uses them

`godot/scripts/models/asset_models.gd` is the only place that loads them:

```gdscript
var model := AssetModels.character("hollow")    # instance of assets/models/characters/hollow.gltf, or null
var mats := AssetModels.prepare(model, tint)     # own copy of each material; tint_* take `tint`
var anim = AssetModels.animate(model)            # a CharacterAnimator driving its AnimationPlayer
var barrel := AssetModels.prop("barrel")
```

- **Fallbacks.** If a model file is missing, the actors and the world fall back to the older code-built models in `scripts/models/*_model.gd`. So a new model can land before or after the code that uses it.
- **Heroes** (`player.gd`): the class model, tinted with the armour colour, with `attack` for basic attacks, `cast` for spells and war cries, `hit` and `death`.
- **Monsters** (`enemy.gd`): the kind's model; the hit flash and the purple elite tint use the per-instance materials from `prepare`.
- **World**: `level_mesh.gd` binds the texture sets to the floor shader (`shaders/flagstone.gdshader`: cobbles or flagstones on paved cells, earth elsewhere) and the wall shader (`shaders/wall.gdshader`). Props are placed by `props_model.gd`, `town.gd` and `catacomb.gd`.

To use a new character, add its id to `AssetModels.character(...)`'s callers (for a monster, a new entry in `enemy.gd`'s `KINDS` whose key matches the file name). For a new prop, call `props_model.asset(parent, "my_prop", position)` where the world builds that spot.

## 10. Conventions and budgets

- **Names:** lowercase with underscores: `crypt_pillar`, `gravestone_round`, `steel_dark`. Bones use Blender's `.L`/`.R` convention.
- **Units:** metres, Z up and -Y forward in Blender (Y up and +Z forward in Godot after export).
- **Size budgets** (per model, with the textures shared): heroes and monsters up to about 25 000 triangles, props up to about 5 000. The current models are well under.
- **Textures:** 1024² for big surfaces seen up close (floors, walls), 512² for everything else. Reuse the shared sets instead of adding near-duplicates.
- **Materials:** a few per model. Base colour × texture, roughness and normal maps, metallic as a number. Emission for glowing eyes, embers and flames only.
- **Originality:** everything here is made from scratch for Depths of Darkness. Don't import models, textures or animations from other games or stores into this pipeline.

## 11. Checking your work

- `bun run assets:build -- <name> --previews C:\temp\previews` renders a 3/4 view of each model in Blender. Add `ddk.preview("name_attack", pose_action="attack", pose_frame=6)` to see a pose.
- In Godot: `res://tests/act1_lineup.tscn` puts every hero and monster side by side (`godot --path godot res://tests/act1_lineup.tscn -- --out C:\temp\lineup` saves a picture), and `res://tests/screenshots.tscn` shows them in the town and the crypt.
- `bun run test` includes the **asset test** (`res://tests/asset_test.tscn`): every model loads, characters have a skeleton and all six clips, and every texture set is complete. The smoke test then plays Act I with the models in place.

## 12. Working by hand in Blender

The `.blend` next to each script is the scene the script made: open it to look around, try poses, or sculpt. Two ways to keep hand work:

- **Preferred:** put the change into the script (a new part, a different radius, another key), so it survives the next build.
- **Hand-made model:** if a model is better made by hand, delete its script (or stop it from exporting), edit the `.blend`, and export it yourself with **File → Export → glTF 2.0**: format *glTF Separate*, textures in `godot/assets/textures/materials/`, *Apply Modifiers* on, animations as *NLA Tracks*. Then it's an ordinary asset; keep the bone and clip names.

`.blend` files are **lockable**: they arrive read-only. Before saving one, lock it so nobody else edits it at the same time (binary files can't be merged):

```powershell
git lfs lock "source-assets/Models/characters/warrior.blend"
# edit, export, commit, push
git lfs unlock "source-assets/Models/characters/warrior.blend"
```

The build skips saving a read-only `.blend` and tells you to lock it; the game-ready `.gltf` is still written.

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Blender not found` | Set `BLENDER` to `blender.exe` (see [setup](#2-setup)) |
| A script fails with a Python traceback | The last lines of the error show the file and line; fix it and run that script again with `bun run assets:build -- <name>` |
| The model is black or untextured in Godot | Godot hasn't imported the new textures yet: open the editor or run `godot --headless --path godot --import` |
| A part floats away from its bone, or points the wrong way | Check its position against `humanoid.bone_point(...)` and remember rotations are applied before binding; render a preview |
| A face is hidden inside a hood or helmet | Use `humanoid.open_face(hood)`, or move the shell back (a shape made with `ddk.lathe` wraps all the way round) |
| An animation doesn't play in the game | The clip name must be exactly one of the six; `bun run test` (asset test) lists what's missing |
| `locked ... is read-only` | `git lfs lock` the `.blend` first (see [above](#12-working-by-hand-in-blender)) |
