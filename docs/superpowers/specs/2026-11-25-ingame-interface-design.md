# In-game interface for 0.5.0-beta.5: design

Date: 2026-11-25. Approved in conversation; this writes it down.

## Intent

Depths of Darkness is a dark gothic action RPG in the Diablo genre (Godot 4.7, GDScript, built in code).
Today its in-game interface is thin:

- a fixed skill bar (basic attack plus 4 skills that unlock with level);
- a text list for gear, with three slots (weapon, armor, charm) and a 24-item pack;
- a pause menu with no settings.

The owner wants the interface a player of the genre expects: a proper character sheet and bag, skill choice
with variants and passives, settings, and a better hotbar. It ships as the next beta, **0.5.0-beta.5**, with
new assets (icons, UI frames) where they're needed.

Success: a player can kit out a hero over 13 gear slots by dragging items, build their own bar out of 8
skills with chosen variants and passives, and change graphics, audio and keys. All of it is in an original
dark-iron-and-parchment look that fits the game.

## Goals

1. **Character and bag panel** (keys C or I):
   - 13 gear slots around a live, slowly turning 3D model of the hero;
   - a 10 × 6 bag grid of item icons;
   - drag and drop, plus right-click to equip;
   - shift + right-click to salvage;
   - hover tooltips with green and red comparison against the equipped item;
   - a stat summary with a "details" toggle;
   - gold shown.
2. **Gear rework:**
   - slots: head, shoulders, amulet, chest, wrists, hands, belt, legs, feet, ring_1, ring_2, weapon and offhand;
   - loot rolls for every slot, with bases and icons per slot;
   - new stats: crit damage, attack speed, cooldown reduction and life regeneration.
3. **Skills panel** (S):
   - each class has 8 skills: 2 primaries and 6 others;
   - the player places any skills on 6 bar slots (LMB, RMB, 1, 2, 3, 4);
   - each skill has 4 variants that unlock with level, and the player picks one (or none, which is the base skill);
   - 3 passive slots, filled from 8 passives per class;
   - everything can be changed at any time when no enemy is within 12 m.
4. **Settings** (Esc → Settings, also on the title screen):
   - Graphics: window mode, resolution, quality preset, shadows, brightness and vsync;
   - Audio: master, music, effects, voice and ambience;
   - Gameplay: damage numbers, screen shake, always-show enemy life bars, and loot labels;
   - Controls: rebind every action.
   - Settings are saved to `user://settings.cfg`.
5. **New hotbar:**
   - 6 skill slots with icons, cooldown sweeps and key labels;
   - the potion slot;
   - a resource label;
   - small menu buttons for Character, Skills, Map and Settings.
6. **Assets** (Blender pipeline, `bun run assets:build`):
   - item icons, one per base;
   - skill and passive icons (glowing emblems);
   - UI frame textures (iron border, parchment, slot well) as nine-patch PNGs.
7. **Old saves keep working:**
   - `armor` moves to `chest` and `charm` moves to `amulet`;
   - a unique keeps its powers in whatever slot it lands in (see Migration);
   - the old bar becomes the default bar.

## Non-goals (later betas)

Stash, blacksmith and crafting, gems and sockets, difficulty levels, endgame (endless levels, timed
dungeons), followers, item sets, legendary powers beyond the four existing uniques, controller support, and
new sounds.

## Anti-goals

- **No copying of Diablo III.** We use the genre's systems but none of its names, icons, layout art or
  wording.
- **Fighting must stay smooth.** Opening panels must not hitch and nothing in the HUD may stutter in combat.
- **Saves must never be lost.** Migration must not drop items or reset a hero.
- **Players need not open menus to play.** A new hero's default bar works out of the box.

## Constraints

- All UI is built in GDScript code, like the current `hud.gd`, with no hand-made `.tscn` UI. The shared look
  lives in `scripts/ui/ui_theme.gd`.
- 1920×1080 base, `canvas_items` stretch, and it must also read at 1280×720.
- **Act I's reach:** it takes a hero to about level 8 to 10 (monster level caps at 6), so unlocks must land
  within reach. The level cap is 20.
- Saves are JSON dictionaries (`Game.progress`), saved locally or online (`SaveSystem`). New fields must be
  plain JSON.
- Tests are headless: `bun run test` runs `smoke_test`, `dev_console_test` and `asset_test`. New behaviour
  gets tests there or in a new `ui_test`.
- Assets come from the existing pipeline (`scripts/assets/blender`), following `assets.md`. PNGs are stored
  in Git LFS.

## Approaches considered

1. **Code-built UI, with icons and frames from the Blender pipeline. Chosen.**
   - It matches how the project already builds everything.
   - It can be rebuilt by script, and its icons match the 3D look.
2. Hand-painted 2D icon and frame art. Rejected: nobody on the project paints, and it can't be regenerated
   or kept consistent.
3. Icons drawn as vectors in code. Rejected: they look flat and cheap next to the textured world.

For growth, the owner picked **skills + variants + passive slots** over a point-spend talent tree.

## Design

### Data

- **`scripts/data/classes.gd`.** Every class gets `skills`, a list of 8 skill dictionaries:
  - Existing kinds are reused: arc, bolt, nova, pyre, rush, fan, blink, buff, whirl, ward, rain, trap and flurry.
  - Each skill has `"primary": true|false`, `"unlock": level` and `"variants": [4 × {id, name, desc, unlock, mods}]`.
  - `mods` is a dictionary merged over the skill when that variant is picked. Merged keys are numbers like
    radius, mult or cooldown, and effect keys that `world.hit_*` already understands (stun, knockback, burn,
    slow), plus `color`.
  - The old `basic` is the first primary.

  | Class | New primary | New skills |
  |---|---|---|
  | Warrior | Shield Bash (narrow arc, high hit, stun) | Grave Leap (blink that lands with a slam); Iron Hide (ward) |
  | Pyromancer | Cinder Spray (short fan) | Ember Step (blink that leaves fire); Flame Wave (fan of slow, piercing flames) |
  | Rogue | Barbed Throw (piercing bolt) | Smoke Veil (buff: dodge and speed); Rot Cloud (trap that poisons) |

- **Unlock levels:**
  - Skill unlocks: primaries at level 1; the six others at levels 1, 1, 2, 3, 5 and 6.
  - Variant unlocks: `max(skill unlock + 1, [2, 4, 6, 9][i])`.
- **`passives`:** 8 per class (`{id, name, desc, effect}`). Effects are simple stat hooks read through
  `Game`, for example +X% damage, + life on kill, cooldown −X%, a slower resource drain, or crit damage.
- **Passive slots** unlock at levels **3, 6 and 10**. This replaces the 5/10/15 shown in conversation,
  because Act I ends near level 8 to 10 and the owner should see all three in play.
- **Build, saved:** `progress["build"] = {"bar": [6 skill ids or ""], "variants": {skill_id: variant_id},
  "passives": [3 ids or ""]}`. The default bar is primary 1 on LMB, then the first skills in order.

### Gear and items (`scripts/data/items.gd`)

- `SLOTS` lists the 13 slot ids. `ring` items fit `ring_1` or `ring_2`.
- `SLOT_NAMES` holds the display names. An item's `slot` is its kind (`ring`, not `ring_1`).
- **Bases per slot**, each with an `icon` id. Weapon and offhand bases are per class:
  - warrior: shields;
  - pyromancer: tomes and orbs;
  - rogue: off-hand daggers.

  Base stats per slot:

  | Slot | Base stat |
  |---|---|
  | weapon | damage |
  | head, shoulders, chest, legs, wrists, hands, belt, feet | armor (chest most) |
  | amulet, rings | life or crit |
  | offhand | armor or mana |

- **New stats:** `crit_dmg` (%, base 50), `attack_speed` (%), `cdr` (%, capped at 40) and `regen`
  (life per second). `Game` adds `crit_damage()`, `attack_speed()`, `cooldown_mult()` and
  `life_regen()`. Player and HUD use them.
- `Items.compare(item, equipped)` returns the stat deltas for the tooltip.
- An `INVENTORY_SIZE` of 60 matches the 10 × 6 grid, with one cell per item. Variable item sizes are out
  of scope.

### Migration

`SAVE_VERSION` goes from 1 to 2, in `Game.load_hero`:

- `equipped.armor` → `chest` and `equipped.charm` → `amulet`. Bag items with `slot` armor become chest,
  and charm becomes amulet.
- `saints_knuckle` becomes a ring.
- **Uniques:**
  - `Items.UNIQUES` gets new slots: chest, amulet, weapon and ring.
  - `has_unique` checks every slot, so a migrated unique keeps working wherever it is.
- `build` is filled with the default build when missing.

### Panels (`scripts/ui/`)

- **`ui_theme.gd`:**
  - nine-patch styleboxes from `assets/textures/ui/`;
  - fonts and colours;
  - helpers `frame()`, `slot_well()` and `icon_button()`;
  - `tooltip(item, compare)`.
- **`character_panel.gd`:**
  - left page: the paper doll. Slots sit around a `SubViewportContainer` that shows `AssetModels.character(class)`
    playing idle and turning slowly. Below it is the stat summary and a details toggle.
  - right page: the bag grid and gold.
  - Drag and drop uses Godot's `_get_drag_data` and `_drop_data`.
  - Right-click equips, shift + right-click salvages, and right-click on an equipped slot unequips.
  - It works through `Game.equip_to(index, slot)`, `Game.unequip(slot)` and `Game.salvage(index)`.
- **`skills_panel.gd`:**
  - 6 bar slots on top. Clicking one opens a picker listing the class's skills (primaries only for LMB, or any;
    my call is that any skill can go on any slot).
  - Choosing a skill shows its 4 variants as cards. Locked cards show their unlock level.
  - 3 passive slots, each with a picker.
  - The panel is greyed out with a reason while enemies are near.
- **`settings_panel.gd`:** tabs for Graphics, Audio, Gameplay and Controls. Controls lists every action with
  its key, and clicking one waits for the next key or button. Changes apply on the spot; Reset defaults.
- **`settings.gd`** (new autoload `Settings`): it loads and saves `user://settings.cfg` and applies values:
  - window mode and resolution;
  - a quality preset that sets MSAA, the shadow atlas and SSAO/glow on the world environment;
  - brightness through the environment's adjustment;
  - audio bus volumes;
  - InputMap overrides;
  - gameplay flags that the HUD and world read.
- **`hotbar.gd`:**
  - the 6 slots read `Game.build.bar` and the player's cooldowns;
  - the potion slot;
  - menu buttons.

  It replaces the slot code in `hud.gd`. The orbs and XP bar stay.
- **`hud.gd`:**
  - owns the panels, with one open at a time beside the map;
  - routes Esc to close the top panel, or else open pause;
  - pause gains a Settings button;
  - `is_blocking()` includes the panels.

### Player (`scripts/actors/player.gd`)

- **Casting:**
  - `cast_skill(i)` becomes `cast_slot(bar_index)`. It looks up the skill by id with the variant applied:
    `Classes.resolved(skill, variant)`.
  - Primaries go through the existing `_basic_attack` path, generalised so that LMB or any slot holding a
    primary uses the same code.
  - The new primary kinds reuse arc and bolt (and fan for Cinder Spray).
- **Cooldowns:** keyed by skill id, so swapping the bar doesn't reset them. Cooldowns use `Game.cooldown_mult()`.
- **Input:**
  - LMB stays move or attack. With the LMB slot holding a primary, clicking an enemy uses that primary.
  - RMB and keys 1–4 cast their slots.
  - The input actions become `bar_1`…`bar_6`. Defaults: LMB, RMB, 1, 2, 3 and 4. `potion` is Q.
  - The `skills`, `settings` and `map` actions are added in `Boot`. `Settings` applies rebinds after that.

### Assets

These are made by `scripts/assets/blender/icons/*.py` and the `ui_frames.py` script, and run by `build.mjs`.

- **Item icons:** a low-poly model per base, rendered at 128 × 128 with a transparent background, 3/4 view
  and a warm key light. They go to `godot/assets/textures/icons/items/<icon>.png`. Roughly 40 bases.
- **Skill and passive icons:** an emblem per skill (a glyph shape from primitives, with an emissive class
  colour and a dark stone disc). They go to `godot/assets/textures/icons/skills/<id>.png`, 24 skills plus
  24 passives.
- **UI frames:** numpy-made nine-patch PNGs:
  - iron frame with rivets;
  - parchment panel;
  - slot well;
  - rarity borders tinted in code;
  - tab and button.

  They go to `godot/assets/textures/ui/`.
- The asset test checks that every base and skill has its icon.

### Tests

- A new `godot/tests/ui_test` (headless), added to `scripts/test.mjs`. It checks:
  - opening and closing each panel;
  - equip by API to every slot, with ring_2 used when ring_1 is full;
  - unequip, salvage and the compare deltas;
  - bar assignment, variant and passive changes, and that they save and reload;
  - migration of a version-1 save fixture;
  - settings saving and reloading, and rebinding an action;
  - every class's 8 skills casting with each variant without errors.
- The smoke test is updated for the new APIs.
- Screenshots: `tests/screenshots.gd` gains shots of every panel, for play review.

## Settled after the builder check

- **The LMB slot only takes a primary.** It keeps today's behaviour: click to move, click an enemy to
  attack with that primary, Shift to attack in place, and hold to repeat. Primaries cost nothing and build
  the class resource (`mana_on_hit`).
- **Every other slot (RMB, 1 to 4) takes any skill, including the second primary.** A skill there casts
  toward the cursor, and holding the key or button repeats it whenever it is ready. A primary used that way
  still builds resource.
- **Each class's 6 non-primary skills, in order:**
  - old skill 0 and old skill 1 unlock at level 1;
  - the first new skill (Grave Leap, Ember Step or Smoke Veil) at level 2;
  - old skill 2 at level 3 (unchanged);
  - old skill 3 at level 5 (unchanged);
  - the second new skill (Iron Hide, Flame Wave or Rot Cloud) at level 6.

  The second primary is available from level 1.
- **Default bar:**

  | Slot | Default |
  |---|---|
  | LMB | primary 1 |
  | RMB | old skill 0 |
  | 1 | old skill 1 |
  | 2 | old skill 2 |
  | 3 | old skill 3 |
  | 4 | empty |

  When a skill unlocks and isn't on the bar, it goes into the first empty slot and a message says so. A
  migrated hero gets this bar, which matches the old one, except that key 1 is no longer a copy of RMB.
- **Sanitise on load:**
  - unknown skill, variant or passive ids are dropped (falling back to the default);
  - a locked choice is kept but has no effect until its level is reached (a locked variant casts as the
    base skill, a locked passive slot is inert);
  - an item in an unknown equipped slot goes back into the bag. The bag grows to 60 cells, so it always
    has room after migration from a 24-item pack.
- **The online save is an opaque JSON blob** (`game-server` stores progress under "dod3d" without a
  schema), so new fields need no server change.
- **No passive uses a drain mechanic, because none exists.** The resource passives are: more resource on
  hit, faster regeneration, and a lower cost for skills.
- **Weapons and offhands are class-specific** and loot rolls only the current class's bases. There are no
  two-handed rules, and anything droppable can be worn.

## Calls I made (owner can veto)

- Any skill can go on any bar slot except LMB, which takes primaries only.
- Passive slots open at 3, 6 and 10, not 5, 10 and 15, because of Act I's level reach.
- The bag has 60 cells of one size each.
- Changes are blocked only when an enemy is within 12 m.
- `cdr` is capped at 40%.
- Names of the new skills, variants and passives are mine, in the game's gothic voice.

## Left to the builder

- Exact numbers for variants, passives and new item stats, tuned so that no single choice is a must-pick.
- Icon shapes and the frame look, within the dark iron and parchment direction.
- Panel layout details at 1280×720.
