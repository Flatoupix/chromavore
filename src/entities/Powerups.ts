// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — POWER-UPS & VOID CORE RELIC
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, CW, PC, PI_, PI2, PN } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from '../systems/ParticleSystem';
import { MazeManager } from '../levels/levels';

export interface PowerupItem {
  x: number;
  y: number;
  type: string;
  timer: number;
}

export interface VoidRelic {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
}

export interface VortexPortal {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
}

export class PowerupManager {
  public current: PowerupItem | null = null;
  public spawnTimer: number = 10;
  public fx = { phase: 0, timewarp: 0, magnet: 0, overdrive: 0 };
  public pred = { on: false, t: 0, maxT: 7.0, k: 0, warn: false };

  public voidRelic: VoidRelic | null = null;
  public voidRelicTimer: number = 14.0;

  public vortexPortal: VortexPortal | null = null;
  public vortexPortalTimer: number = 85.0;

  private spawnPoints = [
    { x: 10, y: 8 }, { x: 4, y: 14 }, { x: 16, y: 14 }, { x: 10, y: 4 }
  ];

  public reset() {
    this.current = null;
    this.spawnTimer = 10;
    this.fx = { phase: 0, timewarp: 0, magnet: 0, overdrive: 0 };
    this.pred = { on: false, t: 0, maxT: 7.0, k: 0, warn: false };
    this.voidRelic = null;
    this.voidRelicTimer = 14.0;
    this.vortexPortal = null;
    this.vortexPortalTimer = 85.0 + Math.random() * 35.0;
  }

  public update(
    dt: number,
    isMadness: boolean,
    maze: MazeManager,
    plPos: { x: number; y: number },
    enemies: any[],
    onTitanTransform: () => void,
    onVoidIntercepted: () => void,
    onNovaCollect: (px: number, py: number) => void,
    onEnterBonusStage?: () => void
  ) {
    // Powerup Spawner
    if (!this.current) {
      this.spawnTimer -= dt * (isMadness ? 3.2 : 1.0);
      if (this.spawnTimer <= 0) {
        this.spawn(isMadness, maze);
        this.spawnTimer = isMadness ? 5 + Math.random() * 4 : 18 + Math.random() * 12;
      }
    } else {
      // Wall safety check for powerup: relocate if inside decor
      if (!maze.isWalkable(this.current.x, this.current.y, false)) {
        const safe = maze.findNearestWalkable(this.current.x, this.current.y, false);
        this.current.x = safe.x;
        this.current.y = safe.y;
      }

      this.current.timer -= dt;
      if (this.current.timer <= 0) {
        this.current = null;
      } else {
        const px = this.current.x * T + HALF, py = this.current.y * T + HALF;
        if (Math.hypot(plPos.x - px, plPos.y - py) < T * 0.9) {
          this.collect(this.current, onNovaCollect);
          this.current = null;
        }
      }
    }

    // Active Timers
    if (this.fx.phase > 0) this.fx.phase -= dt;
    if (this.fx.timewarp > 0) this.fx.timewarp -= dt;
    if (this.fx.magnet > 0) this.fx.magnet -= dt;
    if (this.fx.overdrive > 0) this.fx.overdrive -= dt;

    // Predator timer
    if (this.pred.on) {
      this.pred.t -= dt;
      this.pred.warn = this.pred.t < 2.5;
      if (this.pred.t <= 0) {
        this.pred.on = false;
        for (const e of enemies) {
          if (e.st === 'flee') e.st = 'active';
        }
      }
    }

    // Void Relic in Madness Mode
    if (isMadness) {
      this.updateVoidRelic(dt, maze, plPos, enemies, onTitanTransform, onVoidIntercepted);
    }

    // Vortex Bonus Portal (both Classic and Madness)
    this.updateVortexPortal(dt, maze, plPos, onEnterBonusStage);
  }

  private updateVortexPortal(
    dt: number,
    maze: MazeManager,
    plPos: { x: number; y: number },
    onEnterBonusStage?: () => void
  ) {
    if (!this.vortexPortal) {
      this.vortexPortalTimer -= dt;
      if (this.vortexPortalTimer <= 0) {
        this.vortexPortalTimer = 110.0 + Math.random() * 50.0;
        const pt = maze.getRandomWalkable(false);
        this.vortexPortal = { x: pt.x, y: pt.y, timer: 14.0, maxTimer: 14.0 };
        sounds.play('portal');
        particles.shake(4, 0.25);
        particles.addPop(CW / 2, 70, '🌀 PORTAIL VORTEX APPARU !', '#d946ef', 18);
      }
    } else {
      if (!maze.isWalkable(this.vortexPortal.x, this.vortexPortal.y, false)) {
        const safe = maze.findNearestWalkable(this.vortexPortal.x, this.vortexPortal.y, false);
        this.vortexPortal.x = safe.x;
        this.vortexPortal.y = safe.y;
      }
      this.vortexPortal.timer -= dt;
      const vx = this.vortexPortal.x * T + HALF, vy = this.vortexPortal.y * T + HALF;
      if (Math.random() < 0.25) {
        particles.emit(vx, vy, 1, Math.random() < 0.5 ? '#d946ef' : '#00ffff', { speed: 30, size: 2, life: 0.3 });
      }
      if (this.vortexPortal.timer <= 0) {
        this.vortexPortal = null;
        this.vortexPortalTimer = 90.0 + Math.random() * 40.0;
      } else if (Math.hypot(plPos.x - vx, plPos.y - vy) < T * 0.95) {
        particles.emit(vx, vy, 50, '#d946ef', { speed: 180, size: 5, life: 0.75 });
        sounds.play('portal');
        this.vortexPortal = null;
        this.vortexPortalTimer = 120.0 + Math.random() * 60.0;
        if (onEnterBonusStage) onEnterBonusStage();
      }
    }
  }

  public spawn(isMadness: boolean, maze: MazeManager) {
    const pt = maze.getRandomWalkable(false);
    const types = ['phase', 'nova', 'timewarp', 'magnet', 'overdrive'];
    const tp = isMadness && Math.random() < 0.5 ? 'overdrive' : types[(Math.random() * types.length) | 0];
    this.current = { x: pt.x, y: pt.y, type: tp, timer: isMadness ? 12 : 10 };
  }

  public collect(pu: PowerupItem, onNovaCollect: (px: number, py: number) => void) {
    const px = pu.x * T + HALF, py = pu.y * T + HALF;
    particles.addPop(px, py - 15, PN[pu.type], PC[pu.type], 16);
    particles.emit(px, py, 15, PC[pu.type], { speed: 100, size: 4, life: 0.6 });
    particles.shake(3, 0.15);
    particles.flash(PC[pu.type], 0.2);
    sounds.play('powerup');

    switch (pu.type) {
      case 'phase': this.fx.phase = 4; break;
      case 'nova': onNovaCollect(px, py); break;
      case 'timewarp': this.fx.timewarp = 5; break;
      case 'magnet': this.fx.magnet = 8; break;
      case 'overdrive': this.fx.overdrive = 7.0; break;
    }
  }

  public triggerPredator(enemies: any[]) {
    this.pred.on = true;
    this.pred.maxT = 7.0;
    this.pred.t = 7.0;
    this.pred.k = 0;
    this.pred.warn = false;
    for (const e of enemies) {
      if (e.st === 'active') e.st = 'flee';
    }
    sounds.play('pellet');
  }

  private updateVoidRelic(
    dt: number,
    maze: MazeManager,
    plPos: { x: number; y: number },
    enemies: any[],
    onTitanTransform: () => void,
    onVoidIntercepted: () => void
  ) {
    if (!this.voidRelic) {
      this.voidRelicTimer -= dt;
      if (this.voidRelicTimer <= 0) {
        this.voidRelicTimer = 16.0 + Math.random() * 8.0;
        const pt = maze.getRandomWalkable(false);
        this.voidRelic = { x: pt.x, y: pt.y, timer: 9.0, maxTimer: 9.0 };
        sounds.play('near');
        particles.shake(5, 0.25);
        particles.flash('#ff0055', 0.3);
        particles.addPop(CW / 2, 70, '⚠️ RELIQUE DU VIDE APPARUE !', '#ff0055', 18);
      }
    } else {
      // Wall safety check for Void Relic: relocate if inside decor
      if (!maze.isWalkable(this.voidRelic.x, this.voidRelic.y, false)) {
        const safe = maze.findNearestWalkable(this.voidRelic.x, this.voidRelic.y, false);
        this.voidRelic.x = safe.x;
        this.voidRelic.y = safe.y;
      }

      this.voidRelic.timer -= dt;
      const rx = this.voidRelic.x * T + HALF, ry = this.voidRelic.y * T + HALF;
      particles.emit(rx, ry, 2, '#ff0055', { speed: 40, size: 3, life: 0.3 });

      // Pac-Man intercepts
      if (Math.hypot(plPos.x - rx, plPos.y - ry) < T * 0.95) {
        particles.emit(rx, ry, 50, '#00ffaa', { speed: 220, size: 5, life: 0.75 });
        this.voidRelic = null;
        this.fx.magnet = 8.0;
        onVoidIntercepted();
        return;
      }

      // Ghost intercepts
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ex = e.x * T + HALF, ey = e.y * T + HALF;
          if (Math.hypot(ex - rx, ey - ry) < T * 0.9) {
            particles.emit(rx, ry, 50, '#ff0033', { speed: 180, size: 6, life: 0.8 });
            e.isTitan = true;
            e.speed = (e.speed || 4.5) * 1.35;
            this.voidRelic = null;
            onTitanTransform();
            return;
          }
        }
      }

      if (this.voidRelic.timer <= 0) this.voidRelic = null;
    }
  }

  public draw(c: CanvasRenderingContext2D, time: number) {
    if (this.current) {
      const px = this.current.x * T + HALF, py = this.current.y * T + HALF;
      const col = PC[this.current.type];
      const pulse = 1 + Math.sin(time * 5) * 0.2;
      const dis = this.current.timer < 3;
      c.globalAlpha = dis ? (Math.sin(time * 10) > 0 ? 1 : 0.3) : 1;
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(px, py, T * 0.35 * pulse, 0, PI2);
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#fff';
      c.font = 'bold 14px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(PI_[this.current.type], px, py);
      c.globalAlpha = 1;
    }

    if (this.voidRelic) {
      const rx = this.voidRelic.x * T + HALF, ry = this.voidRelic.y * T + HALF;
      const pulse = 1 + Math.sin(time * 10) * 0.25;
      c.save();
      c.fillStyle = '#ff0055';
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.shadowColor = '#ff0055';
      c.shadowBlur = 22;
      c.beginPath();
      c.arc(rx, ry, T * 0.44 * pulse, 0, PI2);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.font = 'bold 16px monospace';
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('☠️', rx, ry);
      c.restore();
    }

    if (this.vortexPortal) {
      const vx = this.vortexPortal.x * T + HALF, vy = this.vortexPortal.y * T + HALF;
      const pulse = 1 + Math.sin(time * 8) * 0.2;
      c.save();
      c.translate(vx, vy);

      // Rotating elliptical neon plasma rings
      c.strokeStyle = '#00ffff';
      c.lineWidth = 2.2;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 14;
      c.beginPath();
      c.ellipse(0, 0, T * 0.6 * pulse, T * 0.28, time * 2.5, 0, PI2);
      c.stroke();

      c.strokeStyle = '#d946ef';
      c.lineWidth = 2.4;
      c.shadowColor = '#d946ef';
      c.shadowBlur = 18;
      c.beginPath();
      c.ellipse(0, 0, T * 0.6 * pulse, T * 0.28, -time * 2.2, 0, PI2);
      c.stroke();

      // Cosmic core gradient
      const grad = c.createRadialGradient(0, 0, 1, 0, 0, T * 0.45 * pulse);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#d946ef');
      grad.addColorStop(1, 'rgba(80, 0, 200, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(0, 0, T * 0.45 * pulse, 0, PI2);
      c.fill();

      // Portal symbol
      c.font = 'bold 15px monospace';
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.shadowBlur = 8;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('🌀', 0, 0);
      c.restore();
    }
  }
}

export const powerups = new PowerupManager();
