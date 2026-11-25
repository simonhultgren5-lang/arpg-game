# Procedural 3D Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace primitive-stack placeholder models for the Warrior, Hollow, Bone Archer and three props with original Diablo-style procedural models.

**Architecture:** A shared `mesh_kit.gd` generates ArrayMeshes (lathe, tapered limb, beveled box, plate, blade, spike). One builder script per model uses it plus a stylized rim-light shader material. `player.gd` / `enemy.gd` delegate to builders for covered kinds only.

**Tech Stack:** Godot 4.3, GDScript. Godot is NOT installed on this machine, so tests cannot be run here; verification is the smoke test and gallery scene run by the user (`godot --headless --path godot res://tests/smoke_test.tscn`).

**Spec:** `docs/superpowers/specs/2026-11-25-procedural-3d-models-design.md`

## Implementation status

The mesh kit, three actor builders, three prop builders and gallery are implemented. The gallery also supports an effects capture with `-- --effects --out <directory>`. Gameplay uses an animated melee crescent, directional hit sparks and animated sconce flames.

Verification uses Godot 4.7.2. The model test checks grounded feet and capsule height at enemy scales 0.8, 1.0 and 1.25. The Warrior measures 1.793 units within the handoff’s 1.8-unit height limit. Equipment and posed limbs can extend beyond the collision radius. The test covers vertical fit only. The step lists below record the original plan.

## Global Constraints
- Godot 4.3+, GDScript, no imported assets, original designs only.
- No new rigging/animation; existing `_model` bob/tilt/tween code is untouched.
- Preserve: `_model`, `_weapon`, `_body_mat`, `_mats` (flash/elite tint), boss node `"Bell"`, collision shapes.
- Rogue, Mage, Grave Crawler, boss keep their current models.
- Do not commit unless the user asks.

## Review Focus
- Elite enemies (scale 1.25, purple tint via `_mats`) must still tint on the new Hollow/Archer models.
- Hit flash must still work: every flashing surface material must come from `_m()` / `_body_mat`.
- Warrior: `_weapon` node must exist and swing without errors.
- Models at scale 0.8 to 1.25 must keep feet at y=0 and fit inside the collision capsule.
- Headless smoke test (no renderer) must not error on shader/material creation.

---

### Task 1: Mesh kit and stylized material

**Files:**
- Create: `godot/scripts/models/mesh_kit.gd`, `godot/shaders/stylized.gdshader`, `godot/tests/model_kit_test.gd` + `.tscn`
- Modify: `godot/scripts/world/build.gd` (add `stylized_mat`)

**Interfaces:**
- Produces, all `static`, all returning `ArrayMesh` (`const K = preload("res://scripts/models/mesh_kit.gd")`):
  - `lathe(profile: PackedVector2Array, segments := 12)` (x = radius, y = height, revolved around Y)
  - `limb(r_top: float, r_bottom: float, length: float, segments := 8)` (origin at top, extends -Y)
  - `bevel_box(size: Vector3, bevel := 0.04)`
  - `plate(width: float, height: float, thickness: float, curve: float)`
  - `blade(length: float, width: float, thickness: float)` (origin at hilt, extends +Y, pointed tip)
  - `spike(radius: float, height: float, segments := 6)`
- Produces: `B.stylized_mat(color: Color, rim := Color(1.0, 0.55, 0.25), emission := Color.BLACK, energy := 0.0) -> ShaderMaterial` in `build.gd`; shader params `albedo`, `rim_color`, `emission_color`, `emission_energy`.

- [ ] **Step 1: Write failing test** `model_kit_test.gd`: for each generator assert `get_surface_count() == 1` and non-zero AABB size; for `limb(0.1, 0.05, 1.0)` assert `aabb.size.y` is about 1.0 and `aabb.position.y` about -1.0. Exit code 1 on failure.
- [ ] **Step 2: Run** `godot --headless --path godot res://tests/model_kit_test.tscn`; expect FAIL (script missing).
- [ ] **Step 3: Implement** `mesh_kit.gd` using `SurfaceTool` with `generate_normals()`.
- [ ] **Step 4: Implement** `stylized.gdshader` (`shader_type spatial;`): 3-band quantized diffuse in `light()`, rim term `pow(1.0 - dot(NORMAL, VIEW), 3.0) * rim_color` added to `EMISSION`, plus `emission_color * emission_energy`. Add `B.stylized_mat` with caching like `B.mat`.
- [ ] **Step 5: Run test**; expect PASS, exit 0.

### Task 2: Hollow and Bone Archer models

**Files:**
- Create: `godot/scripts/models/hollow_model.gd`, `godot/scripts/models/bone_archer_model.gd`
- Modify: `godot/scripts/actors/enemy.gd:95-148` (`_build_model` cases `"hollow"`, `"archer"`); extend `model_kit_test.gd`

**Interfaces:**
- Consumes: Task 1 kit and `B.stylized_mat`.
- Produces in each builder: `static func build(parent: Node3D, s: float, col: Color, mat_for: Callable) -> void`, where `mat_for(color) -> StandardMaterial3D` is the enemy's `_m`. Body surfaces use `mat_for` (so flash/elite tint keep working); only non-flashing accents (eyes, glow) use `stylized_mat`.

Designs (original): **Hollow** = hunched gaunt husk in a burial shroud: lathed shroud/torso, long tapered arms dragging forward with clawed hands, drooping skull head with two cold-blue eye lights, rope belt. **Bone Archer** = lathed bone ribcage with plate ribs, tapered limb bones, ragged-hooded horned skull with amber eye glow, curved composite bow in the left hand.

- [ ] **Step 1: Extend test**: build each under a `Node3D` at s = 0.8, 1.0, 1.25; assert more than 6 children, no mesh below y = -0.01, top of AABB at most `1.6 * s * 1.5`.
- [ ] **Step 2: Run**; expect FAIL.
- [ ] **Step 3: Implement both builders** to the designs above.
- [ ] **Step 4: Modify `enemy.gd`**: the `"hollow"` and `"archer"` cases call `HollowModel.build(_model, s, col, _m)` / `BoneArcherModel.build(...)` and drop their old primitive code. Leave the `elite` block after the `match` unchanged.
- [ ] **Step 5: Run** model kit test and `smoke_test.tscn`; expect PASS.

### Task 3: Warrior hero model

**Files:**
- Create: `godot/scripts/models/warrior_model.gd`
- Modify: `godot/scripts/actors/player.gd:57-100` (warrior branch of `_build_model`); extend `model_kit_test.gd`

**Interfaces:**
- Consumes: Task 1 kit.
- Produces: `static func build(parent: Node3D, body_mat: StandardMaterial3D, weapon: Node3D) -> void`. The sword mesh parents under the existing `_weapon` node (created at `player.gd:75`); main armor uses `_body_mat`.

Design (original): broad-shouldered knight: lathed cuirass, spiked plate pauldrons, tapered limbs, greaves, beveled great helm with a glowing T-slit visor, short tattered cloak plate, kite shield (`plate` with curve) on the left arm with a gold boss, broadsword (`blade`) with crossguard.

- [ ] **Step 1: Extend test**: build with a fresh `weapon` Node3D; assert weapon has at least 2 mesh children, total height between 1.9 and 2.4, lowest y at least -0.01.
- [ ] **Step 2: Run**; expect FAIL.
- [ ] **Step 3: Implement the builder**, then call it from `player.gd` for the warrior class; rogue and mage branches untouched.
- [ ] **Step 4: Run** model kit test and `smoke_test.tscn` (covers all three classes); expect PASS.

### Task 4: Props and gallery scene

**Files:**
- Create: `godot/scripts/models/props_model.gd`, `godot/tests/model_gallery.gd`, `godot/tests/model_gallery.tscn`
- Modify: `godot/scripts/world/build.gd:116` (`torch` uses the new sconce), plus any barrel/sarcophagus primitives found in `catacomb.gd` / `town.gd`; `godot/README.md` ("Everything visible is built from primitive meshes" now mentions `scripts/models/`)

**Interfaces:**
- Produces: `static func sconce(parent: Node3D, pos: Vector3) -> Node3D`, `barrel(parent: Node3D, pos: Vector3) -> Node3D`, `sarcophagus(parent: Node3D, pos: Vector3) -> Node3D`. `sconce` keeps the flame light and `flicker.gd` hookup that `B.torch` has today.
- Gallery scene: lines up warrior, hollow, archer, elite hollow and props on a stone floor with a warm omni light at the game camera angle; with `--out <dir>` saves a PNG like `tests/screenshots.gd`.

- [ ] **Step 1: Extend test**: each prop builder returns a node with at least 3 mesh children and lowest y at least -0.01; `B.torch` still yields a node containing an `OmniLight3D`.
- [ ] **Step 2: Run**; expect FAIL.
- [ ] **Step 3: Implement props and gallery**; wire `B.torch` to `sconce`; update the README line.
- [ ] **Step 4: Run** model kit test, smoke test, and `godot --path godot res://tests/model_gallery.tscn -- --out C:\temp\gallery`; expect tests PASS and a PNG written.

---
**Self-review:** spec coverage: kit and shader (T1), Hollow and Archer (T2), Warrior (T3), props and gallery (T4); preserved hooks are in Review Focus and the tests. Signatures are consistent across tasks (`mat_for` Callable, `stylized_mat`, kit function names).
