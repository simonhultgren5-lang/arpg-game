# Depths of Darkness — Game Server

Handles accounts (register / log in), cloud saves and the online status the launcher shows.

- **No npm packages:** it uses only what's built into Node.js (SQLite, password hashing, HTTP).
- **One database file:** everything is stored in `data/depths.db`. Back it up by copying the file.
- **Home network:** it's meant for a Raspberry Pi on your LAN while the game is in development. It speaks plain `http`, so don't expose it to the internet as-is (see [Playing over the internet](#playing-over-the-internet)).

## Run it on your PC (for testing)

From the project root:

```powershell
bun run server
```

The launcher (`bun run game`) lists **This PC** (`localhost:4100`) when running from source. Select it, register an account and press Play.

## Set it up on the Raspberry Pi

Requires **Node.js 22.13 or newer** on the Pi.

### 1. Install Node.js on the Pi

On the Pi (over SSH or in a terminal):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v22.13 or newer
```

### 2. Copy the server to the Pi

From the project folder on your Windows PC (replace `USERNAME` with your Pi login):

```powershell
scp -r game-server USERNAME@raspberrypi.local:~/depths-server
```

If `raspberrypi.local` doesn't work, use the Pi's IP address instead. You can find it with `hostname -I` on the Pi.

### 3. Configure it (optional)

On the Pi:

```bash
cd ~/depths-server
cp config.example.json config.json
nano config.json
```

| Setting | What it does | Default |
| --- | --- | --- |
| `SERVER_NAME` | Name shown in the launcher | `Depths Server` |
| `MOTD` | Message shown on the launcher's main screen | empty |
| `PORT` | Port the server listens on | `4100` |
| `HOST` | `0.0.0.0` = reachable from your whole network | `0.0.0.0` |
| `DATA_DIR` | Folder for the database | `data` |

Environment variables with the same names override `config.json`.

### 4. Test it

```bash
node --no-warnings server.mjs
```

You should see `… listening on http://0.0.0.0:4100`. On your PC, open the launcher: the **Raspberry Pi** server should turn green. Stop the test with `Ctrl+C`.

### 5. Start it automatically on boot

```bash
cd ~/depths-server
sed -i "s/USERNAME/$(whoami)/g" depths-server.service
sudo cp depths-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now depths-server
```

Useful commands:

```bash
sudo systemctl status depths-server     # is it running?
journalctl -u depths-server -f          # live log (registrations, errors)
sudo systemctl restart depths-server    # after updating or changing config.json
```

## Connect the launcher

The launcher comes with a **Raspberry Pi** entry pointing at `raspberrypi.local:4100`. If your Pi has a different hostname, or `.local` names don't resolve on your network, press **+** in the launcher and add the Pi's IP, for example `192.168.1.50` (port 4100 is added automatically).

Tip: give the Pi a fixed IP in your router (a "DHCP reservation") so the address never changes.

## Update the server

Copy the new `server.mjs` over and restart:

```powershell
scp game-server/server.mjs USERNAME@raspberrypi.local:~/depths-server/
```

```bash
sudo systemctl restart depths-server
```

Accounts and saves in `data/` are kept.

## Back up the data

```bash
sudo systemctl stop depths-server
cp ~/depths-server/data/depths.db ~/depths-backup-$(date +%F).db
sudo systemctl start depths-server
```

To wipe everything (all accounts and saves) during development, stop the service and delete the `data` folder.

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
