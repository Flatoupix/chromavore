import { T, HALF, COLS, ROWS, CW, PC, PI_, PI2, PN } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from '../systems/ParticleSystem';
import { MazeManager } from '../levels/levels';
import { spriteAtlas } from '../graphics/SpriteAtlas';
import { profileManager } from '../systems/ProfileManager';

export interface PowerupItem {
  x: number;
  y: number;
  type: string;
  timer: number;
}

export interface ForceFieldDrop {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
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
  // Channel 1: Action Items (Nova, Overdrive, Timewarp, Phase)
  public current: PowerupItem | null = null;
  public spawnTimer: number = 12;

  // Channel 2: Force Field System (Independent channel!)
  public forceFieldItem: ForceFieldDrop | null = null;
  public forceFieldSpawnTimer: number = 18.0;

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
    this.spawnTimer = 12;
    this.forceFieldItem = null;
    this.forceFieldSpawnTimer = 14.0;
    this.fx = { phase: 0, timewarp: 0, magnet: 0, overdrive: 0 };
    this.pred = { on: false, t: 0, maxT: 7.0, k: 0, warn: false };
    this.voidRelic = null;
    this.voidRelicTimer = 14.0;
    this.vortexPortal = null;
    this.vortexPortalTimer = 85.0 + Math.random() * 35.0;
  }

  public getForceFieldStats(careerKills: number, isMadness: boolean): { cooldown: number; duration: number } {
    let baseCooldown: number;
    let duration: number;

    if (careerKills < 100) {
      baseCooldown = 24.0;
      duration = 6.0;
    } else if (careerKills < 400) {
      baseCooldown = 18.0;
      duration = 6.5;
    } else if (careerKills < 1000) {
      baseCooldown = 14.0;
      duration = 7.0;
    } else {
      // 1000+ kills: Hyperspace / Cyber Dash V2 era
      baseCooldown = 11.0;
      duration = 8.0;
    }

    return { cooldown: baseCooldown, duration };
  }

  public findDotDenseWalkable(maze: MazeManager): { x: number; y: number } {
    const candidates: { x: number; y: number; dots: number }[] = [];
    for (let r = 2; r < maze.rows - 2; r++) {
      for (let c = 1; c < maze.cols - 1; c++) {
        if (maze.isWalkable(c, r, false) && !maze.isInGhostHouse(c, r) && maze.map[r][c] !== 1 && maze.map[r][c] !== 0) {
          // Count dots in 3-tile radius
          let count = 0;
          for (let dr = -3; dr <= 3; dr++) {
            const nr = r + dr;
            if (nr < 0 || nr >= maze.rows) continue;
            for (let dc = -3; dc <= 3; dc++) {
              const nc = (c + dc + maze.cols) % maze.cols;
              if (maze.dotMap[nr] && maze.dotMap[nr][nc] > 0) count++;
            }
          }
          candidates.push({ x: c, y: r, dots: count });
        }
      }
    }
    if (!candidates.length) return maze.getRandomWalkable(false);
    candidates.sort((a, b) => b.dots - a.dots);
    const topSlice = candidates.slice(0, Math.max(1, Math.min(6, candidates.length)));
    return topSlice[(Math.random() * topSlice.length) | 0];
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
    onEnterBonusStage?: () => void,
    isPowerful: boolean = false
  ) {
    // ═════════════════════════════════════════════════════════════
    // MODE CLASSIQUE : STRICTEMENT AUCUN OBJET / POWERUP (PAC-MAN PUR)
    // ═════════════════════════════════════════════════════════════
    if (!isMadness) {
      if (this.current || this.forceFieldItem || this.voidRelic || this.vortexPortal) {
        this.reset();
      }
      // Only predator (energizer frightened ghosts) timer runs in classic if active
      if (this.pred.on) {
        this.pred.t -= dt;
        this.pred.warn = this.pred.t < 2.0;
        if (this.pred.t <= 0) {
          this.pred.on = false;
          for (const e of enemies) {
            if (e.st === 'flee') e.st = 'active';
          }
        }
      }
      return;
    }

    const careerKills = profileManager.profile.careerGhosts;

    // ─────────────────────────────────────────────────────────────
    // CHANNEL 1: ACTION ITEMS (Nova, Overdrive, Timewarp, Phase)
    // ─────────────────────────────────────────────────────────────
    if (!this.current) {
      this.spawnTimer -= dt * (isMadness ? 2.0 : 1.0);
      if (this.spawnTimer <= 0) {
        this.spawnActionItem(isMadness, maze);
        this.spawnTimer = isMadness ? 6.0 + Math.random() * 4.0 : 18.0 + Math.random() * 8.0;
      }
    } else {
      if (!maze.isWalkable(this.current.x, this.current.y, false) || maze.isInGhostHouse(this.current.x, this.current.y)) {
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

    // ─────────────────────────────────────────────────────────────
    // CHANNEL 2: FORCE FIELD SYSTEM (Independent progression drop!)
    // ─────────────────────────────────────────────────────────────
    if (!this.forceFieldItem) {
      // If player doesn't currently have active magnet, progress cooldown to spawn next Force Field
      if (this.fx.magnet <= 0) {
        const stats = this.getForceFieldStats(careerKills, isMadness);
        const speedScale = isPowerful ? 1.4 : 1.0;
        this.forceFieldSpawnTimer -= dt * speedScale;
        if (this.forceFieldSpawnTimer <= 0) {
          this.spawnForceField(maze, stats.duration);
          this.forceFieldSpawnTimer = stats.cooldown + Math.random() * 2.0;
        }
      }
    } else {
      if (!maze.isWalkable(this.forceFieldItem.x, this.forceFieldItem.y, false) || maze.isInGhostHouse(this.forceFieldItem.x, this.forceFieldItem.y)) {
        const safe = maze.findNearestWalkable(this.forceFieldItem.x, this.forceFieldItem.y, false);
        this.forceFieldItem.x = safe.x;
        this.forceFieldItem.y = safe.y;
      }

      this.forceFieldItem.timer -= dt;
      if (this.forceFieldItem.timer <= 0) {
        this.forceFieldItem = null;
      } else {
        const fx = this.forceFieldItem.x * T + HALF, fy = this.forceFieldItem.y * T + HALF;
        if (Math.hypot(plPos.x - fx, plPos.y - fy) < T * 0.95) {
          const stats = this.getForceFieldStats(careerKills, isMadness);
          this.fx.magnet = stats.duration;
          this.forceFieldItem = null;
          this.forceFieldSpawnTimer = stats.cooldown + Math.random() * 2.0;
          particles.addPop(fx, fy - 15, 'FORCE FIELD ACTIVÉ !', '#00ffff', 18);
          particles.emit(fx, fy, 25, '#00f0ff', { speed: 120, size: 4.5, life: 0.6 });
          particles.shake(4, 0.2);
          particles.flash('#00f0ff', 0.25);
          sounds.play('powerup');
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
        let pt = maze.getRandomWalkable(false);
        let attempts = 0;
        while (maze.isInGhostHouse(pt.x, pt.y) && attempts < 15) {
          pt = maze.getRandomWalkable(false);
          attempts++;
        }
        this.vortexPortal = { x: pt.x, y: pt.y, timer: 14.0, maxTimer: 14.0 };
        sounds.play('portal');
        particles.shake(4, 0.25);
        particles.addPop(CW / 2, 70, 'PORTAIL VORTEX APPARU !', '#d946ef', 18);
      }
    } else {
      if (!maze.isWalkable(this.vortexPortal.x, this.vortexPortal.y, false) || maze.isInGhostHouse(this.vortexPortal.x, this.vortexPortal.y)) {
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

  public spawnActionItem(isMadness: boolean, maze: MazeManager) {
    const types = ['overdrive', 'nova', 'timewarp', 'phase'];
    const tp = types[(Math.random() * types.length) | 0];
    let pt = maze.getRandomWalkable(false);
    let attempts = 0;
    while (maze.isInGhostHouse(pt.x, pt.y) && attempts < 15) {
      pt = maze.getRandomWalkable(false);
      attempts++;
    }
    this.current = { x: pt.x, y: pt.y, type: tp, timer: isMadness ? 12 : 10 };
  }

  public spawnForceField(maze: MazeManager, duration: number) {
    let pt = this.findDotDenseWalkable(maze);
    let attempts = 0;
    while (maze.isInGhostHouse(pt.x, pt.y) && attempts < 15) {
      pt = maze.getRandomWalkable(false);
      attempts++;
    }
    this.forceFieldItem = { x: pt.x, y: pt.y, timer: 14.0, maxTimer: 14.0 };
    sounds.play('powerup');
    particles.addPop(pt.x * T + HALF, pt.y * T - 14, 'FORCE FIELD DÉTECTÉ !', '#00ffff', 18);
    particles.emit(pt.x * T + HALF, pt.y * T + HALF, 24, '#00f0ff', { speed: 85, size: 4, life: 0.55 });
  }

  public spawn(isMadness: boolean, maze: MazeManager, isPowerful: boolean = false) {
    this.spawnActionItem(isMadness, maze);
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
      case 'magnet': this.fx.magnet = 9.0; break;
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
        let pt = maze.getRandomWalkable(false);
        let attempts = 0;
        while (maze.isInGhostHouse(pt.x, pt.y) && attempts < 15) {
          pt = maze.getRandomWalkable(false);
          attempts++;
        }
        this.voidRelic = { x: pt.x, y: pt.y, timer: 9.0, maxTimer: 9.0 };
        sounds.play('near');
        particles.shake(5, 0.25);
        particles.flash('#ff0055', 0.3);
        particles.addPop(CW / 2, 70, 'RELIQUE DU VIDE APPARUE !', '#ff0055', 18);
      }
    } else {
      // Wall safety check for Void Relic: relocate if inside decor or ghost house
      if (!maze.isWalkable(this.voidRelic.x, this.voidRelic.y, false) || maze.isInGhostHouse(this.voidRelic.x, this.voidRelic.y)) {
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
    // 1. Action Item (Nova, Overdrive, Timewarp, Phase)
    if (this.current) {
      const px = this.current.x * T + HALF, py = this.current.y * T + HALF;
      const col = PC[this.current.type] || '#ff00ff';
      const pulse = 1 + Math.sin(time * 5) * 0.2;
      const dis = this.current.timer < 3;

      c.save();
      c.globalAlpha = dis ? (Math.sin(time * 10) > 0 ? 1 : 0.3) : 1;
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(px, py, T * 0.35 * pulse, 0, PI2);
      c.fill();
      spriteAtlas.drawIcon(c, this.current.type, px, py, 18);
      c.restore();
    }

    // 2. Force Field Item (drawn cleanly like standard powerups, no outer bubble/rings)
    if (this.forceFieldItem) {
      const fx = this.forceFieldItem.x * T + HALF, fy = this.forceFieldItem.y * T + HALF;
      const col = PC['magnet'] || '#00f0ff';
      const pulse = 1 + Math.sin(time * 5) * 0.2;
      const dis = this.forceFieldItem.timer < 3;

      c.save();
      c.globalAlpha = dis ? (Math.sin(time * 10) > 0 ? 1 : 0.3) : 1;
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(fx, fy, T * 0.35 * pulse, 0, PI2);
      c.fill();
      c.shadowBlur = 0;
      spriteAtlas.drawIcon(c, 'magnet', fx, fy, 18);
      c.restore();
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

      // Crisp Pixel-Art Void Relic Icon 
      spriteAtlas.drawIcon(c, 'void_relic', rx, ry, 22);
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

      // Crisp Pixel-Art Cosmic Singularity 
      spriteAtlas.drawIcon(c, 'vortex_portal', 0, 0, 24);
      c.restore();
    }
  }
}

export const powerups = new PowerupManager();
