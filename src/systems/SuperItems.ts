// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SUPER-ITEMS SYSTEM (ANTI-STACKING & BALANCED)
// ═══════════════════════════════════════════════════════════════

import { CW, ROWS, T, PI2 } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';

export interface ActiveItemSlot {
  type: string;
  name: string;
  icon: string;
  ready: boolean;
}

export interface VortexEffect {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export class SuperItemManager {
  public activeSlot: ActiveItemSlot | null = null;
  public vortex: VortexEffect | null = null;
  public laserTimer: number = 0;
  public cryoTimer: number = 0;
  public tsunamiX: number = -1;

  public isRunning(): boolean {
    return this.laserTimer > 0 || this.vortex !== null || this.tsunamiX >= 0 || this.cryoTimer > 0;
  }

  public unlock(type: string, name: string, icon: string) {
    // Only store 1 item at a time in reserve
    if (this.activeSlot && this.activeSlot.ready) return;
    this.activeSlot = { type, name, icon, ready: true };
    sounds.play('powerup');
    particles.addPop(CW / 2, 85, `✨ ${icon} ${name} PRÊT ! [E]`, '#ffd700', 16);
    particles.shake(4, 0.15);

    const itmBtn = document.getElementById('item-btn');
    const itmLbl = document.getElementById('item-label');
    const itmTxt = document.getElementById('item-txt');
    if (itmBtn) {
      itmBtn.classList.add('ready');
      if (itmLbl) itmLbl.textContent = name;
      if (itmTxt) itmTxt.textContent = icon;
    }
  }

  public trigger(plPos: { x: number; y: number }, onKillGhost: (e: any, x: number, y: number) => void, enemies: any[], addMadnessTime: (s: number) => void): boolean {
    if (!this.activeSlot || !this.activeSlot.ready) return false;

    // Strict Anti-stacking: Cannot trigger while an effect is already running!
    if (this.isRunning()) {
      particles.addPop(CW / 2, 90, '⚠️ ITEM DÉJÀ ACTIF !', '#ff9900', 16);
      particles.shake(2, 0.1);
      return false;
    }

    const type = this.activeSlot.type;
    this.resetEffects();

    switch (type) {
      case 'nova': {
        sounds.play('nova');
        particles.shake(12, 0.4);
        particles.flash('#ffd700', 0.4);
        particles.emit(plPos.x, plPos.y, 60, '#ffd700', { speed: 250, size: 5, life: 0.8 });
        for (const e of enemies) {
          if (e.st !== 'dead' && e.st !== 'return') {
            onKillGhost(e, e.x * T + T / 2, e.y * T + T / 2);
          }
        }
        particles.addPop(CW / 2, (ROWS * T) / 2, '💥 MEGA NOVA !', '#ffd700', 22);
        break;
      }
      case 'vortex': {
        sounds.play('powerup');
        this.vortex = { x: plPos.x, y: plPos.y, life: 3.5, maxLife: 3.5 };
        particles.shake(6, 0.25);
        particles.flash('#bb44ff', 0.25);
        particles.addPop(plPos.x, plPos.y - 20, '🕳️ BLACK HOLE !', '#bb44ff', 22);
        break;
      }
      case 'laser': {
        sounds.play('dash');
        this.laserTimer = 3.2;
        particles.shake(5, 0.2);
        particles.flash('#00ffff', 0.25);
        particles.addPop(CW / 2, (ROWS * T) / 2, '⚡ HYPER BEAMS !', '#00ffff', 22);
        break;
      }
      case 'cryo': {
        sounds.play('powerup');
        this.cryoTimer = 4.0;
        for (const e of enemies) e.frozen = true;
        particles.shake(5, 0.2);
        particles.flash('#aaffff', 0.25);
        particles.addPop(CW / 2, (ROWS * T) / 2, '❄️ GHOSTS FROZEN !', '#aaffff', 22);
        break;
      }
      case 'tsunami': {
        sounds.play('wave');
        this.tsunamiX = 0;
        addMadnessTime(8.0);
        particles.shake(8, 0.3);
        particles.flash('#ffffff', 0.35);
        particles.addPop(CW / 2, (ROWS * T) / 2, '👑 LIGHT TSUNAMI !', '#ffffff', 22);
        break;
      }
    }

    this.activeSlot = null;
    const itmBtn = document.getElementById('item-btn');
    if (itmBtn) itmBtn.classList.remove('ready');
    return true;
  }

  public update(dt: number, plPos: { x: number; y: number }, enemies: any[], onKillGhost: (e: any, x: number, y: number) => void) {
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      particles.emit(plPos.x, plPos.y, 4, '#00ffff', { speed: 120, size: 3, life: 0.2 });
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ex = e.x * T + T / 2, ey = e.y * T + T / 2;
          if (Math.abs(ex - plPos.x) < T || Math.abs(ey - plPos.y) < T) {
            onKillGhost(e, ex, ey);
          }
        }
      }
    }

    if (this.vortex) {
      this.vortex.life -= dt;
      particles.emit(this.vortex.x, this.vortex.y, 3, '#bb44ff', { speed: -80, size: 3, life: 0.4 });
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ex = e.x * T + T / 2, ey = e.y * T + T / 2;
          const dx = this.vortex.x - ex, dy = this.vortex.y - ey;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28) {
            onKillGhost(e, ex, ey);
          } else {
            e.fx += (dx / dist) * 140 * dt / T;
            e.fy += (dy / dist) * 140 * dt / T;
          }
        }
      }
      if (this.vortex.life <= 0) {
        particles.emit(this.vortex.x, this.vortex.y, 40, '#bb44ff', { speed: 180, size: 5, life: 0.6 });
        this.vortex = null;
      }
    }

    if (this.cryoTimer > 0) {
      this.cryoTimer -= dt;
      if (this.cryoTimer <= 0) {
        for (const e of enemies) e.frozen = false;
      }
    }

    if (this.tsunamiX >= 0) {
      this.tsunamiX += CW * dt * 1.6;
      particles.emit(this.tsunamiX, Math.random() * ROWS * T, 5, '#ffffff', { speed: 100, size: 4, life: 0.3 });
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ex = e.x * T + T / 2, ey = e.y * T + T / 2;
          if (ex <= this.tsunamiX + 20) {
            onKillGhost(e, ex, ey);
          }
        }
      }
      if (this.tsunamiX > CW + 60) this.tsunamiX = -1;
    }
  }

  public draw(c: CanvasRenderingContext2D, plPos: { x: number; y: number }, time: number) {
    if (this.laserTimer > 0) {
      c.save();
      c.strokeStyle = '#00ffff';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 18;
      c.lineWidth = 10 + Math.sin(time * 25) * 3;
      c.beginPath();
      c.moveTo(0, plPos.y); c.lineTo(CW, plPos.y);
      c.moveTo(plPos.x, 0); c.lineTo(plPos.x, ROWS * T);
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2.5;
      c.stroke();
      c.restore();
    }

    if (this.vortex) {
      c.save();
      c.translate(this.vortex.x, this.vortex.y);
      c.rotate(time * 10);
      c.strokeStyle = '#ff44ff';
      c.shadowColor = '#bb44ff';
      c.shadowBlur = 18;
      c.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(0, 0, 12 + i * 10, (i * Math.PI) / 2, (i * Math.PI) / 2 + Math.PI);
        c.stroke();
      }
      c.fillStyle = '#110022';
      c.beginPath();
      c.arc(0, 0, 16, 0, PI2);
      c.fill();
      c.restore();
    }

    if (this.tsunamiX >= 0) {
      c.save();
      const gr = c.createLinearGradient(this.tsunamiX - 40, 0, this.tsunamiX, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.8)');
      c.fillStyle = gr;
      c.fillRect(this.tsunamiX - 40, 0, 40, ROWS * T);
      c.strokeStyle = '#00ffff';
      c.lineWidth = 3.5;
      c.shadowColor = '#ffffff';
      c.shadowBlur = 16;
      c.beginPath();
      c.moveTo(this.tsunamiX, 0);
      c.lineTo(this.tsunamiX, ROWS * T);
      c.stroke();
      c.restore();
    }
  }

  public resetEffects() {
    this.vortex = null;
    this.laserTimer = 0;
    this.cryoTimer = 0;
    this.tsunamiX = -1;
  }

  public resetAll() {
    this.resetEffects();
    this.activeSlot = null;
    const itmBtn = document.getElementById('item-btn');
    if (itmBtn) itmBtn.classList.remove('ready');
  }
}

export const superItems = new SuperItemManager();
