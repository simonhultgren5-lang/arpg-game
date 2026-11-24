import { and, avg, count, desc, eq, gte, isNull, max } from 'drizzle-orm';
import { db, isDatabaseConfigured } from './index.ts';
import {
  accountStash,
  dungeonRuns,
  fallenHeroes,
  heroSaves,
  playerPreferences,
  users,
  type BuildSummary,
} from './schema.ts';

export interface PreferencesInput {
  muted: boolean;
  volume: number;
  highPerformance: boolean;
  uiScale: number;
  autoSalvage: 'off' | 'common' | 'magic';
}

export interface HeroSaveInput {
  slotKey: string;
  heroName: string;
  heroLevel: number;
  currentDepth: number;
  bestDepth: number;
  snapshot: Record<string, string>;
}

export interface DungeonRunInput {
  heroName: string;
  heroLevel: number;
  depthReached: number;
  runMode?: string;
  challengeDate?: string | null;
  buildSummary?: BuildSummary | null;
  notes?: string;
}

export interface FallenHeroInput {
  heroName: string;
  heroLevel: number;
  depthReached: number;
  causeOfDeath?: string;
  buildSummary?: BuildSummary | null;
  slotKey?: string;
}

export interface StashItemInput {
  itemName: string;
  rarity: number;
  slot: number;
  itemLevel: number;
  itemData: Record<string, unknown>;
}

export interface ClassUsageStat {
  id: 'warrior' | 'pyromancer' | 'rogue';
  label: string;
  count: number;
  percentage: number;
}

export interface GlobalServerStats {
  totalUsers: number;
  activeUsers30d: number;
  totalSavedHeroes: number;
  totalDungeonRuns: number;
  avgBestDepthAcrossPlayers: number;
  avgRunDepth: number;
  maxDepthReached: number;
  classDistribution: ClassUsageStat[];
  generatedAt: string;
}

// In-memory mock store used when Cloud SQL / PostgreSQL is not configured
const mockStore = {
  nextId: 1,
  users: new Map<number, typeof users.$inferSelect>(),
  usersByUid: new Map<string, number>(),
  preferences: new Map<number, typeof playerPreferences.$inferSelect>(),
  saves: new Map<number, typeof heroSaves.$inferSelect>(),
  runs: new Map<number, typeof dungeonRuns.$inferSelect>(),
  fallen: new Map<number, typeof fallenHeroes.$inferSelect>(),
  stash: new Map<number, typeof accountStash.$inferSelect>(),
};

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  if (!isDatabaseConfigured) {
    const existingId = mockStore.usersByUid.get(uid);
    const now = new Date();
    if (existingId !== undefined) {
      const existing = mockStore.users.get(existingId)!;
      const updated = { ...existing, email, displayName: displayName || null, updatedAt: now };
      mockStore.users.set(existingId, updated);
      return updated;
    }
    const id = mockStore.nextId++;
    const created: typeof users.$inferSelect = {
      id,
      uid,
      email,
      displayName: displayName || null,
      createdAt: now,
      updatedAt: now,
    };
    mockStore.users.set(id, created);
    mockStore.usersByUid.set(uid, id);
    return created;
  }

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserPreferences(userId: number) {
  if (!isDatabaseConfigured) {
    return mockStore.preferences.get(userId) ?? null;
  }

  try {
    const rows = await db
      .select()
      .from(playerPreferences)
      .where(eq(playerPreferences.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserPreferences:', error);
    throw new Error('Failed to load preferences.', { cause: error });
  }
}

export async function upsertUserPreferences(userId: number, input: PreferencesInput) {
  if (!isDatabaseConfigured) {
    const existing = mockStore.preferences.get(userId);
    const record: typeof playerPreferences.$inferSelect = {
      id: existing?.id ?? mockStore.nextId++,
      userId,
      muted: input.muted,
      volume: input.volume,
      highPerformance: input.highPerformance,
      uiScale: input.uiScale,
      autoSalvage: input.autoSalvage,
      updatedAt: new Date(),
    };
    mockStore.preferences.set(userId, record);
    return record;
  }

  try {
    const rows = await db
      .insert(playerPreferences)
      .values({
        userId,
        muted: input.muted,
        volume: input.volume,
        highPerformance: input.highPerformance,
        uiScale: input.uiScale,
        autoSalvage: input.autoSalvage,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playerPreferences.userId,
        set: {
          muted: input.muted,
          volume: input.volume,
          highPerformance: input.highPerformance,
          uiScale: input.uiScale,
          autoSalvage: input.autoSalvage,
          updatedAt: new Date(),
        },
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database query failed in upsertUserPreferences:', error);
    throw new Error('Failed to save preferences.', { cause: error });
  }
}

export async function listHeroSaves(userId: number) {
  if (!isDatabaseConfigured) {
    return Array.from(mockStore.saves.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  try {
    return await db
      .select()
      .from(heroSaves)
      .where(eq(heroSaves.userId, userId))
      .orderBy(desc(heroSaves.updatedAt));
  } catch (error) {
    console.error('Database query failed in listHeroSaves:', error);
    throw new Error('Failed to load saved heroes.', { cause: error });
  }
}

export async function upsertHeroSave(userId: number, input: HeroSaveInput) {
  if (!isDatabaseConfigured) {
    const existing = Array.from(mockStore.saves.values()).find(
      (s) => s.userId === userId && s.slotKey === input.slotKey
    );
    const id = existing?.id ?? mockStore.nextId++;
    const record: typeof heroSaves.$inferSelect = {
      id,
      userId,
      slotKey: input.slotKey,
      heroName: input.heroName,
      heroLevel: input.heroLevel,
      currentDepth: input.currentDepth,
      bestDepth: input.bestDepth,
      snapshot: input.snapshot,
      updatedAt: new Date(),
    };
    mockStore.saves.set(id, record);
    return record;
  }

  try {
    const rows = await db
      .insert(heroSaves)
      .values({
        userId,
        slotKey: input.slotKey,
        heroName: input.heroName,
        heroLevel: input.heroLevel,
        currentDepth: input.currentDepth,
        bestDepth: input.bestDepth,
        snapshot: input.snapshot,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [heroSaves.userId, heroSaves.slotKey],
        set: {
          heroName: input.heroName,
          heroLevel: input.heroLevel,
          currentDepth: input.currentDepth,
          bestDepth: input.bestDepth,
          snapshot: input.snapshot,
          updatedAt: new Date(),
        },
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database query failed in upsertHeroSave:', error);
    throw new Error('Failed to save hero progress.', { cause: error });
  }
}

export async function deleteHeroSave(userId: number, saveId: number) {
  if (!isDatabaseConfigured) {
    const existing = mockStore.saves.get(saveId);
    if (!existing || existing.userId !== userId) return null;
    mockStore.saves.delete(saveId);
    return existing;
  }

  try {
    const rows = await db
      .delete(heroSaves)
      .where(and(eq(heroSaves.id, saveId), eq(heroSaves.userId, userId)))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in deleteHeroSave:', error);
    throw new Error('Failed to delete saved hero.', { cause: error });
  }
}

export async function listDungeonRuns(userId: number) {
  if (!isDatabaseConfigured) {
    return Array.from(mockStore.runs.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.depthReached - a.depthReached || b.recordedAt.getTime() - a.recordedAt.getTime())
      .slice(0, 20);
  }

  try {
    return await db
      .select()
      .from(dungeonRuns)
      .where(eq(dungeonRuns.userId, userId))
      .orderBy(desc(dungeonRuns.depthReached), desc(dungeonRuns.recordedAt))
      .limit(20);
  } catch (error) {
    console.error('Database query failed in listDungeonRuns:', error);
    throw new Error('Failed to load dungeon run history.', { cause: error });
  }
}

export async function recordDungeonRun(userId: number, input: DungeonRunInput) {
  const runMode = input.runMode || 'standard';
  const challengeDate = input.challengeDate || null;

  if (!isDatabaseConfigured) {
    const existing = Array.from(mockStore.runs.values())
      .filter(
        (r) =>
          r.userId === userId &&
          r.heroName === input.heroName &&
          r.runMode === runMode &&
          r.challengeDate === challengeDate
      )
      .sort((a, b) => b.depthReached - a.depthReached || b.heroLevel - a.heroLevel);

    const top = existing[0];
    const isBossMilestone = Boolean(input.notes && input.notes.toLowerCase().includes('boss'));

    if (!top || input.depthReached > top.depthReached || isBossMilestone) {
      const id = mockStore.nextId++;
      const created: typeof dungeonRuns.$inferSelect = {
        id,
        userId,
        heroName: input.heroName,
        heroLevel: input.heroLevel,
        depthReached: input.depthReached,
        runMode,
        challengeDate,
        buildSummary: input.buildSummary ?? null,
        notes: input.notes ?? null,
        recordedAt: new Date(),
      };
      mockStore.runs.set(id, created);
      return created;
    }

    if (input.heroLevel > top.heroLevel || input.buildSummary) {
      const updated: typeof dungeonRuns.$inferSelect = {
        ...top,
        heroLevel: Math.max(top.heroLevel, input.heroLevel),
        buildSummary: input.buildSummary ?? top.buildSummary,
        notes: input.notes ?? top.notes,
        recordedAt: new Date(),
      };
      mockStore.runs.set(top.id, updated);
      return updated;
    }

    return top;
  }

  try {
    const conditions = [
      eq(dungeonRuns.userId, userId),
      eq(dungeonRuns.heroName, input.heroName),
      eq(dungeonRuns.runMode, runMode),
      challengeDate
        ? eq(dungeonRuns.challengeDate, challengeDate)
        : isNull(dungeonRuns.challengeDate),
    ];

    const existing = await db
      .select()
      .from(dungeonRuns)
      .where(and(...conditions))
      .orderBy(desc(dungeonRuns.depthReached), desc(dungeonRuns.heroLevel))
      .limit(1);

    const top = existing[0];
    const isBossMilestone = Boolean(input.notes && input.notes.toLowerCase().includes('boss'));

    if (!top || input.depthReached > top.depthReached || isBossMilestone) {
      const rows = await db
        .insert(dungeonRuns)
        .values({
          userId,
          heroName: input.heroName,
          heroLevel: input.heroLevel,
          depthReached: input.depthReached,
          runMode,
          challengeDate,
          buildSummary: input.buildSummary ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      return rows[0];
    }

    if (input.heroLevel > top.heroLevel || input.buildSummary) {
      const updated = await db
        .update(dungeonRuns)
        .set({
          heroLevel: Math.max(top.heroLevel, input.heroLevel),
          buildSummary: input.buildSummary ?? top.buildSummary,
          notes: input.notes ?? top.notes,
          recordedAt: new Date(),
        })
        .where(eq(dungeonRuns.id, top.id))
        .returning();
      return updated[0];
    }

    return top;
  } catch (error) {
    console.error('Database query failed in recordDungeonRun:', error);
    throw new Error('Failed to record dungeon run.', { cause: error });
  }
}

export async function listGlobalLeaderboard(options?: {
  limit?: number;
  runMode?: string;
  challengeDate?: string;
}) {
  const limit = Math.max(1, Math.min(50, options?.limit ?? 15));

  if (!isDatabaseConfigured) {
    return Array.from(mockStore.runs.values())
      .filter((r) => {
        if (options?.runMode && options.runMode !== 'all' && r.runMode !== options.runMode) {
          return false;
        }
        if (options?.challengeDate && r.challengeDate !== options.challengeDate) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          b.depthReached - a.depthReached ||
          b.heroLevel - a.heroLevel ||
          b.recordedAt.getTime() - a.recordedAt.getTime()
      )
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        heroName: row.heroName,
        heroLevel: row.heroLevel,
        depthReached: row.depthReached,
        runMode: row.runMode,
        challengeDate: row.challengeDate,
        buildSummary: row.buildSummary,
        notes: row.notes,
        recordedAt: row.recordedAt,
        playerName: mockStore.users.get(row.userId)?.displayName || 'Adventurer',
      }));
  }

  const conditions = [];

  if (options?.runMode && options.runMode !== 'all') {
    conditions.push(eq(dungeonRuns.runMode, options.runMode));
  }
  if (options?.challengeDate) {
    conditions.push(eq(dungeonRuns.challengeDate, options.challengeDate));
  }

  try {
    const query = db
      .select({
        id: dungeonRuns.id,
        heroName: dungeonRuns.heroName,
        heroLevel: dungeonRuns.heroLevel,
        depthReached: dungeonRuns.depthReached,
        runMode: dungeonRuns.runMode,
        challengeDate: dungeonRuns.challengeDate,
        buildSummary: dungeonRuns.buildSummary,
        notes: dungeonRuns.notes,
        recordedAt: dungeonRuns.recordedAt,
        playerName: users.displayName,
      })
      .from(dungeonRuns)
      .innerJoin(users, eq(dungeonRuns.userId, users.id));

    const rows =
      conditions.length > 0
        ? await query
            .where(and(...conditions))
            .orderBy(
              desc(dungeonRuns.depthReached),
              desc(dungeonRuns.heroLevel),
              desc(dungeonRuns.recordedAt)
            )
            .limit(limit)
        : await query
            .orderBy(
              desc(dungeonRuns.depthReached),
              desc(dungeonRuns.heroLevel),
              desc(dungeonRuns.recordedAt)
            )
            .limit(limit);

    return rows.map((row) => ({
      ...row,
      playerName: row.playerName || 'Adventurer',
    }));
  } catch (error) {
    console.error('Database query failed in listGlobalLeaderboard:', error);
    throw new Error('Failed to load leaderboard.', { cause: error });
  }
}

export async function listFallenHeroes(userId: number) {
  if (!isDatabaseConfigured) {
    return Array.from(mockStore.fallen.values())
      .filter((f) => f.userId === userId)
      .sort((a, b) => b.fallenAt.getTime() - a.fallenAt.getTime())
      .slice(0, 20);
  }

  try {
    return await db
      .select()
      .from(fallenHeroes)
      .where(eq(fallenHeroes.userId, userId))
      .orderBy(desc(fallenHeroes.fallenAt))
      .limit(20);
  } catch (error) {
    console.error('Database query failed in listFallenHeroes:', error);
    throw new Error('Failed to load fallen heroes.', { cause: error });
  }
}

export async function archiveFallenHero(userId: number, input: FallenHeroInput) {
  if (!isDatabaseConfigured) {
    if (input.slotKey) {
      for (const [id, save] of mockStore.saves.entries()) {
        if (save.userId === userId && save.slotKey === input.slotKey) {
          mockStore.saves.delete(id);
        }
      }
    }
    const id = mockStore.nextId++;
    const record: typeof fallenHeroes.$inferSelect = {
      id,
      userId,
      heroName: input.heroName,
      heroLevel: input.heroLevel,
      depthReached: input.depthReached,
      causeOfDeath: input.causeOfDeath ?? null,
      buildSummary: input.buildSummary ?? null,
      fallenAt: new Date(),
    };
    mockStore.fallen.set(id, record);
    return record;
  }

  try {
    if (input.slotKey) {
      await db
        .delete(heroSaves)
        .where(and(eq(heroSaves.userId, userId), eq(heroSaves.slotKey, input.slotKey)));
    }

    const rows = await db
      .insert(fallenHeroes)
      .values({
        userId,
        heroName: input.heroName,
        heroLevel: input.heroLevel,
        depthReached: input.depthReached,
        causeOfDeath: input.causeOfDeath ?? null,
        buildSummary: input.buildSummary ?? null,
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database query failed in archiveFallenHero:', error);
    throw new Error('Failed to archive fallen hero.', { cause: error });
  }
}

export async function listStashItems(userId: number) {
  if (!isDatabaseConfigured) {
    return Array.from(mockStore.stash.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.storedAt.getTime() - a.storedAt.getTime())
      .slice(0, 24);
  }

  try {
    return await db
      .select()
      .from(accountStash)
      .where(eq(accountStash.userId, userId))
      .orderBy(desc(accountStash.storedAt))
      .limit(24);
  } catch (error) {
    console.error('Database query failed in listStashItems:', error);
    throw new Error('Failed to load shared stash.', { cause: error });
  }
}

export async function depositStashItem(userId: number, input: StashItemInput) {
  if (!isDatabaseConfigured) {
    const existing = Array.from(mockStore.stash.values()).filter((s) => s.userId === userId);
    if (existing.length >= 24) {
      throw new Error('Shared stash is full (24 items max).');
    }
    const id = mockStore.nextId++;
    const record: typeof accountStash.$inferSelect = {
      id,
      userId,
      itemName: input.itemName,
      rarity: input.rarity,
      slot: input.slot,
      itemLevel: input.itemLevel,
      itemData: input.itemData,
      storedAt: new Date(),
    };
    mockStore.stash.set(id, record);
    return record;
  }

  try {
    const existing = await db
      .select({ id: accountStash.id })
      .from(accountStash)
      .where(eq(accountStash.userId, userId));

    if (existing.length >= 24) {
      throw new Error('Shared stash is full (24 items max).');
    }

    const rows = await db
      .insert(accountStash)
      .values({
        userId,
        itemName: input.itemName,
        rarity: input.rarity,
        slot: input.slot,
        itemLevel: input.itemLevel,
        itemData: input.itemData,
      })
      .returning();

    return rows[0];
  } catch (error) {
    if (error instanceof Error && error.message.includes('Shared stash is full')) {
      throw error;
    }
    console.error('Database query failed in depositStashItem:', error);
    throw new Error('Failed to store item in shared stash.', { cause: error });
  }
}

export async function withdrawStashItem(userId: number, stashId: number) {
  if (!isDatabaseConfigured) {
    const existing = mockStore.stash.get(stashId);
    if (!existing || existing.userId !== userId) return null;
    mockStore.stash.delete(stashId);
    return existing;
  }

  try {
    const rows = await db
      .delete(accountStash)
      .where(and(eq(accountStash.id, stashId), eq(accountStash.userId, userId)))
      .returning();

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in withdrawStashItem:', error);
    throw new Error('Failed to withdraw item from shared stash.', { cause: error });
  }
}

function detectHeroClassFromSnapshot(
  snapshot: Record<string, string> | null | undefined
): 'warrior' | 'pyromancer' | 'rogue' {
  if (!snapshot || typeof snapshot !== 'object') return 'warrior';
  const rawClass = typeof snapshot.dodClass === 'string' ? snapshot.dodClass.trim().toLowerCase() : '';
  if (rawClass === 'pyromancer' || rawClass === 'rogue' || rawClass === 'warrior') {
    return rawClass;
  }
  try {
    if (typeof snapshot.mdjup === 'string' && snapshot.mdjup) {
      const parsed = JSON.parse(snapshot.mdjup) as { eq?: Array<{ weaponClass?: unknown } | null> };
      const weaponClass =
        typeof parsed?.eq?.[0]?.weaponClass === 'string'
          ? parsed.eq[0].weaponClass.trim().toLowerCase()
          : '';
      if (weaponClass === 'pyromancer' || weaponClass === 'rogue') return weaponClass;
    }
  } catch {
    // Fallback to warrior on malformed snapshot JSON
  }
  return 'warrior';
}

function computeStatsFromRows(
  totalUsers: number,
  activeUsers30d: number,
  saveRows: Array<{ userId: number; bestDepth: number; snapshot: Record<string, string> }>,
  totalDungeonRuns: number,
  rawAvgRunDepth: number,
  maxRunDepth: number,
  runPerUserRows: Array<{ userId: number; maxDepth: number | null }>
): GlobalServerStats {
  const classCounts: Record<'warrior' | 'pyromancer' | 'rogue', number> = {
    warrior: 0,
    pyromancer: 0,
    rogue: 0,
  };

  const playerPeakDepth = new Map<number, number>();
  let maxSaveDepth = 0;

  for (const row of saveRows) {
    const cls = detectHeroClassFromSnapshot(row.snapshot);
    classCounts[cls] += 1;
    const depth = Math.max(1, Number(row.bestDepth) || 1);
    if (depth > maxSaveDepth) maxSaveDepth = depth;
    const prev = playerPeakDepth.get(row.userId) ?? 0;
    if (depth > prev) playerPeakDepth.set(row.userId, depth);
  }

  for (const row of runPerUserRows) {
    const depth = Math.max(1, Number(row.maxDepth) || 1);
    const prev = playerPeakDepth.get(row.userId) ?? 0;
    if (depth > prev) playerPeakDepth.set(row.userId, depth);
  }

  const totalHeroes = saveRows.length;
  const classLabels: Record<'warrior' | 'pyromancer' | 'rogue', string> = {
    warrior: 'Warrior',
    pyromancer: 'Pyromancer',
    rogue: 'Shadow Rogue',
  };

  const classDistribution: ClassUsageStat[] = (
    ['warrior', 'pyromancer', 'rogue'] as const
  )
    .map((id) => ({
      id,
      label: classLabels[id],
      count: classCounts[id],
      percentage: totalHeroes > 0 ? Math.round((classCounts[id] / totalHeroes) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const peakDepthValues = Array.from(playerPeakDepth.values());
  const avgBestDepthAcrossPlayers =
    peakDepthValues.length > 0
      ? Math.round(
          (peakDepthValues.reduce((sum, d) => sum + d, 0) / peakDepthValues.length) * 10
        ) / 10
      : 0;

  const avgRunDepth = Number.isFinite(rawAvgRunDepth)
    ? Math.round(rawAvgRunDepth * 10) / 10
    : 0;
  const maxDepthReached = Math.max(maxSaveDepth, maxRunDepth);

  return {
    totalUsers,
    activeUsers30d,
    totalSavedHeroes: totalHeroes,
    totalDungeonRuns,
    avgBestDepthAcrossPlayers,
    avgRunDepth,
    maxDepthReached,
    classDistribution,
    generatedAt: new Date().toISOString(),
  };
}

export async function getGlobalServerStats(): Promise<GlobalServerStats> {
  if (!isDatabaseConfigured) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allUsers = Array.from(mockStore.users.values());
    const activeUsers30d = allUsers.filter((u) => u.updatedAt.getTime() >= thirtyDaysAgo).length;
    const saveRows = Array.from(mockStore.saves.values()).map((s) => ({
      userId: s.userId,
      bestDepth: s.bestDepth,
      snapshot: s.snapshot,
    }));
    const allRuns = Array.from(mockStore.runs.values());
    const totalDungeonRuns = allRuns.length;
    const rawAvgRunDepth =
      totalDungeonRuns > 0
        ? allRuns.reduce((sum, r) => sum + r.depthReached, 0) / totalDungeonRuns
        : 0;
    const maxRunDepth = allRuns.reduce((m, r) => Math.max(m, r.depthReached), 0);
    const runPerUserMap = new Map<number, number>();
    for (const r of allRuns) {
      runPerUserMap.set(r.userId, Math.max(runPerUserMap.get(r.userId) ?? 0, r.depthReached));
    }
    const runPerUserRows = Array.from(runPerUserMap.entries()).map(([userId, maxDepth]) => ({
      userId,
      maxDepth,
    }));
    return computeStatsFromRows(
      allUsers.length,
      activeUsers30d,
      saveRows,
      totalDungeonRuns,
      rawAvgRunDepth,
      maxRunDepth,
      runPerUserRows
    );
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [userTotalsRows, activeUsersRows, saveRows, runAggregateRows, runPerUserRows] =
      await Promise.all([
        db.select({ total: count() }).from(users),
        db
          .select({ total: count() })
          .from(users)
          .where(gte(users.updatedAt, thirtyDaysAgo)),
        db
          .select({
            userId: heroSaves.userId,
            bestDepth: heroSaves.bestDepth,
            snapshot: heroSaves.snapshot,
          })
          .from(heroSaves),
        db
          .select({
            totalRuns: count(),
            avgDepth: avg(dungeonRuns.depthReached),
            maxDepth: max(dungeonRuns.depthReached),
          })
          .from(dungeonRuns),
        db
          .select({
            userId: dungeonRuns.userId,
            maxDepth: max(dungeonRuns.depthReached),
          })
          .from(dungeonRuns)
          .groupBy(dungeonRuns.userId),
      ]);

    const totalUsers = Number(userTotalsRows[0]?.total ?? 0);
    const activeUsers30d = Number(activeUsersRows[0]?.total ?? 0);
    const totalDungeonRuns = Number(runAggregateRows[0]?.totalRuns ?? 0);
    const rawAvgRunDepth = Number(runAggregateRows[0]?.avgDepth ?? 0);
    const maxRunDepth = Number(runAggregateRows[0]?.maxDepth ?? 0);

    return computeStatsFromRows(
      totalUsers,
      activeUsers30d,
      saveRows,
      totalDungeonRuns,
      rawAvgRunDepth,
      maxRunDepth,
      runPerUserRows
    );
  } catch (error) {
    console.error('Database query failed in getGlobalServerStats:', error);
    throw new Error('Failed to load global server statistics.', { cause: error });
  }
}
