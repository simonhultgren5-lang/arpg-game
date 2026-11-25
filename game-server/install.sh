#!/usr/bin/env bash
# Depths of Darkness — game server installer for Raspberry Pi (Raspberry Pi OS / Debian / Ubuntu).
# For running the server without Docker. (With Docker you only need: docker compose up -d --build)
#
#   bash install.sh
#
# Safe to run again: it updates the service and keeps config.json and every account and save.
# What it does:
#   1. Installs Node.js 22 if Node.js 22.13+ isn't already installed
#   2. Installs PostgreSQL and creates the "depths" database and login (first run only)
#   3. Creates config.json from config.example.json with the database address (first run only)
#   4. Installs the server's npm package (pg)
#   5. Installs a systemd service so the server starts on boot and restarts if it crashes
#   6. Starts the server and prints the address to add in the game launcher
# Upgrading from a server before 1.0.0: its SQLite file (data/depths.db) is imported into
# PostgreSQL on the first start and kept as data/depths.db.imported-<date>.
set -euo pipefail

SERVICE=depths-server
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_USER="${SUDO_USER:-$(id -un)}"
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=13
DB_NAME=depths
DB_USER=depths

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}
as_user() {
  if [ "$(id -un)" = "$RUN_USER" ]; then "$@"; elif [ "$(id -u)" -eq 0 ]; then runuser -u "$RUN_USER" -- "$@"; else sudo -u "$RUN_USER" "$@"; fi
}
as_pg() {
  if [ "$(id -u)" -eq 0 ]; then runuser -u postgres -- "$@"; else sudo -u postgres "$@"; fi
}
# psql as the postgres superuser (from / so it doesn't complain about this folder's permissions)
pgsql() { (cd / && as_pg psql "$@"); }

node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local version major minor
  version="$(node -p 'process.versions.node' 2>/dev/null)" || return 1
  major="${version%%.*}"
  minor="$(echo "$version" | cut -d. -f2)"
  [ "$major" -gt "$MIN_NODE_MAJOR" ] || { [ "$major" -eq "$MIN_NODE_MAJOR" ] && [ "$minor" -ge "$MIN_NODE_MINOR" ]; }
}

bold "Depths of Darkness server — install"
echo "  Folder: $INSTALL_DIR"
echo "  Runs as: $RUN_USER"
[ -f "$INSTALL_DIR/server.mjs" ] || fail "server.mjs not found. Run this script from the extracted depths-server folder."
command -v apt-get >/dev/null 2>&1 || NO_APT=1

# ---------------------------------------------------------------- 1. Node.js
bold "1/6 Node.js"
if node_ok; then
  ok "Node.js $(node -v) is installed"
else
  if command -v node >/dev/null 2>&1; then
    warn "Node.js $(node -v) is too old (need $MIN_NODE_MAJOR.$MIN_NODE_MINOR or newer), upgrading"
  else
    warn "Node.js is not installed, installing Node.js $MIN_NODE_MAJOR"
  fi
  [ -z "${NO_APT:-}" ] || fail "This installer needs apt (Raspberry Pi OS, Debian or Ubuntu). Install Node.js 22.13+ yourself, then run it again."
  as_root apt-get update -y
  as_root apt-get install -y ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${MIN_NODE_MAJOR}.x" | as_root bash -
  as_root apt-get install -y nodejs
  node_ok || fail "Node.js install did not give version $MIN_NODE_MAJOR.$MIN_NODE_MINOR+. Found: $(node -v 2>/dev/null || echo none)"
  ok "Installed Node.js $(node -v)"
fi
NODE_BIN="$(command -v node)"
command -v npm >/dev/null 2>&1 || { [ -z "${NO_APT:-}" ] && as_root apt-get install -y npm; } || fail "npm is missing. Install it (sudo apt-get install -y npm), then run this again."

# ---------------------------------------------------------------- 2. PostgreSQL
bold "2/6 PostgreSQL"
CONFIG="$INSTALL_DIR/config.json"
config_url() { "$NODE_BIN" -p "try{JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).DATABASE_URL||''}catch(e){''}"; }
DATABASE_URL_SET="$( [ -f "$CONFIG" ] && config_url || true )"
if [ -n "$DATABASE_URL_SET" ]; then
  ok "Keeping the database in config.json ($(printf '%s' "$DATABASE_URL_SET" | sed -E 's#//([^:/@]+):[^@]*@#//\1:***@#'))"
else
  if ! command -v psql >/dev/null 2>&1 || [ ! -d /etc/postgresql ]; then
    [ -z "${NO_APT:-}" ] || fail "This installer needs apt to install PostgreSQL. Install PostgreSQL yourself, set DATABASE_URL in config.json, then run it again."
    as_root apt-get update -y
    as_root apt-get install -y postgresql
    ok "Installed PostgreSQL"
  else
    ok "PostgreSQL is installed"
  fi
  as_root systemctl enable --now postgresql >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do pgsql -qAtc 'SELECT 1' >/dev/null 2>&1 && break; sleep 1; done
  pgsql -qAtc 'SELECT 1' >/dev/null 2>&1 || fail "PostgreSQL isn't answering. See: sudo systemctl status postgresql"
  # A random password, only for this server. Letters and digits, so it needs no escaping in the URL.
  DB_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)"
  if [ "$(pgsql -qAtc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")" = "1" ]; then
    pgsql -qc "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD'" >/dev/null
  else
    pgsql -qc "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD'" >/dev/null
  fi
  if [ "$(pgsql -qAtc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" != "1" ]; then
    pgsql -qc "CREATE DATABASE $DB_NAME OWNER $DB_USER" >/dev/null
    ok "Created the database '$DB_NAME'"
  else
    ok "Using the existing database '$DB_NAME'"
  fi
  DATABASE_URL_SET="postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"
fi

# ---------------------------------------------------------------- 3. config + data
bold "3/6 Settings"
if [ -f "$CONFIG" ]; then
  ok "Keeping existing config.json"
else
  cp "$INSTALL_DIR/config.example.json" "$CONFIG"
  ok "Created config.json (edit it to change the server name or message)"
fi
# Write the database address into config.json (only readable by the server's user).
DATABASE_URL_SET="$DATABASE_URL_SET" "$NODE_BIN" -e "
  const fs = require('fs'); const f = process.argv[1];
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (c.DATABASE_URL !== process.env.DATABASE_URL_SET) { c.DATABASE_URL = process.env.DATABASE_URL_SET; fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n'); }
" "$CONFIG"
chmod 600 "$CONFIG"
mkdir -p "$INSTALL_DIR/data"
if [ "$(id -u)" -eq 0 ] && [ "$RUN_USER" != "root" ]; then
  chown -R "$RUN_USER":"$(id -gn "$RUN_USER")" "$CONFIG" "$INSTALL_DIR/data"
fi
ok "Data folder (backups, old SQLite file): $INSTALL_DIR/data"
[ -f "$INSTALL_DIR/data/depths.db" ] && ok "Found an old SQLite database: the server imports it into PostgreSQL when it starts"

# ---------------------------------------------------------------- 4. npm package
bold "4/6 Packages"
if [ "$(id -u)" -eq 0 ] && [ "$RUN_USER" != "root" ]; then chown -R "$RUN_USER":"$(id -gn "$RUN_USER")" "$INSTALL_DIR"; fi
(cd "$INSTALL_DIR" && as_user npm ci --omit=dev --no-audit --no-fund --loglevel=error) || fail "npm ci failed (is the Pi online?)."
ok "Installed the pg package"

# ---------------------------------------------------------------- 5. service
bold "5/6 Start on boot"
PORT="$("$NODE_BIN" -p "try{JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).PORT||4100}catch(e){4100}")"
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  as_root tee "/etc/systemd/system/$SERVICE.service" >/dev/null <<UNIT
[Unit]
Description=Depths of Darkness game server
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN --no-warnings $INSTALL_DIR/server.mjs
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
  as_root systemctl daemon-reload
  as_root systemctl enable "$SERVICE" >/dev/null 2>&1
  as_root systemctl restart "$SERVICE"
  ok "Service '$SERVICE' installed and (re)started"

  bold "6/6 Check"
  for _ in $(seq 1 40); do
    if curl -fs "http://127.0.0.1:$PORT/api/status" >/dev/null 2>&1; then break; fi
    sleep 0.5
  done
  if curl -fs "http://127.0.0.1:$PORT/api/status" >/dev/null 2>&1; then
    ok "Server is answering on port $PORT"
  else
    warn "Server did not answer yet. See the log: journalctl -u $SERVICE -n 50"
  fi
else
  warn "systemd isn't available here, so the server won't start on boot."
  warn "Start it by hand with: $NODE_BIN --no-warnings $INSTALL_DIR/server.mjs"
  bold "6/6 Check"
  warn "Skipped (server not started by the installer)"
fi

# ---------------------------------------------------------------- done
IPS="$(hostname -I 2>/dev/null || true)"
echo
bold "Done. In the game launcher, add this server with +"
for ip in $IPS; do
  case "$ip" in *:*) continue ;; esac   # skip IPv6
  echo "    $ip:$PORT"
done
echo "    or $(hostname).local:$PORT"
echo
echo "  Status:   sudo systemctl status $SERVICE"
echo "  Live log: journalctl -u $SERVICE -f"
echo "  Settings: $CONFIG  (then: sudo systemctl restart $SERVICE)"
echo "  Backup:   node $INSTALL_DIR/admin.mjs backup"
