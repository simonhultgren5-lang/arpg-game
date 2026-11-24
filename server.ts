import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  archiveFallenHero,
  deleteHeroSave,
  depositStashItem,
  getGlobalServerStats,
  getUserPreferences,
  listDungeonRuns,
  listFallenHeroes,
  listGlobalLeaderboard,
  listHeroSaves,
  listStashItems,
  recordDungeonRun,
  upsertHeroSave,
  upsertUserPreferences,
  withdrawStashItem,
} from './src/db/repository.ts';
import type { BuildSummary } from './src/db/schema.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeBuildSummary(raw: unknown): BuildSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const equipmentRaw = Array.isArray(record.equipment) ? record.equipment : [];
  const equipment = equipmentRaw
    .slice(0, 12)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.slice(0, 48) : 'Unknown Gear',
      slot: Math.max(0, Math.min(10, Math.trunc(Number(item.slot) || 0))),
      rarity: Math.max(0, Math.min(5, Math.trunc(Number(item.rarity) || 0))),
      icon: typeof item.icon === 'string' ? item.icon.slice(0, 8) : undefined,
      itemLevel: Number.isFinite(Number(item.itemLevel))
        ? Math.max(1, Math.trunc(Number(item.itemLevel)))
        : undefined,
      stats:
        item.stats && typeof item.stats === 'object' && !Array.isArray(item.stats)
          ? Object.fromEntries(
              Object.entries(item.stats as Record<string, unknown>)
                .filter(([, v]) => Number.isFinite(Number(v)))
                .slice(0, 12)
                .map(([k, v]) => [k.slice(0, 24), Number(v)])
            )
          : undefined,
    }));

  const loadout = Array.isArray(record.loadout)
    ? record.loadout
        .slice(0, 6)
        .map((v) => Math.trunc(Number(v)))
        .filter((v) => Number.isFinite(v))
    : undefined;

  return { equipment, loadout };
}

const BASE_ADMIN_EMAILS = ['simonhultgren@gmail.com', 'simonhultgren5@gmail.com'];

function isAdminEmail(email?: string | null, emailVerified?: boolean): boolean {
  if (!email || emailVerified === false) return false;
  const normalized = email.trim().toLowerCase();
  const extra = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return BASE_ADMIN_EMAILS.includes(normalized) || extra.includes(normalized);
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    res.json({
      user: {
        uid: req.dbUser.uid,
        email: req.dbUser.email,
        displayName: req.dbUser.displayName,
        isAdmin: isAdminEmail(req.dbUser.email, req.user?.email_verified),
      },
    });
  });

  app.get('/api/admin/stats', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (!isAdminEmail(req.dbUser.email, req.user?.email_verified)) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    try {
      const stats = await getGlobalServerStats();
      res.json({ stats });
    } catch (error) {
      console.error('GET /api/admin/stats failed:', error);
      res.status(500).json({ error: 'Failed to load global server statistics.' });
    }
  });

  app.get('/api/preferences', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    try {
      const prefs = await getUserPreferences(req.dbUser.id);
      res.json({ preferences: prefs });
    } catch (error) {
      console.error('GET /api/preferences failed:', error);
      res.status(500).json({ error: 'Failed to load preferences.' });
    }
  });

  app.put('/api/preferences', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body ?? {};
    const muted = typeof body.muted === 'boolean' ? body.muted : false;
    const rawVol = Number(body.volume);
    const volume = Number.isFinite(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 0.8;
    const highPerformance = typeof body.highPerformance === 'boolean' ? body.highPerformance : false;
    const rawScale = Number(body.uiScale);
    const uiScale = Number.isFinite(rawScale)
      ? Math.round(Math.max(0.8, Math.min(1.25, rawScale)) * 100) / 100
      : 1;
    const autoSalvage =
      body.autoSalvage === 'common' || body.autoSalvage === 'magic' ? body.autoSalvage : 'off';

    try {
      const saved = await upsertUserPreferences(req.dbUser.id, {
        muted,
        volume,
        highPerformance,
        uiScale,
        autoSalvage,
      });
      res.json({ preferences: saved });
    } catch (error) {
      console.error('PUT /api/preferences failed:', error);
      res.status(500).json({ error: 'Failed to save preferences.' });
    }
  });

  app.get('/api/saves', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    try {
      const saves = await listHeroSaves(req.dbUser.id);
      res.json({ saves });
    } catch (error) {
      console.error('GET /api/saves failed:', error);
      res.status(500).json({ error: 'Failed to load saved heroes.' });
    }
  });

  app.post('/api/saves', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body ?? {};
    const slotKey =
      typeof body.slotKey === 'string' && body.slotKey.trim()
        ? body.slotKey.trim().slice(0, 40)
        : 'primary';
    const heroName =
      typeof body.heroName === 'string' && body.heroName.trim()
        ? body.heroName.trim().slice(0, 32)
        : 'Varg';
    const heroLevel = Math.max(1, Math.min(999, Math.trunc(Number(body.heroLevel) || 1)));
    const currentDepth = Math.max(1, Math.min(999, Math.trunc(Number(body.currentDepth) || 1)));
    const bestDepth = Math.max(currentDepth, Math.min(999, Math.trunc(Number(body.bestDepth) || 1)));

    const rawSnapshot = body.snapshot;
    if (!rawSnapshot || typeof rawSnapshot !== 'object' || Array.isArray(rawSnapshot)) {
      res.status(400).json({ error: 'Valid game snapshot data is required.' });
      return;
    }

    const sanitizedSnapshot: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawSnapshot as Record<string, unknown>)) {
      if (typeof value === 'string') {
        sanitizedSnapshot[key] = value;
      }
    }

    try {
      const save = await upsertHeroSave(req.dbUser.id, {
        slotKey,
        heroName,
        heroLevel,
        currentDepth,
        bestDepth,
        snapshot: sanitizedSnapshot,
      });
      res.json({ save });
    } catch (error) {
      console.error('POST /api/saves failed:', error);
      res.status(500).json({ error: 'Failed to save hero progress.' });
    }
  });

  app.delete('/api/saves/:id', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const saveId = Number(req.params.id);
    if (!Number.isInteger(saveId) || saveId <= 0) {
      res.status(400).json({ error: 'Invalid save ID.' });
      return;
    }

    try {
      const deleted = await deleteHeroSave(req.dbUser.id, saveId);
      if (!deleted) {
        res.status(404).json({ error: 'Save slot not found.' });
        return;
      }
      res.json({ deletedId: saveId });
    } catch (error) {
      console.error('DELETE /api/saves/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete save slot.' });
    }
  });

  app.get('/api/runs', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    try {
      const runs = await listDungeonRuns(req.dbUser.id);
      res.json({ runs });
    } catch (error) {
      console.error('GET /api/runs failed:', error);
      res.status(500).json({ error: 'Failed to load dungeon runs.' });
    }
  });

  app.get('/api/leaderboard', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const modeParam = typeof req.query.mode === 'string' ? req.query.mode : 'all';
    const runMode = ['all', 'standard', 'daily', 'hardcore'].includes(modeParam)
      ? modeParam
      : 'all';
    const challengeDate =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : undefined;

    try {
      const entries = await listGlobalLeaderboard({ limit: 15, runMode, challengeDate });
      res.json({ leaderboard: entries });
    } catch (error) {
      console.error('GET /api/leaderboard failed:', error);
      res.status(500).json({ error: 'Failed to load leaderboard.' });
    }
  });

  app.post('/api/runs', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body ?? {};
    const heroName =
      typeof body.heroName === 'string' && body.heroName.trim()
        ? body.heroName.trim().slice(0, 32)
        : 'Varg';
    const heroLevel = Math.max(1, Math.min(999, Math.trunc(Number(body.heroLevel) || 1)));
    const depthReached = Math.max(1, Math.min(999, Math.trunc(Number(body.depthReached) || 1)));
    const runMode =
      typeof body.runMode === 'string' && ['standard', 'daily', 'hardcore'].includes(body.runMode)
        ? body.runMode
        : 'standard';
    const challengeDate =
      typeof body.challengeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.challengeDate)
        ? body.challengeDate
        : null;
    const buildSummary = sanitizeBuildSummary(body.buildSummary);
    const notes =
      typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 120) : undefined;

    try {
      const run = await recordDungeonRun(req.dbUser.id, {
        heroName,
        heroLevel,
        depthReached,
        runMode,
        challengeDate,
        buildSummary,
        notes,
      });
      res.status(201).json({ run });
    } catch (error) {
      console.error('POST /api/runs failed:', error);
      res.status(500).json({ error: 'Failed to record dungeon run.' });
    }
  });

  app.get('/api/fallen', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    try {
      const fallen = await listFallenHeroes(req.dbUser.id);
      res.json({ fallen });
    } catch (error) {
      console.error('GET /api/fallen failed:', error);
      res.status(500).json({ error: 'Failed to load fallen heroes.' });
    }
  });

  app.post('/api/fallen', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body ?? {};
    const heroName =
      typeof body.heroName === 'string' && body.heroName.trim()
        ? body.heroName.trim().slice(0, 32)
        : 'Varg';
    const heroLevel = Math.max(1, Math.min(999, Math.trunc(Number(body.heroLevel) || 1)));
    const depthReached = Math.max(1, Math.min(999, Math.trunc(Number(body.depthReached) || 1)));
    const causeOfDeath =
      typeof body.causeOfDeath === 'string' && body.causeOfDeath.trim()
        ? body.causeOfDeath.trim().slice(0, 120)
        : 'Slain in the dungeon';
    const slotKey =
      typeof body.slotKey === 'string' && body.slotKey.trim()
        ? body.slotKey.trim().slice(0, 40)
        : undefined;
    const buildSummary = sanitizeBuildSummary(body.buildSummary);

    try {
      const memorial = await archiveFallenHero(req.dbUser.id, {
        heroName,
        heroLevel,
        depthReached,
        causeOfDeath,
        buildSummary,
        slotKey,
      });
      res.status(201).json({ fallen: memorial });
    } catch (error) {
      console.error('POST /api/fallen failed:', error);
      res.status(500).json({ error: 'Failed to archive fallen hero.' });
    }
  });

  app.get('/api/stash', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    try {
      const items = await listStashItems(req.dbUser.id);
      res.json({ items });
    } catch (error) {
      console.error('GET /api/stash failed:', error);
      res.status(500).json({ error: 'Failed to load shared stash.' });
    }
  });

  app.post('/api/stash', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body ?? {};
    const itemData = body.itemData;
    if (!itemData || typeof itemData !== 'object' || Array.isArray(itemData)) {
      res.status(400).json({ error: 'Valid item data is required.' });
      return;
    }
    const rawItem = itemData as Record<string, unknown>;
    const itemName =
      typeof rawItem.n === 'string' && rawItem.n.trim()
        ? rawItem.n.trim().slice(0, 48)
        : 'Dungeon Relic';
    const rarity = Math.max(0, Math.min(5, Math.trunc(Number(rawItem.r) || 0)));
    const slot = Math.max(0, Math.min(10, Math.trunc(Number(rawItem.s) || 0)));
    const itemLevel = Math.max(1, Math.min(999, Math.trunc(Number(rawItem.itemLevel) || 1)));

    try {
      const stored = await depositStashItem(req.dbUser.id, {
        itemName,
        rarity,
        slot,
        itemLevel,
        itemData: rawItem,
      });
      res.status(201).json({ item: stored });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to store item.';
      const status = message.includes('full') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/stash/:id', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const stashId = Number(req.params.id);
    if (!Number.isInteger(stashId) || stashId <= 0) {
      res.status(400).json({ error: 'Invalid stash item ID.' });
      return;
    }

    try {
      const withdrawn = await withdrawStashItem(req.dbUser.id, stashId);
      if (!withdrawn) {
        res.status(404).json({ error: 'Stash item not found.' });
        return;
      }
      res.json({ item: withdrawn });
    } catch (error) {
      console.error('DELETE /api/stash/:id failed:', error);
      res.status(500).json({ error: 'Failed to withdraw item.' });
    }
  });

  // The game itself lives in game/ (plain HTML, CSS and JS) and is shared with the desktop app.
  app.use('/game', express.static(path.resolve(__dirname, 'game')));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
