// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — LEADERBOARD SYSTEM
// ═══════════════════════════════════════════════════════════════

export interface LeaderboardEntry {
  pseudo: string;
  score: number;
  mode: 'classic' | 'madness';
  kills?: number;
  streak?: number;
  date: string;
}

const STORAGE_KEY = 'chv_leaderboard_v1';
const MAX_ENTRIES = 15;

class LeaderboardManager {
  private entries: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch { this.entries = []; }
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
        if (a.mode === 'madness' && b.mode === 'madness') return (b.kills ?? 0) - (a.kills ?? 0);
        return b.score - a.score;
      })
      .slice(0, MAX_ENTRIES);
  }

  public addEntry(entry: LeaderboardEntry): number {
    this.entries.push(entry);
    this.save();
    return this.getEntries(entry.mode).findIndex(
      e => e.pseudo === entry.pseudo && e.date === entry.date
    ) + 1;
  }

  public isHighScore(score: number, mode: 'classic' | 'madness', kills?: number): boolean {
    const list = this.getEntries(mode);
    if (list.length < MAX_ENTRIES) return true;
    if (mode === 'madness') return (kills ?? 0) > (list[list.length - 1].kills ?? 0);
    return score > list[list.length - 1].score;
  }
}

export const leaderboard = new LeaderboardManager();
