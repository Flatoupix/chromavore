// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PLAYER PROFILE & CLOUD SYNC MANAGER (OPTION A)
// ═══════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from '../config/firebase';
import { MADNESS_UNLOCK_KILLS } from '../config/constants';

export interface PlayerProfile {
  pseudo: string;
  syncCode: string;
  careerGhosts: number;
  accountLevel: number;
  accountXp: number;
  skillPoints: number;
  skillUpgrades: Record<string, number>;
  gameMode?: 'arcade' | 'custom';
  hiScore: number;
  bestMadnessKills: number;
  arcadeHiScore?: number;
  arcadeBestKills?: number;
  customHiScore?: number;
  customBestKills?: number;
  badges: Record<string, boolean>;
  discoveredSkills?: string[];
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
    if (typeof localStorage === 'undefined') {
      return {
        pseudo: 'PLAYER1',
        syncCode: 'CHV-DEMO',
        careerGhosts: 0,
        accountLevel: 1,
        accountXp: 0,
        skillPoints: 0,
        skillUpgrades: {},
        hiScore: 0,
        bestMadnessKills: 0,
        badges: {},
        updatedAt: new Date().toISOString()
      };
    }
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
    let skillUpgrades = {};
    try { skillUpgrades = JSON.parse(localStorage.getItem('chv_skill_upgrades') || '{}'); } catch {}
    let discoveredSkills: string[] = [];
    try { discoveredSkills = JSON.parse(localStorage.getItem('chv_discovered_skills') || '[]'); } catch {}

    const savedMode = (localStorage.getItem('chv_game_mode') || 'arcade') as 'arcade' | 'custom';

    const profile: PlayerProfile = {
      pseudo: lastPseudo,
      syncCode: existingCode,
      careerGhosts: parseInt(localStorage.getItem('chv_career_ghosts') || '0', 10),
      accountLevel: parseInt(localStorage.getItem('chv_account_level') || '1', 10),
      accountXp: parseInt(localStorage.getItem('chv_account_xp') || '0', 10),
      skillPoints: parseInt(localStorage.getItem('chv_skill_points') || '0', 10),
      skillUpgrades,
      gameMode: savedMode,
      hiScore: parseInt(localStorage.getItem('chv_hi') || '0', 10),
      bestMadnessKills: parseInt(localStorage.getItem('chv_madness_hi') || '0', 10),
      arcadeHiScore: parseInt(localStorage.getItem('chv_arcade_hi') || localStorage.getItem('chv_hi') || '0', 10),
      arcadeBestKills: parseInt(localStorage.getItem('chv_arcade_kills') || localStorage.getItem('chv_madness_hi') || '0', 10),
      customHiScore: parseInt(localStorage.getItem('chv_custom_hi') || '0', 10),
      customBestKills: parseInt(localStorage.getItem('chv_custom_kills') || '0', 10),
      badges,
      discoveredSkills,
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
      localStorage.setItem('chv_account_level', this.profile.accountLevel.toString());
      localStorage.setItem('chv_account_xp', this.profile.accountXp.toString());
      localStorage.setItem('chv_skill_points', this.profile.skillPoints.toString());
      localStorage.setItem('chv_skill_upgrades', JSON.stringify(this.profile.skillUpgrades));
      localStorage.setItem('chv_game_mode', this.profile.gameMode || 'arcade');
      localStorage.setItem('chv_hi', this.profile.hiScore.toString());
      localStorage.setItem('chv_madness_hi', this.profile.bestMadnessKills.toString());
      localStorage.setItem('chv_arcade_hi', (this.profile.arcadeHiScore || 0).toString());
      localStorage.setItem('chv_arcade_kills', (this.profile.arcadeBestKills || 0).toString());
      localStorage.setItem('chv_custom_hi', (this.profile.customHiScore || 0).toString());
      localStorage.setItem('chv_custom_kills', (this.profile.customBestKills || 0).toString());
      localStorage.setItem('chv_badges', JSON.stringify(this.profile.badges));
      localStorage.setItem('chv_discovered_skills', JSON.stringify(this.profile.discoveredSkills || []));
    } catch {}
    this.pushRemote();
  }

  public isSkillDiscovered(skillId: string): boolean {
    return Array.isArray(this.profile.discoveredSkills) && this.profile.discoveredSkills.includes(skillId);
  }

  public markSkillDiscovered(skillId: string) {
    if (!Array.isArray(this.profile.discoveredSkills)) {
      this.profile.discoveredSkills = [];
    }
    if (!this.profile.discoveredSkills.includes(skillId)) {
      this.profile.discoveredSkills.push(skillId);
      this.saveProfile();
    }
  }

  public isChromamancerUnlocked(): boolean {
    return (this.profile.careerGhosts || 0) >= MADNESS_UNLOCK_KILLS;
  }

  public onGameModeChanged?: (mode: 'arcade' | 'custom') => void;

  public setGameMode(mode: 'arcade' | 'custom'): boolean {
    if (mode === 'custom' && !this.isChromamancerUnlocked()) {
      this.profile.gameMode = 'arcade';
      this.saveProfile();
      if (this.onGameModeChanged) this.onGameModeChanged('arcade');
      return false;
    }
    this.profile.gameMode = mode;
    this.saveProfile();
    if (this.onGameModeChanged) this.onGameModeChanged(mode);
    return true;
  }

  public get gameMode(): 'arcade' | 'custom' {
    if (this.profile.gameMode === 'custom' && !this.isChromamancerUnlocked()) {
      return 'arcade';
    }
    return this.profile.gameMode || 'arcade';
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
      localStorage.removeItem('chv_account_level');
      localStorage.removeItem('chv_account_xp');
      localStorage.removeItem('chv_skill_points');
      localStorage.removeItem('chv_skill_upgrades');
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
      accountLevel: 1,
      accountXp: 0,
      skillPoints: 0,
      skillUpgrades: {},
      hiScore: 0,
      bestMadnessKills: 0,
      badges: {},
      updatedAt: new Date().toISOString()
    };
    this.saveProfile();
  }
}

export const profileManager = new ProfileManager();
