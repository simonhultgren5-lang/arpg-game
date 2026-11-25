# Developing Depths of Darkness

How to set up, build, test and release the project, and how to use the dev tools. For what the game and launcher do, see [README.md](README.md). Deeper reference lives next to the code: [godot/README.md](godot/README.md) for the game, [game-server/README.md](game-server/README.md) for the server, and [source-assets/README.md](source-assets/README.md) for art.

## Contents

1. [The project at a glance](#1-the-project-at-a-glance)
2. [First-time setup](#2-first-time-setup)
3. [Everyday development](#3-everyday-development)
4. [Dev tools](#4-dev-tools)
5. [Testing](#5-testing)
6. [Assets, Git LFS and locks](#6-assets-git-lfs-and-locks)
7. [The build pipeline](#7-the-build-pipeline)
8. [Releasing](#8-releasing)
9. [Running the game server](#9-running-the-game-server)
10. [Troubleshooting](#10-troubleshooting)
11. [Command reference](#11-command-reference)

---

## 1. The project at a glance

| Part | Folder | Made with | What it is |
| --- | --- | --- | --- |
| Game | `godot/` | Godot 4.7, GDScript | The 3D action RPG (Act I: The Tolling of Hollowmere) |
| Launcher | `launcher/` + `electron/` | Electron, plain HTML/CSS/JS | Accounts, characters, news, updates; starts the game |
| Game server | `game-server/` | Node.js (no npm packages), SQLite | Accounts, characters, saves, news, flags, crash reports, telemetry |
| Build scripts | `scripts/` | Node.js | Version sync, export, tests, release, dev setup |
| Pipeline | `.github/` | GitHub Actions | Compile, test, package, QA and deploy on every push |
| Art sources | `source-assets/` | Git LFS | Editable originals (Blender, Photoshop, audio masters, films) |

How the pieces talk:

```
Launcher (Electron) ──HTTP──► Game server (Pi or this PC)
   │  writes a boot file (character, server, token, feature flags)
   ▼
Game (Godot export) ──HTTP──► Game server   (loads and saves the hero)
```

The version lives in one place, `version` in `package.json`. `scripts/sync-version.mjs` copies it into the game (`godot/project.godot`) and the server (`game-server/server.mjs`); every build and `bun run` script runs it for you.

## 2. First-time setup

Install, once per PC:

| Tool | Why | Get it |
| --- | --- | --- |
| Git with **Git LFS** | Code, plus the art, audio and video in LFS | Git for Windows includes LFS |
| **Node.js 22.13+** (24 recommended) | Launcher, server (built-in SQLite) and scripts | <https://nodejs.org> |
| **Bun** | Installs packages and runs the scripts (`bun.lock`) | <https://bun.sh> (`npm` works too) |
| **Godot 4.7.2** (standard, not .NET) | The game | <https://godotengine.org> |
| Godot **export templates** 4.7.2 | Exporting the game `.exe` | In Godot: Editor → Manage Export Templates → Download and Install |
| GitHub CLI `gh` (for releases) | Publishing by hand | <https://cli.github.com>, then `gh auth login` |

Then:

```powershell
git lfs install                       # once per PC, before cloning
git clone https://github.com/simonhultgren5-lang/arpg-game.git
cd arpg-game
bun install
bun run godot:export                  # builds godot/build/DepthsOfDarkness.exe for the launcher's Play
bun run test                          # everything should pass
```

**How scripts find Godot:** the `GODOT` environment variable (path to the `_console.exe`), then `godot` on your PATH, then a Godot download in your Downloads folder. To set it for good:

```powershell
[Environment]::SetEnvironmentVariable("GODOT", "C:\Tools\Godot_v4.7.2-stable_win64_console.exe", "User")
```

## 3. Everyday development

### The quickest start

```powershell
bun run dev
```

This starts a local game server on <http://localhost:4100> (data in `.dev/server-data`), creates the test account **dev / devpass1** with three heroes (Aldric, Morwen, Edda), and opens the launcher from source with the dev tools on. In the launcher pick **This PC** and log in. Closing the launcher stops the server.

`bun run dev -- --no-launcher` starts only the server and test account, handy while you work in the Godot editor. `bun run dev:reset` deletes all dev data (it lists what it will delete and asks first).

### Working on the game (`godot/`)

1. Open `godot/project.godot` in Godot 4.7 and press **F5**. Started from the editor, the title screen offers a test hero of each class, saves offline, and the **F1 dev console** is on.
2. Code is in `godot/scripts/` (`autoload/` for Boot, Game, SaveSystem, Dev; `actors/`, `world/`, `ui/`, `models/`, `data/`). Assets are in `godot/assets/` and loaded by `res://assets/...` paths.
3. To try a change from the launcher, export again: `bun run godot:export`, then **Play**.
4. Before you push: `bun run test`.

Rules of thumb:
- Commit the `.import` and `.uid` files Godot creates next to new files.
- Move files inside the Godot editor (it updates references), or update the `res://` paths in `scripts/` yourself.
- New feature flags: read them with `Boot.flag("name", default)`, which returns the default when the server hasn't set the flag or set a different type.

### Working on the launcher (`launcher/`, `electron/`)

```powershell
bun run launcher        # or bun run dev, which also starts a server
```

- **F5** or **Ctrl+R** reloads the launcher after editing `launcher/` (HTML, CSS, JS). **F12** opens DevTools. Changes in `electron/` need a restart.
- From source the launcher uses its own profile, `%APPDATA%\Depths of Darkness (dev)\`, so it never touches the installed game's logins and settings. Updates are off from source (see [Testing updates](#testing-updates)).
- The launcher talks to Electron only through `window.launcher` (`electron/launcher-preload.cjs`). New features usually need: an `ipcMain.handle` in `electron/main.cjs`, a line in the preload, then the UI in `launcher/launcher.js`.
- Main Electron modules: `servers.cjs` (servers, logins), `characters.cjs` (offline characters, game saves), `updates.cjs` (channels, downloads), `studio.cjs` (settings, consent, crash reports, telemetry, flags), `dev-tools.cjs` (the Dev tools page).

### Working on the game server (`game-server/`)

```powershell
bun run server          # http://localhost:4100, data in game-server/data
```

- One file, `server.mjs`, with no npm packages (Node's built-in SQLite and crypto). Routes are in the `routes` object; tables are created at start-up, so new tables need `CREATE TABLE IF NOT EXISTS`.
- `/api/status` lists `features`. When the launcher needs a new server feature, add a feature name there and check for it in the launcher, so old servers fail politely.
- Add tests in `game-server/tests/server.test.mjs` for every new route.
- `admin.mjs` manages the database directly; see [section 9](#9-running-the-game-server).

### Branches and pull requests

1. Branch from `main` (`feature/…`, `fix/…`, `release/…`).
2. Commit, push, open a pull request. The pipeline runs on it (see [section 7](#7-the-build-pipeline)).
3. **Wait until your last push is on the PR and its checks are green before merging.** A merge only takes the commits that were there at that moment.
4. Merge. If the version in `package.json` is new, merging releases it (see [section 8](#8-releasing)).

## 4. Dev tools

### Dev tools page in the launcher

Shown when running from source, or for an installed launcher started with `--dev` (or `DOD_DEV=1`). Players never see it.

| Panel | What you can do |
| --- | --- |
| Game launch | Turn on the in-game console, start windowed at 1280 × 720, verbose engine log, start in the town, the crypt or next to the boss. Applies to every **Play**; saved in `dev-tools.json`. |
| Folders | Open the game's saves and logs, the launcher's data folder, the game build. See the last boot file sent to the game (token hidden). |
| Update source | Point update checks at another address for this session (e.g. a local folder server). Also turns updates on from source. |
| Reset | Forget remembered choices, delete downloaded updates, reload, show versions. |

### In-game dev console

**F1** or **`** opens it in editor builds, in exports started with `--dev`, and for everyone on a server with the flag `game.dev_console` set to `true`. The game pauses while it's open; **↑**/**↓** step through earlier commands.

| Command | Does |
| --- | --- |
| `help` | List all commands |
| `god [on\|off]` | Monsters can't hurt you |
| `heal` | Full health and mana |
| `level <1-20>`, `xp <n>` | Set level, add experience |
| `gold <n>`, `potions <n>` | Add gold, set draughts |
| `give <weapon\|armor\|charm> [rarity 0-3]` | Put an item in the pack |
| `loot [n]` | Drop items at your feet |
| `spawn <hollow\|archer\|crawler\|boss> [n] [elite]` | Spawn monsters |
| `kill` | Kill every monster in the area |
| `tp <town\|crypt\|boss>` | Go somewhere (`boss`: next to Hask) |
| `quest <0-3>` | Set the Act I quest step |
| `speed <0.1-5>`, `fps` | Game speed, FPS counter |
| `stats`, `save`, `clear` | Hero stats, save now, clear the log |

Start straight in the crypt or at the boss with `--dev --dev-start crypt|boss` (the launcher's **Start in** option passes it).

### Useful environment variables

| Variable | Used by | Effect |
| --- | --- | --- |
| `GODOT` | scripts | Path to the Godot `_console.exe` |
| `DOD_DEV=1` | launcher | Same as `--dev`: Dev tools page on |
| `DOD_UPDATES=1` | launcher | Turn update checks on when running from source |
| `DOD_UPDATE_URL` | launcher | Read updates from another address instead of GitHub |
| `DOD_UPDATE_POLL_MS` | launcher | How often an open launcher checks (default 5 minutes) |
| `DOD_USER_DATA` | launcher | Use another profile folder (QA uses a throwaway one) |
| `DOD_GAME_ARGS` | launcher (dev tools on) | Extra Godot options for the game, e.g. `--headless` |
| `PORT`, `HOST`, `DATA_DIR`, `SERVER_NAME`, `MOTD`, `UPDATE_URL` | game server | See `game-server/README.md`; `UPDATE_URL=off` stops its update check |

## 5. Testing

| Command | Runs | Time |
| --- | --- | --- |
| `bun run test` | Syntax of every script, 17+ server and admin tests, Godot smoke test (Act I with every class), dev console test | ~3–5 min |
| `bun run test:quick` | The same without Godot | ~5 s |
| `bun run ci:compile` | JavaScript syntax, JSON, and every GDScript file compiles | ~1 min |
| `bun run dist:dir` then `bun run ci:qa` | Automated QA on the packaged app (see [section 7](#7-the-build-pipeline)) | ~5 min |

Single tests (`godot` here means your Godot `_console.exe`, or `& $env:GODOT`):

```powershell
node --test game-server/tests/server.test.mjs                       # server and admin CLI
godot --headless --path godot res://tests/smoke_test.tscn            # plays Act I, every class
godot --headless --path godot res://tests/dev_console_test.tscn      # console commands and flags
godot --headless --path godot res://tests/parse_check.tscn           # every .gd compiles
godot --path godot res://tests/screenshots.tscn -- --out C:\temp\shots --class rogue
```

A Godot script error leaves headless Godot running instead of exiting; the test scripts give it a time limit. If you run a scene by hand and it hangs, look for `SCRIPT ERROR` in its output.

When you add a feature, add to the test that covers it: a server route → `game-server/tests/server.test.mjs`; a console command → `godot/tests/dev_console_test.gd`; gameplay → `godot/tests/smoke_test.gd`; something a player sees in the launcher → `scripts/ci/qa.mjs`.

### Testing updates

The launcher never updates itself when run from source. To try the update flow, serve a folder with a `launcher-update.json` whose `version` is higher than yours, then either enter its address under **Dev tools → Update source**, or:

```powershell
$env:DOD_UPDATES="1"; $env:DOD_UPDATE_URL="http://127.0.0.1:5555/"; bun run launcher
```

For channels, put pre-release manifests in `beta/launcher-update.json` and `dev/launcher-update.json` under the same address.

## 6. Assets, Git LFS and locks

```
godot/assets/            game-ready (what the game loads)
├── textures/            UI art, portraits, branding
├── models/              imported 3D models (.glb preferred)
├── animations/
├── audio/               spells/, voice/
└── cinematics/
source-assets/           editable originals, never loaded by the game
├── Textures/ ├── Models/ ├── Animations/ ├── Audio/ └── Cinematics/
```

- Images, audio, video, models and fonts are stored in **Git LFS** (the list is in `.gitattributes`). With `git lfs install` done, they download like normal files.
- **Locks, like a Perforce checkout:** `.blend`, `.psd`, `.ma`, `.max`, `.prproj` and everything in `source-assets/` arrive read-only.

  ```powershell
  git lfs lock "source-assets/Models/hollow.blend"     # take it (becomes writable)
  # edit, commit, push
  git lfs unlock "source-assets/Models/hollow.blend"   # give it back
  git lfs locks                                         # who has what
  ```

- Export from `source-assets/<Group>/` into `godot/assets/<group>/`, lowercase file names with underscores.
- The launcher's own art (emblem, icons, the Act I film) is in `launcher/assets/`. After changing the emblem run `bun run icons`.

## 7. The build pipeline

`.github/workflows/pipeline.yml` runs on GitHub Actions (Windows) for every push to `main` and every pull request:

```
Developer commit → Build server (GitHub Actions)
                     ├─ Compile   JavaScript syntax, JSON, every GDScript file
                     ├─ Test      server + admin tests, Godot smoke and console tests
                     └─ Package   game export, installer, portable .exe, server package
                   → Automated QA  drives the packaged app like a player
                   → Deployment    main only, when the version isn't released yet
```

| Stage | Command it runs | Notes |
| --- | --- | --- |
| Compile | `node scripts/ci/compile.mjs` | Runs first |
| Test | `node scripts/test.mjs` | After Compile, alongside Package |
| Package | `node scripts/release.mjs --dry-run` | Uploads `release/upload/` and `release/win-unpacked/` as artifacts |
| Automated QA | `node scripts/ci/qa.mjs` | Packaged app in a throwaway profile against a throwaway server; the game runs headless (no GPU on CI). Results table in the run summary, screenshot in the `qa-results` artifact |
| New version? | `gh release view v<version>` | Main only |
| Deployment | `node scripts/release.mjs --publish-only` | Publishes exactly the files Package built and QA tested. Uses the `release` environment |

- **Start a run by hand:** GitHub → Actions → Pipeline → Run workflow, or `gh workflow run pipeline.yml --ref <branch>`. Watch it with `gh run watch`.
- **Godot and LFS on CI** are set up by `.github/actions/setup-godot` (official download, SHA-512 checked, cached) and `.github/actions/lfs-pull` (cached, to save LFS bandwidth).
- **Approval before releases:** GitHub → Settings → Environments → **release** → add required reviewers. Deployment then waits for a click.
- **Changing the pipeline:** every stage is a script you can run locally first. Keep the workflow thin and put logic in `scripts/`.

## 8. Releasing

Players' launchers check the latest release every few minutes and offer **Restart to update**. The game ships inside the installer, so each release updates launcher and game together.

### Normal release (Stable)

1. On a branch: `bun run bump:patch` (or `bump:minor` / `bump:major`).
2. Add a section to `CHANGELOG.md`: `## 0.4.2 (2026-12-01)` with `### New` / `### Changes` / `### Fixes` and one `- ` line per change, written for players. A big update can have a name: `## 0.5.0 — Act II: The Catacombs (2026-12-20)`; it becomes the patch title in the launcher and the GitHub release title.
3. `bun run test`, commit, push, open a PR, wait for green, merge.
4. The pipeline publishes `v<version>`. Done.

### Beta and Dev channels

```powershell
bun run bump:beta        # 0.4.1 → 0.4.2-beta.0, then 0.4.2-beta.1 …
```

Add a `## 0.4.2-beta.0` section to the changelog, merge, and the pipeline publishes a GitHub **pre-release** that only launchers on the Beta channel (or Dev) install. `bump:dev` does the same for the Dev channel. When it's ready, `bun run bump:patch` turns it into `0.4.2` for everyone.

### By hand (emergencies)

```powershell
bun run release                         # build everything and publish (needs gh auth login)
bun run release -- --dry-run            # build into release/upload/ only
bun run release -- --publish-only       # publish what a dry run built
```

The script refuses to publish without a changelog section, with uncommitted or unpushed changes, or when the version already has a release. The channel comes from the version (`-beta.N` → beta).

### After a release

- Update the Pi's server (next section) when the release changed `game-server/`.
- Post news: `docker exec -it depths-server node admin.mjs news-post "Title" "Text"`.

## 9. Running the game server

| Where | How |
| --- | --- |
| This PC, for development | `bun run server` or `bun run dev` |
| Raspberry Pi (Docker), update | `cd ~/arpg-game && git pull && cd game-server && docker compose up -d --build` |
| Raspberry Pi, automatic nightly updates | `bash game-server/update.sh --auto` |

Admin commands (in Docker prefix with `docker exec -it depths-server node admin.mjs`; from the repo `bun run admin`):

| Command | Does |
| --- | --- |
| `accounts`, `characters [user]`, `stats` | Look around |
| `reset-password <user> [password]`, `sign-out <user>` | Help a locked-out player |
| `rename-character`, `delete-character … --yes`, `delete-account … --yes` | Clean up |
| `news`, `news-post "Title" "Text" [--channel beta]`, `news-delete <id> --yes` | News in the launcher |
| `flags`, `flag-set <key> <value> [--channel beta] [--note …]`, `flag-unset <key>` | Feature flags |
| `crashes [n]`, `crash <id>`, `telemetry [days]` | Crash reports and usage (from players who said yes) |
| `backup [file]`, `restore <file> --yes` | Database backup and restore (stop the server before restoring) |

Feature flags in use: `launcher.banner` (text above the hero), `game.xp_multiplier` (e.g. `2`), `game.dev_console` (`true` opens the F1 console).

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| Art or sounds are tiny text files | Git LFS wasn't set up before cloning: `git lfs install`, then `git lfs pull` |
| A file is read-only | It's lockable: `git lfs lock <file>` |
| "Godot not found" | Set `GODOT` (see [setup](#2-first-time-setup)) |
| "Export failed" | Install the 4.7.2 export templates in Godot |
| Play says "Export the game first" | `bun run godot:export` |
| Every `.import` file shows as changed | `godot/**` is checked out with LF via `.gitattributes`; run `git add --renormalize godot` once |
| Headless Godot test never ends | A script error; run it by hand and look for `SCRIPT ERROR` |
| Launcher says the server needs an update | The server is older than the launcher; update it (section 9) |
| Merged PR is missing a commit | It was pushed after the merge; open a new PR with it |
| Dev data is in a strange state | `bun run dev:reset` |

## 11. Command reference

| Command | Does |
| --- | --- |
| `bun run dev` | Local server + test account + launcher with dev tools (`-- --no-launcher` for server only) |
| `bun run dev:reset` | Delete dev data (asks first) |
| `bun run launcher` | Launcher from source |
| `bun run server` | Game server on port 4100 |
| `bun run godot:export` | Export the game to `godot/build/DepthsOfDarkness.exe` |
| `bun run test` / `test:quick` | All checks / without Godot |
| `bun run ci:compile` | Pipeline Compile stage |
| `bun run ci:qa` | Pipeline QA stage (after `bun run dist:dir`) |
| `bun run dist` / `dist:dir` | Installer and portable `.exe` / unpacked app only |
| `bun run release` | Publish by hand (`-- --dry-run`, `-- --publish-only`, `-- --channel beta`) |
| `bun run bump:patch` / `minor` / `major` / `beta` / `dev` | Bump the version everywhere |
| `bun run patch-notes` | Rebuild `launcher/patch-notes.json` from `CHANGELOG.md` |
| `bun run admin <command>` | Server admin CLI against `game-server/data` |
| `bun run server:pack` | Server package for the Pi in `release/` |
| `bun run icons` | Rebuild the app icons from the emblem |
