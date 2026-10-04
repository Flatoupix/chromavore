// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — LEADERBOARD SYSTEM (LOCAL + REMOTE FIREBASE)
// ═══════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from '../config/firebase';

export interface LeaderboardEntry {
  pseudo: string;
  score: number;
  kills?: number;
  streak?: number;
  mode?: 'arcade' | 'custom';
  date: string;
}

const STORAGE_ARCADE_KEY = 'chv_leaderboard_arcade_v1';
const STORAGE_CUSTOM_KEY = 'chv_leaderboard_custom_v1';
const LEGACY_STORAGE_KEY = 'chv_leaderboard_v1';
const MAX_ENTRIES = 20;

class LeaderboardManager {
  private arcadeEntries: LeaderboardEntry[] = [];
  private customEntries: LeaderboardEntry[] = [];
  public isSyncing: boolean = false;
  public remoteActive: boolean = false;
  public remoteOnline: boolean = false;
  public remoteError: string | null = null;
  public lastSyncTime: number = 0;

  constructor() {
    this.load();
    this.syncRemote();
  }

  private load() {
    try {
      const rawArcade = localStorage.getItem(STORAGE_ARCADE_KEY);
      if (rawArcade) {
        this.arcadeEntries = JSON.parse(rawArcade);
      } else {
        // Migration from legacy single storage key into arcade
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          this.arcadeEntries = JSON.parse(legacy);
        }
      }

      const rawCustom = localStorage.getItem(STORAGE_CUSTOM_KEY);
      if (rawCustom) {
        this.customEntries = JSON.parse(rawCustom);
      }

      this.cleanupEntries('arcade');
      this.cleanupEntries('custom');
    } catch {
      this.arcadeEntries = [];
      this.customEntries = [];
    }
  }

  public cleanupEntries(mode: 'arcade' | 'custom' = 'arcade') {
    const list = mode === 'custom' ? this.customEntries : this.arcadeEntries;
    const map = new Map<string, LeaderboardEntry>();
    for (const e of list) {
      if (!e || !e.pseudo) continue;
      if ((e.kills ?? 0) <= 0) continue;

      const key = e.pseudo.trim().toUpperCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...e, mode });
      } else {
        const isBetter = (e.kills ?? 0) > (existing.kills ?? 0) || ((e.kills ?? 0) === (existing.kills ?? 0) && e.score > existing.score);
        if (isBetter) map.set(key, { ...e, mode });
      }
    }
    if (mode === 'custom') {
      this.customEntries = Array.from(map.values());
    } else {
      this.arcadeEntries = Array.from(map.values());
    }
    this.save(mode);
  }

  public save(mode?: 'arcade' | 'custom') {
    try {
      if (!mode || mode === 'arcade') {
        localStorage.setItem(STORAGE_ARCADE_KEY, JSON.stringify(this.arcadeEntries));
      }
      if (!mode || mode === 'custom') {
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(this.customEntries));
      }
    } catch {}
  }

  public getEntries(mode: 'arcade' | 'custom' = 'arcade'): LeaderboardEntry[] {
    const list = mode === 'custom' ? this.customEntries : this.arcadeEntries;
    return list
      .slice()
      .sort((a, b) => {
        if ((b.kills ?? 0) !== (a.kills ?? 0)) return (b.kills ?? 0) - (a.kills ?? 0);
        return b.score - a.score;
      })
      .slice(0, MAX_ENTRIES);
  }

  public getTopScore(mode: 'arcade' | 'custom' = 'arcade'): number {
    const list = this.getEntries(mode);
    if (!list.length) return 0;
    return list[0].kills ?? 0;
  }

  public getBestEntry(pseudo: string, mode: 'arcade' | 'custom' = 'arcade'): LeaderboardEntry | undefined {
    const list = mode === 'custom' ? this.customEntries : this.arcadeEntries;
    return list.find(e => e.pseudo.toUpperCase() === pseudo.trim().toUpperCase());
  }

  public addEntry(entry: LeaderboardEntry, explicitMode?: 'arcade' | 'custom'): number {
    if ((entry.kills ?? 0) <= 0) return 0;

    const mode = explicitMode || entry.mode || 'arcade';
    entry.mode = mode;
    const targetList = mode === 'custom' ? this.customEntries : this.arcadeEntries;

    const pseudoKey = entry.pseudo.trim().toUpperCase();
    const existingIndex = targetList.findIndex(
      e => e.pseudo.toUpperCase() === pseudoKey
    );

    let recordedEntry = entry;
    if (existingIndex >= 0) {
      const existing = targetList[existingIndex];
      const isBetter = (entry.kills ?? 0) > (existing.kills ?? 0) || ((entry.kills ?? 0) === (existing.kills ?? 0) && entry.score > existing.score);

      if (isBetter) {
        targetList[existingIndex] = entry;
      } else {
        recordedEntry = existing;
      }
    } else {
      targetList.push(entry);
    }

    this.cleanupEntries(mode);
    this.save(mode);
    this.pushRemote(recordedEntry);

    return this.getEntries(mode).findIndex(
      e => e.pseudo.toUpperCase() === pseudoKey
    ) + 1;
  }

  // Remote Firebase Realtime Database Sync
  public async syncRemote() {
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl) return;

    this.remoteActive = true;
    this.isSyncing = true;
    try {
      const res = await fetch(`${dbUrl}/leaderboard.json`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        this.remoteOnline = true;
        this.remoteError = null;
        this.lastSyncTime = Date.now();
        const data = await res.json();
        if (data) {
          // 1. Sync Arcade (data.arcade || data.madness || data)
          const arcadeSource = data.arcade || data.madness || data;
          this.mergeRemoteList(arcadeSource, 'arcade');

          // 2. Sync Custom (data.custom)
          if (data.custom) {
            this.mergeRemoteList(data.custom, 'custom');
          }
        }
      } else {
        if (res.status === 401 || res.status === 403) {
          this.remoteError = 'PERMISSION_DENIED';
        } else {
          this.remoteError = `HTTP_${res.status}`;
        }
        this.remoteOnline = false;
        console.warn(`Leaderboard remote returned ${res.status} (${this.remoteError})`);
      }
    } catch (err) {
      this.remoteOnline = false;
      this.remoteError = 'NETWORK_ERROR';
      console.warn('Leaderboard remote sync error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private mergeRemoteList(source: Record<string, any>, mode: 'arcade' | 'custom') {
    const targetList = mode === 'custom' ? this.customEntries : this.arcadeEntries;
    const remoteList: LeaderboardEntry[] = [];
    for (const item of Object.values(source as Record<string, any>)) {
      if (item && item.pseudo && typeof item.score === 'number' && (item.kills ?? 0) > 0) {
        remoteList.push({
          pseudo: item.pseudo.slice(0, 12).toUpperCase(),
          score: item.score,
          kills: item.kills,
          streak: item.streak,
          mode,
          date: item.date || new Date().toISOString()
        });
      }
    }

    for (const r of remoteList) {
      const idx = targetList.findIndex(e => e.pseudo.toUpperCase() === r.pseudo.toUpperCase());
      if (idx >= 0) {
        const ex = targetList[idx];
        const rBetter = (r.kills ?? 0) > (ex.kills ?? 0) || ((r.kills ?? 0) === (ex.kills ?? 0) && r.score > ex.score);
        if (rBetter) {
          targetList[idx] = r;
        } else {
          this.pushRemote(ex);
        }
      } else {
        targetList.push(r);
      }
    }

    for (const e of targetList) {
      const onRemote = remoteList.some(r => r.pseudo.toUpperCase() === e.pseudo.toUpperCase());
      if (!onRemote) {
        this.pushRemote(e);
      }
    }

    this.cleanupEntries(mode);
    this.save(mode);
  }

  public async pushRemote(entry: LeaderboardEntry) {
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl) return;

    const mode = entry.mode || 'arcade';
    const path = mode === 'custom' ? 'custom' : 'arcade';
    const safeKey = encodeURIComponent(entry.pseudo.trim().toUpperCase().replace(/[.#$\[\]\/]/g, '_'));
    try {
      const res = await fetch(`${dbUrl}/leaderboard/${path}/${safeKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        this.remoteOnline = true;
        this.remoteError = null;
      } else if (res.status === 401 || res.status === 403) {
        this.remoteOnline = false;
        this.remoteError = 'PERMISSION_DENIED';
      }
    } catch (err) {
      console.warn('Leaderboard remote push error:', err);
    }
  }

  public setFirebaseURL(url: string) {
    localStorage.setItem('chv_firebase_url', url.trim());
    FIREBASE_CONFIG.databaseURL = url.trim();
    this.syncRemote();
  }

  // ---------- Reset utilities (personal project, no extra guard) ----------
  /** Remove local leaderboard storage */
  public clearLocal(): void {
    try {
      localStorage.removeItem(STORAGE_ARCADE_KEY);
      localStorage.removeItem(STORAGE_CUSTOM_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      this.arcadeEntries = [];
      this.customEntries = [];
    } catch {}
  }

  /** Hard reset: clear local and delete remote data */
  public async hardReset(): Promise<void> {
    this.clearLocal();
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl) return;
    try {
      await fetch(`${dbUrl}/leaderboard.json`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Leaderboard hard reset remote error:', err);
    }
  }
}

export const leaderboard = new LeaderboardManager();
