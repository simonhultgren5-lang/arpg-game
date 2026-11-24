import { useCallback, useEffect, useRef, useState } from 'react';

export const PREFERENCES_STORAGE_KEY = 'dodGamePreferencesV1';
export const LEGACY_AUDIO_STORAGE_KEY = 'dodAudioSettingsV1';
export const LOOT_FILTER_STORAGE_KEY = 'dodLootFilterV1';

export type AutoSalvageMode = 'off' | 'common' | 'magic';

export interface GamePreferences {
  muted: boolean;
  volume: number;
  highPerformance: boolean;
  uiScale: number;
  autoSalvage: AutoSalvageMode;
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  muted: false,
  volume: 0.8,
  highPerformance: false,
  uiScale: 1,
  autoSalvage: 'off',
};

export interface GameBridgeWindow extends Window {
  dodAudio?: {
    getState: () => { muted: boolean; volume: number };
    setAudio: (muted: boolean, volume: number) => void;
    testSound: () => void;
  };
  dodPreferences?: {
    getPreferences: () => GamePreferences;
    setPreferences: (prefs: Partial<GamePreferences>) => void;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAutoSalvage(raw: unknown, fallback: AutoSalvageMode): AutoSalvageMode {
  if (raw === 'off' || raw === 'common' || raw === 'magic') {
    return raw;
  }
  return fallback;
}

function normalizePreferences(raw: unknown, fallback: GamePreferences = DEFAULT_PREFERENCES): GamePreferences {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const record = raw as Record<string, unknown>;
  const volumeNum = Number(record.volume);
  const scaleNum = Number(record.uiScale);

  return {
    muted: typeof record.muted === 'boolean' ? record.muted : fallback.muted,
    volume: Number.isFinite(volumeNum) ? clamp(volumeNum, 0, 1) : fallback.volume,
    highPerformance:
      typeof record.highPerformance === 'boolean' ? record.highPerformance : fallback.highPerformance,
    uiScale: Number.isFinite(scaleNum)
      ? Math.round(clamp(scaleNum, 0.8, 1.25) * 100) / 100
      : fallback.uiScale,
    autoSalvage: normalizeAutoSalvage(record.autoSalvage, fallback.autoSalvage),
  };
}

function readInitialPreferences(): GamePreferences {
  let base: GamePreferences = { ...DEFAULT_PREFERENCES };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      base = normalizePreferences(stored, DEFAULT_PREFERENCES);
    } else {
      const legacyAudio = JSON.parse(localStorage.getItem(LEGACY_AUDIO_STORAGE_KEY) || 'null');
      if (legacyAudio && typeof legacyAudio === 'object') {
        base = normalizePreferences(legacyAudio, DEFAULT_PREFERENCES);
      }
    }

    const legacyFilter = localStorage.getItem(LOOT_FILTER_STORAGE_KEY);
    if (
      (!stored || typeof stored !== 'object' || !('autoSalvage' in stored)) &&
      (legacyFilter === 'off' || legacyFilter === 'common' || legacyFilter === 'magic')
    ) {
      base = { ...base, autoSalvage: legacyFilter };
    }
  } catch {
    // Ignore storage access errors
  }
  return base;
}

function persistPreferences(prefs: GamePreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    localStorage.setItem(
      LEGACY_AUDIO_STORAGE_KEY,
      JSON.stringify({ muted: prefs.muted, volume: prefs.volume })
    );
    localStorage.setItem(LOOT_FILTER_STORAGE_KEY, prefs.autoSalvage);
  } catch {
    // Ignore storage access errors
  }
}

export function useGamePreferences() {
  const [preferences, setPreferences] = useState<GamePreferences>(() => readInitialPreferences());
  const lastNonZeroVolumeRef = useRef<number>(
    preferences.volume > 0 ? preferences.volume : DEFAULT_PREFERENCES.volume
  );
  const lastActiveAutoSalvageRef = useRef<'common' | 'magic'>(
    preferences.autoSalvage === 'magic' ? 'magic' : 'common'
  );

  useEffect(() => {
    persistPreferences(preferences);
  }, [preferences]);

  const syncToWindow = useCallback(
    (win: Window | null | undefined, prefs: GamePreferences = preferences) => {
      if (!win) return;
      const bridge = win as GameBridgeWindow;
      try {
        bridge.dodAudio?.setAudio(prefs.muted, prefs.volume);
        bridge.dodPreferences?.setPreferences(prefs);
        bridge.postMessage(
          { type: 'dod:set-audio', muted: prefs.muted, volume: prefs.volume },
          window.location.origin
        );
        bridge.postMessage(
          { type: 'dod:set-preferences', preferences: prefs },
          window.location.origin
        );
      } catch {
        // Ignore iframe communication errors during initialization
      }
    },
    [preferences]
  );

  const toggleMute = useCallback(() => {
    setPreferences((prev) => {
      if (prev.muted || prev.volume <= 0) {
        const restored = prev.volume > 0 ? prev.volume : lastNonZeroVolumeRef.current || 0.8;
        return { ...prev, muted: false, volume: restored };
      }
      lastNonZeroVolumeRef.current = prev.volume;
      return { ...prev, muted: true };
    });
  }, []);

  const setVolumePercent = useCallback((percent: number) => {
    const normalized = clamp(percent / 100, 0, 1);
    if (normalized > 0) {
      lastNonZeroVolumeRef.current = normalized;
    }
    setPreferences((prev) => ({
      ...prev,
      muted: normalized <= 0,
      volume: normalized,
    }));
  }, []);

  const setHighPerformance = useCallback((highPerformance: boolean) => {
    setPreferences((prev) => ({ ...prev, highPerformance }));
  }, []);

  const toggleHighPerformance = useCallback(() => {
    setPreferences((prev) => ({ ...prev, highPerformance: !prev.highPerformance }));
  }, []);

  const setUiScalePercent = useCallback((percent: number) => {
    const scale = Math.round(clamp(percent / 100, 0.8, 1.25) * 100) / 100;
    setPreferences((prev) => ({ ...prev, uiScale: scale }));
  }, []);

  const setAutoSalvage = useCallback((autoSalvage: AutoSalvageMode) => {
    if (autoSalvage === 'common' || autoSalvage === 'magic') {
      lastActiveAutoSalvageRef.current = autoSalvage;
    }
    setPreferences((prev) => ({ ...prev, autoSalvage }));
  }, []);

  const toggleAutoSalvage = useCallback(() => {
    setPreferences((prev) => {
      if (prev.autoSalvage === 'off') {
        const restored = lastActiveAutoSalvageRef.current || 'common';
        return { ...prev, autoSalvage: restored };
      }
      lastActiveAutoSalvageRef.current = prev.autoSalvage;
      return { ...prev, autoSalvage: 'off' };
    });
  }, []);

  const resetPreferences = useCallback(() => {
    lastNonZeroVolumeRef.current = DEFAULT_PREFERENCES.volume;
    lastActiveAutoSalvageRef.current = 'common';
    setPreferences({ ...DEFAULT_PREFERENCES });
  }, []);

  const applyPreferences = useCallback((partial: Partial<GamePreferences>) => {
    setPreferences((prev) => {
      const next = normalizePreferences(partial, prev);
      if (next.volume > 0) {
        lastNonZeroVolumeRef.current = next.volume;
      }
      if (next.autoSalvage === 'common' || next.autoSalvage === 'magic') {
        lastActiveAutoSalvageRef.current = next.autoSalvage;
      }
      return next;
    });
  }, []);

  return {
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
  };
}
