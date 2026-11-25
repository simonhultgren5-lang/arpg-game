# In-game interface (0.5.0-beta.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the character/bag, skills and settings panels, a new hotbar, and the gear, skill and asset work
behind them, and ship them as 0.5.0-beta.5.

**Architecture:** The data lives in `scripts/data/` (classes, items and passives). The state lives in the `Game`
autoload, which handles the build, gear, stats and migration. A new `Settings` autoload loads and applies
settings. The UI is code-built panels in `scripts/ui/`, owned by `hud.gd`. Icons and frames come from the
Blender/numpy pipeline.

**Tech Stack:** Godot 4.7 GDScript, Blender 4.5 Python (bpy + numpy), and the Node/Bun test runner
`scripts/test.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-25-ingame-interface-design.md`

## Global Constraints

- All UI is built in code; there are no `.tscn` UI scenes. The look comes from `scripts/ui/ui_theme.gd`.
- It must read at both 1920×1080 and 1280×720 (`canvas_items` stretch).
- Saves are plain JSON dictionaries. `SAVE_VERSION` goes from 1 to 2. No item or level may be lost.
- Use original names and art only, with no Diablo III names, icons or wording.
- Act I reach is level 8–10. Passive slots open at levels 3, 6 and 10. Skill unlocks are 1, 1, 2, 3, 5 and 6.
  Variant i unlocks at `max(skill unlock + 1, [2, 4, 6, 9][i])`.
- The LMB slot takes primaries only. RMB and keys 1–4 take any skill.
- `cdr` is capped at 40%, and `crit_dmg` has a base of 50%.
- The bag has 60 cells (`INVENTORY_SIZE := 60`).
- Changing the build is blocked while an enemy is within 12 m.
- `bun run test` and `bun run ci:compile` must pass at the end of each task.

## Review Focus

1. **A version-1 save with a full 24-item pack, a unique charm and armor:** after migration every item
   still exists, and the uniques keep working. Test: `ui_test` loads a v1 fixture.
2. **Swapping a skill off the bar while it is on cooldown, then back:** the cooldown persists (it is
   keyed by id) and can't be dodged. Test: `ui_test` "cooldown follows skill id".
3. **Equipping a ring when both ring slots are full:** it replaces `ring_1`, and the old ring goes to the
   bag. With the bag full, the equip is refused with a message. Test: `ui_test` ring cases.
4. **Rebinding a key to one already used by another action:** the old action loses that key, and there
   is no double-fire. Test: `ui_test` rebind conflict.
5. **Opening a panel mid-fight:** the game keeps running (no pause), clicks on the panel never move the
   hero, and Esc closes the panel first. Test: `ui_test` "panel blocks world clicks" through
   `hud.is_blocking()`.

---

### Task 1: Gear slots, item bases, new stats, migration

**Files:**
- Modify: `godot/scripts/data/items.gd`
- Modify: `godot/scripts/autoload/game_state.gd`
- Create: `godot/tests/ui_test.gd` and `godot/tests/ui_test.tscn`, the same harness as `asset_test`, which prints
  `UI TEST PASSED`.
- Modify: `scripts/test.mjs` to add the `ui_test` entry.

**Interfaces (produced):**
- `Items.SLOTS: Array[String]`: head, shoulders, amulet, chest, wrists, hands, belt, legs, feet, ring_1,
  ring_2, weapon and offhand.
- `Items.slot_kind(slot) -> String`: ring_1 and ring_2 return "ring".
- `Items.roll_item(ilvl, cls, bias, force_kind)` keeps its signature. Every item gets `icon: String`.
- `Items.compare(item, other) -> Dictionary` returns stat deltas.
- `Items.stat_line` covers crit_dmg, attack_speed, cdr and regen.
- `Game.equip_to(index: int, slot := "") -> bool`
- `Game.unequip(slot) -> bool`
- `Game.salvage(index)`
- `Game.move_item(from: int, to: int)`
- `Game.crit_damage() -> float` (1.5 base)
- `Game.attack_speed() -> float` (a multiplier)
- `Game.cooldown_mult() -> float` (at least 0.6)
- `Game.life_regen() -> float`
- `Game.migrate(progress: Dictionary) -> Dictionary`, a static and pure function.
- `INVENTORY_SIZE = 60`, `SAVE_VERSION = 2`.

**Steps:**

- [ ] **1. Write the `ui_test` gear checks:**
  - `migrate` of a v1 fixture: `equipped.armor` moves to `chest` and `charm` to `amulet`, the bag
    count is unchanged, and `saints_knuckle` becomes `slot` "ring";
  - `roll_item` for each kind gives that kind and a non-empty icon;
  - `equip_to` a ring fills ring_1, then ring_2, then swaps ring_1;
  - with the bag full, unequip returns false;
  - `compare` deltas are signed;
  - `cooldown_mult()` is at least 0.6 with 90 cdr.
- [ ] **2. Run** `godot --headless --path godot res://tests/ui_test.tscn` and expect it to FAIL.
- [ ] **3. Implement the items and Game functions above.** The bases per kind come with icon ids:
  - weapon and offhand per class;
  - head, shoulders, chest, wrists, hands, belt, legs and feet as 2–3 bases each;
  - amulet and ring as 2–3 each.
  - `roll_item` picks the kind uniformly when no kind is forced.
  - `has_unique` scans all slots. The unique slot remap is: wardens_vigil → chest, lamplighters_wick →
    amulet, saints_knuckle → ring.
  - `load_hero` calls `migrate` and then `sanitize_build` (from Task 2; until then, call `migrate` only).
- [ ] **4. Update the gear stats in the existing code:**
  - the player uses `Game.crit_damage()` for crit;
  - attack cooldowns divide by `attack_speed()`;
  - regen adds `life_regen()`.
- [ ] **5. Check** that `bun run test` and `bun run ci:compile` pass, including the existing smoke test.
- [ ] **6. Commit:** "Gear: 13 slots, new stats, save v2 migration".

### Task 2: Skills (8 per class), variants, passives, build

**Files:**
- Modify: `godot/scripts/data/classes.gd`
- Create: `godot/scripts/data/passives.gd`
- Modify: `godot/scripts/autoload/game_state.gd`
- Modify: `godot/scripts/actors/player.gd`
- Modify: `godot/scripts/world/world.gd`, only if a new effect needs it (`burn` and `slow` already exist
  through pyre and trap).
- Modify: `godot/scripts/autoload/boot.gd` for the actions `bar_1..bar_6` (LMB, RMB, 1, 2, 3, 4) and
  `skills` (S), `settings`, `map` (M). The old actions `skill_1..4` are removed.

**Interfaces (produced):**
- `Classes.skills(cls) -> Array`: 8 skill dictionaries, each with id, name, kind, primary, unlock, desc,
  color, cost/cooldown and `variants` (4 × {id, name, desc, unlock, mods}).
- `Classes.skill(cls, id) -> Dictionary`
- `Classes.resolved(cls, id, variant_id) -> Dictionary`: the skill with that variant's `mods` merged in.
- `Classes.variant_unlock(skill, i) -> int`
- `Passives.for_class(cls) -> Array`: 8 entries of {id, name, desc, effect: {stat: value}}.
- `Passives.SLOT_LEVELS = [3, 6, 10]`
- `Game.build() -> Dictionary`
- `Game.set_bar(slot_i, skill_id) -> String`: returns an error text, or "".
- `Game.set_variant(skill_id, variant_id) -> String`
- `Game.set_passive(i, passive_id) -> String`
- `Game.passive_bonus(stat) -> float`
- `Game.default_build(cls) -> Dictionary`
- `Game.sanitize_build()`
- `Game.can_change_build() -> String`: "" when allowed, otherwise the reason.
- The `Game.build_changed` signal.
- `Player.cast_slot(i)`
- `Player.cooldown_left(skill_id) -> float`
- `Player.cooldown_frac(skill_id) -> float`

**Steps:**

- [ ] **1. Add the `ui_test` skill checks:**
  - each class has 8 skills, 2 of them primary, each with 4 variants;
  - the unlock levels match the spec order;
  - the default bar is [p1, old0, old1, old2, old3, ""];
  - `set_bar(0, non-primary)` returns an error;
  - `set_variant` to a locked variant is stored, and `resolved` gives the base until the level is reached;
  - setting a passive in a slot that isn't open yet is refused;
  - `sanitize_build` drops an unknown id;
  - a skill that unlocks auto-fills the first empty bar slot;
  - the cooldown follows the skill id across bar swaps;
  - in a spawned world, every skill × variant casts with no errors (using the player from the smoke-test
    setup).
- [ ] **2. Run it** and expect FAIL.
- [ ] **3. Write the data.**
  - The new skills follow the design doc's table. They reuse existing kinds: arc, bolt, fan, blink, ward,
    buff and trap.
  - Variants change numbers and effects only: radius, mult, cooldown, cost, count, stun, knockback, burn,
    slow and color.
  - Any new effect key must be handled in one place (`world.hit_radius` opts).
  - Blink gains an optional `burn` (Ember Step leaves fire: reuse `cast_trap` with a fire colour and
    `mult`) and an optional `slam` (Grave Leap).
  - Buff gains an optional `speed` and `dodge` (Smoke Veil).
- [ ] **4. Rework the player.**
  - LMB uses `build.bar[0]` (a primary) through a generalised `_primary_attack(skill, at)`.
  - Holding RMB or keys 1–4 repeats `cast_slot`.
  - Cooldowns go in `_cds: Dictionary` keyed by id and scaled by `Game.cooldown_mult()`.
  - Passive effects are read through `Game.passive_bonus` in `roll_damage`, `mana_on_hit`, regen and costs.
- [ ] **5. Check** that `bun run test` passes; update the smoke and dev-console tests where they call
  `cast_skill`.
- [ ] **6. Commit:** "Skills: eight per class, variants, passives and a saved build".

### Task 3: UI theme, icons and frames (assets)

**Files:**
- Create: `scripts/assets/blender/ui_frames.py` (numpy nine-patches written to `godot/assets/textures/ui/`:
  frame, parchment, well, button, button_hover, tab, tab_active and tooltip)
- Create: `scripts/assets/blender/icons/item_icons.py` and `icons/skill_icons.py`. They render
  `godot/assets/textures/icons/items/<icon>.png` and `icons/skills/<id>.png` at 128 px with a
  transparent background. Use `ddk.preview` settings with film_transparent.
- Modify: `scripts/assets/build.mjs` to add the `icons` group and `ui_frames.py`.
- Modify: `godot/scripts/ui/ui_theme.gd` to use nine-patch styleboxes when the textures exist (keeping the
  flat fallback), and to add `frame()`, `well()`, `icon(path) -> Texture2D`, `item_icon(item)`,
  `skill_icon(id)` and `rarity_color(r)`.
- Modify: `godot/tests/asset_test.gd`, which checks that every item base icon and every skill and passive
  icon exists.
- Modify: `assets.md`, adding a section on icons and UI frames.

**Steps:**

- [ ] **1. Add asset_test checks** that every `Items` base icon and every skill and passive id has a PNG.
  Run it and expect FAIL.
- [ ] **2. Write the scripts:**
  - **Item icons:** low-poly models per base (blade, maul, axe, staff, wand, dagger, shield, tome, orb,
    helm, hood, pauldron, chest, bracer, glove, belt, greaves, boot, amulet and ring), with material
    variety from `materials.get`.
  - **Skill icons:** an emblem made of a disc and a glyph built from primitives, chosen by kind, in an
    emissive class colour.
  - **Passive icons:** a smaller emblem in a ring frame.
- [ ] **3. Run** `bun run assets:build -- ui_frames item_icons skill_icons`, then
  `godot --headless --path godot --import`. Review a contact sheet, then run the asset test and expect PASS.
- [ ] **4. Commit:** "Assets: item and skill icons, UI frames".

### Task 4: Panels, hotbar and settings

**Files:**
- Create: `godot/scripts/ui/item_tooltip.gd`, `character_panel.gd`, `skills_panel.gd`, `settings_panel.gd` and
  `hotbar.gd`
- Create: `godot/scripts/autoload/settings.gd`, registered in `project.godot` as `Settings`, after Boot.
- Modify: `godot/scripts/ui/hud.gd`. The old inventory and skill-slot code is removed. Its job becomes
  owning the panels and the Esc order (map, then panel, then dialogue, then pause), and the pause menu
  gains a Settings button.
- Modify: `godot/scripts/ui/main_menu.gd`, adding a Settings button.
- Modify: `godot/tests/screenshots.gd`, adding shots of each panel.

**Interfaces (produced):**
- `hud.open_panel(name: String)` where the name is "character", "skills" or "settings".
- `hud.close_panels()`
- `hud.is_blocking()` covers panels.
- `Settings.get_value(section, key)`
- `Settings.set_value(section, key, v)`, which applies the change and saves.
- `Settings.rebind(action, event) -> String`, which returns the action that lost the key, or "".
- `Settings.reset()`
- `Settings.apply_world(env: WorldEnvironment)`, called by `world.gd`.
- Gameplay flags: `damage_numbers`, `screen_shake`, `enemy_bars` and `loot_labels`. Fx and world read them.

**Steps:**

- [ ] **1. Add the `ui_test` panel checks:**
  - `open_panel` shows each panel and `is_blocking()` becomes true;
  - Esc closes panels in order;
  - drag data from a bag cell dropped on a slot calls `equip_to`;
  - the skills panel lists 8 skills and is disabled with a reason while an enemy is within 12 m;
  - a settings value persists after a reload (`user://settings_test.cfg` via `Settings.path`
    override);
  - a rebind conflict returns the old action.

  Run it and expect FAIL.
- [ ] **2. Build `settings.gd`:**
  - **Graphics:** window mode, resolution, quality low/medium/high (MSAA, shadow atlas, SSAO, glow),
    shadows on/off, brightness and vsync.
  - **Audio:** bus volumes in dB from a 0–100 slider. Create the Music, SFX, Voice and Ambience buses if
    they are missing, and route `ActAudio` players to them.
  - **Controls:** keys stored as physical keycodes or mouse buttons per action.
- [ ] **3. Build the panels.**
  - **Character:** 980×640. The paper doll uses a `SubViewport` with its own World3D, a light, and
    `AssetModels.character` playing idle while turning slowly; the slots sit around it. The bag is a
    10×6 grid of 52 px cells. Stats show a summary with a details toggle.
  - **Skills:** 6 bar slots, then a picker list, then variant cards, then 3 passive slots.
  - **Settings:** 4 tabs.
  - **Hotbar:** icons and a cooldown sweep for each of the 6 slots, the potion, and 4 small menu
    buttons.

  Panels open beside the map and do not pause the game.
- [ ] **4. Run** `bun run test`, `bun run ci:compile` and the screenshots, then review the screenshots at
  1920 and 1280.
- [ ] **5. Commit:** "Interface: character, skills, settings panels and a new hotbar".

### Task 5: Play, polish, release

- [ ] **1. Play it:**
  - run the screenshot tour for all three classes;
  - drive the game with the dev console (`level 10`, `loot 20`) to fill the bag and unlock everything;
  - review every panel and fix layout and contrast issues.
- [ ] **2. Update the docs:**
  - README: the controls table;
  - dev.md: tests;
  - CHANGELOG: `## 0.5.0-beta.5 — <name>`.

  Then run `bun run bump:beta`.
- [ ] **3. Run** `bun run test` and `bun run ci:compile`, and expect all checks to pass.
- [ ] **4. Push** the branch and open a PR. Merging it publishes the beta.
