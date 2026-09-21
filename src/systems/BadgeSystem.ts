// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — BADGES & ACHIEVEMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import { CW, HUD_H } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { profileManager } from './ProfileManager';
import { spriteAtlas } from '../graphics/SpriteAtlas';
import { wobbleBanner } from '../graphics/WobbleBanner';

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: 'kill' | 'feat';
  killsRequired?: number;
}

export const BADGES: Record<string, BadgeDef> = {
  // === CAREER GHOST MILESTONES (Aligned with skill tiers) ===
  firstBlood:   { id: 'firstBlood',   name: 'FIRST BLOOD',          desc: 'Devour 1 ghost in your career',                       icon: 'skull', category: 'kill', killsRequired: 1 },
  kills35:      { id: 'kills35',      name: 'OFFENSIVE DASH',       desc: 'Reach 10 ghosts (Unlocks Dash V1)',                   icon: 'dash', category: 'kill', killsRequired: 10 },
  kills75:      { id: 'kills75',      name: 'MEGA NOVA',            desc: 'Reach 75 ghosts (Unlocks Mega Nova V1)',              icon: 'nova', category: 'kill', killsRequired: 75 },
  kills120:     { id: 'kills120',     name: 'WIGGLE EMP',           desc: 'Reach 120 ghosts (Unlocks Wiggle EMP V1)',            icon: 'wiggle', category: 'kill', killsRequired: 120 },
  kills180:     { id: 'kills180',     name: 'CHRONO SHIFT',         desc: 'Reach 180 ghosts (Unlocks TimeShift V1)',             icon: 'chrono', category: 'kill', killsRequired: 180 },
  kills260:     { id: 'kills260',     name: 'INFINITE DASH',        desc: 'Reach 260 ghosts (Unlocks Infinite Dash V1)',         icon: 'overdrive', category: 'kill', killsRequired: 260 },
  kills360:     { id: 'kills360',     name: 'NITRO JET',            desc: 'Reach 360 ghosts (Unlocks Nitro Jet V1)',             icon: 'nitro', category: 'kill', killsRequired: 360 },
  kills500:     { id: 'kills500',     name: 'BLACK HOLE',           desc: 'Reach 500 ghosts (Unlocks Black Hole V1)',            icon: 'black_hole', category: 'kill', killsRequired: 500 },
  kills700:     { id: 'kills700',     name: 'HYPER BEAMS',          desc: 'Reach 700 ghosts (Unlocks Laser Beams V1)',           icon: 'laser', category: 'kill', killsRequired: 700 },
  kills950:     { id: 'kills950',     name: 'CRYO SHATTER',         desc: 'Reach 950 ghosts (Unlocks Cryo Freeze V1)',           icon: 'cryo', category: 'kill', killsRequired: 950 },
  kills1250:    { id: 'kills1250',    name: 'LIGHT TSUNAMI',        desc: 'Reach 1,250 ghosts (Unlocks Royal Wave V1)',          icon: 'tsunami', category: 'kill', killsRequired: 1250 },
  kills1600:    { id: 'kills1600',    name: 'CYBER DASH V2',        desc: 'Reach 1,600 ghosts (16:9 Arena & 4-Tile Dash)',       icon: 'screen', category: 'kill', killsRequired: 1600 },
  kills2000:    { id: 'kills2000',    name: 'SUPER PELLET',         desc: 'Reach 2,000 ghosts (Frightens reinforcements too)',   icon: 'super_pellet', category: 'kill', killsRequired: 2000 },
  kills2400:    { id: 'kills2400',    name: 'GIGA EMP V2',          desc: 'Reach 2,400 ghosts (Unlocks Giga EMP V2)',            icon: 'wiggle', category: 'kill', killsRequired: 2400 },
  kills2800:    { id: 'kills2800',    name: 'QUANTUM DILATION V2',  desc: 'Reach 2,800 ghosts (Unlocks TimeShift V2)',           icon: 'chrono', category: 'kill', killsRequired: 2800 },
  kills3000:    { id: 'kills3000',    name: 'HD DARKSYNTH OST',     desc: 'Reach 3,000 ghosts (Unlocks Studio HD Soundtrack)',   icon: 'music', category: 'kill', killsRequired: 3000 },
  kills3300:    { id: 'kills3300',    name: 'PLASMA BURNER V2',     desc: 'Reach 3,300 ghosts (Unlocks Flames V2)',              icon: 'nitro', category: 'kill', killsRequired: 3300 },
  kills3900:    { id: 'kills3900',    name: 'SUPERNOVA V2',         desc: 'Reach 3,900 ghosts (Unlocks Supernova V2)',           icon: 'nova', category: 'kill', killsRequired: 3900 },
  kills4500:    { id: 'kills4500',    name: 'HYPER DASH V3',        desc: 'Reach 4,500 ghosts (5-Tile Extended Dash)',           icon: 'dash', category: 'kill', killsRequired: 4500 },
  kills5200:    { id: 'kills5200',    name: 'CHRONO DRIVE V2',      desc: 'Reach 5,200 ghosts (Unlocks Overdrive V2)',           icon: 'overdrive', category: 'kill', killsRequired: 5200 },
  kills6000:    { id: 'kills6000',    name: 'DARK MATTER V2',       desc: 'Reach 6,000 ghosts (Unlocks Vortex V2)',              icon: 'black_hole', category: 'kill', killsRequired: 6000 },
  kills7000:    { id: 'kills7000',    name: 'OCTO BEAMS V2',        desc: 'Reach 7,000 ghosts (Unlocks 8-Axis Lasers V2)',       icon: 'laser', category: 'kill', killsRequired: 7000 },
  kills8000:    { id: 'kills8000',    name: 'QUANTUM DASH V4',      desc: 'Reach 8,000 ghosts (6-Tile Quantum Dash)',            icon: 'dash', category: 'kill', killsRequired: 8000 },
  kills9000:    { id: 'kills9000',    name: 'ABSOLUTE ZERO V2',     desc: 'Reach 9,000 ghosts (Unlocks Cryo V2)',                icon: 'cryo', category: 'kill', killsRequired: 9000 },
  kills10000:   { id: 'kills10000',   name: 'SOLAR ECLIPSE V2',     desc: 'Reach 10,000 ghosts (100% Mastered Arsenal)',         icon: 'tsunami', category: 'kill', killsRequired: 10000 },
  kills12000:   { id: 'kills12000',   name: 'QUANTUM BURST V5',     desc: 'Reach 12,000 ghosts (Quantum Wall-Breaker V5)',       icon: 'dash', category: 'kill', killsRequired: 12000 },

  // === CHROMA AWAKENING — Visual Progression Tiers ===
  chroma_spark: { id: 'chroma_spark', name: 'CHROMA SPARK',  desc: '10 ghosts — The first spark of vibrant color',       icon: 'lightning', category: 'kill', killsRequired: 10   },
  chroma_pulse: { id: 'chroma_pulse', name: 'CHROMA PULSE',  desc: '50 ghosts — The world begins to breathe',             icon: 'flame',     category: 'kill', killsRequired: 50   },
  chroma_surge: { id: 'chroma_surge', name: 'CHROMA SURGE',  desc: '200 ghosts — Neon illumination awakens',              icon: 'rocket',    category: 'kill', killsRequired: 200  },
  chroma_flow:  { id: 'chroma_flow',  name: 'CHROMA FLOW',   desc: '600 ghosts — Chromatic energy flows freely',          icon: 'vortex',    category: 'kill', killsRequired: 600  },
  chroma_full:  { id: 'chroma_full',  name: 'FULL CHROMA',   desc: '1,600 ghosts — You are the Chromavore',               icon: 'crown',     category: 'kill', killsRequired: 1600 },

  // === FEATS OF MASTERY & COMBOS ===
  ghostHunter:  { id: 'ghostHunter',  name: 'ROYAL HUNT',           desc: 'Devour 4 ghosts during a single power pellet hunt',   icon: 'spectre', category: 'feat' },
  wallBreaker:  { id: 'wallBreaker',  name: 'WALL BREAKER',         desc: 'Pulverize your first wall with Quantum Dash V5',      icon: 'dash', category: 'feat' },
  combo8:       { id: 'combo8',       name: 'COMBO RUNNER',         desc: 'Reach the x8 multiplier',                             icon: 'lightning', category: 'feat' },
  combo16:      { id: 'combo16',      name: 'COMBO MASTER',         desc: 'Reach the x16 multiplier',                            icon: 'flame', category: 'feat' },
  combo32:      { id: 'combo32',      name: 'x32 GODHOOD',          desc: 'Trigger absolute x32 God Mode invulnerability',       icon: 'crown', category: 'feat' },
  closeCall:    { id: 'closeCall',    name: 'CLOSE CALL',           desc: 'Escape 5 Near Misses without taking damage',          icon: 'nearmiss', category: 'feat' },
  wave5:        { id: 'wave5',        name: 'CYBER FREEWAY',        desc: 'Reach high-speed Level 5',                            icon: 'rocket', category: 'feat' },
  loop1:        { id: 'loop1',        name: 'TIME WARP',            desc: 'Complete Level 10 and launch Loop 2',                 icon: 'vortex', category: 'feat' },
  loop2:        { id: 'loop2',        name: 'LIGHTSPEED',           desc: 'Reach Loop 3 with +20% base speed',                   icon: 'rocket', category: 'feat' },
  madness50:    { id: 'madness50',    name: 'BERSERK TRANSCENDENT', desc: 'Eliminate 50 spectres in a single session',           icon: 'skull', category: 'feat' },
  madness100:   { id: 'madness100',   name: 'TOTAL EXTERMINATOR',   desc: 'Eliminate 100 spectres in a single session',          icon: 'nova', category: 'feat' },
  bonus50:      { id: 'bonus50',      name: 'SWARM SLAYER',         desc: 'Pulverize 50 spectres in a Bonus Stage',              icon: 'vortex', category: 'feat' },
  arena16_9:    { id: 'arena16_9',    name: '16:9 ARENA UNLOCKED',  desc: 'Unlock access to Widescreen Madness Mode',            icon: 'screen', category: 'feat' }
};

export const BADGE_PAGE_SIZE = 14;
export const BADGE_MAX_PAGES = Math.ceil(Object.values(BADGES).length / BADGE_PAGE_SIZE);

export class BadgeManager {
  public unlocked: Record<string, boolean> = {};
  public hiScore: number = 0;
  public bestMadnessKills: number = 0;

  public getMaxPages(pageSize: number = BADGE_PAGE_SIZE): number {
    return Math.ceil(Object.values(BADGES).length / pageSize);
  }

  constructor() {
    try {
      this.unlocked = JSON.parse(localStorage.getItem('chv_badges') || '{}');
      this.hiScore = parseInt(localStorage.getItem('chv_hi') || '0', 10);
      this.bestMadnessKills = parseInt(localStorage.getItem('chv_madness_hi') || '0', 10);
    } catch {
      this.unlocked = {};
      this.hiScore = 0;
      this.bestMadnessKills = 0;
    }
  }

  public syncWithProfile() {
    if (profileManager.profile.badges) {
      this.unlocked = { ...this.unlocked, ...profileManager.profile.badges };
    }
    this.hiScore = Math.max(this.hiScore, profileManager.profile.hiScore || 0);
    this.bestMadnessKills = Math.max(this.bestMadnessKills, profileManager.profile.bestMadnessKills || 0);
    this.checkKillBadges(profileManager.profile.careerGhosts);
  }

  public checkKillBadges(careerKills: number) {
    for (const b of Object.values(BADGES)) {
      if (b.killsRequired && careerKills >= b.killsRequired) {
        this.unlock(b.id);
      }
    }
  }

  public isUnlocked(id: string): boolean {
    return !!this.unlocked[id];
  }

  public getUnlockedCount(): number {
    return Object.keys(this.unlocked).filter(k => !!this.unlocked[k] && !!BADGES[k]).length;
  }

  public getTotalCount(): number {
    return Object.keys(BADGES).length;
  }

  public unlock(id: string) {
    if (this.unlocked[id] || !BADGES[id]) return;
    this.unlocked[id] = true;
    try {
      localStorage.setItem('chv_badges', JSON.stringify(this.unlocked));
      if (profileManager.profile.badges) {
        profileManager.profile.badges[id] = true;
        profileManager.saveProfile();
      }
    } catch {}

    sounds.play('badge');
    wobbleBanner.show('★ BADGE UNLOCKED ★', BADGES[id].name, BADGES[id].desc, BADGES[id].icon, '#ffd700', 2.2);
    particles.flash('#ffd700', 0.25);
    particles.shake(5, 0.18);
  }

  public saveScore(score: number): boolean {
    if (score > this.hiScore) {
      this.hiScore = score;
      profileManager.profile.hiScore = Math.max(profileManager.profile.hiScore || 0, score);
      try {
        localStorage.setItem('chv_hi', this.hiScore.toString());
      } catch {}
      profileManager.saveProfile();
      return true;
    }
    return false;
  }

  public saveMadnessKills(kills: number): boolean {
    if (kills > this.bestMadnessKills) {
      this.bestMadnessKills = kills;
      profileManager.profile.bestMadnessKills = Math.max(profileManager.profile.bestMadnessKills || 0, kills);
      try {
        localStorage.setItem('chv_madness_hi', this.bestMadnessKills.toString());
      } catch {}
      profileManager.saveProfile();
      return true;
    }
    return false;
  }

  public update(_dt: number) {}

  public currentCw: number = CW;
}

export const badges = new BadgeManager();
