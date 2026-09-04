// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — BADGES & ACHIEVEMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import { CW, HUD_H } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { profileManager } from './ProfileManager';

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
  firstBlood:   { id: 'firstBlood',   name: 'PREMIER SANG',         desc: 'Dévorer 1 spectre dans votre carrière',              icon: '🩸', category: 'kill', killsRequired: 1 },
  kills5:       { id: 'kills5',       name: 'DASH OFFENSIF',        desc: 'Atteindre 5 spectres (Débloque Dash V1)',           icon: '⚡', category: 'kill', killsRequired: 5 },
  kills15:      { id: 'kills15',      name: 'ONDE WIGGLE',          desc: 'Atteindre 15 spectres (Débloque Wiggle EMP V1)',    icon: '⚡', category: 'kill', killsRequired: 15 },
  kills35:      { id: 'kills35',      name: 'NITRO JET',            desc: 'Atteindre 35 spectres (Débloque Nitro Jet V1)',     icon: '🔥', category: 'kill', killsRequired: 35 },
  kills80:      { id: 'kills80',      name: 'MÉGA NOVA',            desc: 'Atteindre 80 spectres (Débloque Mega Nova V1)',     icon: '💣', category: 'kill', killsRequired: 80 },
  kills160:     { id: 'kills160',     name: 'DASH INFINI',          desc: 'Atteindre 160 spectres (Débloque Dash Infini V1)',  icon: '⚡', category: 'kill', killsRequired: 160 },
  kills400:     { id: 'kills400',     name: 'TROU NOIR',            desc: 'Atteindre 400 spectres (Débloque Black Hole V1)',   icon: '🕳️', category: 'kill', killsRequired: 400 },
  kills700:     { id: 'kills700',     name: 'GIGA EMP V2',          desc: 'Atteindre 700 spectres (Débloque Giga EMP V2)',     icon: '⚡', category: 'kill', killsRequired: 700 },
  kills1000:    { id: 'kills1000',    name: 'CYBER DASH V2',        desc: 'Atteindre 1 000 spectres (Débloque Cyber Dash V2)', icon: '⚡', category: 'kill', killsRequired: 1000 },
  kills1500:    { id: 'kills1500',    name: 'HYPER BEAMS',          desc: 'Atteindre 1 500 spectres (Débloque Canons Lasers)', icon: '⚡', category: 'kill', killsRequired: 1500 },
  kills2000:    { id: 'kills2000',    name: 'PLASMA BURNER V2',     desc: 'Atteindre 2 000 spectres (Débloque Flammes V2)',    icon: '🔥', category: 'kill', killsRequired: 2000 },
  kills3000:    { id: 'kills3000',    name: 'CRYO SHATTER',         desc: 'Atteindre 3 000 spectres (Débloque Gel V1)',        icon: '❄️', category: 'kill', killsRequired: 3000 },
  kills4500:    { id: 'kills4500',    name: 'SUPERNOVA V2',         desc: 'Atteindre 4 500 spectres (Débloque Supernova V2)',  icon: '💣', category: 'kill', killsRequired: 4500 },
  kills6500:    { id: 'kills6500',    name: 'LIGHT TSUNAMI',        desc: 'Atteindre 6 500 spectres (Débloque Vague Royale)',  icon: '👑', category: 'kill', killsRequired: 6500 },
  kills9500:    { id: 'kills9500',    name: 'CHRONO DRIVE V2',      desc: 'Atteindre 9 500 spectres (Débloque Overdrive V2)',  icon: '⚡', category: 'kill', killsRequired: 9500 },
  kills14000:   { id: 'kills14000',   name: 'DARK MATTER V2',       desc: 'Atteindre 14 000 spectres (Débloque Vortex V2)',    icon: '🕳️', category: 'kill', killsRequired: 14000 },
  kills20000:   { id: 'kills20000',   name: 'OCTO BEAMS V2',        desc: 'Atteindre 20 000 spectres (Débloque Lasers V2)',    icon: '⚡', category: 'kill', killsRequired: 20000 },
  kills30000:   { id: 'kills30000',   name: 'ZÉRO ABSOLU V2',       desc: 'Atteindre 30 000 spectres (Débloque Cryo V2)',      icon: '❄️', category: 'kill', killsRequired: 30000 },
  kills50000:   { id: 'kills50000',   name: 'ÉCLIPSE SOLAIRE V2',   desc: 'Atteindre 50 000 spectres (Arsenal 100% Maîtrisé)', icon: '👑', category: 'kill', killsRequired: 50000 },

  // === EXPLOITS DE MAÎTRISE & GAMEPLAY ===
  ghostHunter:  { id: 'ghostHunter',  name: 'CHASSE ROYALE',        desc: 'Dévorer 4 fantômes durant une seule chasse',        icon: '👻', category: 'feat' },
  combo8:       { id: 'combo8',       name: 'COMBO RUNNER',         desc: 'Atteindre le multiplicateur x8',                    icon: '⚡', category: 'feat' },
  combo16:      { id: 'combo16',      name: 'COMBO MASTER',         desc: 'Atteindre le multiplicateur x16',                   icon: '🔥', category: 'feat' },
  combo32:      { id: 'combo32',      name: 'DIVINITÉ x32',         desc: 'Déclencher l\'invulnérabilité totale x32',          icon: '👑', category: 'feat' },
  closeCall:    { id: 'closeCall',    name: 'FRÔLEMENT CRITIQUE',   desc: 'Échapper à 5 Near Misses sans dégât',               icon: '👁️', category: 'feat' },
  wave5:        { id: 'wave5',        name: 'CYBER FREEWAY',        desc: 'Atteindre le Niveau 5 grande vitesse',              icon: '🏁', category: 'feat' },
  loop1:        { id: 'loop1',        name: 'SAUT TEMPOREL',        desc: 'Compléter le Niveau 5 et lancer la Boucle 2',       icon: '🌀', category: 'feat' },
  loop2:        { id: 'loop2',        name: 'VITESSE SUPRASONIQUE', desc: 'Atteindre la Boucle 3 (+20% Vitesse)',              icon: '🚀', category: 'feat' },
  madness50:    { id: 'madness50',    name: 'BERSERK TRANSCENDANT', desc: 'Éliminer 50 spectres en une session Folie',         icon: '💀', category: 'feat' },
  madness100:   { id: 'madness100',   name: 'EXTERMINATEUR TOTAL',  desc: 'Éliminer 100 spectres en une session Folie',        icon: '🌌', category: 'feat' }
};

export class BadgeManager {
  public unlocked: Record<string, boolean> = {};
  public banner: { text: string; icon: string; life: number; ml: number } | null = null;
  public hiScore: number = 0;
  public bestMadnessKills: number = 0;

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

    this.banner = { text: BADGES[id].name, icon: BADGES[id].icon, life: 3.2, ml: 3.2 };
    sounds.play('badge');
    particles.addPop(CW / 2, HUD_H + 36, '🏆 SUCCÈS : ' + BADGES[id].name, '#ffd700', 17);
    particles.flash('#ffd700', 0.25);
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

  public update(dt: number) {
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
  }

  public drawBanner(c: CanvasRenderingContext2D) {
    if (!this.banner || this.banner.life <= 0) return;
    const a = Math.min(this.banner.life / 0.4, 1);
    const y = HUD_H + 8;
    c.save();
    c.globalAlpha = a;
    const bw = 320, bh = 32, bx = (CW - bw) / 2;
    c.fillStyle = 'rgba(12,18,34,0.95)';
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.8;
    c.shadowColor = '#ffd700';
    c.shadowBlur = 14;
    c.beginPath();
    c.roundRect(bx, y, bw, bh, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 11.5px monospace';
    c.fillStyle = '#ffd700';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🏆 ' + this.banner.icon + ' SUCCÈS : ' + this.banner.text, CW / 2, y + bh / 2);
    c.restore();
  }
}

export const badges = new BadgeManager();
