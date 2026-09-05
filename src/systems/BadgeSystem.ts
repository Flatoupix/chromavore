// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — BADGES & ACHIEVEMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import { CW, HUD_H } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { profileManager } from './ProfileManager';
import { spriteAtlas } from '../graphics/SpriteAtlas';

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
  kills10:      { id: 'kills10',      name: 'DASH OFFENSIF',        desc: 'Atteindre 10 spectres (Débloque Dash V1)',           icon: 'dash', category: 'kill', killsRequired: 10 },
  kills30:      { id: 'kills30',      name: 'ONDE WIGGLE',          desc: 'Atteindre 30 spectres (Débloque Wiggle EMP V1)',    icon: 'wiggle', category: 'kill', killsRequired: 30 },
  kills50:      { id: 'kills50',      name: 'CHRONO SHIFT',         desc: 'Atteindre 50 spectres (Débloque TimeShift V1)',     icon: 'chrono', category: 'kill', killsRequired: 50 },
  kills75:      { id: 'kills75',      name: 'NITRO JET',            desc: 'Atteindre 75 spectres (Débloque Nitro Jet V1)',     icon: 'nitro', category: 'kill', killsRequired: 75 },
  kills150:     { id: 'kills150',     name: 'MÉGA NOVA',            desc: 'Atteindre 150 spectres (Débloque Mega Nova V1)',    icon: 'nova', category: 'kill', killsRequired: 150 },
  kills250:     { id: 'kills250',     name: 'DASH INFINI',          desc: 'Atteindre 250 spectres (Débloque Dash Infini V1)',  icon: 'overdrive', category: 'kill', killsRequired: 250 },
  kills400:     { id: 'kills400',     name: 'TROU NOIR',            desc: 'Atteindre 400 spectres (Débloque Black Hole V1)',   icon: 'black_hole', category: 'kill', killsRequired: 400 },
  kills600:     { id: 'kills600',     name: 'HYPER BEAMS',          desc: 'Atteindre 600 spectres (Débloque Canons Lasers V1)', icon: 'laser', category: 'kill', killsRequired: 600 },
  kills800:     { id: 'kills800',     name: 'CRYO SHATTER',         desc: 'Atteindre 800 spectres (Débloque Gel V1)',          icon: 'cryo', category: 'kill', killsRequired: 800 },
  kills1000:    { id: 'kills1000',    name: 'LIGHT TSUNAMI',        desc: 'Atteindre 1 000 spectres (Débloque Vague Royale V1)', icon: 'tsunami', category: 'kill', killsRequired: 1000 },
  kills1200:    { id: 'kills1200',    name: 'CYBER DASH V2',        desc: 'Atteindre 1 200 spectres (Mode 16:9 & Dash 4 cases)',  icon: 'screen', category: 'kill', killsRequired: 1200 },
  kills1500:    { id: 'kills1500',    name: 'GIGA EMP V2',          desc: 'Atteindre 1 500 spectres (Débloque Giga EMP V2)',     icon: 'wiggle', category: 'kill', killsRequired: 1500 },
  kills1800:    { id: 'kills1800',    name: 'QUANTUM DILATION V2',  desc: 'Atteindre 1 800 spectres (Débloque TimeShift V2)',  icon: 'chrono', category: 'kill', killsRequired: 1800 },
  kills2100:    { id: 'kills2100',    name: 'PLASMA BURNER V2',     desc: 'Atteindre 2 100 spectres (Débloque Flammes V2)',      icon: 'nitro', category: 'kill', killsRequired: 2100 },
  kills2600:    { id: 'kills2600',    name: 'SUPERNOVA V2',         desc: 'Atteindre 2 600 spectres (Débloque Supernova V2)',  icon: 'nova', category: 'kill', killsRequired: 2600 },
  kills3200:    { id: 'kills3200',    name: 'CHRONO DRIVE V2',      desc: 'Atteindre 3 200 spectres (Débloque Overdrive V2)',  icon: 'overdrive', category: 'kill', killsRequired: 3200 },
  kills3900:    { id: 'kills3900',    name: 'DARK MATTER V2',       desc: 'Atteindre 3 900 spectres (Débloque Vortex V2)',     icon: 'black_hole', category: 'kill', killsRequired: 3900 },
  kills4700:    { id: 'kills4700',    name: 'OCTO BEAMS V2',        desc: 'Atteindre 4 700 spectres (Débloque Lasers V2)',     icon: 'laser', category: 'kill', killsRequired: 4700 },
  kills5600:    { id: 'kills5600',    name: 'ZÉRO ABSOLU V2',       desc: 'Atteindre 5 600 spectres (Débloque Cryo V2)',       icon: 'cryo', category: 'kill', killsRequired: 5600 },
  kills6500:    { id: 'kills6500',    name: 'ÉCLIPSE SOLAIRE V2',   desc: 'Atteindre 6 500 spectres (Arsenal 100% Maîtrisé)',  icon: 'tsunami', category: 'kill', killsRequired: 6500 },

  // === EXPLOITS DE MAÎTRISE & GAMEPLAY ===
  ghostHunter:  { id: 'ghostHunter',  name: 'CHASSE ROYALE',        desc: 'Dévorer 4 fantômes durant une seule chasse',        icon: 'spectre', category: 'feat' },
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
    particles.addPop(this.currentCw / 2, HUD_H + 36, 'SUCCÈS : ' + BADGES[id].name, '#ffd700', 17);
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

  public currentCw: number = CW;

  public drawBanner(c: CanvasRenderingContext2D) {
    if (!this.banner || this.banner.life <= 0) return;
    const cw = c.canvas.width;
    this.currentCw = cw;
    const a = Math.min(this.banner.life / 0.4, 1);
    const y = HUD_H + 8;
    c.save();
    c.globalAlpha = a;
    const bw = 320, bh = 32, bx = (cw - bw) / 2;
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

    spriteAtlas.drawIcon(c, 'trophy', bx + 20, y + bh / 2, 16);
    spriteAtlas.drawIcon(c, this.banner.icon, bx + 40, y + bh / 2, 16);

    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffd700';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText('SUCCÈS : ' + this.banner.text, bx + 54, y + bh / 2);
    c.restore();
  }
}

export const badges = new BadgeManager();
