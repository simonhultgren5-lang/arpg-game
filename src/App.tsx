/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Crown,
  Download,
  Lock,
  LogIn,
  LogOut,
  PackagePlus,
  RefreshCw,
  Save,
  Shield,
  Skull,
  SlidersHorizontal,
  Swords,
  Trash2,
  Trophy,
  Users,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { GameBridgeWindow, useGamePreferences } from './hooks/useGamePreferences';
import { HeroAvatar } from './components/HeroAvatar';
import {
  applyGameSnapshot,
  archiveFallenHeroRun,
  BESTIARY_CATALOG,
  captureBuildSummary,
  captureGameSnapshot,
  deleteCloudHeroSave,
  depositToAccountStash,
  extractHeroAvatarProfile,
  fetchAccountStash,
  fetchAdminServerStats,
  fetchCloudPreferences,
  fetchCurrentUser,
  fetchDungeonRuns,
  fetchFallenHeroes,
  fetchGlobalLeaderboard,
  fetchHeroSaves,
  getMonsterDifficulty,
  getMonsterMilestoneState,
  getTodayUtcDate,
  readBestiaryKills,
  recordDungeonRun,
  saveCloudPreferences,
  saveHeroToCloud,
  withdrawFromAccountStash,
  type BuildSummary,
  type DungeonRunRecord,
  type FallenHeroRecord,
  type GameStashBridgeWindow,
  type GlobalServerStats,
  type HeroSaveRecord,
  type LeaderboardEntry,
  type RunMode,
  type StashItemRecord,
} from './lib/gameCloudSync';

const GAME_ASSET_PATH = '/game/index.html';
const RUN_MODE_STORAGE_KEY = 'dodRunModeV1';

function workshopRunActive() {
  return Boolean(localStorage.getItem('dodAdminHeroBackupV1') || localStorage.getItem('dodWhirlTrialBackupV1'));
}

const workshopCloudNotice = 'Restore your original hero in the Admin Workshop to use cloud saves and the account stash.';

const RARITY_COLOR: Record<number, string> = {
  0: '#b7a894',
  1: '#86c5ff',
  2: '#f0d473',
  3: '#e89b45',
  4: '#d67bff',
};

function readInitialRunMode(): RunMode {
  try {
    const raw = JSON.parse(localStorage.getItem(RUN_MODE_STORAGE_KEY) || 'null') as {
      runMode?: unknown;
    } | null;
    if (raw && (raw.runMode === 'standard' || raw.runMode === 'daily' || raw.runMode === 'hardcore')) {
      return raw.runMode;
    }
  } catch {
    // Ignore storage read issues
  }
  return 'standard';
}

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const readyDoneRef = useRef(false);
  const prefsHydratedUidRef = useRef<string | null>(null);
  const skipNextCloudPrefWriteRef = useRef(false);

  const [loadError, setLoadError] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'fading' | 'ready'>('loading');
  const [loadProgress, setLoadProgress] = useState(14);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'cloud'>('settings');
  const [cloudView, setCloudView] = useState<'heroes' | 'stash' | 'leaderboard' | 'bestiary'>('heroes');
  const [bestiaryFilter, setBestiaryFilter] = useState<'defeated' | 'all'>('defeated');
  const [selectedBossKey, setSelectedBossKey] = useState<string | null>(null);
  const [selectedMilestoneTier, setSelectedMilestoneTier] = useState<Record<string, number>>({});
  const [equippedTitle, setEquippedTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('dodSlayerTitleV1') || '';
    } catch {
      return '';
    }
  });
  const [bestiaryKills, setBestiaryKills] = useState<Record<string, number>>(() =>
    readBestiaryKills()
  );
  const [heroClassLabel, setHeroClassLabel] = useState<'WARRIOR' | 'PYROMANCER' | 'ROGUE'>('WARRIOR');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'daily' | 'hardcore'>('all');
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [runMode, setRunMode] = useState<RunMode>(() => readInitialRunMode());
  const [iframeKey, setIframeKey] = useState(0);

  const [cloudLoading, setCloudLoading] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [stashBusy, setStashBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState<GlobalServerStats | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminStatsError, setAdminStatsError] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [heroSaves, setHeroSaves] = useState<HeroSaveRecord[]>([]);
  const [dungeonRuns, setDungeonRuns] = useState<DungeonRunRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [fallenHeroes, setFallenHeroes] = useState<FallenHeroRecord[]>([]);
  const [stashItems, setStashItems] = useState<StashItemRecord[]>([]);
  const [backpackItems, setBackpackItems] = useState<
    Array<{ index: number; item: Record<string, unknown> }>
  >([]);

  const { user, loading: authLoading, signingIn, authError, signInWithGoogle, signOutUser, getToken } =
    useAuth();

  const {
    preferences,
    toggleMute,
    setVolumePercent,
    setHighPerformance,
    toggleHighPerformance,
    setUiScalePercent,
    setAutoSalvage,
    toggleAutoSalvage,
    resetPreferences,
    applyPreferences,
    syncToWindow,
    lastNonZeroVolumeRef,
  } = useGamePreferences();

  const focusGame = useCallback(() => {
    try {
      iframeRef.current?.focus();
      iframeRef.current?.contentWindow?.focus();
    } catch {
      // Ignore cross-context focus restrictions
    }
  }, []);

  // When the in-game pause menu opens Options, focus the panel so Esc closes it instead of reaching the game.
  const focusPanelOnOpenRef = useRef(false);
  useEffect(() => {
    if (!panelOpen || !focusPanelOnOpenRef.current) return;
    focusPanelOnOpenRef.current = false;
    controlRef.current?.querySelector<HTMLButtonElement>('section button')?.focus();
  }, [panelOpen]);

  useEffect(() => {
    syncToWindow(iframeRef.current?.contentWindow, preferences);
  }, [preferences, syncToWindow]);

  const syncAdminToGame = useCallback((adminEnabled: boolean) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dod:set-admin', isAdmin: adminEnabled },
        window.location.origin
      );
    } catch {
      // Ignore postMessage before load
    }
  }, []);

  const syncAdminStatsToGame = useCallback(
    (statsPayload: GlobalServerStats | null, adminEnabled = isAdmin) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'dod:set-admin-stats', stats: adminEnabled ? statsPayload : null },
          window.location.origin
        );
      } catch {
        // Ignore postMessage before load
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    syncAdminToGame(isAdmin);
  }, [isAdmin, syncAdminToGame]);

  useEffect(() => {
    syncAdminStatsToGame(adminStats, isAdmin);
  }, [adminStats, isAdmin, syncAdminStatsToGame]);

  const refreshAdminStats = useCallback(async () => {
    if (!user || !isAdmin) return;
    setAdminStatsLoading(true);
    setAdminStatsError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetchAdminServerStats(token);
      setAdminStats(res.stats);
      syncAdminStatsToGame(res.stats, true);
    } catch (error) {
      setAdminStatsError(
        error instanceof Error ? error.message : 'Unable to load global server stats.'
      );
    } finally {
      setAdminStatsLoading(false);
    }
  }, [getToken, isAdmin, syncAdminStatsToGame, user]);

  const handleOpenAdmin = useCallback(() => {
    if (!isAdmin) return;
    setPanelOpen(false);
    void refreshAdminStats();
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dod:open-admin' },
        window.location.origin
      );
    } catch {
      // Ignore postMessage errors
    }
    focusGame();
  }, [focusGame, isAdmin, refreshAdminStats]);

  const handleStartEndgame = useCallback(() => {
    if (!isAdmin) return;
    setPanelOpen(false);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dod:start-endgame' },
        window.location.origin
      );
    } catch {
      // Ignore postMessage errors
    }
    focusGame();
  }, [focusGame, isAdmin]);

  const refreshBackpack = useCallback(() => {
    try {
      const bridge = iframeRef.current?.contentWindow as GameStashBridgeWindow | null | undefined;
      if (bridge?.dodStash?.listInventory) {
        setBackpackItems(bridge.dodStash.listInventory());
      } else {
        setBackpackItems([]);
      }
    } catch {
      setBackpackItems([]);
    }
  }, []);

  const refreshBestiaryAndMeta = useCallback(() => {
    try {
      const win = iframeRef.current?.contentWindow;
      setBestiaryKills(readBestiaryKills(win));
      const clsRaw =
        (win as (Window & { dodHeroClass?: string }) | null | undefined)?.dodHeroClass ||
        win?.localStorage?.getItem('dodClass') ||
        window.localStorage.getItem('dodClass');
      if (clsRaw === 'pyromancer') setHeroClassLabel('PYROMANCER');
      else if (clsRaw === 'rogue') setHeroClassLabel('ROGUE');
      else setHeroClassLabel('WARRIOR');
    } catch {
      setBestiaryKills(readBestiaryKills());
    }
  }, []);

  useEffect(() => {
    if (panelOpen && activeTab === 'cloud') {
      if (cloudView === 'stash') refreshBackpack();
      if (cloudView === 'bestiary') refreshBestiaryAndMeta();
    }
  }, [activeTab, cloudView, panelOpen, refreshBackpack, refreshBestiaryAndMeta]);

  const bestiaryList = useMemo(() => {
    const merged = BESTIARY_CATALOG.map((entry) => ({
      ...entry,
      kills: Number(bestiaryKills[entry.key]) || 0,
    }));
    const knownKeys = new Set(BESTIARY_CATALOG.map((e) => e.key));
    for (const [key, val] of Object.entries(bestiaryKills)) {
      const kills = Math.max(0, Math.floor(Number(val) || 0));
      if (!knownKeys.has(key) && kills > 0) {
        merged.push({
          key,
          icon: '☠️',
          tier: 'Monster',
          depths: 'Unknown',
          lore: 'Encountered in the shifting depths.',
          kills,
        });
      }
    }
    return merged;
  }, [bestiaryKills]);

  const encounteredCount = useMemo(
    () => bestiaryList.filter((m) => m.kills > 0).length,
    [bestiaryList]
  );

  const totalBestiaryKills = useMemo(
    () => bestiaryList.reduce((acc, m) => acc + m.kills, 0),
    [bestiaryList]
  );

  const majorBosses = useMemo(
    () => bestiaryList.filter((m) => m.isMajorBoss),
    [bestiaryList]
  );

  const bossesSlainCount = useMemo(
    () => majorBosses.filter((m) => m.kills > 0).length,
    [majorBosses]
  );

  const activeBossEntry = useMemo(() => {
    if (selectedBossKey) {
      return majorBosses.find((b) => b.key === selectedBossKey) ?? null;
    }
    return majorBosses.find((b) => b.kills > 0) ?? majorBosses[0] ?? null;
  }, [majorBosses, selectedBossKey]);

  const milestoneSummary = useMemo(() => {
    const unlockedTitles: Array<{ monsterKey: string; threshold: number; title: string }> = [];
    let totalMilestones = 0;
    for (const monster of bestiaryList) {
      if (!monster.milestones?.length) continue;
      totalMilestones += monster.milestones.length;
      for (const m of monster.milestones) {
        if (monster.kills >= m.threshold) {
          unlockedTitles.push({ monsterKey: monster.key, threshold: m.threshold, title: m.title });
        }
      }
    }
    return {
      totalMilestones,
      unlockedCount: unlockedTitles.length,
      unlockedTitles,
    };
  }, [bestiaryList]);

  const effectiveSlayerTitle = useMemo(() => {
    const unlockedSet = new Set(milestoneSummary.unlockedTitles.map((t) => t.title));
    if (equippedTitle && unlockedSet.has(equippedTitle)) return equippedTitle;
    return milestoneSummary.unlockedTitles[milestoneSummary.unlockedTitles.length - 1]?.title ?? '';
  }, [equippedTitle, milestoneSummary.unlockedTitles]);

  const handleEquipSlayerTitle = useCallback((nextTitle: string) => {
    setEquippedTitle(nextTitle);
    try {
      if (nextTitle) {
        localStorage.setItem('dodSlayerTitleV1', nextTitle);
        iframeRef.current?.contentWindow?.localStorage?.setItem('dodSlayerTitleV1', nextTitle);
      } else {
        localStorage.removeItem('dodSlayerTitleV1');
        iframeRef.current?.contentWindow?.localStorage?.removeItem('dodSlayerTitleV1');
      }
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dod:set-slayer-title', title: nextTitle },
        window.location.origin
      );
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleSelectRunMode = useCallback((nextMode: RunMode) => {
    const challengeDate = nextMode === 'daily' ? getTodayUtcDate() : null;
    setRunMode(nextMode);
    setCloudNotice(
      nextMode === 'daily'
        ? `Switched to Daily Challenge (${challengeDate}).`
        : nextMode === 'hardcore'
          ? 'Switched to Hardcore Mode (permadeath active).'
          : 'Switched to Standard Mode.'
    );
    try {
      localStorage.setItem(
        RUN_MODE_STORAGE_KEY,
        JSON.stringify({ runMode: nextMode, challengeDate })
      );
      const win = iframeRef.current?.contentWindow as GameStashBridgeWindow | null | undefined;
      win?.postMessage(
        { type: 'dod:set-run-mode', runMode: nextMode, challengeDate },
        window.location.origin
      );
    } catch {
      // Ignore bridge error before load
    }
  }, []);

  const refreshLeaderboard = useCallback(
    async (filter: 'all' | 'daily' | 'hardcore') => {
      if (!user) return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchGlobalLeaderboard(token, {
          mode: filter,
          date: filter === 'daily' ? getTodayUtcDate() : undefined,
        });
        setLeaderboard(res.leaderboard);
      } catch {
        // Ignore transient filter error
      }
    },
    [getToken, user]
  );

  useEffect(() => {
    if (user && prefsHydratedUidRef.current === user.uid) {
      void refreshLeaderboard(leaderboardFilter);
    }
  }, [leaderboardFilter, refreshLeaderboard, user]);

  const loadCloudData = useCallback(async () => {
    if (!user) {
      prefsHydratedUidRef.current = null;
      setIsAdmin(false);
      setAdminStats(null);
      setAdminStatsError(null);
      setHeroSaves([]);
      setDungeonRuns([]);
      setLeaderboard([]);
      setFallenHeroes([]);
      setStashItems([]);
      return;
    }

    setCloudLoading(true);
    setCloudError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const [meRes, prefRes, savesRes, runsRes, leaderboardRes, fallenRes, stashRes] =
        await Promise.all([
          fetchCurrentUser(token),
          fetchCloudPreferences(token),
          fetchHeroSaves(token),
          fetchDungeonRuns(token),
          fetchGlobalLeaderboard(token, {
            mode: leaderboardFilter,
            date: leaderboardFilter === 'daily' ? getTodayUtcDate() : undefined,
          }),
          fetchFallenHeroes(token),
          fetchAccountStash(token),
        ]);

      const adminAuthorized = Boolean(meRes.user?.isAdmin);
      setIsAdmin(adminAuthorized);
      if (adminAuthorized) {
        try {
          const statsRes = await fetchAdminServerStats(token);
          setAdminStats(statsRes.stats);
          setAdminStatsError(null);
        } catch (statsErr) {
          setAdminStatsError(
            statsErr instanceof Error ? statsErr.message : 'Unable to load server stats.'
          );
        }
      } else {
        setAdminStats(null);
        setAdminStatsError(null);
      }

      if (prefRes.preferences) {
        skipNextCloudPrefWriteRef.current = true;
        applyPreferences(prefRes.preferences);
      } else {
        await saveCloudPreferences(token, preferences);
      }

      prefsHydratedUidRef.current = user.uid;
      setHeroSaves(savesRes.saves);
      setDungeonRuns(runsRes.runs);
      setLeaderboard(leaderboardRes.leaderboard);
      setFallenHeroes(fallenRes.fallen);
      setStashItems(stashRes.items);
    } catch (error) {
      setIsAdmin(false);
      setAdminStats(null);
      setCloudError(error instanceof Error ? error.message : 'Unable to sync account data.');
    } finally {
      setCloudLoading(false);
    }
  }, [applyPreferences, getToken, leaderboardFilter, preferences, user]);

  useEffect(() => {
    if (user && prefsHydratedUidRef.current !== user.uid) {
      void loadCloudData();
    } else if (!user) {
      prefsHydratedUidRef.current = null;
      setIsAdmin(false);
      setHeroSaves([]);
      setDungeonRuns([]);
      setLeaderboard([]);
      setFallenHeroes([]);
      setStashItems([]);
      setCloudNotice(null);
      setCloudError(null);
    }
  }, [loadCloudData, user]);

  useEffect(() => {
    if (!user || prefsHydratedUidRef.current !== user.uid) return;
    if (skipNextCloudPrefWriteRef.current) {
      skipNextCloudPrefWriteRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await saveCloudPreferences(token, preferences);
      } catch {
        // Keep local preferences working even if cloud sync fails temporarily
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [getToken, preferences, user]);

  const handleSaveHero = useCallback(async () => {
    if (!user) return;
    if (workshopRunActive()) {
      setCloudError(workshopCloudNotice);
      return;
    }
    setCloudNotice(null);
    setCloudError(null);

    const win = iframeRef.current?.contentWindow;
    const captured = captureGameSnapshot(win);
    if (!captured) {
      setCloudError('Create or enter the dungeon with a hero first before saving.');
      return;
    }

    const slug =
      captured.heroName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'primary';
    const slotPrefix = runMode === 'standard' ? 'hero' : runMode;
    const buildSummary = captureBuildSummary(win);
    const challengeDate = runMode === 'daily' ? getTodayUtcDate() : null;

    setSavingHero(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again to save.');

      const [{ save }, { run }, leaderboardRes] = await Promise.all([
        saveHeroToCloud(token, {
          slotKey: `${slotPrefix}-${slug}`,
          ...captured,
        }),
        recordDungeonRun(token, {
          heroName: captured.heroName,
          heroLevel: captured.heroLevel,
          depthReached: captured.bestDepth,
          runMode,
          challengeDate,
          buildSummary,
          notes: `Checkpoint at Depth ${captured.currentDepth}`,
        }),
        fetchGlobalLeaderboard(token, {
          mode: leaderboardFilter,
          date: leaderboardFilter === 'daily' ? getTodayUtcDate() : undefined,
        }),
      ]);

      setHeroSaves((prev) => [save, ...prev.filter((item) => item.id !== save.id)]);
      setDungeonRuns((prev) => {
        const filtered = prev.filter((item) => item.id !== run.id);
        return [run, ...filtered].sort((a, b) => b.depthReached - a.depthReached).slice(0, 20);
      });
      setLeaderboard(leaderboardRes.leaderboard);
      setCloudNotice(`Saved ${save.heroName} (Lv. ${save.heroLevel}, Depth ${save.currentDepth}).`);
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Failed to save hero.');
    } finally {
      setSavingHero(false);
    }
  }, [getToken, leaderboardFilter, runMode, user]);

  const handleAutoCheckpoint = useCallback(
    async (
      reason: string,
      depth: number,
      modeOverride?: RunMode,
      challengeOverride?: string | null,
      summaryOverride?: BuildSummary | null
    ) => {
      if (!user || workshopRunActive()) return;
      const win = iframeRef.current?.contentWindow;
      const captured = captureGameSnapshot(win);
      if (!captured) return;

      const activeMode = modeOverride ?? runMode;
      const challengeDate =
        activeMode === 'daily' ? challengeOverride || getTodayUtcDate() : null;
      const buildSummary = summaryOverride ?? captureBuildSummary(win);
      const slug =
        captured.heroName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'primary';
      const slotPrefix = activeMode === 'standard' ? 'hero' : activeMode;

      try {
        const token = await getToken();
        if (!token) return;

        const [{ save }, { run }, leaderboardRes] = await Promise.all([
          saveHeroToCloud(token, {
            slotKey: `${slotPrefix}-${slug}`,
            ...captured,
          }),
          recordDungeonRun(token, {
            heroName: captured.heroName,
            heroLevel: captured.heroLevel,
            depthReached: captured.bestDepth,
            runMode: activeMode,
            challengeDate,
            buildSummary,
            notes:
              reason === 'boss' ? `Boss Defeated · Depth ${depth}` : `Reached Depth ${depth}`,
          }),
          fetchGlobalLeaderboard(token, {
            mode: leaderboardFilter,
            date: leaderboardFilter === 'daily' ? getTodayUtcDate() : undefined,
          }),
        ]);

        setHeroSaves((prev) => [save, ...prev.filter((item) => item.id !== save.id)]);
        setDungeonRuns((prev) => {
          const filtered = prev.filter((item) => item.id !== run.id);
          return [run, ...filtered].sort((a, b) => b.depthReached - a.depthReached).slice(0, 20);
        });
        setLeaderboard(leaderboardRes.leaderboard);
      } catch {
        // Auto-sync runs silently in the background
      }
    },
    [getToken, leaderboardFilter, runMode, user]
  );

  const handleHeroFallen = useCallback(
    async (payload: {
      heroName: string;
      heroLevel: number;
      depthReached: number;
      causeOfDeath?: string;
      buildSummary?: BuildSummary | null;
    }) => {
      if (!user || workshopRunActive()) return;
      const slug =
        payload.heroName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'primary';
      const slotKey = `hardcore-${slug}`;

      try {
        const token = await getToken();
        if (!token) return;
        const { fallen } = await archiveFallenHeroRun(token, {
          ...payload,
          slotKey,
        });
        setFallenHeroes((prev) => [fallen, ...prev]);
        setHeroSaves((prev) => prev.filter((s) => s.slotKey !== slotKey));
        setCloudNotice(`${fallen.heroName} has entered the Hall of Fallen Heroes.`);
      } catch {
        // Ignore archival network failure during death screen
      }
    },
    [getToken, user]
  );

  const handleDepositItem = useCallback(
    async (index: number) => {
      if (!user) return;
      if (workshopRunActive()) {
        setCloudError(workshopCloudNotice);
        return;
      }
      const bridge = iframeRef.current?.contentWindow as GameStashBridgeWindow | null | undefined;
      if (!bridge?.dodStash) return;

      setCloudError(null);
      setCloudNotice(null);
      const removed = bridge.dodStash.popInventoryItem(index);
      if (!removed) return;

      setStashBusy(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Please sign in again.');
        const { item } = await depositToAccountStash(token, removed);
        setStashItems((prev) => [item, ...prev]);
        refreshBackpack();
        setCloudNotice(`Stored ${item.itemName} in Account Stash.`);
      } catch (error) {
        bridge.dodStash.giveItem(removed);
        refreshBackpack();
        setCloudError(error instanceof Error ? error.message : 'Failed to store item.');
      } finally {
        setStashBusy(false);
      }
    },
    [getToken, refreshBackpack, user]
  );

  const handleWithdrawItem = useCallback(
    async (stashItem: StashItemRecord) => {
      if (!user) return;
      if (workshopRunActive()) {
        setCloudError(workshopCloudNotice);
        return;
      }
      const bridge = iframeRef.current?.contentWindow as GameStashBridgeWindow | null | undefined;
      if (!bridge?.dodStash) return;

      setCloudError(null);
      setCloudNotice(null);
      setStashBusy(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Please sign in again.');

        const ok = bridge.dodStash.giveItem(stashItem.itemData);
        if (!ok) {
          throw new Error('Hero backpack is full (24 items max).');
        }

        await withdrawFromAccountStash(token, stashItem.id);
        setStashItems((prev) => prev.filter((i) => i.id !== stashItem.id));
        refreshBackpack();
        setCloudNotice(`Claimed ${stashItem.itemName} into backpack.`);
      } catch (error) {
        setCloudError(error instanceof Error ? error.message : 'Failed to withdraw item.');
      } finally {
        setStashBusy(false);
      }
    },
    [getToken, refreshBackpack, user]
  );

  const handleLoadHero = useCallback((save: HeroSaveRecord) => {
    if (workshopRunActive()) {
      setCloudError(workshopCloudNotice);
      return;
    }
    setCloudNotice(null);
    setCloudError(null);
    applyGameSnapshot(save.snapshot, iframeRef.current?.contentWindow);
    readyDoneRef.current = false;
    setLoadProgress(25);
    setLoadingPhase('loading');
    setIframeKey((k) => k + 1);
    setPanelOpen(false);
    setCloudNotice(`Loaded ${save.heroName}.`);
  }, []);

  const handleDeleteHero = useCallback(
    async (saveId: number) => {
      if (!user) return;
      setCloudNotice(null);
      setCloudError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Please sign in again.');
        await deleteCloudHeroSave(token, saveId);
        setHeroSaves((prev) => prev.filter((item) => item.id !== saveId));
      } catch (error) {
        setCloudError(error instanceof Error ? error.message : 'Failed to delete save.');
      }
    },
    [getToken, user]
  );

  const playTestSound = useCallback(() => {
    const win = iframeRef.current?.contentWindow as GameBridgeWindow | null | undefined;
    if (!win) return;
    try {
      if (preferences.muted || preferences.volume <= 0) {
        const restoredPercent = Math.round((lastNonZeroVolumeRef.current || 0.8) * 100);
        setVolumePercent(restoredPercent);
        win.dodAudio?.setAudio(false, restoredPercent / 100);
      }
      win.dodAudio?.testSound();
      win.postMessage({ type: 'dod:test-audio' }, window.location.origin);
    } catch {
      // Ignore audio test errors
    }
  }, [lastNonZeroVolumeRef, preferences.muted, preferences.volume, setVolumePercent]);

  const completeLoading = useCallback(() => {
    if (readyDoneRef.current) return;
    readyDoneRef.current = true;
    setLoadProgress(100);
    window.setTimeout(() => {
      setLoadingPhase('fading');
      window.setTimeout(() => {
        setLoadingPhase('ready');
      }, 220);
    }, 140);
  }, []);

  useEffect(() => {
    if (loadingPhase !== 'loading' || loadError) return;
    const interval = window.setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 88) return prev;
        const step = prev < 45 ? 8 : prev < 72 ? 4 : 1.5;
        return Math.min(88, Number((prev + step).toFixed(1)));
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [loadingPhase, loadError]);

  useEffect(() => {
    const handleWindowFocus = () => {
      if (!panelOpen) focusGame();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'dod:toggle-mute') {
        toggleMute();
      } else if (event.data.type === 'dod:open-settings') {
        // Opened from the in-game pause menu: move focus out of the game frame so Esc reaches this panel.
        focusPanelOnOpenRef.current = true;
        setActiveTab('settings');
        setPanelOpen(true);
      } else if (event.data.type === 'dod:loot-filter-changed') {
        const nextMode = event.data.autoSalvage;
        if (nextMode === 'off' || nextMode === 'common' || nextMode === 'magic') {
          applyPreferences({ autoSalvage: nextMode });
        }
      } else if (event.data.type === 'dod:ready') {
        completeLoading();
        refreshBestiaryAndMeta();
        syncAdminToGame(isAdmin);
        syncAdminStatsToGame(adminStats, isAdmin);
      } else if (event.data.type === 'dod:request-admin-stats') {
        if (isAdmin) {
          void refreshAdminStats();
        }
      } else if (event.data.type === 'dod:bestiary-updated') {
        if (event.data.bestiary && typeof event.data.bestiary === 'object') {
          const clean: Record<string, number> = {};
          for (const [k, v] of Object.entries(event.data.bestiary as Record<string, unknown>)) {
            const c = Math.max(0, Math.floor(Number(v) || 0));
            if (c > 0) clean[k] = c;
          }
          setBestiaryKills(clean);
        } else {
          refreshBestiaryAndMeta();
        }
      } else if (event.data.type === 'dod:slayer-title-changed') {
        const nextTitle = typeof event.data.title === 'string' ? event.data.title : '';
        setEquippedTitle(nextTitle);
        try {
          if (nextTitle) localStorage.setItem('dodSlayerTitleV1', nextTitle);
          else localStorage.removeItem('dodSlayerTitleV1');
        } catch {
          // Ignore storage error
        }
      } else if (event.data.type === 'dod:checkpoint') {
        refreshBestiaryAndMeta();
        const reason = typeof event.data.reason === 'string' ? event.data.reason : 'floor';
        const depth = Number(event.data.currentDepth) || 1;
        const modeVal =
          event.data.runMode === 'daily' || event.data.runMode === 'hardcore'
            ? (event.data.runMode as RunMode)
            : 'standard';
        const challengeDate =
          typeof event.data.challengeDate === 'string' ? event.data.challengeDate : null;
        const buildSummary = (event.data.buildSummary as BuildSummary | undefined) ?? null;
        void handleAutoCheckpoint(reason, depth, modeVal, challengeDate, buildSummary);
      } else if (event.data.type === 'dod:hero-fallen') {
        void handleHeroFallen({
          heroName: String(event.data.heroName || 'Varg'),
          heroLevel: Number(event.data.heroLevel) || 1,
          depthReached: Number(event.data.depthReached) || 1,
          causeOfDeath:
            typeof event.data.causeOfDeath === 'string' ? event.data.causeOfDeath : undefined,
          buildSummary: (event.data.buildSummary as BuildSummary | undefined) ?? null,
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (event.key.toLowerCase() === 'm' && !event.repeat) {
        event.preventDefault();
        toggleMute();
      } else if (event.key === 'Escape' && panelOpen) {
        setPanelOpen(false);
        focusGame();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (panelOpen && controlRef.current && !controlRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
        focusGame();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [
    applyPreferences,
    completeLoading,
    focusGame,
    handleAutoCheckpoint,
    handleHeroFallen,
    panelOpen,
    refreshBestiaryAndMeta,
    toggleMute,
  ]);

  const effectivePercent = preferences.muted ? 0 : Math.round(preferences.volume * 100);
  const uiScalePercent = Math.round(preferences.uiScale * 100);
  const VolumeIcon =
    preferences.muted || effectivePercent === 0 ? VolumeX : effectivePercent < 50 ? Volume1 : Volume2;
  const roundedProgress = Math.round(loadProgress);
  const loadingStageLabel =
    roundedProgress >= 100
      ? 'Ready'
      : roundedProgress >= 55
        ? 'Preparing world'
        : 'Loading';

  if (loadError) {
    return (
      <main className="grid h-dvh w-screen place-items-center bg-[#090807] p-6 text-[#d4cfc7]">
        <section className="max-w-md border border-[#c9a24a] bg-[#0f0c0e] p-6 text-center">
          <h1 className="font-editorial text-3xl font-semibold text-[#c9a24a]">
            Depths of Darkness
          </h1>
          <p className="mt-2 text-sm text-[#bfb097]">
            The game file could not be loaded. Reload to try again.
          </p>
          <button
            type="button"
            onClick={() => {
              readyDoneRef.current = false;
              setLoadProgress(14);
              setLoadingPhase('loading');
              setLoadError(false);
            }}
            className="font-archive-mono mt-4 border border-[#c9a24a] bg-[#090807] px-4 py-2 text-xs uppercase text-[#c9a24a] transition-colors hover:bg-[#c9a24a] hover:text-[#090807] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
          >
            Reload Game
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#090807] text-[#d4cfc7] selection:bg-[#c9a24a] selection:text-[#090807] md:grid md:grid-cols-[288px_1fr] lg:grid-cols-[320px_1fr]">
      <aside
        className="hidden md:flex md:flex-col md:justify-between border-r border-[#d4cfc7]/[0.08] p-7 lg:p-8"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(201, 162, 74, 0.05) 0%, transparent 50%)',
        }}
      >
        <div>
          <span className="font-archive-mono block text-[10.5px] uppercase tracking-[0.15em] text-[#d4cfc7]/80">
            TALE 001
          </span>
          <h1 className="font-editorial mt-2 mb-7 text-[3.1rem] lg:text-[3.5rem] leading-[0.85] font-semibold tracking-[-0.02em] text-[#c9a24a]">
            Depths
            <br />
            of
            <br />
            Darkness
          </h1>
          <p className="font-editorial border-l border-[#c9a24a] pl-5 text-[1.1rem] leading-[1.4] italic text-[#d4cfc7]/70">
            A dark fantasy top-down dungeon crawler with procedural depths, warrior abilities,
            talent builds, and loot progression.
          </p>
        </div>

        <div className="font-archive-mono text-[10.5px] uppercase tracking-[0.15em]">
          <ul className="mt-8 space-y-4">
            <li className="flex justify-between border-b border-[#d4cfc7]/[0.08] pb-2">
              <span className="text-[#d4cfc7]/70">REALM</span>
              <span className="text-[#d4cfc7]">PROCEDURAL</span>
            </li>
            <li className="flex justify-between gap-2 border-b border-[#d4cfc7]/[0.08] pb-2">
              <span className="text-[#d4cfc7]/70">HERO</span>
              <span className="truncate text-right text-[#d4cfc7]">
                {heroClassLabel}
                {effectiveSlayerTitle ? ` · ${effectiveSlayerTitle}` : ''}
              </span>
            </li>
            <li className="flex justify-between border-b border-[#d4cfc7]/[0.08] pb-2">
              <span className="text-[#d4cfc7]/70">MODE</span>
              <span className="text-[#d4cfc7]">
                {runMode === 'daily' ? 'DAILY' : runMode === 'hardcore' ? 'HARDCORE' : 'STANDARD'}
              </span>
            </li>
          </ul>
          <div className="mt-7 text-[#d4cfc7]/40">© 2025 ARCHIVE SYST.</div>
        </div>
      </aside>

      <main className="relative flex h-full flex-col overflow-hidden p-0 md:p-4">
        <div
          className="pointer-events-none absolute top-4 right-4 z-10 hidden opacity-20 md:block"
          aria-hidden="true"
        >
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeDasharray="4 4"
            />
            <path d="M50 0 L50 100 M0 50 L100 50" stroke="currentColor" />
          </svg>
        </div>

        <div className="relative flex-1 overflow-hidden border-0 bg-[#090807] md:border md:border-[#c9a24a] md:shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={GAME_ASSET_PATH}
            title="Depths of Darkness"
            className="block h-full w-full border-0 bg-[#090807]"
            onLoad={() => {
              syncToWindow(iframeRef.current?.contentWindow, preferences);
              syncAdminToGame(isAdmin);
              syncAdminStatsToGame(adminStats, isAdmin);
              refreshBestiaryAndMeta();
              focusGame();
              window.setTimeout(completeLoading, 260);
            }}
            onError={() => setLoadError(true)}
            allow="autoplay; fullscreen"
          />

          {loadingPhase !== 'ready' && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Loading Depths of Darkness"
              className={`absolute inset-0 z-40 grid place-items-center bg-[#090807] px-6 transition-opacity duration-200 ${
                loadingPhase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
            >
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <div className="relative grid h-24 w-24 place-items-center">
              <svg
                viewBox="0 0 96 96"
                className="h-24 w-24 text-[#c9a24a] motion-safe:animate-[spin_6s_linear_infinite]"
                aria-hidden="true"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.22"
                  strokeWidth="2"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="64 200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="33"
                  fill="none"
                  stroke="#ff8a1f"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                  strokeDasharray="10 14"
                />
              </svg>

              <svg
                viewBox="0 0 48 48"
                className="absolute h-10 w-10 text-[#e8c987]"
                aria-hidden="true"
              >
                <path d="M24 6 L27 29 L24 34 L21 29 Z" fill="currentColor" />
                <path d="M17 29 H31" stroke="#ff8a1f" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M24 34 V41" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h1
              className="mt-5 text-2xl font-semibold tracking-wider text-[#e8c987]"
              style={{ fontFamily: 'Georgia, serif', textWrap: 'balance' }}
            >
              Depths of Darkness
            </h1>

            <div className="mt-5 w-full">
              <div className="flex items-center justify-between text-xs text-[#b7a894]">
                <span>{loadingStageLabel}</span>
                <span className="font-mono tabular-nums text-[#e8c987]">{roundedProgress}%</span>
              </div>

              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={roundedProgress}
                aria-label="Game initialization progress"
                className="mt-2 h-2 w-full overflow-hidden rounded-[2px] border border-[#4a3a2d] bg-[#161113]"
              >
                <div
                  className="h-full w-full origin-left rounded-[1px] bg-[#c9a24a] transition-transform duration-150 ease-out"
                  style={{ transform: `scaleX(${loadProgress / 100})` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

          <div
            ref={controlRef}
            className="absolute bottom-3 right-3 z-50 flex flex-col items-end gap-2 md:bottom-5 md:right-5"
          >
        {panelOpen && (
          <section
            aria-label="Game settings and cloud saves"
            className="max-h-[82dvh] w-[20.5rem] overflow-y-auto rounded-[3px] border border-[#8a6d45] bg-[#0f0c0e] p-3.5 text-[#f2e7cf] shadow-[0_12px_28px_rgba(0,0,0,0.88)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#3c2f27] pb-2">
              <h2 className="text-sm font-semibold tracking-wide text-[#ead08b]">Options</h2>
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  focusGame();
                }}
                aria-label="Close game options"
                className="grid h-8 w-8 place-items-center rounded-[3px] border border-[#4a3a2d] bg-[#161113] text-[#bfb097] transition-colors hover:border-[#8a6d45] hover:bg-[#1e1614] hover:text-[#f2e7cf] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[3px] border border-[#3c2f27] bg-[#0b090a] p-1">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[2px] border px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                  activeTab === 'settings'
                    ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                    : 'border-transparent text-[#bfb097] hover:text-[#f2e7cf]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cloud')}
                className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[2px] border px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                  activeTab === 'cloud'
                    ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                    : 'border-transparent text-[#bfb097] hover:text-[#f2e7cf]'
                }`}
              >
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cloud</span>
              </button>
            </div>

            {activeTab === 'settings' ? (
              <>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="master-volume-slider" className="text-[#c9b99d]">
                      Master Volume
                    </label>
                    <span
                      className={`font-mono tabular-nums ${
                        preferences.muted || effectivePercent === 0
                          ? 'text-[#d88c82]'
                          : 'text-[#e8c987]'
                      }`}
                    >
                      {preferences.muted ? 'Muted' : `${effectivePercent}%`}
                    </span>
                  </div>

                  <input
                    id="master-volume-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={effectivePercent}
                    onChange={(e) => setVolumePercent(Number(e.target.value))}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-[2px] bg-[#241b19] accent-[#c9a24a] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                  />

                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 100].map((preset) => {
                      const active = !preferences.muted && effectivePercent === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setVolumePercent(preset)}
                          className={`min-h-[32px] rounded-[2px] border px-1.5 py-1 text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                            active
                              ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                              : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                          }`}
                        >
                          {preset}%
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[2px] border border-[#594635] bg-[#1e1614] px-3 py-1.5 text-xs font-medium text-[#f2e7cf] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                    >
                      <VolumeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{preferences.muted ? 'Unmute' : 'Mute'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={playTestSound}
                      className="min-h-[36px] rounded-[2px] border border-[#594635] bg-[#161113] px-3 py-1.5 text-xs font-medium text-[#ead08b] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                    >
                      Test Sound
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 border-t border-[#3c2f27] pt-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs font-medium text-[#f2e7cf]">
                        High Performance
                      </span>
                      <span className="block text-[11px] text-[#9e8f7a]">
                        Simplified visual effects
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.highPerformance}
                      aria-label="High Performance mode"
                      onClick={toggleHighPerformance}
                      className={`flex min-h-[34px] min-w-[64px] items-center justify-center rounded-[2px] border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                        preferences.highPerformance
                          ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                          : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                      }`}
                    >
                      {preferences.highPerformance ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="mt-3.5 border-t border-[#3c2f27] pt-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-medium text-[#f2e7cf]">
                          Auto-Salvage Junk
                        </span>
                        <span className="block text-[11px] text-[#9e8f7a]">
                          Convert low-rarity drops into Salvage &amp; Gold
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={preferences.autoSalvage !== 'off'}
                        aria-label="Auto-Salvage Junk"
                        onClick={toggleAutoSalvage}
                        className={`flex min-h-[34px] min-w-[64px] items-center justify-center rounded-[2px] border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                          preferences.autoSalvage !== 'off'
                            ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                            : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                        }`}
                      >
                        {preferences.autoSalvage !== 'off' ? 'On' : 'Off'}
                      </button>
                    </div>

                    {preferences.autoSalvage !== 'off' && (
                      <div className="mt-2.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              ['common', 'Common Only'],
                              ['magic', 'Common + Magic'],
                            ] as const
                          ).map(([mode, label]) => {
                            const active = preferences.autoSalvage === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setAutoSalvage(mode)}
                                className={`min-h-[30px] rounded-[2px] border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                                  active
                                    ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                                    : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#9e8f7a]">
                          {preferences.autoSalvage === 'magic'
                            ? 'Converts Common (+2 Salvage, +3g) & Magic (+4 Salvage, +7g); keeps Uniques & Sets.'
                            : 'Converts Common (+2 Salvage, +3g) drops on pickup; keeps Magic+ & Uniques.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="ui-scale-slider" className="text-[#c9b99d]">
                        UI Scale
                      </label>
                      <span className="font-mono tabular-nums text-[#ead08b]">
                        {uiScalePercent}%
                      </span>
                    </div>
                    <input
                      id="ui-scale-slider"
                      type="range"
                      min={80}
                      max={125}
                      step={5}
                      value={uiScalePercent}
                      onChange={(e) => setUiScalePercent(Number(e.target.value))}
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-[2px] bg-[#241b19] accent-[#c9a24a] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                    />
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {[85, 100, 115].map((preset) => {
                        const active = uiScalePercent === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setUiScalePercent(preset)}
                            className={`min-h-[30px] rounded-[2px] border px-1.5 py-1 text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                              active
                                ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                                : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                            }`}
                          >
                            {preset}%
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#3c2f27] pt-2.5">
                  <a
                    href={GAME_ASSET_PATH}
                    download="depths-of-darkness.html"
                    className="flex min-h-[32px] items-center gap-1.5 rounded-[2px] border border-[#594635] bg-[#1e1614] px-2.5 py-1 text-xs text-[#ead08b] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Download (.html)</span>
                  </a>
                  <button
                    type="button"
                    onClick={resetPreferences}
                    className="min-h-[32px] rounded-[2px] border border-[#4a3a2d] bg-[#161113] px-2.5 py-1 text-xs text-[#bfb097] transition-colors whitespace-nowrap shrink-0 hover:border-[#8a6d45] hover:bg-[#1e1614] hover:text-[#f2e7cf] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                  >
                    Reset Defaults
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#ead08b]">
                    Dungeon Mode
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'standard', label: 'Standard' },
                        { id: 'daily', label: 'Daily Seed' },
                        { id: 'hardcore', label: 'Hardcore' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleSelectRunMode(mode.id)}
                        className={`min-h-[32px] rounded-[2px] border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                          runMode === mode.id
                            ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                            : 'border-[#3c2f27] bg-[#0f0c0e] text-[#bfb097] hover:border-[#8a6d45] hover:text-[#f2e7cf]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#9e8f7a]">
                    {runMode === 'daily'
                      ? `Daily seed (${getTodayUtcDate()}).`
                      : runMode === 'hardcore'
                        ? 'Permadeath enabled.'
                        : 'Standard progression.'}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-1 border-b border-[#3c2f27] pb-2">
                  {(
                    [
                      { id: 'heroes', label: 'Heroes' },
                      { id: 'stash', label: `Stash (${stashItems.length})` },
                      { id: 'leaderboard', label: 'Ranks' },
                      { id: 'bestiary', label: 'Bestiary' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCloudView(tab.id)}
                      className={`min-h-[30px] rounded-[2px] border px-1.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                        cloudView === tab.id
                          ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                          : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:text-[#f2e7cf]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {cloudView === 'bestiary' ? (
                  <div key="bestiary-view" className="bestiary-fade-in space-y-3">
                    <div className="rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ead08b]">
                          <Crown className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                          <span>Boss Kills</span>
                        </h3>
                        <span className="font-mono text-[11px] tabular-nums text-[#bfb097]">
                          {bossesSlainCount}/{majorBosses.length} defeated
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-6 gap-1">
                        {majorBosses.map((boss) => {
                          const defeated = boss.kills > 0;
                          const isSelected = activeBossEntry?.key === boss.key;
                          return (
                            <button
                              key={boss.key}
                              type="button"
                              onClick={() => setSelectedBossKey(boss.key)}
                              aria-pressed={isSelected}
                              aria-label={`${boss.key}: ${defeated ? `${boss.kills} slain` : 'Undefeated'}`}
                              title={`${boss.key} (${boss.depths}) · ${defeated ? `${boss.kills} slain` : 'Undefeated'}`}
                              className={`relative flex h-10 flex-col items-center justify-center rounded-[2px] border transition-colors focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                                isSelected
                                  ? defeated
                                    ? 'border-[#e8c987] bg-[#2c1f19] text-[#f5e3b8]'
                                    : 'border-[#8a6d45] bg-[#1b1514] text-[#bfb097]'
                                  : defeated
                                    ? 'border-[#c9a24a] bg-[#211814] text-[#ead08b] hover:border-[#e8c987]'
                                    : 'border-[#3c2f27] bg-[#0b090a] text-[#9e8f7a] opacity-60 hover:opacity-85'
                              }`}
                            >
                              <span className="text-sm leading-none" aria-hidden="true">
                                {boss.icon}
                              </span>
                              <span className="mt-0.5 flex items-center gap-0.5 font-mono text-[9px] leading-none tabular-nums">
                                {defeated ? (
                                  <>
                                    <Crown
                                      className="h-2.5 w-2.5 text-[#c9a24a]"
                                      aria-hidden="true"
                                    />
                                    <span>{boss.kills}</span>
                                  </>
                                ) : (
                                  <Lock className="h-2.5 w-2.5 text-[#7d6f5e]" aria-hidden="true" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {activeBossEntry && (
                        <div
                          key={activeBossEntry.key}
                          className="bestiary-fade-in mt-2.5 border-t border-[#3c2f27] pt-2.5 text-xs"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="flex items-center gap-1.5 truncate font-medium text-[#ead08b]">
                              <span aria-hidden="true">{activeBossEntry.icon}</span>
                              <span>{activeBossEntry.key}</span>
                            </span>
                            <span
                              className={`flex items-center gap-1 font-mono text-[11px] tabular-nums shrink-0 ${
                                activeBossEntry.kills > 0 ? 'text-[#8ce09b]' : 'text-[#9e8f7a]'
                              }`}
                            >
                              {activeBossEntry.kills > 0 ? (
                                <>
                                  <Swords className="h-3 w-3" aria-hidden="true" />
                                  <span>{activeBossEntry.kills} slain</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" aria-hidden="true" />
                                  <span>Undefeated</span>
                                </>
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-[#9e8f7a]">
                            {activeBossEntry.tier} · {activeBossEntry.depths}
                          </p>

                          {activeBossEntry.kills > 0 ? (
                            <div className="mt-2 space-y-2">
                              {activeBossEntry.dropTable && activeBossEntry.dropTable.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a24a]">
                                    Drop Table
                                  </p>
                                  <ul className="mt-1 space-y-0.5 text-[11px] text-[#d6c9b2]">
                                    {activeBossEntry.dropTable.map((drop, idx) => (
                                      <li key={idx} className="leading-snug">
                                        • {drop}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {activeBossEntry.loreSecret && (
                                <div className="border-t border-[#3c2f27] pt-1.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a24a]">
                                    Unlocked Lore Secret
                                  </p>
                                  <p className="mt-1 text-[11px] leading-relaxed italic text-[#bfb097]">
                                    {activeBossEntry.loreSecret}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9e8f7a]">
                              Defeat {activeBossEntry.key} ({activeBossEntry.depths}) to unlock its
                              drop table and lore secret.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ead08b]">
                          <Award className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                          <span>Milestones</span>
                        </h3>
                        <span className="font-mono text-[11px] tabular-nums text-[#bfb097]">
                          {milestoneSummary.unlockedCount}/{milestoneSummary.totalMilestones} unlocked
                        </span>
                      </div>
                      {milestoneSummary.unlockedTitles.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <label htmlFor="slayer-title-select" className="text-[#9e8f7a]">
                              Active Title
                            </label>
                            <select
                              id="slayer-title-select"
                              value={effectiveSlayerTitle}
                              onChange={(e) => handleEquipSlayerTitle(e.target.value)}
                              className="max-w-[11.5rem] truncate rounded-[2px] border border-[#594635] bg-[#0b090a] px-2 py-1 text-[11px] font-medium text-[#ead08b] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                            >
                              {milestoneSummary.unlockedTitles.map((t) => (
                                <option key={`${t.monsterKey}-${t.threshold}`} value={t.title}>
                                  {t.title} ({t.monsterKey} {t.threshold})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#9e8f7a]">
                          Reach 50, 100, 500, and 1,000 kills on common monsters to unlock Slayer
                          Titles and lore snippets.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[#3c2f27] pt-2.5">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#bfb097]">
                          <BookOpen className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                          <span>Bestiary</span>
                        </h3>
                        <p className="mt-0.5 text-[11px] tabular-nums text-[#9e8f7a]">
                          {encounteredCount}/{bestiaryList.length} defeated · {totalBestiaryKills} slain
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(
                          [
                            { id: 'defeated', label: 'Defeated' },
                            { id: 'all', label: 'All' },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setBestiaryFilter(f.id)}
                            className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                              bestiaryFilter === f.id
                                ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                                : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:text-[#f2e7cf]'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {bestiaryFilter === 'defeated' && encounteredCount === 0 ? (
                      <p
                        key="empty-defeated"
                        className="bestiary-fade-in rounded-[3px] border border-[#3c2f27] bg-[#161113] p-3 text-xs text-[#9e8f7a]"
                      >
                        No monsters defeated yet. Enter the dungeon to record encountered foes and
                        their lore.
                      </p>
                    ) : (
                      <ul key={bestiaryFilter} className="bestiary-fade-in space-y-2">
                        {(bestiaryFilter === 'defeated'
                          ? bestiaryList.filter((m) => m.kills > 0)
                          : bestiaryList
                        ).map((monster) => {
                          const seen = monster.kills > 0;
                          const difficulty = getMonsterDifficulty(monster);
                          const milestoneState = getMonsterMilestoneState(
                            monster.kills,
                            monster.milestones
                          );
                          const hasMilestones = Boolean(monster.milestones?.length);
                          const defaultThreshold =
                            milestoneState.unlocked[milestoneState.unlocked.length - 1]
                              ?.threshold ??
                            monster.milestones?.[0]?.threshold ??
                            50;
                          const activeThreshold =
                            selectedMilestoneTier[monster.key] ?? defaultThreshold;
                          const inspectedMilestone =
                            monster.milestones?.find((m) => m.threshold === activeThreshold) ??
                            null;
                          const inspectedUnlocked = inspectedMilestone
                            ? monster.kills >= inspectedMilestone.threshold
                            : false;

                          return (
                            <li
                              key={monster.key}
                              className={`rounded-[3px] border p-2.5 text-xs ${
                                seen
                                  ? 'border-[#594635] bg-[#161113]'
                                  : 'border-[#3c2f27] bg-[#0b090a] opacity-70'
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate font-medium text-[#ead08b]">
                                  {monster.icon} {monster.key}
                                </span>
                                <span
                                  className={`font-mono text-[11px] tabular-nums shrink-0 ${
                                    seen ? 'text-[#8ce09b]' : 'text-[#9e8f7a]'
                                  }`}
                                >
                                  {seen ? `${monster.kills} slain` : 'Undiscovered'}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-[10px] text-[#9e8f7a]">
                                  {monster.tier} · {monster.depths}
                                  {milestoneState.highestTitle
                                    ? ` · Title: ${milestoneState.highestTitle}`
                                    : ''}
                                </p>
                                <span
                                  title={`Difficulty: ${difficulty.label} (Avg. Depth ${difficulty.avgDepth})`}
                                  className={`inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider whitespace-nowrap shrink-0 ${
                                    difficulty.label === 'Deadly'
                                      ? 'border-[#8f3834] bg-[#211012] text-[#f09b92]'
                                      : difficulty.label === 'Moderate'
                                        ? 'border-[#8a6d45] bg-[#1f1712] text-[#ead08b]'
                                        : 'border-[#4a3a2d] bg-[#12100f] text-[#bfb097]'
                                  }`}
                                >
                                  {difficulty.label === 'Deadly' ? (
                                    <Skull className="h-2.5 w-2.5" aria-hidden="true" />
                                  ) : difficulty.label === 'Moderate' ? (
                                    <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                                  ) : (
                                    <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                                  )}
                                  <span>{difficulty.label}</span>
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#bfb097]">
                                {seen
                                  ? monster.lore
                                  : 'Defeat this foe in the depths to record its entry.'}
                              </p>

                              {hasMilestones && monster.milestones && (
                                <div className="mt-2 border-t border-[#3c2f27] pt-2">
                                  <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
                                    <span className="text-[#bfb097]">
                                      {milestoneState.nextMilestone
                                        ? `Next: ${milestoneState.nextMilestone.title}`
                                        : 'All Milestones Complete'}
                                    </span>
                                    <span className="font-mono text-[#c9a24a]">
                                      {milestoneState.nextMilestone
                                        ? `${monster.kills}/${milestoneState.nextMilestone.threshold}`
                                        : `${monster.kills}/1000+`}
                                    </span>
                                  </div>
                                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-[1px] bg-[#0b090a]">
                                    <div
                                      className="h-full origin-left bg-[#c9a24a] transition-transform duration-200"
                                      style={{
                                        transform: `scaleX(${milestoneState.progressPct / 100})`,
                                      }}
                                    />
                                  </div>

                                  <div className="mt-2 grid grid-cols-4 gap-1">
                                    {monster.milestones.map((m) => {
                                      const unlocked = monster.kills >= m.threshold;
                                      const selected = activeThreshold === m.threshold;
                                      return (
                                        <button
                                          key={m.threshold}
                                          type="button"
                                          onClick={() =>
                                            setSelectedMilestoneTier((prev) => ({
                                              ...prev,
                                              [monster.key]: m.threshold,
                                            }))
                                          }
                                          aria-pressed={selected}
                                          className={`flex min-h-[24px] items-center justify-center gap-1 rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] tabular-nums transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
                                            selected
                                              ? unlocked
                                                ? 'border-[#e8c987] bg-[#2c1f19] text-[#f5e3b8]'
                                                : 'border-[#8a6d45] bg-[#1b1514] text-[#bfb097]'
                                              : unlocked
                                                ? 'border-[#8a6d45] bg-[#211814] text-[#ead08b]'
                                                : 'border-[#3c2f27] bg-[#0b090a] text-[#9e8f7a]'
                                          }`}
                                        >
                                          {unlocked ? (
                                            <Check
                                              className="h-2.5 w-2.5 text-[#8ce09b]"
                                              aria-hidden="true"
                                            />
                                          ) : (
                                            <Lock
                                              className="h-2.5 w-2.5 text-[#7d6f5e]"
                                              aria-hidden="true"
                                            />
                                          )}
                                          <span>{m.threshold}</span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {inspectedMilestone && (
                                    <div
                                      key={`${monster.key}-${inspectedMilestone.threshold}`}
                                      className="bestiary-fade-in mt-1.5 rounded-[2px] border border-[#3c2f27] bg-[#0b090a] px-2 py-1.5 text-[11px]"
                                    >
                                      <p className="font-medium text-[#ead08b]">
                                        {inspectedUnlocked
                                          ? `Title Unlocked: ${inspectedMilestone.title}`
                                          : `Milestone ${inspectedMilestone.threshold}: ${inspectedMilestone.title}`}
                                      </p>
                                      <p className="mt-0.5 leading-relaxed text-[#bfb097]">
                                        {inspectedUnlocked
                                          ? inspectedMilestone.loreSnippet
                                          : `Defeat ${inspectedMilestone.threshold} ${monster.key} (${Math.max(
                                              0,
                                              inspectedMilestone.threshold - monster.kills
                                            )} remaining) to unlock this title and lore snippet.`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : authLoading ? (
                  <p className="py-4 text-center text-xs text-[#bfb097]">Checking account...</p>
                ) : !user ? (
                  <div className="rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-3">
                    <p className="text-xs leading-relaxed text-[#bfb097]">
                      Sign in to sync heroes, Shared Stash, and rankings.
                    </p>
                    {authError && <p className="mt-2 text-xs text-[#e58c82]">{authError}</p>}
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={() => void signInWithGoogle()}
                      className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[2px] border border-[#c9a24a] bg-[#2c1f19] px-3 py-2 text-xs font-medium text-[#f5e3b8] transition-colors whitespace-nowrap shrink-0 hover:bg-[#3a2820] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 rounded-[3px] border border-[#4a3a2d] bg-[#161113] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#ead08b]">
                          {user.displayName || 'Adventurer'}
                        </p>
                        <p className="truncate text-[11px] text-[#9e8f7a]">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void signOutUser()}
                        aria-label="Sign out"
                        title="Sign out"
                        className="flex min-h-[32px] items-center gap-1 rounded-[2px] border border-[#594635] bg-[#1e1614] px-2.5 py-1 text-xs text-[#f2e7cf] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={savingHero || cloudLoading}
                      onClick={() => void handleSaveHero()}
                      className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[2px] border border-[#c9a24a] bg-[#2c1f19] px-3 py-2 text-xs font-medium text-[#f5e3b8] transition-colors whitespace-nowrap shrink-0 hover:bg-[#3a2820] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      <span>{savingHero ? 'Saving Hero...' : 'Save Current Hero'}</span>
                    </button>

                    {isAdmin && (
                      <div className="space-y-2.5 rounded-[3px] border border-[#c9a24a]/70 bg-[#181210] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ead08b]">
                            <Shield className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                            Admin Tools
                          </span>
                          <span className="font-mono text-[10px] text-[#9e8f7a]">Authorized</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={handleOpenAdmin}
                            className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-[2px] border border-[#8a6d45] bg-[#1e1614] px-2 py-1 text-[11px] font-medium text-[#ead08b] transition-colors hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                          >
                            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Admin Panel</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartEndgame}
                            className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-[2px] border border-[#c9a24a] bg-[#2c1f19] px-2 py-1 text-[11px] font-medium text-[#f5e3b8] transition-colors hover:bg-[#3a2820] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                          >
                            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Endgame + Gear</span>
                          </button>
                        </div>

                        <div className="border-t border-[#3c2f27] pt-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#c9a24a]">
                              <BarChart3 className="h-3 w-3" aria-hidden="true" />
                              Global Server Statistics
                            </span>
                            <button
                              type="button"
                              disabled={adminStatsLoading}
                              onClick={() => void refreshAdminStats()}
                              aria-label="Refresh global server statistics"
                              className="inline-flex items-center gap-1 rounded-[2px] border border-[#4a3a2d] bg-[#120e0f] px-1.5 py-0.5 text-[10px] text-[#bfb097] transition-colors hover:border-[#c9a24a] hover:text-[#ead08b] disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`h-2.5 w-2.5 ${adminStatsLoading ? 'animate-spin' : ''}`}
                                aria-hidden="true"
                              />
                              <span>{adminStatsLoading ? 'Loading' : 'Refresh'}</span>
                            </button>
                          </div>

                          {adminStatsError ? (
                            <p className="mt-1.5 text-[11px] text-[#e58c82]">{adminStatsError}</p>
                          ) : !adminStats ? (
                            <p className="mt-1.5 text-[11px] text-[#9e8f7a]">
                              Loading global telemetry...
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div className="rounded-[2px] border border-[#3c2f27] bg-[#120e10] p-1.5">
                                  <span className="flex items-center justify-center gap-1 text-[9.5px] text-[#9e8f7a]">
                                    <Users className="h-2.5 w-2.5 text-[#c9a24a]" aria-hidden="true" />
                                    Active
                                  </span>
                                  <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#ead08b]">
                                    {adminStats.activeUsers30d}
                                  </p>
                                  <p className="font-mono text-[9px] tabular-nums text-[#9e8f7a]">
                                    of {adminStats.totalUsers} users
                                  </p>
                                </div>
                                <div className="rounded-[2px] border border-[#3c2f27] bg-[#120e10] p-1.5">
                                  <span className="block text-[9.5px] text-[#9e8f7a]">
                                    Avg Depth
                                  </span>
                                  <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#ead08b]">
                                    {adminStats.avgBestDepthAcrossPlayers}
                                  </p>
                                  <p className="font-mono text-[9px] tabular-nums text-[#9e8f7a]">
                                    Run avg {adminStats.avgRunDepth}
                                  </p>
                                </div>
                                <div className="rounded-[2px] border border-[#3c2f27] bg-[#120e10] p-1.5">
                                  <span className="block text-[9.5px] text-[#9e8f7a]">
                                    Peak Depth
                                  </span>
                                  <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[#ead08b]">
                                    {adminStats.maxDepthReached}
                                  </p>
                                  <p className="font-mono text-[9px] tabular-nums text-[#9e8f7a]">
                                    {adminStats.totalDungeonRuns} runs
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-[#bfb097]">
                                  <span>Most Played Classes</span>
                                  <span className="font-mono tabular-nums text-[#9e8f7a]">
                                    {adminStats.totalSavedHeroes} heroes
                                  </span>
                                </div>
                                {adminStats.classDistribution.map((cls) => (
                                  <div key={cls.id} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[10.5px]">
                                      <span className="text-[#f2e7cf]">{cls.label}</span>
                                      <span className="font-mono tabular-nums text-[#ead08b]">
                                        {cls.count} ({cls.percentage}%)
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-[1px] bg-[#0b090a]">
                                      <div
                                        className="h-full bg-[#c9a24a] transition-all duration-200"
                                        style={{ width: `${cls.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {cloudNotice && (
                      <p className="rounded-[2px] border border-[#8a6d45] bg-[#161113] px-2.5 py-1.5 text-[11px] text-[#ead08b]">
                        {cloudNotice}
                      </p>
                    )}
                    {cloudError && (
                      <p className="rounded-[2px] border border-[#6e3531] bg-[#1f1012] px-2.5 py-1.5 text-[11px] text-[#e58c82]">
                        {cloudError}
                      </p>
                    )}

                    {cloudView === 'heroes' && (
                      <>
                        <div>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#bfb097]">
                            Saved Heroes
                          </h3>
                          {cloudLoading && heroSaves.length === 0 ? (
                            <p className="mt-2 text-xs text-[#9e8f7a]">Loading saves...</p>
                          ) : heroSaves.length === 0 ? (
                            <p className="mt-2 text-xs text-[#9e8f7a]">
                              No cloud hero saves yet. Enter the dungeon and save your hero.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {heroSaves.map((save) => {
                                const profile = extractHeroAvatarProfile(save);
                                return (
                                  <li
                                    key={save.id}
                                    className="flex items-center justify-between gap-2.5 rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2.5"
                                  >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      <HeroAvatar profile={profile} size={44} />
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-[#f2e7cf]">
                                          {save.heroName}
                                        </p>
                                        <p className="truncate text-[11px] tabular-nums text-[#bfb097]">
                                          {profile.classLabel} · Lv.{profile.heroLevel} · D
                                          {profile.currentDepth}
                                        </p>
                                        <p className="truncate font-mono text-[10px] tabular-nums text-[#9e8f7a]">
                                          {profile.power} PWR · {profile.defense} DEF ·{' '}
                                          {profile.cunning}% CUN
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleLoadHero(save)}
                                        className="flex min-h-[30px] items-center gap-1 rounded-[2px] border border-[#594635] bg-[#1e1614] px-2 py-1 text-[11px] font-medium text-[#ead08b] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                                      >
                                        <Download className="h-3 w-3" aria-hidden="true" />
                                        <span>Load</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteHero(save.id)}
                                        aria-label={`Delete ${save.heroName}`}
                                        className="grid h-[30px] w-[30px] place-items-center rounded-[2px] border border-[#4a3a2d] bg-[#161113] text-[#bfb097] transition-colors hover:border-[#8f3834] hover:text-[#e58c82] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        {dungeonRuns.length > 0 && (
                          <div className="border-t border-[#3b2e26] pt-2.5">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#b7a894]">
                              <Trophy className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                              <span>Your Best Runs</span>
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                              {dungeonRuns.slice(0, 5).map((run) => (
                                <li
                                  key={run.id}
                                  className="flex items-center justify-between text-xs text-[#c9b99d]"
                                >
                                  <span className="truncate">{run.heroName}</span>
                                  <span className="font-mono text-[11px] tabular-nums text-[#e8c987] shrink-0">
                                    Depth {run.depthReached} · Lv. {run.heroLevel}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {fallenHeroes.length > 0 && (
                          <div className="border-t border-[#3b2e26] pt-2.5">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#d88c82]">
                              <Skull className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Hall of Fallen Heroes</span>
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                              {fallenHeroes.slice(0, 5).map((fallen) => (
                                <li
                                  key={fallen.id}
                                  className="flex items-center justify-between gap-2 rounded-[3px] border border-[#5e2d30] bg-[#160f11] px-2.5 py-1.5 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-[#f0d8d5]">
                                      {fallen.heroName}
                                    </p>
                                    <p className="truncate text-[11px] text-[#a98987]">
                                      {fallen.causeOfDeath || 'Fallen in Hardcore'}
                                    </p>
                                  </div>
                                  <span className="font-mono text-[11px] tabular-nums text-[#d88c82] shrink-0">
                                    D{fallen.depthReached} · Lv.{fallen.heroLevel}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {cloudView === 'stash' && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#bfb097]">
                              <Archive className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                              <span>Shared Account Stash ({stashItems.length}/24)</span>
                            </h3>
                            <button
                              type="button"
                              onClick={refreshBackpack}
                              className="text-[11px] text-[#c9a24a] hover:underline whitespace-nowrap shrink-0"
                            >
                              Refresh Bag
                            </button>
                          </div>

                          {stashItems.length === 0 ? (
                            <p className="mt-2 text-xs text-[#9e8f7a]">
                              Your account stash is empty. Store items from your active hero&apos;s
                              backpack below to share across characters.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {stashItems.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-2 rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p
                                      className="truncate font-medium"
                                      style={{ color: RARITY_COLOR[item.rarity] || '#f2e7cf' }}
                                    >
                                      {item.itemName}
                                    </p>
                                    <p className="text-[11px] tabular-nums text-[#9e8f7a]">
                                      Item Lv. {item.itemLevel}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={stashBusy}
                                    onClick={() => void handleWithdrawItem(item)}
                                    className="min-h-[28px] rounded-[2px] border border-[#594635] bg-[#1e1614] px-2.5 py-1 text-[11px] font-medium text-[#ead08b] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                                  >
                                    Claim
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="border-t border-[#3c2f27] pt-2.5">
                          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#bfb097]">
                            <PackagePlus
                              className="h-3.5 w-3.5 text-[#c9a24a]"
                              aria-hidden="true"
                            />
                            <span>Store From Active Backpack</span>
                          </h3>
                          {backpackItems.length === 0 ? (
                            <p className="mt-2 text-xs text-[#9e8f7a]">
                              No items in current hero&apos;s backpack.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {backpackItems.slice(0, 8).map(({ index, item }) => {
                                const rarity = Number(item.r) || 0;
                                const name = String(item.n || 'Gear');
                                const itemLevel = Number(item.itemLevel) || 1;
                                return (
                                  <li
                                    key={`${name}-${index}`}
                                    className="flex items-center justify-between gap-2 rounded-[3px] border border-[#4a3a2d] bg-[#161113] p-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <p
                                        className="truncate font-medium"
                                        style={{ color: RARITY_COLOR[rarity] || '#f2e7cf' }}
                                      >
                                        {name}
                                      </p>
                                      <p className="text-[11px] tabular-nums text-[#9e8f7a]">
                                        Item Lv. {itemLevel}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={stashBusy || stashItems.length >= 24}
                                      onClick={() => void handleDepositItem(index)}
                                      className="min-h-[28px] rounded-[2px] border border-[#4a3a2d] bg-[#1e1614] px-2.5 py-1 text-[11px] font-medium text-[#f2e7cf] transition-colors whitespace-nowrap shrink-0 hover:border-[#c9a24a] hover:bg-[#2c1f19] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                                    >
                                      Store
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {cloudView === 'leaderboard' && (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#bfb097]">
                            <Trophy className="h-3.5 w-3.5 text-[#c9a24a]" aria-hidden="true" />
                            <span>Top Delvers</span>
                          </h3>
                          <div className="flex items-center gap-1">
                            {(
                              [
                                { id: 'all', label: 'All' },
                                { id: 'daily', label: 'Daily' },
                                { id: 'hardcore', label: 'HC' },
                              ] as const
                            ).map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setLeaderboardFilter(f.id)}
                                className={`rounded-[2px] border px-1.5 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                                  leaderboardFilter === f.id
                                    ? 'border-[#c9a24a] bg-[#2c1f19] text-[#f5e3b8]'
                                    : 'border-[#4a3a2d] bg-[#161113] text-[#bfb097] hover:text-[#f2e7cf]'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {leaderboardFilter === 'daily' && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#9e8f7a]">
                            <Calendar className="h-3 w-3 text-[#c9a24a]" aria-hidden="true" />
                            <span>Daily Seed: {getTodayUtcDate()}</span>
                          </p>
                        )}

                        {leaderboard.length === 0 ? (
                          <p className="mt-2 text-xs text-[#9e8f7a]">
                            No recorded runs in this bracket yet.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {leaderboard.map((entry, index) => {
                              const isExpanded = expandedRunId === entry.id;
                              const eq = entry.buildSummary?.equipment ?? [];
                              return (
                                <li
                                  key={entry.id}
                                  className="rounded-[3px] border border-[#4a3a2d] bg-[#161113] text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRunId((cur) => (cur === entry.id ? null : entry.id))
                                    }
                                    aria-expanded={isExpanded}
                                    className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[#1e1614] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="w-5 font-mono text-[11px] font-semibold tabular-nums text-[#c9a24a] shrink-0">
                                        #{index + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-[#f2e7cf]">
                                          {entry.heroName}
                                          {entry.runMode === 'hardcore' ? ' 💀' : ''}
                                          {entry.runMode === 'daily' ? ' 📅' : ''}
                                        </p>
                                        <p className="truncate text-[11px] text-[#9e8f7a]">
                                          {entry.playerName}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-[11px] tabular-nums text-[#ead08b]">
                                        D{entry.depthReached} · Lv.{entry.heroLevel}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp className="h-3.5 w-3.5 text-[#9e8f7a]" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5 text-[#9e8f7a]" />
                                      )}
                                    </div>
                                  </button>

                                  {isExpanded && (
                                    <div className="border-t border-[#3c2f27] bg-[#0b090a] px-2.5 py-2 text-[11px]">
                                      {entry.notes && (
                                        <p className="mb-1.5 text-[#bfb097]">{entry.notes}</p>
                                      )}
                                      {eq.length === 0 ? (
                                        <p className="text-[#9e8f7a]">No gear snapshot recorded.</p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {eq.map((gear, idx) => (
                                            <li
                                              key={`${gear.name}-${idx}`}
                                              className="flex items-center justify-between gap-2"
                                            >
                                              <span
                                                className="truncate"
                                                style={{
                                                  color: RARITY_COLOR[gear.rarity] || '#f2e7cf',
                                                }}
                                              >
                                                {gear.icon ? `${gear.icon} ` : ''}
                                                {gear.name}
                                              </span>
                                              <span className="font-mono text-[10px] tabular-nums text-[#9e8f7a] shrink-0">
                                                iLv.{gear.itemLevel ?? entry.heroLevel}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdmin}
              aria-label="Open Admin Workshop"
              title="Admin Workshop (F2)"
              className="font-archive-mono flex min-h-[40px] items-center gap-2 border border-[#c9a24a] bg-[#2c1f19] px-3.5 py-2 text-[11px] uppercase text-[#f5e3b8] transition-colors whitespace-nowrap shrink-0 hover:bg-[#c9a24a] hover:text-[#090807] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Admin</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              toggleMute();
              if (!panelOpen) focusGame();
            }}
            aria-pressed={preferences.muted}
            aria-label={preferences.muted ? 'Unmute game audio (M)' : 'Mute game audio (M)'}
            title={preferences.muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            className="font-archive-mono flex min-h-[40px] items-center gap-2 border border-[#c9a24a] bg-[#090807] px-3.5 py-2 text-[11px] uppercase text-[#c9a24a] transition-colors whitespace-nowrap shrink-0 hover:bg-[#c9a24a] hover:text-[#090807] focus-visible:outline-2 focus-visible:outline-[#ead08b]"
          >
            <VolumeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {preferences.muted || effectivePercent === 0 ? 'Muted' : `${effectivePercent}%`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-label="Open game settings, modes, and cloud saves"
            title="Options"
            className={`font-archive-mono flex min-h-[40px] items-center gap-2 border border-[#c9a24a] px-3.5 py-2 text-[11px] uppercase transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#ead08b] ${
              panelOpen
                ? 'bg-[#c9a24a] text-[#090807]'
                : 'bg-[#090807] text-[#c9a24a] hover:bg-[#c9a24a] hover:text-[#090807]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}
