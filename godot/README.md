# Depths of Darkness: the game (Godot 4)

Depths of Darkness is a three-quarter 3D action RPG made with Godot 4 (GDScript). This folder is the whole game. **Act I** is playable: the cursed town of Hollowmere, a procedurally assembled crypt beneath it, and the first boss. The launcher (`launcher/` + `electron/`, see the root README) starts it with the player's character.

The Warrior, Hollow, Bone Archer, the townsfolk (Sister Maud, Edda, Old Corwin), torch sconces, barrels and sarcophagi use original procedural meshes from `scripts/models/`. The rest of the world uses runtime-built primitives, lights and fog. Open **Field guide** on the title screen to browse 13 original Act I illustrations. The portrait-format 4K editions in `assets/textures/field_guide/` were resampled from 941 × 1672 generated paintings. Hero selection and dialogue use smaller portrait textures.

## Run it

1. Install **Godot 4.3 or newer** (the standard build, not .NET).
2. In the Project Manager choose **Import**, pick `godot/project.godot`, then press **Run** (F5).

Started from the editor, the title screen offers a test hero of each class. Started by the launcher, it shows the launcher's character instead (see [Launcher contract](#launcher-contract)).

From a terminal:

```powershell
godot --path godot
```

### Dev console

Press **F1** or **`** (backtick) to open the developer console. It works in builds run from the Godot editor, and in exported builds started with `--dev` (the launcher's **Dev tools** page passes it). Players' builds don't have it. The game pauses while the console is open; **↑** and **↓** step through earlier commands.

| Command | What it does |
| --- | --- |
| `help` | List every command |
| `god [on\|off]` | Monsters can't hurt you |
| `heal` | Full health and mana |
| `level <1-20>`, `xp <n>` | Set the level, or add experience |
| `gold <n>`, `potions <n>` | Add gold, set the number of draughts |
| `give <weapon\|armor\|charm> [rarity 0-3]` | Put a rolled item in the pack |
| `loot [n]` | Drop items at your feet |
| `spawn <hollow\|archer\|crawler\|boss> [n] [elite]` | Spawn monsters near you |
| `kill` | Kill every monster in the area |
| `tp <town\|crypt\|boss>` | Go to an area (`boss`: next to Hask) |
| `quest <0-3>` | Set The Silent Bell's step |
| `quest <silent_bell\|lamps\|act_end\|wardens> <step>` | Set any Act I quest's step (`wardens 2` also gives every name-stone) |
| `quests` | List every Act I quest and its step |
| `unique <id>` | Put a unique item in the pack (`unique list` names them) |
| `speed <0.1-5>`, `fps` | Game speed, FPS counter |
| `stats`, `save`, `clear` | Print the hero's stats, save now, clear the log |

`--dev-start crypt` or `--dev-start boss` (with `--dev`) goes there right after **Enter Hollowmere**. The console's code is `scripts/autoload/dev_console.gd`; `res://tests/dev_console_test.tscn` tests it headless.

### Feature flags

The launcher passes the server's feature flags in the boot file (`"flags": { "game.xp_multiplier": 2 }`). Read one with `Boot.flag("game.xp_multiplier", 1.0)`: you get the fallback when the flag isn't set, or is set to a different type. Flags the game uses:

| Flag | Effect |
| --- | --- |
| `game.xp_multiplier` | Multiplies experience (0–10), for example `2` for a double-XP weekend |
| `game.dev_console` | `true` turns on the F1 dev console, for testers on a server |

Server owners set them with `admin.mjs flag-set` (see `game-server/README.md`).

### Smoke test

Plays Act I headless for all three classes (walk, talk, crypt, fight, boss, loot, portal, every quest to the end of the act, skills 3 and 4, uniques, music, death, save) and exits with code 0 when every check passes:

```powershell
godot --headless --path godot res://tests/smoke_test.tscn
```

`res://tests/online_save_test.tscn` saves to and reloads from a running game server. Pass a boot file with `serverUrl` and `token` for an existing character: `godot --headless --path godot res://tests/online_save_test.tscn -- --character-json boot.json`.

`res://tests/screenshots.tscn` renders a few screenshots into a folder (needs a window): `godot --path godot res://tests/screenshots.tscn -- --out C:\temp\shots --class rogue`.

Preview the procedural assets with `godot --path godot res://tests/model_gallery.tscn` from the repository root. Add `-- --out C:/temp/gallery` to save the rendered lineup. Include `--effects` after `--` to capture a melee strike and hit sparks. `res://tests/townsfolk_gallery.tscn` does the same for Sister Maud, Edda and Old Corwin, and `res://tests/act1_lineup.tscn` renders every hero and monster of Act I side by side.

## Controls

| Input | Action |
| --- | --- |
| Left click | Move to the point, attack a monster, or talk to / use what you clicked |
| Hold left click | Keep walking toward the cursor, or keep attacking |
| Shift + left click | Attack toward the cursor without moving |
| Right click or 1 | First skill, aimed at the cursor |
| 2 | Second skill |
| 3, 4 | Third and fourth skills (they unlock at level 3 and level 5) |
| Q | Drink a grave-moss draught (heals 45%) |
| W A S D / arrows | Move directly |
| E | Talk to or use the nearest NPC, gate or stairs |
| I or C | Hero and pack: click an item to equip, right-click to salvage it for gold |
| Mouse wheel | Zoom |
| H | Show or hide the controls help |
| M or click the minimap | Open the area map. M or Esc resumes play. |
| Esc | Close a panel, or pause (save and return to title, save and quit) |
| 1Ã¢â‚¬â€œ9 in a dialogue | Pick a reply |

## Act I

- **Classes:** four skills each, besides the basic attack. Skills 3 and 4 unlock at level 3 and level 5.
  - **Warrior:** Grave Cleave; Earthsplitter (stun slam), Iron Rush (charge), Grave Roar (more damage, less damage taken), Sexton's Whirl (spin).
  - **Pyromancer:** Ember Bolt; Cinder Nova (knockback ring), Pyre (delayed fire pillar, burning ground), Ashen Ward (absorbs damage), Cinder Rain (cinders over an area).
  - **Rogue:** Twin Cuts; Knife Fan, Veilstep (blink, guaranteed critical), Bone Caltrops (slowing, bleeding ground), Death Flurry (strike up to five nearby foes).
  - The armor color chosen in the launcher tints the hero.
- **Hollowmere** (town hub): Sister Maud (quest giver), Edda the smith (sells draughts), Old Corwin the gravedigger (lore, a gift charm, The Wardens' Oath), the Lamplighter (after the bell is silent), St. Aldric's chapel, the graveyard and the Mausoleum Gate down to the crypt.
- **The Sunken Crypt**: a new layout every visit. Rooms on a 4×4 slot grid are chained by a random walk from the entry stairs to the bell-pit, with side rooms branching off; each room is one of four tiles (hall, pillared nave, ossuary, flooded chapel). Torch-lit, with Hollows and Grave Crawlers (melee), Bone Archers (ranged) and elite packs.
- **Boss: Hask, the Bell-Warden**: telegraphed bell tolls, summons the dead at half health, enrages at a quarter. Drops the Black Clapper (and Hask's Toll) and opens a portal home.
- **Story** (`scripts/data/act1_dialogue.gd` lists every quest step):
  1. **The Silent Bell**: talk to Maud, descend, slay Hask, bring the clapper back.
  2. **Lamps Without Oil**: the Lamplighter's lamps lead to an unmarked grave and the Founders' Charter; Maud reads it.
  3. **The Wells Toll**: the wells toll and Maud opens the undercroft stair. Going down it ends Act I (you can keep playing afterwards).
  4. **The Wardens' Oath** (optional, from Corwin): three name-stones in the crypt go back on the plinth by the mausoleum.
- **Unique items** (`scripts/data/items.gd`, `UNIQUES`), each with a power: the Warden's Vigil and the Lamplighter's Wick (quest rewards), Hask's Toll (Hask; sure the first time) and the Knuckle of the Thirteenth (elite monsters, rare).
- **Progression**: XP and level-ups (life, resource and damage grow), gold, draughts, and random gear (weapon, armor, charm) in four rarities: Worn, Hallowed, Cursed, Relic.
- **Music and ambience**: a track each for the title, Hollowmere, the crypt and Hask's fight, with wind in town and dripping water below (`scripts/autoload/act_audio.gd`; made by `scripts/audio/act1-audio.mjs`).

The full four-act story outline is in [`story/ACTS.md`](story/ACTS.md). Act I is complete; Act II is next.

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

  On load the game reads `save.data.dod3d`. A character with no `dod3d` yet starts fresh (for example a hero made before 0.4.0, when the game was 2D). A copy is also kept in `user://saves/online-<server>-<id>.json` (`<server>` is the first 8 hex digits of the MD5 of the server URL); if the server can't be reached, the game plays from that copy and says so in the bottom-left corner.
- On quit the game waits up to 4 seconds for the last online save to finish.
- For `http://` servers the game looks up the host name's IPv4 address once and connects to that. Names like `raspberrypi.local` often resolve to an IPv6 link-local address first, which Godot can't connect to. `https://` URLs keep the name for the certificate check.

`meta.depth` is 1 until the hero has entered the crypt, then 2.

### How the launcher runs it

- **Export:** `bun run godot:export` (repo root) exports the **Windows Desktop** preset in `export_presets.cfg` to `build/DepthsOfDarkness.exe`. The installer bundles it as `resources/game/DepthsOfDarkness.exe`.
- **Launch:** the launcher's **Play** button writes the boot file to `<launcher userData>/boot-character.json`, starts the exe, hides itself, and comes back (refreshing the character list) when the game exits. The boot file is deleted then. See `launchGame()` in `electron/main.cjs`.
- **Saves:** the server keeps the `dod3d` key apart from anything an old 2D launcher (before 0.4.0) might still write, so neither can erase the other. The `meta` level and depth of the game's saves are what the launcher's character list shows. Offline, the launcher reads level and depth from `user://saves/<id>.json`, and deletes a character's save file when the character is deleted. The launcher only starts the game online when the server's `/api/status` lists the `save-merge` feature.

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
