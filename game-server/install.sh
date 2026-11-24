#!/usr/bin/env bash
# Depths of Darkness — game server installer for Raspberry Pi (Raspberry Pi OS / Debian / Ubuntu).
#
#   bash install.sh
#
# Safe to run again: it updates the service and keeps config.json and all accounts and saves in data/.
# What it does:
#   1. Installs Node.js 22 if Node.js 22.13+ isn't already installed
#   2. Creates config.json from config.example.json (first run only)
#   3. Installs a systemd service so the server starts on boot and restarts if it crashes
#   4. Starts the server and prints the address to add in the game launcher
set -euo pipefail

SERVICE=depths-server
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_USER="${SUDO_USER:-$(id -un)}"
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=13

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}

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

# ---------------------------------------------------------------- 1. Node.js
bold "1/4 Node.js"
if node_ok; then
  ok "Node.js $(node -v) is installed"
else
  if command -v node >/dev/null 2>&1; then
    warn "Node.js $(node -v) is too old (need $MIN_NODE_MAJOR.$MIN_NODE_MINOR or newer), upgrading"
  else
    warn "Node.js is not installed, installing Node.js $MIN_NODE_MAJOR"
  fi
  command -v apt-get >/dev/null 2>&1 || fail "This installer needs apt (Raspberry Pi OS, Debian or Ubuntu). Install Node.js 22.13+ yourself, then run it again."
  as_root apt-get update -y
  as_root apt-get install -y ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${MIN_NODE_MAJOR}.x" | as_root bash -
  as_root apt-get install -y nodejs
  node_ok || fail "Node.js install did not give version $MIN_NODE_MAJOR.$MIN_NODE_MINOR+. Found: $(node -v 2>/dev/null || echo none)"
  ok "Installed Node.js $(node -v)"
fi
NODE_BIN="$(command -v node)"
"$NODE_BIN" --no-warnings -e "require('node:sqlite')" || fail "This Node.js build has no built-in SQLite. Install Node.js 22.13 or newer."
ok "Built-in SQLite available"

# ---------------------------------------------------------------- 2. config + data
bold "2/4 Settings"
if [ -f "$INSTALL_DIR/config.json" ]; then
  ok "Keeping existing config.json"
else
  cp "$INSTALL_DIR/config.example.json" "$INSTALL_DIR/config.json"
  ok "Created config.json (edit it to change the server name or message)"
fi
mkdir -p "$INSTALL_DIR/data"
if [ "$(id -u)" -eq 0 ] && [ "$RUN_USER" != "root" ]; then
  chown -R "$RUN_USER":"$(id -gn "$RUN_USER")" "$INSTALL_DIR/config.json" "$INSTALL_DIR/data"
fi
ok "Database folder: $INSTALL_DIR/data"

# ---------------------------------------------------------------- 3. service
bold "3/4 Start on boot"
PORT="$("$NODE_BIN" -p "try{JSON.parse(require('fs').readFileSync('$INSTALL_DIR/config.json','utf8')).PORT||4100}catch(e){4100}")"
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  as_root tee "/etc/systemd/system/$SERVICE.service" >/dev/null <<UNIT
[Unit]
Description=Depths of Darkness game server
After=network-online.target
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

  bold "4/4 Check"
  for _ in $(seq 1 20); do
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
  bold "4/4 Check"
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
echo "  Settings: $INSTALL_DIR/config.json  (then: sudo systemctl restart $SERVICE)"
