# Depths of Darkness — Game Server

Handles accounts (register / log in), cloud saves and the online status the launcher shows.

- **No npm packages:** it uses only what's built into Node.js (SQLite, password hashing, HTTP).
- **One database file:** everything is stored in `depths.db` in the data folder.
- **Home network:** it's meant for a Raspberry Pi on your LAN while the game is in development. It speaks plain `http`, so don't expose it to the internet as-is (see [Playing over the internet](#playing-over-the-internet)).

## Run it on your PC (for testing)

From the project root:

```powershell
bun run server
```

The launcher (`bun run game`) lists **This PC** (`localhost:4100`) when running from source. Select it, register an account and press Play.

## Run it on the Raspberry Pi with Docker

The Pi needs Docker with the Compose plugin (`docker compose version` should work).

### 1. Build the server package (on your PC)

From the project root:

```powershell
bun run server:pack
```

This creates `release/depths-server-<version>.tar.gz` (about 10 KB) with the server, `Dockerfile` and `docker-compose.yml`.

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

The first start downloads the Node.js base image, so give it a minute. Then check it:

```bash
docker compose ps          # STATUS should say "healthy" after ~10 seconds
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

Either way it rebuilds and restarts the container (or restarts the systemd service from `install.sh`), then waits until the new version answers. Accounts and saves stay in the Docker volume. Your `docker-compose.yml` (`SERVER_NAME`, `MOTD`, ports) is kept: if a release changes that file, the new one is saved next to yours as `docker-compose.yml.new`.

| Command | What it does |
| --- | --- |
| `bash update.sh --check` | Only says whether an update is available |
| `bash update.sh --auto` | Turns on nightly updates (a systemd timer, around 04:30) |
| `bash update.sh --no-auto` | Turns them off again |
| `bash update.sh --force` | Reinstalls the newest release |

Nightly updates run as your user, so that user must be allowed to use Docker (`sudo usermod -aG docker $USER`, then log in again). See what they did with `journalctl -u depths-server-update`.

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
docker exec -it depths-server node admin.mjs backup               # copy to /data/backups/depths-<date>.db
```

Without Docker, run `node admin.mjs <command>` in the server folder. From a clone of the repo, `bun run admin <command>` uses `game-server/data`. Commands that delete something ask for `--yes` first.

To restore a backup made with `admin.mjs backup`, stop the server first: the command refuses while the server runs. Then `node admin.mjs restore <file> --yes` replaces the database and keeps the old one next to it as `depths.db.before-restore-<time>`.

### Back up the data

```bash
cd ~/depths-server
docker compose stop
docker cp depths-server:/data ./backup-$(date +%F)
docker compose start
```

To restore, stop the server, copy a backup back with `docker cp ./backup-2026-11-24/. depths-server:/data`, and start it again.

To wipe everything (all accounts and saves) during development: `docker compose down -v`. The `-v` deletes the volume.

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

The package also contains `install.sh`, which installs Node.js 22 if needed and sets up a systemd service:

```bash
tar xzf depths-server-0.1.0.tar.gz
cd depths-server
bash install.sh
```

Settings go in `config.json` (created from `config.example.json`), with the same names as in the Docker table plus `PORT`, `HOST` and `DATA_DIR`. Data lives in `depths-server/data/`. Useful commands:

```bash
sudo systemctl status depths-server
journalctl -u depths-server -f
sudo systemctl restart depths-server   # after changing config.json
```

Running `bash install.sh` again (for example after unpacking a new version) is safe: it keeps `config.json` and `data/`. `bash update.sh` works here too: it restarts the systemd service instead of Docker.

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

Each account has up to **5 characters**. Names are 2–18 letters (spaces, `-` and `'` allowed) and unique per account; classes are `warrior`, `pyromancer` and `rogue`. A server upgraded from an older version moves each account's existing hero into its first character slot on start-up.

Usernames are 3–20 letters, numbers or `_` (not case-sensitive). Passwords need 6+ characters and are stored as salted scrypt hashes. Logins last 30 days. After 10 failed attempts from one address, logins pause for 10 minutes.

## Playing over the internet

Not set up yet. Before friends outside your home can connect, the server should sit behind HTTPS so passwords aren't sent in plain text. The usual options are a tunnel (Cloudflare Tunnel or Tailscale), or a reverse proxy like Caddy with a domain name. The launcher already accepts `https://` addresses.
