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

Build and copy the new package, then on the Pi:

```bash
tar xzf depths-server-0.2.0.tar.gz   # unpacks over the old files
cd depths-server
docker compose up -d --build
```

Accounts and saves are kept: they live in the `depths-data` Docker volume, not in the folder. If you changed `SERVER_NAME` or `MOTD`, the new `docker-compose.yml` overwrites them, so set them again.

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

Running `bash install.sh` again (for example after unpacking a new version) is safe: it keeps `config.json` and `data/`.

## Connect the launcher

The launcher comes with a **Raspberry Pi** entry pointing at `raspberrypi.local:4100`. If your Pi has a different hostname, or `.local` names don't resolve on your network, press **+** in the launcher and add the Pi's IP, for example `192.168.1.50` (port 4100 is added automatically).

Tip: give the Pi a fixed IP in your router (a "DHCP reservation") so the address never changes.

## API

All responses are JSON. Logged-in requests send `Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/status` | | `online`, `name`, `motd`, `version`, `accounts`, `uptimeSeconds` |
| POST | `/api/auth/register` | `username`, `password` | `token`, `user`, `save` |
| POST | `/api/auth/login` | `username`, `password` | `token`, `user`, `save` (hero summary) |
| POST | `/api/auth/logout` | | `ok` |
| GET | `/api/auth/me` | | `user`, `save` (hero summary) |
| GET | `/api/save` | | `save` with `data` (the full hero), or `null` |
| PUT | `/api/save` | `data` (game keys), `meta` (hero summary) | `updatedAt` |

Usernames are 3–20 letters, numbers or `_` (not case-sensitive). Passwords need 6+ characters and are stored as salted scrypt hashes. Logins last 30 days. After 10 failed attempts from one address, logins pause for 10 minutes.

## Playing over the internet

Not set up yet. Before friends outside your home can connect, the server should sit behind HTTPS so passwords aren't sent in plain text. The usual options are a tunnel (Cloudflare Tunnel or Tailscale), or a reverse proxy like Caddy with a domain name. The launcher already accepts `https://` addresses.
