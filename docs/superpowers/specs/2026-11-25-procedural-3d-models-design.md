# Original Diablo-style 3D models (Godot) — design

## Intent
Replace the primitive-stack placeholder models in the Godot Act I preview with original,
hand-authored procedural models in a dark-fantasy, painterly, Diablo 3-like style
(chunky silhouettes, exaggerated shoulders/helms, warm rim light, glowing accents).
Original designs only; nothing copied from Blizzard. Why: the preview currently reads as
grey boxes and capsules, which undersells the game.

## Goals
- First slice you can judge: **Warrior hero**, **Hollow**, **Bone Archer**, plus a few props
  (torch sconce, barrel, sarcophagus).
- Models stay code-built (GDScript), no imported files, no new tools.
- Style can be tuned from one place (palette + shader params).

## Non-goals
- No skeletal rigging or new animation; existing bob/tilt/tween animation keeps working.
- No Rogue/Mage/Crawler/Boss in this slice (follow-up once the style is approved).
- No 2D game changes.

## Anti-goals
- Breaking gameplay hooks: collision shapes, `_model`, `_weapon`, `_body_mat`, `_mats`
  (hit flash / elite tint), boss `"Bell"` node name, and the smoke test must keep working.

## Constraints
- Godot 4.3, GDScript. Neither Godot nor Blender is installed here, so I cannot run or
  screenshot the result. Verification is by you running the game / a gallery scene.

## Approaches considered
1. **Procedural models in code (chosen).** Self-contained, original, tweakable; limited to stylized low-poly.
2. Generate `.glb` files via script. Real files, but more tooling, same quality ceiling.
3. Import external models. Best looks, but not made here.

## Design
- `godot/scripts/models/mesh_kit.gd`: reusable generators (lathe/revolve profile, tapered
  limb, beveled box, plate/pauldron, blade, spike) returning `ArrayMesh`.
- `godot/scripts/models/{warrior,hollow,bone_archer,props}.gd`: one builder each,
  `static func build(parent, ...)`; use `B.mat`/`unique_mat` so existing flash/tint logic applies.
- `godot/shaders/stylized.gdshader`: toon-ish lit shader with warm rim light and
  optional emissive mask, used via a material helper in `build.gd`.
- `player.gd` / `enemy.gd` `_build_model` call the new builders for the covered kinds; other kinds unchanged.
- `godot/tests/model_gallery.tscn`: lines up all new models for screenshots.

## Left to the builder
Exact proportions, palettes, polygon counts, and prop placement in catacomb/town.
