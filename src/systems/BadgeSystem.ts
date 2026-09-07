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
  // === PALIERS DE DÉVORATION (Alignés rigoureusement avec chaque palier de compétence) ===
  firstBlood:   { id: 'firstBlood',   name: 'PREMIER SANG',         desc: 'Dévorer 1 spectre dans votre carrière',              icon: 'skull', category: 'kill', killsRequired: 1 },
  kills35:      { id: 'kills35',      name: 'DASH OFFENSIF',        desc: 'Atteindre 35 spectres (Débloque Dash V1)',           icon: 'dash', category: 'kill', killsRequired: 35 },
  kills75:      { id: 'kills75',      name: 'MÉGA NOVA',            desc: 'Atteindre 75 spectres (Débloque Mega Nova V1)',    icon: 'nova', category: 'kill', killsRequired: 75 },
  kills120:     { id: 'kills120',     name: 'ONDE WIGGLE',          desc: 'Atteindre 120 spectres (Débloque Wiggle EMP V1)',    icon: 'wiggle', category: 'kill', killsRequired: 120 },
  kills180:     { id: 'kills180',     name: 'CHRONO SHIFT',         desc: 'Atteindre 180 spectres (Débloque TimeShift V1)',     icon: 'chrono', category: 'kill', killsRequired: 180 },
  kills260:     { id: 'kills260',     name: 'DASH INFINI',          desc: 'Atteindre 260 spectres (Débloque Dash Infini V1)',  icon: 'overdrive', category: 'kill', killsRequired: 260 },
  kills360:     { id: 'kills360',     name: 'NITRO JET',            desc: 'Atteindre 360 spectres (Débloque Nitro Jet V1)',     icon: 'nitro', category: 'kill', killsRequired: 360 },
  kills500:     { id: 'kills500',     name: 'TROU NOIR',            desc: 'Atteindre 500 spectres (Débloque Black Hole V1)',   icon: 'black_hole', category: 'kill', killsRequired: 500 },
  kills700:     { id: 'kills700',     name: 'HYPER BEAMS',          desc: 'Atteindre 700 spectres (Débloque Canons Lasers V1)', icon: 'laser', category: 'kill', killsRequired: 700 },
  kills950:     { id: 'kills950',     name: 'CRYO SHATTER',         desc: 'Atteindre 950 spectres (Débloque Gel V1)',          icon: 'cryo', category: 'kill', killsRequired: 950 },
  kills1250:    { id: 'kills1250',    name: 'LIGHT TSUNAMI',        desc: 'Atteindre 1 250 spectres (Débloque Vague Royale V1)', icon: 'tsunami', category: 'kill', killsRequired: 1250 },
  kills1600:    { id: 'kills1600',    name: 'CYBER DASH V2',        desc: 'Atteindre 1 600 spectres (Mode 16:9 & Dash 4 cases)',  icon: 'screen', category: 'kill', killsRequired: 1600 },
  kills2000:    { id: 'kills2000',    name: 'SUPER PASTILLE',       desc: 'Atteindre 2 000 spectres (Effraie aussi les renforts)', icon: 'super_pellet', category: 'kill', killsRequired: 2000 },
  kills2400:    { id: 'kills2400',    name: 'GIGA EMP V2',          desc: 'Atteindre 2 400 spectres (Débloque Giga EMP V2)',     icon: 'wiggle', category: 'kill', killsRequired: 2400 },
  kills2800:    { id: 'kills2800',    name: 'QUANTUM DILATION V2',  desc: 'Atteindre 2 800 spectres (Débloque TimeShift V2)',  icon: 'chrono', category: 'kill', killsRequired: 2800 },
  kills3000:    { id: 'kills3000',    name: 'OST HD DARKSYNTH',     desc: 'Atteindre 3 000 spectres (Débloque la bande-son HD Studio)', icon: 'music', category: 'kill', killsRequired: 3000 },
  kills3300:    { id: 'kills3300',    name: 'PLASMA BURNER V2',     desc: 'Atteindre 3 300 spectres (Débloque Flammes V2)',      icon: 'nitro', category: 'kill', killsRequired: 3300 },
  kills3900:    { id: 'kills3900',    name: 'SUPERNOVA V2',         desc: 'Atteindre 3 900 spectres (Débloque Supernova V2)',  icon: 'nova', category: 'kill', killsRequired: 3900 },
  kills4500:    { id: 'kills4500',    name: 'HYPER DASH V3',        desc: 'Atteindre 4 500 spectres (Dash de 5 cases)',         icon: 'dash', category: 'kill', killsRequired: 4500 },
  kills5200:    { id: 'kills5200',    name: 'CHRONO DRIVE V2',      desc: 'Atteindre 5 200 spectres (Débloque Overdrive V2)',  icon: 'overdrive', category: 'kill', killsRequired: 5200 },
  kills6000:    { id: 'kills6000',    name: 'DARK MATTER V2',       desc: 'Atteindre 6 000 spectres (Débloque Vortex V2)',     icon: 'black_hole', category: 'kill', killsRequired: 6000 },
  kills7000:    { id: 'kills7000',    name: 'OCTO BEAMS V2',        desc: 'Atteindre 7 000 spectres (Débloque Lasers V2)',     icon: 'laser', category: 'kill', killsRequired: 7000 },
  kills8000:    { id: 'kills8000',    name: 'QUANTUM DASH V4',      desc: 'Atteindre 8 000 spectres (Dash de 6 cases)',         icon: 'dash', category: 'kill', killsRequired: 8000 },
  kills9000:    { id: 'kills9000',    name: 'ZÉRO ABSOLU V2',       desc: 'Atteindre 9 000 spectres (Débloque Cryo V2)',       icon: 'cryo', category: 'kill', killsRequired: 9000 },
  kills10000:   { id: 'kills10000',   name: 'ÉCLIPSE SOLAIRE V2',   desc: 'Atteindre 10 000 spectres (Arsenal 100% Maîtrisé)',  icon: 'tsunami', category: 'kill', killsRequired: 10000 },
  kills12000:   { id: 'kills12000',   name: 'QUANTUM BURST V5',     desc: 'Atteindre 12 000 spectres (Brise-Mur Quantique V5)', icon: 'dash', category: 'kill', killsRequired: 12000 },

  // === EXPLOITS DE MAÎTRISE & GAMEPLAY ===
  ghostHunter:  { id: 'ghostHunter',  name: 'CHASSE ROYALE',        desc: 'Dévorer 4 fantômes durant une seule chasse',        icon: 'spectre', category: 'feat' },
  wallBreaker:  { id: 'wallBreaker',  name: 'BRISE-MURS',           desc: 'Pulvériser votre premier mur au Quantum Dash V5',   icon: 'dash', category: 'feat' },
  combo8:       { id: 'combo8',       name: 'COMBO RUNNER',         desc: 'Atteindre le multiplicateur x8',                    icon: 'lightning', category: 'feat' },
  combo16:      { id: 'combo16',      name: 'COMBO MASTER',         desc: 'Atteindre le multiplicateur x16',                   icon: 'flame', category: 'feat' },
  combo32:      { id: 'combo32',      name: 'DIVINITÉ x32',         desc: 'Déclencher l\'invulnérabilité totale x32',          icon: 'crown', category: 'feat' },
  closeCall:    { id: 'closeCall',    name: 'FRÔLEMENT CRITIQUE',   desc: 'Échapper à 5 Near Misses sans dégât',               icon: 'nearmiss', category: 'feat' },
  wave5:        { id: 'wave5',        name: 'CYBER FREEWAY',        desc: 'Atteindre le Niveau 5 grande vitesse',              icon: 'rocket', category: 'feat' },
  loop1:        { id: 'loop1',        name: 'SAUT TEMPOREL',        desc: 'Compléter le Niveau 5 et lancer la Boucle 2',       icon: 'vortex', category: 'feat' },
  loop2:        { id: 'loop2',        name: 'VITESSE SUPRASONIQUE', desc: 'Atteindre la Boucle 3 (+20% Vitesse)',              icon: 'rocket', category: 'feat' },
  madness50:    { id: 'madness50',    name: 'BERSERK TRANSCENDANT', desc: 'Éliminer 50 spectres en une session Folie',         icon: 'skull', category: 'feat' },
  madness100:   { id: 'madness100',   name: 'EXTERMINATEUR TOTAL',  desc: 'Éliminer 100 spectres en une session Folie',        icon: 'nova', category: 'feat' },
  bonus50:      { id: 'bonus50',      name: 'SWARM SLAYER',         desc: 'Pulvériser 50 spectres en un Niveau Bonus',         icon: 'vortex', category: 'feat' },
  arena16_9:    { id: 'arena16_9',    name: 'ARÈNE 16:9 DÉBLOQUÉE', desc: 'Débloquer l\'accès au Mode Widescreen Madness',     icon: 'screen', category: 'feat' }
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
    wobbleBanner.show('★ SUCCÈS DÉBLOQUÉ ★', BADGES[id].name, BADGES[id].desc, BADGES[id].icon, '#ffd700', 2.2);
    particles.flash('#ffd700', 0.25);
    particles.shake(5, 0.18);
  }

  public saveScore(score: number): boolean {
    if (score > this.hiScore) {
      this.hiScore = score;
      try {
        localStorage.setItem('chv_hi', this.hiScore.toString());
      } catch {}
      return true;
    }
    return false;
  }

  public saveMadnessKills(kills: number): boolean {
    if (kills > this.bestMadnessKills) {
      this.bestMadnessKills = kills;
      try {
        localStorage.setItem('chv_madness_hi', this.bestMadnessKills.toString());
      } catch {}
      return true;
    }
    return false;
  }

  public update(_dt: number) {}

  public currentCw: number = CW;
}

export const badges = new BadgeManager();
