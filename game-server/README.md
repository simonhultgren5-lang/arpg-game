# Depths of Darkness — Game Server

Handles accounts (register / log in), cloud saves and the online status the launcher shows.

- **PostgreSQL:** accounts, characters, saves, news, flags, crash reports and usage events are tables in a PostgreSQL database (see [The database](#the-database)). With Docker, the database runs in its own container next to the server.
- **One npm package:** `pg`, the PostgreSQL driver (`npm ci` in `game-server/`). Everything else is built into Node.js.
- **Home network:** it's meant for a Raspberry Pi on your LAN while the game is in development. It speaks plain `http`, so don't expose it to the internet as-is (see [Playing over the internet](#playing-over-the-internet)).

## Run it on your PC (for testing)

The server needs a PostgreSQL database. The easiest is the one from `docker-compose.yml` (needs Docker Desktop running). From the project root:

```powershell
bun run server:install    # npm ci in game-server/ (the pg package), once
bun run server:db         # starts only the database container, on 127.0.0.1:5432
bun run server
```

`bun run server` connects to `postgres://depths:depths@127.0.0.1:5432/depths`, the database `server:db` starts. To use another PostgreSQL, set `DATABASE_URL` (environment or `game-server/config.json`).

The launcher (`bun run game`) lists **This PC** (`localhost:4100`) when running from source. Select it, register an account and press Play.

## Run it on the Raspberry Pi with Docker

The Pi needs Docker with the Compose plugin (`docker compose version` should work).

### 1. Build the server package (on your PC)

From the project root:

```powershell
bun run server:pack
```

This creates `release/depths-server-<version>.tar.gz` (about 30 KB) with the server, its schema migrations, `Dockerfile` and `docker-compose.yml` (the server and its PostgreSQL database).

### 2. Copy it to the Pi

Replace `USERNAME` with your Pi login. Use the Pi's IP instead of `raspberrypi.local` if that name doesn't work:

```powershell
scp release/depths-server-0.1.0.tar.gz USERNAME@raspberrypi.local:~
```

### 3. Start the server (on the Pi)

```bash
tar xzf depths-server-0.1.0.tar.gz
cd depths-server
docker compose up -d --build
```

The first start downloads the Node.js and PostgreSQL images and installs the `pg` package, so give it a few minutes. To choose the database password, create a file `.env` next to `docker-compose.yml` with `POSTGRES_PASSWORD=something-long` **before** this first start (the database only listens inside Docker and on the Pi itself, so the default is fine on a home network). Then check it:

```bash
docker compose ps          # both containers should say "healthy" after ~30 seconds
docker compose logs -f     # live log: registrations and errors (Ctrl+C to stop watching)
hostname -I                # the Pi's IP address, for the launcher
```

The container restarts by itself if it crashes and starts again when the Pi reboots, as long as Docker is set to start on boot (it is by default).

### 4. Name the server (optional)

Edit `docker-compose.yml` and change `SERVER_NAME` and `MOTD` (the message shown in the launcher), then apply it:

```bash
docker compose up -d
```

| Setting | What it does | Default |
| --- | --- | --- |
| `SERVER_NAME` | Name shown in the launcher | `Raspberry Pi` |
| `MOTD` | Message shown on the launcher's main screen | a short welcome |
| `ports` | `"4100:4100"`. Change the first number to use another port on the Pi | `4100` |

### Update to a new version

Every release on GitHub includes the server. The server checks for new releases every 6 hours: the launcher then shows **Server update x.y.z available** under the server, and the server log prints a line about it. The server never updates itself. You install the update on the Pi with `update.sh`:

```bash
cd ~/depths-server            # or game-server/ inside your git clone
bash update.sh                # installs the newest release if there is one
```

It works whether you installed from the package or from a git clone:

- **Package folder:** it downloads `depths-server-<version>.tar.gz`, checks its SHA-256 and copies the new files over the folder.
- **Git clone:** it fast-forwards the clone to the release tag (`v<version>`).

Either way it rebuilds and restarts the containers (or runs `npm ci` and restarts the systemd service from `install.sh`), then waits until the new version answers. Accounts and saves stay in the database's Docker volume. Your `docker-compose.yml` (`SERVER_NAME`, `MOTD`, ports) is kept: if a release changes that file, the new one is saved next to yours as `docker-compose.yml.new`.

| Command | What it does |
| --- | --- |
| `bash update.sh --check` | Only says whether an update is available |
| `bash update.sh --auto` | Turns on nightly updates (a systemd timer, around 04:30) |
| `bash update.sh --no-auto` | Turns them off again |
| `bash update.sh --force` | Reinstalls the newest release |

Nightly updates run as your user, so that user must be allowed to use Docker (`sudo usermod -aG docker $USER`, then log in again). See what they did with `journalctl -u depths-server-update`.

**Updating from a server before 1.0.0 (the SQLite versions):** on its first start the server moves everything from its old database file into PostgreSQL by itself, and keeps the file as `depths.db.imported-<date>` in the data volume. The new `docker-compose.yml` adds the database container, but `update.sh` from those older releases keeps your old `docker-compose.yml`, so the server finds no database and doesn't come back. Then run the new `update.sh` once:

```bash
bash update.sh --force     # switches to the new docker-compose.yml, keeps your SERVER_NAME and MOTD
```

Your old file is kept as `docker-compose.yml.before-postgres`. Without Docker, `update.sh` runs `install.sh`, which installs PostgreSQL.

**First time on a Pi that runs from a git clone:** older checkouts don't have `update.sh` yet. Pull once by hand, then use it from then on:

```bash
cd ~/arpg-game && git pull
bash game-server/update.sh --auto
```

### Manage accounts (admin commands)

`admin.mjs` manages accounts and characters directly in the server's database. It works while the server runs, and changes apply right away. With Docker, run it inside the container:

```bash
docker exec -it depths-server node admin.mjs                      # list of commands
docker exec -it depths-server node admin.mjs accounts             # accounts, characters, last login
docker exec -it depths-server node admin.mjs characters edda      # one account's characters (or everyone's)
docker exec -it depths-server node admin.mjs reset-password edda  # new random password, signs out everywhere
docker exec -it depths-server node admin.mjs reset-password edda hunter22
docker exec -it depths-server node admin.mjs rename-character edda "Old Name" "New Name"
docker exec -it depths-server node admin.mjs delete-character edda "Old Name" --yes
docker exec -it depths-server node admin.mjs delete-account edda --yes
docker exec -it depths-server node admin.mjs sign-out edda        # end all logins of an account
docker exec -it depths-server node admin.mjs stats                # counts and database size
docker exec -it depths-server node admin.mjs backup               # copy to /data/backups/depths-<date>.dump

# News in the launcher
docker exec -it depths-server node admin.mjs news-post "Double XP weekend" "Friday to Sunday, every kill counts twice."
docker exec -it depths-server node admin.mjs news-post "Beta testers" "Try the new crypt." --channel beta
docker exec -it depths-server node admin.mjs news                 # list (with ids)
docker exec -it depths-server node admin.mjs news-delete 3 --yes

# Feature flags (applied the next time a player presses Play)
docker exec -it depths-server node admin.mjs flag-set game.xp_multiplier 2 --note "Double XP weekend"
docker exec -it depths-server node admin.mjs flag-set launcher.banner "Double XP weekend: every kill counts twice"
docker exec -it depths-server node admin.mjs flag-set game.dev_console true --channel dev
docker exec -it depths-server node admin.mjs flags
docker exec -it depths-server node admin.mjs flag-unset game.xp_multiplier

# Crash reports and usage statistics (from players who said yes)
docker exec -it depths-server node admin.mjs crashes              # newest 20
docker exec -it depths-server node admin.mjs crash 12             # one report, with stack trace or game log
docker exec -it depths-server node admin.mjs telemetry 30         # summary of the last 30 days
```

Without Docker, run `node admin.mjs <command>` in the server folder. From a clone of the repo, `bun run admin <command>` uses the database from `DATABASE_URL` (default: the one `bun run server:db` starts). Commands that delete something ask for `--yes` first.

### Back up the data

`node admin.mjs backup` writes one consistent copy of the whole database, also while the server runs:

```bash
docker exec -it depths-server node admin.mjs backup        # /data/backups/depths-<date>.dump
docker cp depths-server:/data/backups ./depths-backups     # copy the backups off the Pi
```

| Command | What it writes |
| --- | --- |
| `node admin.mjs backup [file]` | A `pg_dump` archive (`.dump`) when the PostgreSQL client tools are installed (they are in the Docker image); otherwise the built-in format |
| `node admin.mjs backup [file] --format json` | The built-in format (`.json.gz`): every table as gzip'd JSON. Needs nothing but Node.js |
| `node admin.mjs backup [file] --format pg_dump` | Always `pg_dump` (fails if it isn't installed, or is older than the database) |

To restore, stop the server first (the command refuses while it runs), then:

```bash
docker compose stop depths-server
docker compose run --rm depths-server node admin.mjs restore /data/backups/depths-2026-11-24-20-00-00.dump --yes
docker compose start depths-server
```

`restore` reads both formats. It replaces every account and save, and first keeps what was there as `data/backups/before-restore-<time>.json.gz`.

To wipe everything (all accounts and saves) during development: `docker compose down -v`. The `-v` deletes the volumes.

### Prebuilt image (optional)

Instead of building on the Pi, you can build the image on your PC (needs Docker Desktop running):

```powershell
bun run server:image
```

This also creates `release/depths-server-0.1.0-arm64.tar` for a 64-bit Raspberry Pi OS. For 32-bit Pi OS, run `$env:PLATFORM="linux/arm/v7"; bun run server:image` instead. Copy both files to the Pi, then:

```bash
docker load -i depths-server-0.1.0-arm64.tar
tar xzf depths-server-0.1.0.tar.gz && cd depths-server
docker compose up -d          # no --build: uses the loaded image
```

## Run it on the Raspberry Pi without Docker

The package also contains `install.sh`, which installs Node.js 22 and PostgreSQL if needed, creates the `depths` database with a random password, installs the `pg` package and sets up a systemd service:

```bash
tar xzf depths-server-0.1.0.tar.gz
cd depths-server
bash install.sh
```

Settings go in `config.json` (created from `config.example.json`), with the same names as in the Docker table plus `PORT`, `HOST`, `DATA_DIR` and `DATABASE_URL` (`install.sh` writes it and makes the file readable only by you). Accounts and saves live in PostgreSQL; `depths-server/data/` holds backups and, after an upgrade, the old SQLite file. Useful commands:

```bash
sudo systemctl status depths-server
journalctl -u depths-server -f
sudo systemctl restart depths-server   # after changing config.json
```

Running `bash install.sh` again (for example after unpacking a new version) is safe: it keeps `config.json`, `data/` and the database. `bash update.sh` works here too: it runs `npm ci` and restarts the systemd service instead of Docker.

## Connect the launcher

The launcher comes with a **Raspberry Pi** entry pointing at `raspberrypi.local:4100`. If your Pi has a different hostname, or `.local` names don't resolve on your network, press **+** in the launcher and add the Pi's IP, for example `192.168.1.50` (port 4100 is added automatically).

Tip: give the Pi a fixed IP in your router (a "DHCP reservation") so the address never changes.

## API

All responses are JSON. Logged-in requests send `Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/status` | | `online`, `name`, `motd`, `version`, `accounts`, `uptimeSeconds` |
| POST | `/api/auth/register` | `username`, `password` | `token`, `user`, `characters`, `maxCharacters` |
| POST | `/api/auth/login` | `username`, `password` | `token`, `user`, `characters`, `maxCharacters` |
| POST | `/api/auth/logout` | | `ok` |
| GET | `/api/auth/me` | | `user`, `characters`, `maxCharacters` |
| GET | `/api/characters` | | `characters`, `maxCharacters` |
| POST | `/api/characters` | `name`, `heroClass`, `color` | `character`, `characters` |
| DELETE | `/api/characters/:id` | | `ok`, `characters` |
| GET | `/api/characters/:id/save` | | `save` with `data` (the full hero), or `null` |
| PUT | `/api/characters/:id/save` | `data` (game keys), `meta` (level, depth) | `updatedAt` |
| GET / PUT | `/api/save` | as above | For launchers before 0.3: reads and writes the account's first character |
| POST | `/api/auth/password` | `current`, `password` | `ok`; signs out the account's other sessions |
| GET | `/api/news?channel=` | | `news`: `[{ id, title, body, date }]`, newest first |
| GET | `/api/flags?channel=` | | `flags`: `{ name: value }`; a channel's value wins over the one for everyone |
| POST | `/api/crash` | `source`, `message`, `detail`, `version`, `channel`, `platform`, `installId` | `ok` (no login; 30 per hour per address) |
| POST | `/api/telemetry` | `events: [{ event, at, props }]` (up to 50), `version`, `channel`, `installId` | `ok` (no login; 120 per hour per address) |

Each account has up to **5 characters**. Names are 2–18 letters (spaces, `-` and `'` allowed) and unique per account; classes are `warrior`, `pyromancer` and `rogue`. A server upgraded from a version before 0.3 moves each account's existing hero into its first character slot.

Usernames are 3–20 letters, numbers or `_` (not case-sensitive). Passwords need 6+ characters and are stored as salted scrypt hashes. Logins last 30 days. After 10 failed attempts from one address, logins pause for 10 minutes.

## The database

PostgreSQL 16 or newer (the Docker setup uses 17). Times are milliseconds since 1970, in `BIGINT` columns.

| Table | What's in it |
| --- | --- |
| `accounts` | Username (unique, not case-sensitive), scrypt password hash, created and last login |
| `sessions` | SHA-256 of each login token, its account and when it expires |
| `characters` | Up to 5 heroes per account: name, class, color, level, depth, and `data`: the save (the game's progress under the `dod3d` key) |
| `news`, `flags` | Set with `admin.mjs`; channel `''` means every launcher |
| `crashes`, `telemetry` | Reports from launchers whose players opted in; usage events are kept 90 days |
| `schema_migrations` | Which migrations have run |
| `sqlite_imports` | Which old SQLite files were imported (by SHA-256), so none is imported twice |

**Migrations.** The schema is in numbered files next to the server: `migration-001-initial.sql`, `migration-002-….sql` and so on. At start-up the server (and `admin.mjs`) applies the ones that haven't run yet, in order, each in its own transaction, holding a lock so two processes never migrate at once. To change the schema, add the next file; never edit one that was released. They aren't in a folder because `update.sh` from older releases only copies files.

**Transactions.** Writes that touch more than one row run in one transaction: register and login (account and session), password changes (password and other sessions), creating a character (with the account row locked, so the five-hero limit and unique names hold under parallel requests), and saves (the character row is locked while the new keys are merged into the old save, so two saves at once never lose each other's keys). A batch of usage events is stored with one statement.

**Import from SQLite.** Servers up to 0.5.0-beta.8 kept everything in `data/depths.db`. If that file exists when the server starts, it is copied into PostgreSQL in one transaction, keeping every id (so the launcher's characters stay the same), and the server checks that every table has as many rows as the file. Then the file is renamed to `depths.db.imported-<date>`; it is never deleted. A file that was imported before is recognised and only renamed. The import only runs into a database without accounts: if PostgreSQL already has players, the file is left where it is and the log says so. `node admin.mjs import-sqlite <file> --yes` does the same by hand. If the import fails, the server stops, so nobody starts over in an empty database.

**Tests.** `bun run test` (or `node --test game-server/tests/server.test.mjs`) runs the server tests against the PostgreSQL in `TEST_DATABASE_URL` (default: the one from `bun run server:db`). Each run makes throwaway databases and drops them afterwards, so the login must be allowed to create databases. Without a reachable PostgreSQL the tests are skipped, with a message. In GitHub Actions they run in the **Game server tests** job, against a PostgreSQL service container.

## Playing over the internet

Not set up yet. Before friends outside your home can connect, the server should sit behind HTTPS so passwords aren't sent in plain text. The usual options are a tunnel (Cloudflare Tunnel or Tailscale), or a reverse proxy like Caddy with a domain name. The launcher already accepts `https://` addresses.
