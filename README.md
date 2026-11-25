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
| Everything for local development | `bun run dev` | A local game server with a test account and three heroes, then the launcher with the dev tools on |
| Run every check | `bun run test` | Syntax, game server and admin CLI tests, and the Godot smoke and dev console tests (`bun run test:quick` skips Godot) |
| Start the dev setup from scratch | `bun run dev:reset` | Deletes the dev server's data, the dev launcher's data and the saves of dev and test heroes |
| Work on the game | Open `godot/project.godot` in Godot and press F5 | The title screen offers a test hero of each class |
| Export the game | `bun run godot:export` | `godot/build/DepthsOfDarkness.exe` |
| Run the launcher from source | `bun run launcher` | The launcher; **Play** starts the exported game |
| Run a game server on this PC | `bun run server` | Accounts and saves on <http://localhost:4100> |
| Package the server for the Raspberry Pi | `bun run server:pack` | `release/depths-server-<version>.tar.gz` (see [game-server/README.md](game-server/README.md)) |
| Build the Windows `.exe` | `bun run dist` | Installer and portable `.exe` in `release/` |

(`npm run <script>` works the same as `bun run <script>`.)

`bun run godot:export` finds Godot through the `GODOT` environment variable (path to the Godot `.exe`, the `_console` one is best), `godot` on your PATH, or a Godot download in your Downloads folder.

## The launcher and accounts

The launcher has four pages in its top bar: **Play**, **News**, **Settings** and, in dev builds, **Dev tools**.

- **Play:** the selected hero stands in the chapel niche in the middle. Your characters line up along the bottom, and **Play** is on the right. Before you can play, the niche shows what's needed: choose a server, sign in (log in or create an account), or create your first character.
  - **Characters:** each account has up to **5 characters**. **New character** creates one (class, name, armor color). Click a character to select it, or double-click to play straight away. Hover a character and press ✕ to delete it, then type its name to confirm.
  - **Online / Offline** (top right) switches between your characters on the selected server and characters stored on this PC only (also up to 5).
  - **Play** hides the launcher and starts the game with that character. The game loads and saves the hero's progress on the server (see [godot/README.md](godot/README.md), "Launcher contract"). When the game closes, the launcher comes back with the character list refreshed.
  - The left side shows the newest patch (its name, with a **New** badge until you've read it), update progress and the server's message. The right side shows the server you play on and the **Act I film**, which also loops behind the launcher.
- **News:** posts from the server you play on (the server owner writes them with `admin.mjs news-post`), and every version's patch notes. The newest server post also shows on the Play page, and **News** gets a dot while something is unread.
- **Settings:**
  - **Servers:** the list, with a live online/offline dot, ping and server version for each. **+** adds a server by address (`192.168.1.50` or `my-pi.local:4100`; port 4100 is assumed). Hover a server and press ✕ to remove it. When a newer server is released, it shows **Server update available**.
  - **Account:** log out, and change your password (this signs out your other devices).
  - **Updates:** the version, the **release channel** (see below), and whether updates download by themselves. With automatic downloads off, the Play page offers **Download (size)**. Downloads show their size and speed.
  - **Privacy:** crash reports and usage statistics, each off until the player turns it on. The launcher asks once on first launch.
- **Dev tools** (see [Developing](#developing)).

The app icon and logo come from `launcher/assets/emblem.svg` (the game has its own copy in `godot/art/`). After changing it, run `bun run icons` to regenerate `launcher/assets/icon.ico` and `icon.png`.

### Release channels

Players pick a channel in **Settings → Updates**:

| Channel | Gets | Published with |
| --- | --- | --- |
| Stable | Normal releases | `bun run release` |
| Beta | Stable releases and `-beta.N` pre-releases | `bun run bump:beta`, then `bun run release -- --channel beta` |
| Dev | Stable, beta and `-dev.N` pre-releases | `bun run bump:dev`, then `bun run release -- --channel dev` |

Pre-releases are GitHub pre-releases, so `releases/latest` (what Stable reads) never points at them. A launcher always moves to the highest version its channel allows; switching back from Beta to Stable waits until a stable release passes the installed version. A pre-release needs its own changelog section, like `## 0.4.1-beta.1`. Stable launchers hide beta and dev patch notes.

### Crash reports, usage statistics and feature flags

All three go through the game server the player has selected; nothing goes to a third party.

- **Crash reports** (only with the player's consent): errors in the launcher, and the game closing with an error code. A game crash includes the end of the game's log. Paths have the Windows user folder replaced with `~`, and login tokens are hidden. Read them on the server with `admin.mjs crashes` and `admin.mjs crash <id>`.
- **Usage statistics** (only with consent): launcher opened, game started (class, online or offline), and game closed (minutes played, exit code), with the version, channel and a random install id. No account, name or chat. `admin.mjs telemetry` summarizes them, and the server deletes them after 90 days.
- Reports made while no server is reachable wait in `report-queue.json` in the launcher's data folder (at most 100) and are sent later. Turning consent off drops the queue.
- **Feature flags** need no consent: the launcher fetches them from the server (`admin.mjs flag-set`) and passes them to the game in its boot file. Flags can differ per channel. Built in: `launcher.banner` (text shown above the hero), `game.xp_multiplier` (for example `2` for a double-XP weekend) and `game.dev_console` (`true` opens the F1 console to everyone on that server, for testers). The game reads any flag with `Boot.flag("name", default)`.

**Where things are stored on the PC:**

- The launcher's server list and logins (`launcher.json`), offline characters (`offline-characters.json`), settings (`settings.json`: channel, downloads, privacy choices, install id) and queued reports (`report-queue.json`) are in `%APPDATA%\Depths of Darkness\`. Running the launcher from source uses `%APPDATA%\Depths of Darkness (dev)\` instead.
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
- **The launcher:** `bun run launcher` (or `bun run dev`, which also starts a local server). `F5` or `Ctrl+R` reloads it after editing `launcher/`, and `F12` opens DevTools. Changes to `electron/` need a restart. **Play** needs an exported game (`bun run godot:export`).
- **`bun run dev`** starts a game server on <http://localhost:4100> with its data in `.dev/server-data`, creates the test account **dev / devpass1** with three heroes (Aldric, Morwen and Edda), and opens the launcher with the dev tools on. In the launcher, pick **This PC** and log in. Closing the launcher stops the server. `bun run dev:reset` deletes the dev data again (it asks first; installed-game data is never touched).
- **`bun run test`** runs every automated check: syntax, the game server and admin CLI tests (`game-server/tests/`), and the Godot smoke test and dev console test, headless. Run it before every release.

### Dev tools in the launcher

Builds run from source show a **Dev tools** page. An installed launcher shows it when started with `--dev` (or with `DOD_DEV=1`). Players never see it.

- **Game launch:** turn the in-game dev console on, start the game windowed at 1280 × 720, turn on Godot's verbose log, and choose where to start (town, the crypt, or next to the boss). The choices apply every time you press **Play**, and are saved in `dev-tools.json` in the launcher's data folder.
- **Folders:** open the game's saves and logs, the launcher's data folder and the game build. Also shows the last boot file sent to the game, with the login token hidden.
- **Update source:** check for updates against another address (like a local folder server) until the launcher closes. This also turns update checks on when running from source.
- **Reset:** forget the launcher's remembered choices, delete downloaded launcher updates, reload the launcher, and see the launcher, Electron and Node versions.

### In-game dev console

**F1** or **`** opens the console in builds run from the Godot editor, and in exported builds started with `--dev` (which the launcher's dev tools pass). The game pauses while it's open. Type `help` for every command; the main ones are `god`, `heal`, `level 10`, `gold 500`, `give armor 3`, `loot 5`, `spawn hollow 5 elite`, `kill`, `tp town|crypt|boss`, `quest 0-3`, `speed 2`, `fps` and `stats`. See [godot/README.md](godot/README.md).

## Releasing an update

Players don't download anything by hand. When the launcher starts (and every few minutes while it's open), it checks your latest GitHub release, downloads the new installer in the background and offers **Restart to update**. The game ships inside the installer, so every release updates both.

Releases go through the build pipeline (below): bump the version in a pull request, merge it, and the pipeline builds, tests, checks and publishes it. Releasing by hand still works for emergencies:

1. Bump the version: `bun run bump:patch` (or `minor` / `major`, or `bump:beta` / `bump:dev` for a pre-release).
2. Make and test your changes.
3. Add a `## <version> (<date>)` section to [CHANGELOG.md](CHANGELOG.md), with optional `### New` / `### Changes` / `### Fixes` subheadings and one `- ` line per change. This is what players read on the launcher's Play page and **News** page. A big update can have a name: `## 0.4.0 — Act I: The Tolling of Hollowmere (<date>)`. The launcher shows it as the patch's title, and the GitHub release is called "Depths of Darkness v0.4.0 — Act I: The Tolling of Hollowmere".
4. Run `bun run test`.
5. Commit and push.
6. Run `bun run release`. It exports the game, builds the installer, packs the game server, writes the update files and creates the GitHub release `v<version>`. Add `-- --dry-run` to build into `release/upload/` without publishing.

`bun run release -- --publish-only` publishes what an earlier `--dry-run` built, without rebuilding (the pipeline uses this). The channel comes from the version: `0.4.1-beta.1` is published as a beta pre-release.

The release script needs the GitHub CLI logged in (`gh auth login`), and it refuses to publish if the version already has a release, the changelog section is missing, or your changes aren't committed and pushed.

### Build pipeline

`.github/workflows/pipeline.yml` runs on GitHub Actions (Windows) for every push and pull request:

```
Developer commit → Build server (GitHub Actions)
                     ├─ Compile   JavaScript syntax, JSON, every GDScript file (bun run ci:compile)
                     ├─ Test      server and admin CLI tests, Godot smoke and dev console tests (bun run test)
                     └─ Package   game export, installer, portable .exe, server package (release --dry-run)
                   → Automated QA  plays the packaged app (bun run ci:qa)
                   → Deployment    main only, when the version isn't released yet
```

- **Compile** runs first; **Test** and **Package** then run side by side.
- **Automated QA** starts the packaged app in a throwaway profile against a throwaway game server and drives it through the DevTools protocol. It walks through first-launch consent, patch notes, server news and the flag banner, registering, creating a character, and Play. The game runs headless, because CI machines have no GPU. QA also kills the game to check that the crash reaches the server, checks usage events, and plays offline. The results table appears in the run's summary, and a screenshot of the launcher is saved with the `qa-results` artifact. Run it locally with `bun run dist:dir` and then `bun run ci:qa`.
- **Deployment** publishes exactly the files Package built and QA tested (`release.mjs --publish-only`). It runs on `main` when `package.json` has a version without a release yet, so **merging a version bump publishes it**. Pushes to `main` that don't bump the version skip it. To approve each release by hand first, add a required reviewer to the `release` environment: GitHub → Settings → Environments → release.
- Godot 4.7.2 and its export templates are downloaded from the official release (checked against its SHA-512 sums) and cached between runs.

**How it works:** every release carries `launcher-update.json` (the installer's URL, size and SHA-256), `patch-notes.json` (all of `CHANGELOG.md`), and `server-update.json` with `depths-server-<version>.tar.gz` for game servers. Launchers and servers read them from `https://github.com/<repo>/releases/latest/download/`, so the newest release is always the one players get. Installers are checked against their SHA-256 before they run.

**Patch notes:** `CHANGELOG.md` is the only place you write them. The launcher bundles a copy (`launcher/patch-notes.json`, generated by `bun run launcher` and `bun run dist`, not committed) so the notes work offline, and downloads the newest copy from the latest release.

**Testing updates locally:** the launcher never updates itself when run from source. To try the flow, serve a folder with a `launcher-update.json` whose `version` is higher than the current one, and either enter its address under **Dev tools → Update source**, or start the launcher with `$env:DOD_UPDATES="1"; $env:DOD_UPDATE_URL="http://127.0.0.1:5555/"; bun run launcher`.

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
