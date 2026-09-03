// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — BADGES & ACHIEVEMENTS SYSTEM
// ═══════════════════════════════════════════════════════════════

import { CW, HUD_H } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const BADGES: Record<string, BadgeDef> = {
  firstBlood:  { id: 'firstBlood', name: 'FIRST BLOOD', desc: 'Devour a phantom', icon: '🩸' },
  combo8:      { id: 'combo8', name: 'COMBO RUNNER', desc: 'Reach x8 multiplier', icon: '⚡' },
  combo16:     { id: 'combo16', name: 'COMBO MASTER', desc: 'Reach maximum x16 combo', icon: '🔥' },
  closeCall:   { id: 'closeCall', name: 'CLOSE CALL', desc: 'Escape 5 near misses', icon: '👁️' },
  ghostHunter: { id: 'ghostHunter', name: 'GHOST HUNTER', desc: 'Eat 4 phantoms in 1 hunt', icon: '👻' },
  wave5:       { id: 'wave5', name: 'SURVIVOR', desc: 'Reach Wave 5', icon: '🏆' }
};

export class BadgeManager {
  public unlocked: Record<string, boolean> = {};
  public banner: { text: string; icon: string; life: number; ml: number } | null = null;
  public hiScore: number = 0;
  public bestMadnessKills: number = 0;

  constructor() {
    try {
      this.unlocked = JSON.parse(localStorage.getItem('chv_badges') || '{}');
      this.hiScore = parseInt(localStorage.getItem('chv_hi') || '0');
      this.bestMadnessKills = parseInt(localStorage.getItem('chv_madness_hi') || '0');
    } catch {
      this.unlocked = {};
      this.hiScore = 0;
      this.bestMadnessKills = 0;
    }
  }

  public unlock(id: string) {
    if (this.unlocked[id] || !BADGES[id]) return;
    this.unlocked[id] = true;
    try {
      localStorage.setItem('chv_badges', JSON.stringify(this.unlocked));
    } catch {}

    this.banner = { text: BADGES[id].name, icon: BADGES[id].icon, life: 3.0, ml: 3.0 };
    sounds.play('badge');
    particles.addPop(CW / 2, HUD_H + 36, '🏆 ' + BADGES[id].name, '#ffd700', 16);
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
    const bw = 280, bh = 30, bx = (CW - bw) / 2;
    c.fillStyle = 'rgba(12,18,34,0.94)';
    c.strokeStyle = '#ffd700';
    c.lineWidth = 1.5;
    c.shadowColor = '#ffd700';
    c.shadowBlur = 12;
    c.beginPath();
    c.roundRect(bx, y, bw, bh, 6);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.font = 'bold 11px monospace';
    c.fillStyle = '#ffd700';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🏆 DÉBLOQUÉ : ' + this.banner.text, CW / 2, y + bh / 2);
    c.restore();
  }
}

export const badges = new BadgeManager();
