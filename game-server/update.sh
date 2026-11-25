#!/usr/bin/env bash
# Depths of Darkness — game server updater (run on the Raspberry Pi).
#
#   bash update.sh            install the newest server release if there is one
#   bash update.sh --check    only say whether an update is available
#   bash update.sh --auto     also update automatically every night (systemd timer)
#   bash update.sh --no-auto  turn the automatic updates off again
#   bash update.sh --force    reinstall the newest release even if it isn't newer
#
# Accounts and saves are never touched: they live in the Docker volume (or data/ without Docker).
# Your settings are kept: docker-compose.yml (SERVER_NAME, MOTD, ports) and config.json.
#
# Works for every way of installing the server:
#   - a git clone of the repository (game-server/ inside it): fast-forwards to the release tag
#   - an extracted depths-server-<version>.tar.gz: downloads the new package, checks its SHA-256
#     and copies the new files over this folder
# Then it rebuilds and restarts the server (docker compose, or the systemd service from install.sh)
# and waits until the new version answers.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_URL="${UPDATE_URL:-https://github.com/simonhultgren5-lang/arpg-game/releases/latest/download/server-update.json}"
PORT="${PORT:-4100}"
RUN_USER="${SUDO_USER:-$(id -un)}"
MODE=install
QUIET=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --check) MODE=check ;;
    --auto) MODE=auto ;;
    --no-auto) MODE=no-auto ;;
    --quiet) QUIET=1 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

bold() { [ "$QUIET" = 1 ] || printf '\033[1m%s\033[0m\n' "$*"; }
ok() { [ "$QUIET" = 1 ] || printf '  \033[32m✓\033[0m %s\n' "$*"; }
info() { [ "$QUIET" = 1 ] || printf '  %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*" >&2; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
as_root() { if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi; }

[ -f "$DIR/server.mjs" ] || fail "server.mjs not found next to update.sh."

# ---------------------------------------------------------------- automatic updates (systemd timer)
UNIT_DIR=/etc/systemd/system
if [ "$MODE" = auto ]; then
  bold "Automatic server updates"
  command -v systemctl >/dev/null 2>&1 || fail "systemd is needed for automatic updates."
  for unit in depths-server-update.service depths-server-update.timer; do
    [ -f "$DIR/$unit" ] || fail "$unit is missing from $DIR."
    sed -e "s|@DIR@|$DIR|g" -e "s|@USER@|$RUN_USER|g" "$DIR/$unit" | as_root tee "$UNIT_DIR/$unit" >/dev/null
  done
  as_root systemctl daemon-reload
  as_root systemctl enable --now depths-server-update.timer >/dev/null
  if [ -f "$DIR/docker-compose.yml" ] && command -v docker >/dev/null 2>&1 && ! sudo -u "$RUN_USER" docker info >/dev/null 2>&1; then
    warn "$RUN_USER can't use Docker without sudo, so the nightly update can't restart the server."
    warn "Fix: sudo usermod -aG docker $RUN_USER   (then log out and in again)"
  fi
  ok "The server checks for updates every night around 04:30 and installs them."
  info "Log: journalctl -u depths-server-update"
  info "Turn it off: bash update.sh --no-auto"
  exit 0
fi
if [ "$MODE" = no-auto ]; then
  as_root systemctl disable --now depths-server-update.timer >/dev/null 2>&1 || true
  as_root rm -f "$UNIT_DIR/depths-server-update.timer" "$UNIT_DIR/depths-server-update.service"
  as_root systemctl daemon-reload 2>/dev/null || true
  ok "Automatic server updates are off."
  exit 0
fi

# ---------------------------------------------------------------- what's new?
current="$(sed -n "s/^const SERVER_VERSION = '\([^']*\)'.*/\1/p" "$DIR/server.mjs" | head -n1)"
[ -n "$current" ] || current=0.0.0
bold "Depths of Darkness server — update"
info "Installed: $current"

command -v curl >/dev/null 2>&1 || fail "curl is needed (sudo apt-get install -y curl)."
manifest="$(curl -fsSL --max-time 30 "$UPDATE_URL")" || fail "Could not reach $UPDATE_URL"
field() { printf '%s\n' "$manifest" | sed -n "s/^[[:space:]]*\"$1\":[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1; }
latest="$(field version)"
url="$(field url)"
sha="$(field sha256)"
[ -n "$latest" ] || fail "The update manifest has no version."
info "Newest:    $latest"

newer() { [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]; }
if ! newer "$latest" "$current" && [ "$FORCE" = 0 ]; then
  ok "The server is up to date."
  exit 0
fi
if [ "$MODE" = check ]; then
  ok "Server $latest is available. Install it with: bash update.sh"
  exit 0
fi

# ---------------------------------------------------------------- get the new files
REPO="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$REPO" ]; then
  bold "Updating the git checkout to v$latest"
  git -C "$REPO" fetch --quiet origin "refs/tags/v$latest:refs/tags/v$latest" \
    || fail "Could not fetch tag v$latest from GitHub."
  # Local edits (for example SERVER_NAME in docker-compose.yml) are stashed and put back.
  git -C "$REPO" -c user.name=depths-updater -c user.email=updater@localhost \
    merge --ff-only --autostash --quiet "v$latest" \
    || fail "This checkout has commits that aren't in v$latest, so it can't fast-forward. Update it by hand (git pull)."
  ok "Files are at v$latest"
else
  bold "Downloading server $latest"
  [ -n "$url" ] || fail "The update manifest has no download url."
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL --max-time 300 -o "$tmp/server.tar.gz" "$url" || fail "Download failed: $url"
  if [ -n "$sha" ]; then
    got="$(sha256sum "$tmp/server.tar.gz" | cut -d' ' -f1)"
    [ "$got" = "$sha" ] || fail "The download is damaged (SHA-256 mismatch). Nothing was changed."
    ok "Download verified"
  fi
  tar -xzf "$tmp/server.tar.gz" -C "$tmp"
  [ -f "$tmp/depths-server/server.mjs" ] || fail "The package has no server.mjs. Nothing was changed."
  for f in "$tmp"/depths-server/* "$tmp"/depths-server/.dockerignore; do
    [ -e "$f" ] || continue
    name="$(basename "$f")"
    case "$name" in
      config.json) continue ;;  # never shipped, but never overwrite it either
      docker-compose.yml)
        # Keep your settings. If the new release changed the file, put it next to yours.
        if [ -f "$DIR/docker-compose.yml" ] && ! cmp -s "$f" "$DIR/docker-compose.yml"; then
          cp "$f" "$DIR/docker-compose.yml.new"
          warn "Kept your docker-compose.yml. The release's version is in docker-compose.yml.new; compare them when you have a minute."
          continue
        fi ;;
    esac
    cp -p "$f" "$DIR/$name"
  done
  chmod +x "$DIR"/*.sh 2>/dev/null || true
  ok "Files updated to $latest"
fi

# ---------------------------------------------------------------- restart
bold "Restarting the server"
if [ -f "$DIR/docker-compose.yml" ] && command -v docker >/dev/null 2>&1; then
  DOCKER=(docker)
  docker info >/dev/null 2>&1 || DOCKER=(sudo docker)
  (cd "$DIR" && "${DOCKER[@]}" compose up -d --build --quiet-pull >/dev/null) || fail "docker compose up failed. Run it yourself to see why: cd $DIR && docker compose up -d --build"
  ok "Rebuilt and restarted the container"
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files depths-server.service >/dev/null 2>&1 \
     && systemctl cat depths-server.service >/dev/null 2>&1; then
  as_root systemctl restart depths-server
  ok "Restarted the depths-server service"
else
  warn "Couldn't tell how this server runs. Restart it yourself to finish the update."
  exit 0
fi

# ---------------------------------------------------------------- check
for i in $(seq 1 30); do
  running="$(curl -fsS --max-time 3 "http://127.0.0.1:$PORT/api/status" 2>/dev/null \
    | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' || true)"
  if [ "$running" = "$latest" ]; then
    ok "Server $latest is running. Accounts and saves are unchanged."
    exit 0
  fi
  sleep 2
done
warn "The server didn't answer with version $latest within a minute. Check the log: docker compose logs -f (or journalctl -u depths-server)"
exit 1
