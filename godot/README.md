# Depths of Darkness: Godot 4 (3D) version

A three-quarter 3D rebuild of Depths of Darkness in Godot 4 (GDScript). This folder is a playable **vertical slice of Act I**: the cursed town of Hollowmere, a procedurally assembled crypt beneath it, and the first boss. The 2D game in `game/` keeps shipping until this version replaces it.

The Warrior, Hollow, Bone Archer, torch sconces, barrels and sarcophagi use original procedural meshes from `scripts/models/`. The rest of the world uses runtime-built primitives, lights and fog. Open **Field guide** on the title screen to browse 13 original Act I illustrations. The portrait-format 4K editions in `art/field_guide/` were resampled from 941 × 1672 generated paintings. Hero selection and dialogue use smaller portrait textures.

## Run it

1. Install **Godot 4.3 or newer** (the standard build, not .NET).
2. In the Project Manager choose **Import**, pick `godot/project.godot`, then press **Run** (F5).

Started from the editor, the title screen offers a test hero of each class. Started by the launcher, it shows the launcher's character instead (see [Launcher contract](#launcher-contract)).

From a terminal:

```powershell
godot --path godot
```

### Smoke test

Plays the slice headless for all three classes (walk, talk, crypt, fight, boss, loot, portal, quest hand-in, death, save) and exits with code 0 when every check passes:

```powershell
godot --headless --path godot res://tests/smoke_test.tscn
```

`res://tests/online_save_test.tscn` saves to and reloads from a running game server. Pass a boot file with `serverUrl` and `token` for an existing character: `godot --headless --path godot res://tests/online_save_test.tscn -- --character-json boot.json`.

`res://tests/screenshots.tscn` renders a few screenshots into a folder (needs a window): `godot --path godot res://tests/screenshots.tscn -- --out C:\temp\shots --class rogue`.

Preview the procedural assets with `godot --path godot res://tests/model_gallery.tscn` from the repository root. Add `-- --out C:/temp/gallery` to save the rendered lineup. Include `--effects` after `--` to capture a melee strike and hit sparks.

## Controls

| Input | Action |
| --- | --- |
| Left click | Move to the point, attack a monster, or talk to / use what you clicked |
| Hold left click | Keep walking toward the cursor, or keep attacking |
| Shift + left click | Attack toward the cursor without moving |
| Right click or 1 | First skill, aimed at the cursor |
| 2 | Second skill |
| 3, 4 | Locked slots (new skills in later acts) |
| Q | Drink a grave-moss draught (heals 45%) |
| W A S D / arrows | Move directly |
| E | Talk to or use the nearest NPC, gate or stairs |
| I or C | Hero and pack: click an item to equip, right-click to salvage it for gold |
| Mouse wheel | Zoom |
| H | Show or hide the controls help |
| Esc | Close a panel, or pause (save and return to title, save and quit) |
| 1Ã¢â‚¬â€œ9 in a dialogue | Pick a reply |

## The slice

- **Classes** (from the 2D game): **Warrior** (Grave Cleave; Earthsplitter stun slam, Iron Rush charge), **Pyromancer** (Ember Bolt; Cinder Nova knockback ring, Pyre delayed fire pillar with burning ground) and **Rogue** (Twin Cuts; Knife Fan, Veilstep blink with a guaranteed critical hit). The armor color chosen in the launcher tints the hero.
- **Hollowmere** (town hub): Sister Maud (quest giver), Edda the smith (sells draughts), Old Corwin the gravedigger (lore, a gift charm), St. Aldric's chapel, the graveyard and the Mausoleum Gate down to the crypt.
- **The Sunken Crypt**: a new layout every visit. Rooms on a 4Ãƒâ€”4 slot grid are chained by a random walk from the entry stairs to the bell-pit, with side rooms branching off; each room is one of four tiles (hall, pillared nave, ossuary, flooded chapel). Torch-lit, with Hollows and Grave Crawlers (melee), Bone Archers (ranged) and elite packs.
- **Boss: Hask, the Bell-Warden**: telegraphed bell tolls, summons the dead at half health, enrages at a quarter. Drops the Black Clapper and opens a portal home.
- **Quest "The Silent Bell"**: talk to Maud, descend, slay Hask, bring the clapper back. Rewards gold, XP and an item.
- **Progression**: XP and level-ups (life, resource and damage grow), gold, draughts, and random gear (weapon, armor, charm) in four rarities: Worn, Hallowed, Cursed, Relic.

The full four-act story outline is in [`story/ACTS.md`](story/ACTS.md). Only Act I's opening quest is in the game.

## Launcher contract

### Starting the game

The launcher starts the exported game with the character to play. The preferred way is a JSON boot file:

```powershell
DepthsOfDarkness.exe -- --character-json "C:\Users\me\AppData\Roaming\depths-launcher\boot-character.json"
```

Godot passes everything after `--` to the game. (Without `--` it works too, but Godot may warn about unknown arguments.)

Boot file contents:

```json
{
  "id": "12",
  "name": "Edda",
  "heroClass": "rogue",
  "color": "#8d3430",
  "serverUrl": "http://raspberrypi.local:4100",
  "token": "<session token>"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Character id (string or number). Online: the server's character id. Offline: the launcher's local character id. |
| `name` | yes | 2Ã¢â‚¬â€œ18 characters. |
| `heroClass` | yes | `warrior`, `pyromancer` or `rogue` (anything else falls back to `warrior`). |
| `color` | no | Armor color as `#rrggbb`. Default `#8d3430`. |
| `serverUrl` | online only | Base URL of the game server, no trailing slash. |
| `token` | online only | The session token the launcher got from `/api/auth/login`. |

With both `serverUrl` and `token` the game plays **online**; otherwise it plays **offline**. This matches what `electron/characters.cjs` `bootCharacter()` produces, plus the two online fields.

Individual arguments work as an alternative and override fields from the file:
`--character-id 12 --character-name Edda --hero-class rogue --hero-color "#8d3430" --server-url http://raspberrypi.local:4100 --token <token>`.
Prefer the file for the token: command lines are visible to other programs on the PC. The launcher should write the file into its own user-data folder and can delete it after the game exits.

If the file can't be read, the title screen shows the error and offers test heroes instead.

### Saves

The game keeps the hero's progress as **one JSON object** (level, XP, gold, draughts, inventory, equipped items, quest states, flags, kills, play time). It saves on area changes, level-ups, quest steps, every 60 seconds and on quit.

- **Offline:** written to `user://saves/<id>.json`. On Windows that is `%APPDATA%\Godot\app_userdata\Depths of Darkness\saves\<id>.json`.
- **Online:** loaded with `GET <serverUrl>/api/characters/<id>/save` and written with `PUT <serverUrl>/api/characters/<id>/save`, both with `Authorization: Bearer <token>` (see `game-server/README.md`). Because the server only keeps string values under keys that start with `dod`, the progress object is sent as a string:

  ```json
  {
    "data": { "dod3d": "{\"version\":1,\"level\":4,\"xp\":120, ...}" },
    "meta": { "heroLevel": 4, "depth": 2 }
  }
  ```

  On load the game reads `save.data.dod3d`. A character with no `dod3d` yet starts fresh in the 3D game. A copy is also kept in `user://saves/online-<id>.json`; if the server can't be reached, the game plays from that copy and says so in the bottom-left corner.
- On quit the game waits up to 4 seconds for the last online save to finish.

`meta.depth` is 1 until the hero has entered the crypt, then 2.

### How the launcher runs it

- **Export:** `bun run godot:export` (repo root) exports the **Windows Desktop** preset in `export_presets.cfg` to `build/DepthsOfDarkness.exe`. The installer bundles it as `resources/game3d/DepthsOfDarkness.exe`.
- **Launch:** the launcher's **Play Act I in 3D** button writes the boot file to `<launcher userData>/boot-character.json`, starts the exe, hides itself, and comes back (refreshing the character list) when the game exits. The boot file is deleted then. See `play3d()` in `electron/main.cjs`.
- **Saves:** the server merges a character's save instead of replacing it: a write with only `dod3d*` keys replaces the 3D keys and keeps the 2D game's keys, and the other way round. 3D writes don't change the level and depth the launcher shows. The launcher only starts the 3D game online when the server's `/api/status` lists the `save-merge` feature.

## Layout

| Path | What it is |
| --- | --- |
| `project.godot` | Project settings: boot splash, autoloads, window. |
| `scenes/` | `main_menu.tscn` (title) and `world.tscn` (the playable world). Both are tiny; everything is built in code. |
| `scripts/autoload/` | `boot.gd` (launcher contract, input map), `save_system.gd` (local and server saves), `game_state.gd` (progress, stats, quests, area changes). |
| `scripts/data/` | Classes and skills, item generation, Act I dialogue. |
| `scripts/world/` | Level grid and A* pathfinding, level geometry, Hollowmere layout, crypt generator, camera, effects, the world controller. |
| `scripts/actors/` | Hero, monsters and boss, projectiles, loot. |
| `scripts/ui/` | HUD (orbs, skill bar, panels), title screen, theme. |
| `shaders/wall.gdshader` | Stone walls that cut away near the hero so walls never hide them. |
| `story/ACTS.md` | The four-act story outline. |
| `tests/` | Headless smoke test and the screenshot script. |
