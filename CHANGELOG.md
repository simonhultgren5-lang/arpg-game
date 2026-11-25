# Changelog

Patch notes for players. The launcher shows them on its **What's new** card and in the
**Patch Notes** panel, and `bun run release` refuses to publish a version without a section here.

How to write a section:

- Start with `## <version> (<YYYY-MM-DD>)`. The date is optional, but the launcher shows it.
- A big update can have a name: `## 0.4.0 — Act I: The Tolling of Hollowmere (<YYYY-MM-DD>)`. The launcher shows it as the patch title, and it becomes the GitHub release's title.
- Optional `### ` subheadings group changes (for example New, Changes, Fixes).
- One `- ` line per change, in plain language for players. `**bold**` works.

## 0.5.0-beta.7 — Embers and Mist (2026-11-25)

### New
- **Hollowmere looks darker and richer.** A moodier colour grade, softer glow on flames and lamps, low ground mist and, on High quality, light bounce, reflections on wet floors and volumetric fog in the crypt.
- **New hand-modelled props:** the well, house doors, windows with shutters, chimneys, the chapel's rose window, iron braziers, bone piles, a broken handcart and gnarled dead trees.
- **The town is dressed:** braziers light the square, barrels and crates stand against the houses, carts lie where people fled, and a broken fence runs along the graveyard.
- **The crypt has more life:** bone piles on the floors and braziers in the bigger rooms.

### Fixes
- **Quest rewards are never lost to a full pack.** Handing in The Silent Bell, Lamps Without Oil or The Wardens' Oath now waits until you have room, and tells you so.
- Quest items (the Black Clapper and the Founders' Charter) can no longer be refused by a full pack.
- The Wardens' Oath always places all three name-stones in the crypt.

## 0.5.0-beta.6 — Tolling Heard (2026-11-25)

### New
- **Hollowmere has its own sound.** Every skill of every class has its own sound, with three takes so repeated casts never sound the same.
- **Monsters sound like what they are.** Each one has its own hits, death and a warning sound before it attacks, so you can hear a blow coming.
- **Footsteps change underfoot**: stone in the crypt, cobble and earth in town.
- **New music:** for the title, the town, the crypt and combat, and a two-phase score for Hask that turns as the fight does.
- **The world around you is heard:** wind, dripping water, the cave, the forest and rain, with thunder in storms.
- **Loot, the inventory, quests, level-ups and uniques all have their own sounds.**
- **The Second Cup**, a short opening scene: Edda the smith remembers the night her brother came back. It plays once, when a new hero first walks into Hollowmere.

### Changes
- Music and ambience dip under big moments, and every sound follows the volume sliders in Settings.

## 0.5.0-beta.5 — The Hero's Ledger (2026-11-25)

### New
- **Character and bag (C or I).** Your hero stands turning between **13 gear slots**: head, shoulders, amulet, chest, wrists, hands, belt, legs, feet, two rings, weapon and off-hand. Drag gear on and off, right-click to wear, and see at a glance in the tooltip what is better (green) or worse (red) than what you wear. The bag holds 60.
- **Loot drops for every slot**, each with its own icon, and gear can roll new stats: critical damage, attack speed, cooldown reduction and life per second.
- **Skills (K).** Every class now has **eight skills**: two new primaries and two new skills (Shield Bash, Grave Leap and Iron Hide; Cinder Spray, Ember Step and Flame Wave; Barbed Throw, Smoke Veil and Rot Cloud). Put any of them on right click and keys 1–4, and hold a key to keep casting.
- **Every skill has four variants** that unlock as you level: slow foes with the grave's chill, burn them, stun them longer, widen the blast. Pick the one that suits you, or keep the plain skill.
- **Passives:** three slots that open at levels 3, 6 and 10, with eight passives per class.
- **Settings (Esc).** Window mode and resolution, quality, shadows, brightness, sound volumes, damage numbers, screen shake, enemy life bars, loot names, and every key can be changed. Also on the title screen.
- A new skill bar with icons, and buttons for the character, skills, map and menu.

### Changes
- Old heroes keep everything: armour moves to the chest slot, charms to the amulet slot, and the Knuckle of the Thirteenth becomes a ring.
- The skills panel is shut while a foe is close; change your build out of the fight.

## 0.5.0-beta.4 — Forged in Hollowmere (2026-11-25)

### New
- **All three heroes have new, fully modelled bodies.** The Warrior wears plate, a great helm, a tabard in your armour colour and carries a sword and heater shield. The Pyromancer has a hooded robe and an ember-tipped staff. The Rogue wears leathers, a mask and twin daggers.
- **Every monster of Act I is remodelled:** hunched Hollow, skeletal Bone Archers with bow and quiver, six-legged Grave Crawlers and Hask, the bell-bodied Bell-Warden, with his maul.
- Heroes and monsters now **walk, strike, cast, flinch and fall** with real animations.
- Hollowmere's streets are paved in **textured cobbles**, the crypt in **worn flagstones**, and the walls are built of **cut stone** that catches the torchlight.
- New props: carved crypt pillars, sarcophagi, banded barrels, three kinds of gravestone and iron lamp posts with flickering lanterns.

### Fixes
- Building a release now stops early when that version is already published or the disk is too full, instead of failing halfway.

## 0.5.0-beta.3 — Moon over Hollowmere

- Moonlight picks out cottage chimneys and timber window frames above Hollowmere's streets.
- Follow staggered cobbles through the town and broad, worn flagstones underground.
- Flooded crypt chambers catch the torchlight in moving ripples. A cast bronze bell with a flared rim, aged band and hanging clapper lies in the Bell-Warden's pit.
- Grave Crawlers lift and plant their six feet in alternating groups. Heroes breathe at rest and lean into their strikes.

## 0.5.0-beta.1 — Survey of Hollowmere

- Follow the minimap through town and the crypt. Press **M** or click the map to see the whole area, your heading, townsfolk and passages. Press **Esc** to resume.
- The combat bar, dialogue, inventory and menus have a slate-and-brass finish. Press **H** to show the controls.
- All three heroes take alternating steps, sway with their stride and leave fading boot scuffs.

## 0.5.0-beta.0 — Act I: Complete

The bell is silent, but Hollowmere isn't finished with you. Act I now runs to its end, and the way down to Act II is open.

### New
- **The rest of Act I's story.** After the bell falls silent, a child with a lamp waits in the square, and answers every question with another. Follow the Lamplighter's lamps to an unmarked grave in **Lamps Without Oil**, and bring what you find to Sister Maud. Then listen to the wells.
- **The end of the act.** The wells of Hollowmere toll, and Maud opens the stair beneath St. Aldric's. Go down it to finish Act I; you can keep playing afterwards.
- **The Wardens' Oath**, an optional quest from Old Corwin: find the wardens' lost name-stones in the Sunken Crypt and set them back where they belong.
- **Two new skills for every class**, in slots 3 and 4. They unlock at level 3 and level 5.
  - **Warrior:** Grave Roar and Sexton's Whirl.
  - **Pyromancer:** Ashen Ward and Cinder Rain.
  - **Rogue:** Bone Caltrops and Death Flurry.
- **Unique items**, each with a power of its own: the Warden's Vigil, the Lamplighter's Wick, Hask's Toll and the Knuckle of the Thirteenth. They glow pale gold on the ground.
- **New models** for the Rogue, the Pyromancer, the Grave Crawler and Hask, the Bell-Warden.
- **Music and ambience:** Hollowmere, the Sunken Crypt and Hask's fight each have their own music, with wind in the town and dripping water below. Hask's toll, and the wells, ring out loud.

### Changes
- The quest log shows the main quest and the optional one you're on.
- Your life orb shows how much damage a ward will still absorb.

## 0.4.1

### Changes
- Faster updates: the game's art, sound and video are now stored separately from its code, so downloads and builds are smaller and quicker.
- Behind the scenes, the game's files are organized the way large game studios do it, ready for new 3D models, animations and cinematics.

## 0.4.0 — Act I: The Tolling of Hollowmere

The bells of St. Aldric's have started ringing on their own, and every toll brings the dead closer to the surface. Act I is here.

### New
- **Depths of Darkness is now a 3D game.** Walk into Hollowmere, take Sister Maud's task, descend into the Sunken Crypt and silence Hask, the Bell-Warden. The old 2D game is gone.
- **A new launcher.** Your chosen hero stands in the chapel niche at the center, your characters line up along the bottom, and Play is one click away. Patch notes have their own **News** page, and servers and your account live under **Settings**.
- Your characters keep their name, class and armor colour, and start their story in Hollowmere. Progress from the 2D game doesn't carry over.
- **News from your server** in the launcher: the newest post shows next to your hero, and the **News** page has every post alongside the patch notes.
- **Release channels:** choose **Stable**, **Beta** or **Dev** in Settings to get new versions earlier. Beta and Dev builds can have rough edges.
- **Change your password** in Settings.
- **Optional crash reports and usage statistics.** The launcher asks once. Reports only go to the server you play on, never to anyone else, and aren't linked to your account. Change your mind any time in Settings.

### Changes
- Updates show their size and download speed, and you can choose to download them yourself instead of automatically.
- The character list shows each hero's level and depth in Act I.
- Updates now come as one download that brings the launcher and the game together.

### For developers and server owners
- **In-game dev console** (F1 or `): god mode, levels, gold and gear, spawning monsters, jumping to the crypt or the boss. Only in builds run from source, or when the launcher starts with `--dev`.
- **Dev tools page in the launcher** (same builds): start the game windowed or next to the boss, open the save and log folders, and test updates against a local folder.
- **`bun run dev`** starts a local server with a test account and three heroes, then the launcher. **`bun run test`** runs every check. **`bun run dev:reset`** wipes the dev data.
- **Feature flags** set on the server (`admin.mjs flag-set`) reach the launcher and the game, for things like a double-XP weekend or a banner over the hero.
- **Server admin commands** for the Pi: news posts, feature flags, crash reports and a usage summary, as well as listing accounts and characters, resetting a password, renaming or deleting a character, and backing up or restoring the database: `docker exec -it depths-server node admin.mjs`.

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
