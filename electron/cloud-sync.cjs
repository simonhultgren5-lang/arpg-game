// Uploads the hero to the selected game server while playing online.
// The game sends a snapshot after each save; uploads are batched so the server gets at most
// one write every few seconds, and the latest snapshot is always sent before the game closes.
const { request } = require('./servers.cjs');

const MIN_GAP_MS = 8000; // shortest time between two uploads
const RETRY_MS = 20000; // wait before retrying after the server was unreachable

class CloudSync {
  constructor({ serverUrl, token, webContents, savePath = '/api/save' }) {
    this.serverUrl = serverUrl;
    this.savePath = savePath; // /api/characters/<id>/save for a character
    this.token = token;
    this.webContents = webContents;
    this.pending = null;
    this.timer = null;
    this.lastUpload = 0;
    this.inFlight = null;
  }

  status(update) {
    if (!this.webContents.isDestroyed()) this.webContents.send('dod:cloud-status', update);
  }

  push(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    this.pending = snapshot;
    if (this.timer) return;
    const wait = Math.max(1500, this.lastUpload + MIN_GAP_MS - Date.now());
    this.timer = setTimeout(() => this.flush(), wait);
  }

  async flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.inFlight) await this.inFlight;
    const snapshot = this.pending;
    if (!snapshot) return true;
    this.pending = null;
    this.status({ state: 'saving' });
    this.inFlight = request(this.serverUrl, this.savePath, {
      method: 'PUT',
      token: this.token,
      body: snapshot,
      timeoutMs: 8000,
    })
      .then((result) => {
        this.lastUpload = Date.now();
        this.status({ state: 'synced', updatedAt: result.updatedAt });
        return true;
      })
      .catch((error) => {
        // Keep the newest snapshot and try again later.
        this.pending = this.pending || snapshot;
        this.status({ state: error.status === 401 ? 'signed-out' : 'offline', message: error.message });
        if (error.status !== 401 && !this.timer) this.timer = setTimeout(() => this.flush(), RETRY_MS);
        return false;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  // Upload whatever is pending, but never hold up closing the game for long.
  flushWithin(ms) {
    return Promise.race([this.flush(), new Promise((resolve) => setTimeout(() => resolve(false), ms))]);
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

module.exports = { CloudSync };
