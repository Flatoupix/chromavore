// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — LEADERBOARD SYSTEM (LOCAL + REMOTE FIREBASE)
// ═══════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from '../config/firebase';

export interface LeaderboardEntry {
  pseudo: string;
  score: number;
  mode: 'classic' | 'madness';
  kills?: number;
  streak?: number;
  date: string;
}

const STORAGE_KEY = 'chv_leaderboard_v1';
const MAX_ENTRIES = 20;

class LeaderboardManager {
  private entries: LeaderboardEntry[] = [];
  public isSyncing: boolean = false;
  public remoteActive: boolean = false;

  constructor() {
    this.load();
    this.syncRemote();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
        this.cleanupEntries();
      }
    } catch {
      this.entries = [];
    }
  }

  public cleanupEntries() {
    const map = new Map<string, LeaderboardEntry>();
    for (const e of this.entries) {
      if (!e || !e.pseudo) continue;
      // Filter out invalid zero scores/kills
      if (e.mode === 'madness' && (e.kills ?? 0) <= 0) continue;
      if (e.mode === 'classic' && e.score <= 0) continue;

      const key = `${e.mode}_${e.pseudo.trim().toUpperCase()}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, e);
      } else {
        const isBetter = e.mode === 'madness'
          ? (e.kills ?? 0) > (existing.kills ?? 0) || ((e.kills ?? 0) === (existing.kills ?? 0) && e.score > existing.score)
          : e.score > existing.score;
        if (isBetter) map.set(key, e);
      }
    }
    this.entries = Array.from(map.values());
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {}
  }

  public getEntries(mode?: 'classic' | 'madness'): LeaderboardEntry[] {
    const list = mode ? this.entries.filter(e => e.mode === mode) : this.entries;
    return list
      .slice()
      .sort((a, b) => {
        if (a.mode === 'madness' && b.mode === 'madness') {
          if ((b.kills ?? 0) !== (a.kills ?? 0)) return (b.kills ?? 0) - (a.kills ?? 0);
          return b.score - a.score;
        }
        return b.score - a.score;
      })
      .slice(0, MAX_ENTRIES);
  }

  public addEntry(entry: LeaderboardEntry): number {
    // Validate entry: don't record 0 kills in madness or 0 score in classic
    if (entry.mode === 'madness' && (entry.kills ?? 0) <= 0) return 0;
    if (entry.mode === 'classic' && entry.score <= 0) return 0;

    const pseudoKey = entry.pseudo.trim().toUpperCase();
    const existingIndex = this.entries.findIndex(
      e => e.mode === entry.mode && e.pseudo.toUpperCase() === pseudoKey
    );

    let recordedEntry = entry;
    if (existingIndex >= 0) {
      const existing = this.entries[existingIndex];
      const isBetter = entry.mode === 'madness'
        ? (entry.kills ?? 0) > (existing.kills ?? 0) || ((entry.kills ?? 0) === (existing.kills ?? 0) && entry.score > existing.score)
        : entry.score > existing.score;

      if (isBetter) {
        this.entries[existingIndex] = entry;
      } else {
        recordedEntry = existing;
      }
    } else {
      this.entries.push(entry);
    }

    this.cleanupEntries();
    this.pushRemote(recordedEntry);

    return this.getEntries(entry.mode).findIndex(
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
        const data = await res.json();
        if (data) {
          const remoteList: LeaderboardEntry[] = [];
          for (const mode of ['classic', 'madness'] as const) {
            if (data[mode]) {
              for (const [_, item] of Object.entries(data[mode] as Record<string, any>)) {
                if (item && item.pseudo && typeof item.score === 'number') {
                  remoteList.push({
                    pseudo: item.pseudo.slice(0, 12).toUpperCase(),
                    score: item.score,
                    mode,
                    kills: item.kills,
                    streak: item.streak,
                    date: item.date || new Date().toISOString()
                  });
                }
              }
            }
          }

          for (const r of remoteList) {
            const idx = this.entries.findIndex(e => e.mode === r.mode && e.pseudo.toUpperCase() === r.pseudo.toUpperCase());
            if (idx >= 0) {
              const ex = this.entries[idx];
              const rBetter = r.mode === 'madness'
                ? (r.kills ?? 0) > (ex.kills ?? 0)
                : r.score > ex.score;
              if (rBetter) this.entries[idx] = r;
            } else {
              this.entries.push(r);
            }
          }
          this.cleanupEntries();
        }
      }
    } catch (err) {
      console.warn('Leaderboard remote sync error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public async pushRemote(entry: LeaderboardEntry) {
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl) return;

    const safeKey = encodeURIComponent(entry.pseudo.trim().toUpperCase().replace(/[.#$\[\]\/]/g, '_'));
    try {
      await fetch(`${dbUrl}/leaderboard/${entry.mode}/${safeKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (err) {
      console.warn('Leaderboard remote push error:', err);
    }
  }

  public setFirebaseURL(url: string) {
    localStorage.setItem('chv_firebase_url', url.trim());
    FIREBASE_CONFIG.databaseURL = url.trim();
    this.syncRemote();
  }
}

export const leaderboard = new LeaderboardManager();
