# Depths of Darkness

A dark fantasy top-down dungeon crawler. Pick a Warrior, Pyromancer or Shadow Rogue, descend through procedural depths, fight a boss every third floor, and build your hero with talents, gear and crafting.

The game ships two ways from the same source:

| Build | What it is | Saves |
| --- | --- | --- |
| **Desktop app** (`.exe`) | Windows game with a launcher: pick a server, log in or register, then play fullscreen. | Your account on the game server, or local when playing offline |
| **Website** | The game inside a web page with Google login, cloud saves and leaderboards. | Local + cloud when signed in |

The desktop app talks to the **game server** in [`game-server/`](game-server/README.md), which you host yourself (for now on a Raspberry Pi on your home network).

---

## Requirements

- **Node.js 20 or newer** (developed on Node 24): <https://nodejs.org>
- **Bun** (recommended, the repo uses `bun.lock`) or npm, which comes with Node
- **Windows** to build the `.exe`

## Quick start

```powershell
bun install
```

Then pick what you want to do:

| Goal | Command | Result |
| --- | --- | --- |
| Run a game server on this PC | `bun run server` | Accounts and cloud saves on <http://localhost:4100> |
| Play the desktop version from source | `bun run game` | Opens the launcher, then the game |
| Skip the launcher (offline) | `bun run game:offline` | Opens the game directly with local saves |
| Build the Windows `.exe` | `bun run dist` | Installer and portable `.exe` in `release/` |
| Run the website version | `bun run dev` | <http://localhost:3000> |

(`npm run <script>` works the same as `bun run <script>`.)

## The launcher and accounts

The desktop app opens a launcher first:

- **Server list** with a live online/offline dot and ping for each server. **+** adds a server by address (`192.168.1.50` or `my-pi.local:4100`; port 4100 is assumed). Hover a server and press ✕ to remove it.
- **Log in / Register** for the selected server. Accounts live on that server, so each server has its own accounts.
- **Play** downloads your hero from the server and starts the game. While you play, every save is uploaded in the background. The title screen and pause menu show the account and whether the last save reached the server.
- **Play offline** skips the server and uses saves stored on this PC only.

Each account (and offline play) has its own separate save storage on the PC, so switching accounts never overwrites another hero. If the same account plays on two PCs, the most recent upload wins. **Switch Account / Server** on the title screen returns to the launcher.

To host the server on your Raspberry Pi, follow [game-server/README.md](game-server/README.md).

## Building the `.exe`

```powershell
bun run dist
```

The first build downloads Electron's packaging tools, so it takes a few minutes. When it finishes, `release/` contains:

- `Depths of Darkness Setup <version>.exe`: installer with Start menu and desktop shortcuts
- `Depths of Darkness-<version>-portable.exe`: a single file that runs without installing
- `win-unpacked/`: the unpacked app, handy for quick testing

For a faster test build that only produces `release/win-unpacked/`, run `bun run dist:dir`.

## Version number

The version lives in **one place: `version` in `package.json`**. It shows in the bottom-right corner of the main menu, at the bottom of the pause menu, in the window title, and in the installer's file names.

To bump it when you start a new update:

```powershell
bun run bump:patch   # 0.1.0 -> 0.1.1  (bug fixes)
bun run bump:minor   # 0.1.0 -> 0.2.0  (new features)
bun run bump:major   # 0.1.0 -> 1.0.0  (big release)
```

Each command updates `package.json` and regenerates `game/js/00-version.js`. That file is generated, so don't edit it by hand. If you change `package.json` yourself, `game`, `dist`, `dev` and `build` all re-sync the version automatically, or you can run `bun run version:sync`.

## Project structure

```
game/                   The game itself: plain HTML, CSS and JavaScript (no build step)
  index.html            Page markup plus the list of CSS and JS files, in load order
  css/                  Styles, numbered in load order (01-base.css … 12-menus.css)
  js/                   Game code, numbered in load order
    00-version.js       Generated version number (see "Version number")
    00-session.js       Desktop: which account is playing; loads the downloaded hero first
    01-core.js          Engine: rendering, combat, enemies, loot, saving
    02-…17-*.js         Expansions and systems layered on top of the core
    18-menu-dialog.js   Shared dialog used by every menu
    19-menu-title.js    Main menu
    20-menu-in-game.js  Pause menu, Esc handling, hero creation, death screen
    21-settings.js      In-game Settings screen (desktop and standalone)
    22-cloud.js         Desktop: uploads saves, account/sync status, Back to Launcher
  licenses/fonts.txt    Licenses for the embedded fonts
launcher/               Launcher window: server list, login/register, Play (HTML, CSS, JS)
electron/               Desktop app wrapper
  main.cjs              Opens the launcher and game windows, serves files, per-account storage
  servers.cjs           Server list, saved logins (encrypted) and requests to game servers
  cloud-sync.cjs        Uploads the hero to the server while playing online
  preload.cjs           Bridge the game uses for fullscreen, Quit and cloud saves
  launcher-preload.cjs  Bridge the launcher uses
game-server/            Self-hosted game server (accounts, cloud saves, status); see its README
scripts/
  sync-version.mjs      Copies the version from package.json into the game
src/                    Website shell (React): login, cloud saves, leaderboard, options
server.ts               Website server (API + serves game/ at /game)
release/                Desktop builds (created by `bun run dist`, not committed)
```

### How the game code fits together

The files in `game/js/` are **classic scripts that share global variables** (for example `P` for the player, `fl` for the current depth, `save()`). They run in the exact order they are listed in `game/index.html`, and later files extend earlier ones. So:

- **To change existing behavior**, find the file that owns it. Searching for a menu's id (like `titleScreen` or `worldPanel`) or a function name across `game/js/` is the quickest way.
- **To add a new system**, create a new numbered file (e.g. `game/js/22-my-feature.js`), wrap it in `(()=>{ ... })();` so its own variables stay private, and add a `<script src="js/22-my-feature.js"></script>` line to `game/index.html` after the files it depends on. CSS works the same way with `game/css/`.
- Don't convert these files to ES modules (`import`/`export`): they rely on shared globals.

## Developing the desktop app

`bun run game` opens the launcher and starts the game windowed so it's easy to work alongside your editor. While running from source:

| Key | Action |
| --- | --- |
| `F5` or `Ctrl+R` | Reload the game after editing files in `game/` |
| `F12` or `Ctrl+Shift+I` | Open DevTools |
| `F11` or `Alt+Enter` | Toggle fullscreen (also works in the packaged game) |

The installed game starts fullscreen and remembers the player's choice. DevTools and reload shortcuts are disabled in packaged builds.

**Where desktop saves live:** `%APPDATA%\Depths of Darkness\`. Hero progress is in the app's local storage there (one storage area per account under `Partitions\`), the launcher's server list and logins are in `launcher.json`, and window settings are in `window.json`. Running from source uses a separate `%APPDATA%\Depths of Darkness (dev)\` folder, so playtesting never touches your installed game's hero.

## Running the website version

```powershell
bun run dev
```

Opens on <http://localhost:3000>. The game also loads on its own at <http://localhost:3000/game/index.html>. When opened directly on localhost it shows the developer-only **Admin Workshop** button; players never see it in the desktop app.

Cloud saves, login and the leaderboard need Firebase and (optionally) PostgreSQL. Copy `.env.example` to `.env` and fill in the values. Without a database the server falls back to an in-memory store, so data resets on restart.

Production build:

```powershell
bun run build
$env:NODE_ENV = "production"; bun run start
```

## Releasing an update

1. Bump the version: `bun run bump:patch` (or `minor` / `major`).
2. Make and test your changes with `bun run game`.
3. Build: `bun run dist`.
4. Test `release/Depths of Darkness-<version>-portable.exe`.
5. Commit, then share the installer or portable `.exe` from `release/`.

## Troubleshooting

- **`bun run game` says Electron failed to install.** Bun skips install scripts for packages it doesn't trust. `electron` is listed in `trustedDependencies`, but if the binary is still missing run `node node_modules/electron/install.js`.
- **Windows SmartScreen warns about the `.exe`.** The build isn't code-signed, so Windows doesn't recognize the publisher yet. Choose *More info → Run anyway*. Signing needs a code-signing certificate.
- **Edits don't show up in the desktop app.** Press `F5` in the game window. Changes to `electron/main.cjs` need a full restart of `bun run game`.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` / arrow keys | Move |
| Left mouse (hold) | Advance and attack |
| Right mouse (hold) | Aim while strafing |
| `1`–`4` | Abilities |
| `Q` | Health potion |
| `I` / `K` / `O` / `B` | Bag / Spell book / Atelier / Codex |
| `M` | Mute |
| `Esc` | Close panel, or open the pause menu |
