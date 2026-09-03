// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PLAYER PROFILE & CLOUD SYNC MANAGER (OPTION A)
// ═══════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from '../config/firebase';

export interface PlayerProfile {
  pseudo: string;
  syncCode: string;
  careerGhosts: number;
  hiScore: number;
  bestMadnessKills: number;
  badges: Record<string, boolean>;
  updatedAt: string;
}

const STORAGE_PROFILE = 'chv_profile_v1';
const STORAGE_SYNC_CODE = 'chv_sync_code';

class ProfileManager {
  public profile: PlayerProfile;

  constructor() {
    this.profile = this.loadProfile();
  }

  public generateSyncCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CHV-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private loadProfile(): PlayerProfile {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    const lastPseudo = (localStorage.getItem('chv_last_pseudo') || 'PLAYER1').slice(0, 12).toUpperCase();
    const existingCode = localStorage.getItem(STORAGE_SYNC_CODE) || this.generateSyncCode();
    localStorage.setItem(STORAGE_SYNC_CODE, existingCode);

    let badges = {};
    try { badges = JSON.parse(localStorage.getItem('chv_badges') || '{}'); } catch {}

    const profile: PlayerProfile = {
      pseudo: lastPseudo,
      syncCode: existingCode,
      careerGhosts: parseInt(localStorage.getItem('chv_career_ghosts') || '0', 10),
      hiScore: parseInt(localStorage.getItem('chv_hi') || '0', 10),
      bestMadnessKills: parseInt(localStorage.getItem('chv_madness_hi') || '0', 10),
      badges,
      updatedAt: new Date().toISOString()
    };
    this.saveProfile(profile);
    return profile;
  }

  public saveProfile(p?: PlayerProfile) {
    if (p) this.profile = p;
    this.profile.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(this.profile));
      localStorage.setItem(STORAGE_SYNC_CODE, this.profile.syncCode);
      localStorage.setItem('chv_last_pseudo', this.profile.pseudo);
      localStorage.setItem('chv_career_ghosts', this.profile.careerGhosts.toString());
      localStorage.setItem('chv_hi', this.profile.hiScore.toString());
      localStorage.setItem('chv_madness_hi', this.profile.bestMadnessKills.toString());
      localStorage.setItem('chv_badges', JSON.stringify(this.profile.badges));
    } catch {}
    this.pushRemote();
  }

  public setPseudo(pseudo: string) {
    const clean = pseudo.trim().toUpperCase().slice(0, 12);
    if (!clean) return;
    this.profile.pseudo = clean;
    this.saveProfile();
  }

  public async pushRemote() {
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl || !this.profile.pseudo) return;

    const safeKey = encodeURIComponent(this.profile.pseudo.replace(/[.#$\[\]\/]/g, '_'));
    try {
      await fetch(`${dbUrl}/players/${safeKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.profile)
      });
    } catch (err) {
      console.warn('Profile remote push error:', err);
    }
  }

  public async restoreProfile(pseudo: string, syncCode: string): Promise<boolean> {
    const dbUrl = (FIREBASE_CONFIG.databaseURL || localStorage.getItem('chv_firebase_url') || '').trim().replace(/\/+$/, '');
    if (!dbUrl) return false;

    const cleanPseudo = pseudo.trim().toUpperCase().slice(0, 12);
    const cleanCode = syncCode.trim().toUpperCase();
    const safeKey = encodeURIComponent(cleanPseudo.replace(/[.#$\[\]\/]/g, '_'));

    try {
      const res = await fetch(`${dbUrl}/players/${safeKey}.json`);
      if (res.ok) {
        const remoteProfile: PlayerProfile = await res.json();
        if (remoteProfile && remoteProfile.syncCode.toUpperCase() === cleanCode) {
          this.profile = remoteProfile;
          this.saveProfile();
          return true;
        }
      }
    } catch (err) {
      console.warn('Restore profile error:', err);
    }
    return false;
  }

  public wipeAllData() {
    try {
      localStorage.removeItem(STORAGE_PROFILE);
      localStorage.removeItem(STORAGE_SYNC_CODE);
      localStorage.removeItem('chv_last_pseudo');
      localStorage.removeItem('chv_career_ghosts');
      localStorage.removeItem('chv_hi');
      localStorage.removeItem('chv_madness_hi');
      localStorage.removeItem('chv_badges');
      localStorage.removeItem('chv_leaderboard_v1');
    } catch {}

    const newCode = this.generateSyncCode();
    this.profile = {
      pseudo: 'PLAYER1',
      syncCode: newCode,
      careerGhosts: 0,
      hiScore: 0,
      bestMadnessKills: 0,
      badges: {},
      updatedAt: new Date().toISOString()
    };
    this.saveProfile();
  }
}

export const profileManager = new ProfileManager();
