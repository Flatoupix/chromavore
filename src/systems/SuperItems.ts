// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SUPER-ITEMS SYSTEM (ANTI-STACKING & BALANCED)
// ═══════════════════════════════════════════════════════════════

import { CW, ROWS, COLS, T, PI2, EC } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { progression } from './ProgressionSystem';
import { MazeManager } from '../levels/levels';

export interface SuperItem {
  type: 'nova' | 'vortex' | 'laser' | 'cryo' | 'tsunami' | 'overdrive';
  name: string;
  icon: string;
  ready: boolean;
}

export interface AbsorbedGhost {
  col: string;
  x: number;
  y: number;
  angle: number;
  dist: number;
  scale: number;
  life: number;
}

export class SuperItemManager {
  public activeSlot: SuperItem | null = null;
  public vortex: { x: number; y: number; life: number; maxLife: number } | null = null;
  public absorbedGhosts: AbsorbedGhost[] = [];
  public laserTimer: number = 0;
  public cryoTimer: number = 0;
  public tsunamiX: number = -1;

  public isRunning(): boolean {
    return this.laserTimer > 0 || this.vortex !== null || this.tsunamiX >= 0 || this.cryoTimer > 0;
  }

  public unlock(type: string, name: string, icon: string) {
    if (this.activeSlot) return;
    this.activeSlot = { type: type as any, name, icon, ready: true };
    sounds.play('badge');
    particles.flash('#00ffff', 0.25);
    particles.shake(4, 0.15);
    particles.addPop(CW / 2, 80, `⚡ SUPER-ITEM : ${name} ! [E]`, '#00ffff', 20);

    const itmBtn = document.getElementById('item-btn');
    if (itmBtn) {
      itmBtn.classList.add('ready');
      itmBtn.innerText = icon;
    }
  }

  public trigger(
    plPos: { x: number; y: number },
    enemies: any[],
    onKillGhost: (e: any, x: number, y: number) => void,
    addMadnessTime: (sec: number) => void,
    activateOverdrive?: () => void
  ): boolean {
    if (!this.activeSlot) return false;

    const type = this.activeSlot.type;
    const lvl = progression.getSkillLevel(type);
    this.resetEffects();

    switch (type) {
      case 'nova': {
        sounds.play('nova');
        particles.shake(lvl >= 2 ? 16 : 12, 0.45);
        particles.flash('#ffd700', 0.45);
        particles.emit(plPos.x, plPos.y, lvl >= 2 ? 100 : 60, '#ffd700', { speed: 280, size: 6, life: 0.9 });
        for (const e of enemies) {
          if (e.st !== 'dead' && e.st !== 'return') {
            onKillGhost(e, e.x * T + T / 2, e.y * T + T / 2);
          }
        }
        particles.addPop(CW / 2, (ROWS * T) / 2, lvl >= 2 ? '💣 SUPERNOVA V2 !' : '💥 MEGA NOVA !', '#ffd700', lvl >= 2 ? 26 : 22);
        break;
      }
      case 'vortex': {
        sounds.play('powerup');
        this.vortex = { x: plPos.x, y: plPos.y, life: lvl >= 2 ? 5.0 : 3.5, maxLife: lvl >= 2 ? 5.0 : 3.5 };
        particles.shake(7, 0.25);
        particles.flash('#bb44ff', 0.25);
        particles.addPop(plPos.x, plPos.y - 20, lvl >= 2 ? '🕳️ DARK MATTER V2 !' : '🕳️ BLACK HOLE !', '#bb44ff', 22);
        break;
      }
      case 'laser': {
        sounds.play('dash');
        this.laserTimer = lvl >= 2 ? 4.5 : 3.2;
        particles.shake(6, 0.25);
        particles.flash('#00ffff', 0.25);
        particles.addPop(CW / 2, (ROWS * T) / 2, lvl >= 2 ? '⚡ OCTO BEAMS V2 !' : '⚡ HYPER BEAMS !', '#00ffff', 22);
        break;
      }
      case 'cryo': {
        sounds.play('powerup');
        this.cryoTimer = lvl >= 2 ? 5.5 : 4.0;
        for (const e of enemies) e.frozen = true;
        particles.shake(6, 0.25);
        particles.flash('#aaffff', 0.25);
        particles.addPop(CW / 2, (ROWS * T) / 2, lvl >= 2 ? '❄️ ABSOLUTE ZERO V2 !' : '❄️ GHOSTS FROZEN !', '#aaffff', 22);
        break;
      }
      case 'tsunami': {
        sounds.play('wave');
        this.tsunamiX = 0;
        addMadnessTime(lvl >= 2 ? 14.0 : 8.0);
        particles.shake(9, 0.35);
        particles.flash('#ffffff', 0.35);
        particles.addPop(CW / 2, (ROWS * T) / 2, lvl >= 2 ? '👑 SOLAR ECLIPSE V2 !' : '👑 LIGHT TSUNAMI !', '#ffffff', 22);
        break;
      }
      case 'overdrive': {
        sounds.play('powerup');
        if (activateOverdrive) activateOverdrive();
        particles.shake(6, 0.2);
        particles.flash('#00ffcc', 0.35);
        particles.addPop(plPos.x, plPos.y - 20, lvl >= 2 ? '⚡ CHRONO OVERDRIVE V2 !' : '⚡ DASH INFINI (8s) !', '#00ffcc', 22);
        break;
      }
    }

    this.activeSlot = null;
    const itmBtn = document.getElementById('item-btn');
    if (itmBtn) itmBtn.classList.remove('ready');
    return true;
  }

  public update(
    dt: number,
    plPos: { x: number; y: number },
    enemies: any[],
    onKillGhost: (e: any, x: number, y: number) => void,
    maze?: MazeManager,
    onCollectDot?: (c: number, r: number) => void
  ) {
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      const isOcto = progression.getSkillLevel('laser') >= 2;
      particles.emit(plPos.x, plPos.y, isOcto ? 6 : 4, '#00ffff', { speed: 120, size: 3, life: 0.2 });
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ex = e.x * T + T / 2, ey = e.y * T + T / 2;
          const hitAxis = Math.abs(ex - plPos.x) < T || Math.abs(ey - plPos.y) < T;
          const hitDiag = isOcto && Math.abs(Math.abs(ex - plPos.x) - Math.abs(ey - plPos.y)) < T * 1.2;
          if (hitAxis || hitDiag) {
            onKillGhost(e, ex, ey);
          }
        }
      }
    }

    if (this.vortex) {
      this.vortex.life -= dt;
      const vLvl = progression.getSkillLevel('vortex');
      const vX = this.vortex.x;
      const vY = this.vortex.y;
      const vRadius = vLvl >= 2 ? 240 : 175;
      const eventHorizon = vLvl >= 2 ? 38 : 30;

      // Accretion disk ambient particle suction
      for (let i = 0; i < 3; i++) {
        const pAng = Math.random() * PI2;
        const pDist = 24 + Math.random() * (vRadius * 0.7);
        particles.emit(
          vX + Math.cos(pAng) * pDist,
          vY + Math.sin(pAng) * pDist,
          1,
          vLvl >= 2 ? '#00ffff' : '#bb44ff',
          { speed: -110, size: 2.5, life: 0.3 }
        );
      }

      // Dark Matter V2: Gravitational pull on surrounding dots
      if (vLvl >= 2 && maze && onCollectDot) {
        const tileRadius = 5;
        const vTileX = Math.floor(vX / T);
        const vTileY = Math.floor(vY / T);
        for (let dy = -tileRadius; dy <= tileRadius; dy++) {
          for (let dx = -tileRadius; dx <= tileRadius; dx++) {
            const tx = (vTileX + dx + COLS) % COLS;
            const ty = vTileY + dy;
            if (ty >= 0 && ty < ROWS && maze.dotMap[ty] && maze.dotMap[ty][tx] > 0) {
              const dDist = Math.hypot(tx * T + T / 2 - vX, ty * T + T / 2 - vY);
              if (dDist < vRadius * 0.75 && Math.random() < dt * 4.5) {
                onCollectDot(tx, ty);
                particles.emit(tx * T + T / 2, ty * T + T / 2, 2, '#ffd700', { speed: -120, size: 2, life: 0.25 });
              }
            }
          }
        }
      }

      // Physical suction of ghosts with STRICT WALL COLLISION
      for (const e of enemies) {
        if (e.st === 'dead' || e.st === 'return' || e.st === 'spawn') continue;

        // Current real position of ghost in pixels
        const curX = (e.fx + (e.x - e.fx) * e.t) * T + T / 2;
        const curY = (e.fy + (e.y - e.fy) * e.t) * T + T / 2;
        const dx = vX - curX;
        const dy = vY - curY;
        const dist = Math.hypot(dx, dy);

        if (dist <= eventHorizon) {
          // GHOST ABSORPTION: Spiral into the singularity!
          this.absorbedGhosts.push({
            col: e.isTitan ? '#ff0055' : (EC[e.type] || '#bb44ff'),
            x: curX,
            y: curY,
            angle: Math.atan2(curY - vY, curX - vX),
            dist: dist,
            scale: 1.0,
            life: 0.55
          });

          // Kill ghost (triggers points, sound, streak, and ghost return)
          onKillGhost(e, curX, curY);
          particles.emit(curX, curY, 25, '#ff00ff', { speed: 120, size: 4, life: 0.5 });
          particles.shake(5, 0.2);
          sounds.play('pellet');
        } else if (dist < vRadius) {
          // Gravitational pull magnitude (stronger closer to singularity)
          const normDist = dist / vRadius;
          const pullSpeed = (1 - normDist) * (vLvl >= 2 ? 150 : 105) * dt;
          const pullDirX = (dx / dist) * pullSpeed;
          const pullDirY = (dy / dist) * pullSpeed;

          // Check walls before moving: walls remain 100% solid obstacles!
          let canMoveX = true;
          let canMoveY = true;

          if (maze) {
            // Predict next tile in X
            const checkX = curX + pullDirX + Math.sign(pullDirX) * (T * 0.38);
            const tileX = Math.floor(checkX / T);
            const currentTileY = Math.floor(curY / T);
            if (!maze.isWalkable(tileX, currentTileY, true)) {
              canMoveX = false; // Solid wall in X!
            }

            // Predict next tile in Y
            const checkY = curY + pullDirY + Math.sign(pullDirY) * (T * 0.38);
            const tileY = Math.floor(checkY / T);
            const currentTileX = Math.floor(curX / T);
            if (!maze.isWalkable(currentTileX, tileY, true)) {
              canMoveY = false; // Solid wall in Y!
            }
          }

          // Apply displacement only where there is no solid wall
          const moveX = canMoveX ? pullDirX : 0;
          const moveY = canMoveY ? pullDirY : 0;

          if (moveX !== 0 || moveY !== 0) {
            e.fx += moveX / T;
            e.x += moveX / T;
            e.fy += moveY / T;
            e.y += moveY / T;

            // Spiral particle trail on ghost as it gets pulled
            if (Math.random() < 0.25) {
              particles.emit(curX, curY, 1, '#bb44ff', { speed: 40, size: 2, life: 0.2 });
            }
          }
        }
      }

      // Update absorbed ghosts spiraling into singularity
      for (let i = this.absorbedGhosts.length - 1; i >= 0; i--) {
        const g = this.absorbedGhosts[i];
        g.life -= dt;
        g.angle += dt * 18; // rapid orbital spin
        g.dist = Math.max(0, g.dist - dt * 65); // pulled into center
        g.scale = Math.max(0, g.life / 0.55); // shrinking
        if (this.vortex) {
          g.x = this.vortex.x + Math.cos(g.angle) * g.dist;
          g.y = this.vortex.y + Math.sin(g.angle) * g.dist;
        }
        if (g.life <= 0 || g.dist <= 2) {
          if (this.vortex) {
            particles.emit(this.vortex.x, this.vortex.y, 8, g.col, { speed: 60, size: 3, life: 0.3 });
          }
          this.absorbedGhosts.splice(i, 1);
        }
      }

      if (this.vortex.life <= 0) {
        particles.emit(vX, vY, 50, '#ff00ff', { speed: 200, size: 5, life: 0.7 });
        particles.flash('#bb44ff', 0.3);
        particles.shake(8, 0.3);
        this.vortex = null;
        this.absorbedGhosts = [];
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
      const vLvl = progression.getSkillLevel('vortex');
      const vCoreR = vLvl >= 2 ? 18 : 14;

      // Gravitational lensing outer distortion ring
      c.save();
      c.translate(this.vortex.x, this.vortex.y);
      const pulse = 1 + Math.sin(time * 8) * 0.08;
      c.strokeStyle = vLvl >= 2 ? 'rgba(0, 255, 255, 0.35)' : 'rgba(187, 68, 255, 0.3)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, (vLvl >= 2 ? 65 : 48) * pulse, 0, PI2);
      c.stroke();
      c.restore();

      // Swirling Accretion Disk Arms
      c.save();
      c.translate(this.vortex.x, this.vortex.y);
      c.rotate(time * 12);
      c.shadowColor = vLvl >= 2 ? '#00ffff' : '#ff00ff';
      c.shadowBlur = 22;
      c.lineWidth = 2.5;

      const armCount = vLvl >= 2 ? 6 : 4;
      for (let i = 0; i < armCount; i++) {
        const startA = (i * PI2) / armCount;
        c.strokeStyle = i % 2 === 0 ? '#ff00aa' : (vLvl >= 2 ? '#00ffff' : '#bb44ff');
        c.beginPath();
        c.arc(0, 0, 10 + (i % 3) * 12, startA, startA + Math.PI * 0.9);
        c.stroke();
      }
      c.shadowBlur = 0;

      // Event Horizon / Singularity Core
      c.fillStyle = '#000000';
      c.beginPath();
      c.arc(0, 0, vCoreR, 0, PI2);
      c.fill();

      // Bright photon ring around singularity
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.shadowColor = '#ff00ff';
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(0, 0, vCoreR, 0, PI2);
      c.stroke();
      c.restore();

      // Render Absorbed Ghosts spiraling into the Singularity!
      for (const ag of this.absorbedGhosts) {
        c.save();
        c.translate(ag.x, ag.y);
        c.rotate(ag.angle + Math.PI / 2);
        c.scale(ag.scale, ag.scale * 1.4); // spaghettification stretch
        c.globalAlpha = Math.max(0.2, ag.scale);
        c.fillStyle = ag.col;
        c.shadowColor = ag.col;
        c.shadowBlur = 10;
        const gr = T * 0.35;
        c.beginPath();
        c.arc(0, 0, gr, 0, PI2);
        c.fill();
        c.restore();
      }

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
    this.absorbedGhosts = [];
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
