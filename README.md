# Depths of Darkness

A grim gothic action RPG in 3D. Pick a Warrior, Pyromancer or Rogue, walk out of the fog into the cursed town of Hollowmere, and descend into the crypt beneath it.

The game is made with **Godot 4** in [`godot/`](godot/README.md). It ships as a Windows app with a **launcher** (`launcher/` + `electron/`): pick a server, log in or register, pick one of your characters, and press Play. Accounts and saves live on the **game server** in [`game-server/`](game-server/README.md), which you host yourself (for now on a Raspberry Pi on your home network). The launcher can also play offline with characters stored on the PC.

The story is planned in four acts ([godot/story/ACTS.md](godot/story/ACTS.md)). Act I is playable.

---

## Requirements

- **Node.js 22 or newer** (developed on Node 24): <https://nodejs.org>
- **Bun** (recommended, the repo uses `bun.lock`) or npm, which comes with Node
- **Godot 4.7+** with its Windows export templates (in Godot: Editor → Manage Export Templates), to build the game
- **Windows** to build the `.exe`

## Quick start

```powershell
bun install
```

Then pick what you want to do:

| Goal | Command | Result |
| --- | --- | --- |
| Work on the game | Open `godot/project.godot` in Godot and press F5 | The title screen offers a test hero of each class |
| Export the game | `bun run godot:export` | `godot/build/DepthsOfDarkness.exe` |
| Run the launcher from source | `bun run launcher` | The launcher; **Play** starts the exported game |
| Run a game server on this PC | `bun run server` | Accounts and saves on <http://localhost:4100> |
| Package the server for the Raspberry Pi | `bun run server:pack` | `release/depths-server-<version>.tar.gz` (see [game-server/README.md](game-server/README.md)) |
| Build the Windows `.exe` | `bun run dist` | Installer and portable `.exe` in `release/` |

(`npm run <script>` works the same as `bun run <script>`.)

`bun run godot:export` finds Godot through the `GODOT` environment variable (path to the Godot `.exe`, the `_console` one is best), `godot` on your PATH, or a Godot download in your Downloads folder.

## The launcher and accounts

- **Server list** with a live online/offline dot, ping and server version for each server. **+** adds a server by address (`192.168.1.50` or `my-pi.local:4100`; port 4100 is assumed). Hover a server and press ✕ to remove it. When a newer server is released, the server shows **Server update available**.
- **Log in / Register** for the selected server. Accounts live on that server, so each server has its own accounts.
- **Characters:** each account has up to **5 characters**. Create one in the launcher (name, class, armor color), select it, and press **Play**. Delete a character by hovering it and pressing ✕, then typing its name to confirm. Double-click a character to play it straight away.
- **Play** hides the launcher and starts the game with that character. The game loads and saves the hero's progress on the server (see [godot/README.md](godot/README.md), "Launcher contract"). When the game closes, the launcher comes back with the character list refreshed.
- **Play offline** switches to characters stored on this PC only (also up to 5).
- **The Act I film** loops behind the launcher; **Watch the Act I film** plays it full size with sound.
- **What's new** shows the highlights of the newest version, with a NEW badge until the player opens the notes. **Patch notes** (on the card or in the footer) opens every version's notes.

The app icon and logo come from `launcher/assets/emblem.svg` (the game has its own copy in `godot/art/`). After changing it, run `bun run icons` to regenerate `launcher/assets/icon.ico` and `icon.png`.

**Where things are stored on the PC:**

- The launcher's server list and logins (`launcher.json`) and offline characters (`offline-characters.json`) are in `%APPDATA%\Depths of Darkness\`. Running the launcher from source uses `%APPDATA%\Depths of Darkness (dev)\` instead.
- The game's saves are in `%APPDATA%\Godot\app_userdata\Depths of Darkness\saves\`: `<id>.json` for an offline hero, and `online-<server>-<id>.json` as a local copy of an online hero.

## Building the `.exe`

```powershell
bun run dist
```

This exports the game, then packages the launcher with the game inside (`resources/game/DepthsOfDarkness.exe`). The first build downloads Electron's packaging tools, so it takes a few minutes. When it finishes, `release/` contains:

- `Depths-of-Darkness-Setup-<version>.exe`: installer with Start menu and desktop shortcuts. Updates itself.
- `Depths-of-Darkness-<version>-portable.exe`: a single file that runs without installing. Needs a manual download for updates.
- `win-unpacked/`: the unpacked app, handy for quick testing

For a faster test build that only produces `release/win-unpacked/`, run `bun run dist:dir`.

## Version number

The version lives in **one place: `version` in `package.json`**. It shows on the game's title screen, in the launcher, in the game server's status, and in the installer's file names.

```powershell
bun run bump:patch   # 0.4.0 -> 0.4.1  (bug fixes)
bun run bump:minor   # 0.4.0 -> 0.5.0  (new features)
bun run bump:major   # 0.4.0 -> 1.0.0  (big release)
```

Each command updates `package.json`, then copies the version into `godot/project.godot` and `game-server/server.mjs`. If you change `package.json` yourself, `launcher`, `dist` and `release` re-sync it automatically, or run `bun run version:sync`.

## Project structure

```
godot/                  The game (Godot 4, GDScript); see godot/README.md
  story/ACTS.md         The four-act story outline
launcher/               Launcher window: film, servers, login, characters, Play (HTML, CSS, JS)
  assets/               Emblem, icons, fonts, the Act I film and its captions
electron/               Desktop app
  main.cjs              Opens the launcher, starts the game with the chosen character
  servers.cjs           Server list, saved logins (encrypted) and requests to game servers
  characters.cjs        Offline characters, and the game's save files on this PC
  updates.cjs           Checks GitHub for new versions and installs them
  launcher-preload.cjs  Bridge the launcher uses
game-server/            Self-hosted game server (accounts, saves, status, update.sh); see its README
scripts/
  sync-version.mjs      Copies the version from package.json into the game and the server
  export-godot.mjs      Exports the game to godot/build/DepthsOfDarkness.exe
  patch-notes.mjs       Turns CHANGELOG.md into patch-notes.json for the launcher
  release.mjs           Publishes a release to GitHub (bun run release)
  pack-server.mjs       Packages the game server for the Raspberry Pi
  build-icons.cjs       Renders the emblem into the app icons
CHANGELOG.md            Patch notes; the launcher shows them to players
release/                Builds (created by `bun run dist` and `bun run release`, not committed)
```

## Developing

- **The game:** open `godot/project.godot` in Godot. Started from the editor, the title screen offers a test hero of each class and saves offline. `godot/README.md` covers the controls, the headless smoke test and the model galleries.
- **The launcher:** `bun run launcher`. `F5` or `Ctrl+R` reloads it after editing `launcher/`, and `F12` opens DevTools. Changes to `electron/` need a restart. **Play** needs an exported game (`bun run godot:export`).

## Releasing an update

Players don't download anything by hand. When the launcher starts (and every few minutes while it's open), it checks your latest GitHub release, downloads the new installer in the background and offers **Restart to update**. The game ships inside the installer, so every release updates both.

1. Bump the version: `bun run bump:patch` (or `minor` / `major`).
2. Make and test your changes.
3. Add a `## <version> (<date>)` section to [CHANGELOG.md](CHANGELOG.md), with optional `### New` / `### Changes` / `### Fixes` subheadings and one `- ` line per change. This is what players read in the launcher's **What's new** card and **Patch Notes** panel.
4. Commit and push.
5. Run `bun run release`. It exports the game, builds the installer, packs the game server, writes the update files and creates the GitHub release `v<version>`. Add `-- --dry-run` to build into `release/upload/` without publishing.

The release script needs the GitHub CLI logged in (`gh auth login`), and it refuses to publish if the version already has a release, the changelog section is missing, or your changes aren't committed and pushed.

**How it works:** every release carries `launcher-update.json` (the installer's URL, size and SHA-256), `patch-notes.json` (all of `CHANGELOG.md`), and `server-update.json` with `depths-server-<version>.tar.gz` for game servers. Launchers and servers read them from `https://github.com/<repo>/releases/latest/download/`, so the newest release is always the one players get. Installers are checked against their SHA-256 before they run.

**Patch notes:** `CHANGELOG.md` is the only place you write them. The launcher bundles a copy (`launcher/patch-notes.json`, generated by `bun run launcher` and `bun run dist`, not committed) so the notes work offline, and downloads the newest copy from the latest release.

**Testing updates locally:** the launcher never updates itself when run from source. To try the flow, serve a folder with a `launcher-update.json` whose `version` is higher than the current one, and start the launcher with `$env:DOD_UPDATES="1"; $env:DOD_UPDATE_URL="http://127.0.0.1:5555/"; bun run launcher`.

## Troubleshooting

- **`bun run launcher` says Electron failed to install.** Bun skips install scripts for packages it doesn't trust. `electron` is listed in `trustedDependencies`, but if the binary is still missing run `node node_modules/electron/install.js`.
- **Play says "Export the game first".** Running from source, the launcher starts `godot/build/DepthsOfDarkness.exe`. Run `bun run godot:export`.
- **The export fails.** Install Godot's export templates (Editor → Manage Export Templates) for the same Godot version, and point `GODOT` at that Godot.
- **Windows SmartScreen warns about the `.exe`.** The build isn't code-signed, so Windows doesn't recognize the publisher yet. Choose *More info → Run anyway*. Signing needs a code-signing certificate.

## Controls

| Input | Action |
| --- | --- |
| Left click | Move, attack, or talk to / use what you clicked (hold to keep going) |
| Shift + left click | Attack toward the cursor without moving |
| Right click or `1` | First skill · `2` second skill |
| `Q` | Grave-moss draught (heals) |
| `W A S D` / arrows | Move directly |
| `E` | Talk to or use the nearest NPC, gate or stairs |
| `I` or `C` | Hero and pack |
| Mouse wheel | Zoom |
| `Esc` | Close a panel, or pause |

The full list is in [godot/README.md](godot/README.md#controls).
