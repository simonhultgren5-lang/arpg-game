# Changelog

Patch notes for players. The launcher shows them on its **What's new** card and in the
**Patch Notes** panel, and `bun run release` refuses to publish a version without a section here.

How to write a section:

- Start with `## <version> (<YYYY-MM-DD>)`. The date is optional, but the launcher shows it.
- A big update can have a name: `## 0.4.0 — Act I: The Tolling of Hollowmere (<YYYY-MM-DD>)`. The launcher shows it as the patch title, and it becomes the GitHub release's title.
- Optional `### ` subheadings group changes (for example New, Changes, Fixes).
- One `- ` line per change, in plain language for players. `**bold**` works.

## 0.4.0 — Act I: The Tolling of Hollowmere

The bells of St. Aldric's have started ringing on their own, and every toll brings the dead closer to the surface. Act I is here.

### New
- **Depths of Darkness is now a 3D game.** Walk into Hollowmere, take Sister Maud's task, descend into the Sunken Crypt and silence Hask, the Bell-Warden. The old 2D game is gone.
- **A new launcher.** Your chosen hero stands in the chapel niche at the center, your characters line up along the bottom, and Play is one click away. Patch notes have their own **News** page, and servers and your account live under **Settings**.
- Your characters keep their name, class and armor colour, and start their story in Hollowmere. Progress from the 2D game doesn't carry over.

### Changes
- The character list shows each hero's level and depth in Act I.
- Updates now come as one download that brings the launcher and the game together.

### For developers and server owners
- **In-game dev console** (F1 or `): god mode, levels, gold and gear, spawning monsters, jumping to the crypt or the boss. Only in builds run from source, or when the launcher starts with `--dev`.
- **Dev tools page in the launcher** (same builds): start the game windowed or next to the boss, open the save and log folders, and test updates against a local folder.
- **`bun run dev`** starts a local server with a test account and three heroes, then the launcher. **`bun run test`** runs every check. **`bun run dev:reset`** wipes the dev data.
- **Server admin commands** for the Pi: list accounts and characters, reset a password, rename or delete a character, and back up or restore the database: `docker exec -it depths-server node admin.mjs`.

## 0.3.3 (2026-11-25)

### New
- **The Act I film plays behind the launcher.** It loops quietly behind the title. **Watch the Act I film** plays it full size with sound and captions, and Esc brings you back.
- **Sister Maud, Edda and Old Corwin have 3D models** that match their Field guide portraits: Maud's lantern and red habit, Edda's apron and hammer, Corwin's hat, staff and lantern.
- **Server updates:** the launcher shows the server's version, and tells you when a newer server is out. On the Pi, `bash game-server/update.sh` installs it (or `--auto` for nightly updates). Accounts and saves are kept.

### Fixes
- The 3D game now saves to servers with a `.local` name (like `raspberrypi.local`). Before, it couldn't reach them and only saved on your PC.
- The game server reports its real version instead of 0.1.0.

## 0.3.2 (2026-11-25)

### New
- **New 3D art in Act I:** the Warrior, the Hollow, the Bone Archer and the crypt props (torch sconces, barrels, sarcophagi) have brand-new hand-built models with warm rim lighting and glowing details.
- **Sound for Act I:** spell and weapon sounds for every class, and spoken lines for the people of Hollowmere and the monsters of the crypt.
- **Field guide:** a new menu in the 3D preview with portraits of the heroes, monsters, townsfolk and objects.
- **Act I trailer:** watch it from the launcher with the new **Watch the Act I trailer** link.

### Changes
- The 3D title screen shows a portrait of the hero you are about to play, and townsfolk portraits appear in dialogue.
- Torches now flicker with an animated flame.
- Models for the Rogue, Mage, Grave Crawler and Hask are unchanged for now.

## 0.3.1 (2026-11-25)

### Fixes
- The launcher now notices new updates while it's open. Before, a new version only showed up after you closed and reopened the launcher.

## 0.3.0 (2026-11-25)

### New
- **Act I in 3D (preview):** press **Play Act I in 3D** in the launcher to try the new 3D version of Depths of Darkness with your character. Explore the cursed town of Hollowmere, descend into the Sunken Crypt and face Hask, the Bell-Warden.
- The preview uses simple placeholder art while the 3D world is being built. More acts and real art are on the way.
- Your 3D progress is saved separately, so playing the preview never touches your hero in the main game.

### Changes
- Game servers now keep a character's main-game and 3D progress side by side. Server owners: update your server to play the 3D preview online.

## 0.2.1 (2026-11-24)

### New
- **Characters:** create up to 5 characters per account right in the launcher. Pick a class, a name and an armor color, with a live preview.
- Your current hero is kept and becomes your first character. Offline play gets its own 5 characters too.
- A new **Depths of Darkness emblem** in the launcher, on the title screen and as the app icon.

### Changes
- Choosing a character in the launcher takes you straight into the game.
- Launcher fixes.

### Coming soon
- A complete **3D engine** rework of the game is on the way, so stay tuned!

Regards, Afiniel

## 0.2.0 (2026-11-24)

### New
- **Patch Notes in the launcher:** read the notes for every version, not just the latest update.
- A **What's new** card on the launcher's main screen shows the highlights of the newest version, with a NEW badge until you've read it.

### Changes
- Patch notes now update together with game patches, so they're always current.

## 0.1.1 (2026-11-24)

### New
- The launcher now updates the game automatically. No more downloading a new installer for each patch.
- The launcher updates itself too: when a new launcher is out, press **Restart to update**.

## 0.1.0 (2026-11-24)

### New
- First desktop release: launcher with servers, accounts and cloud saves.
- Fullscreen desktop game with in-game settings, pause menu and controls guide.
