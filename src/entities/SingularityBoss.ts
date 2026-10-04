// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SINGULARITY CORE BOSS ENCOUNTER (LEVEL 10)
// ═══════════════════════════════════════════════════════════════

import { T, ROWS, HALF } from '../config/constants';
import { particles } from '../systems/ParticleSystem';
import { sounds } from '../audio/SoundManager';
import { experienceSystem } from '../systems/ExperienceSystem';
import { badges } from '../systems/BadgeSystem';
import { Player } from './Player';
import { EnemyManager } from './Enemy';
import { MazeManager } from '../levels/levels';

export interface BossRelay {
  id: 'NW' | 'NE' | 'SW' | 'SE';
  x: number;
  y: number;
  radius: number;
  isOverloaded: boolean;
  overloadTimer: number; // max 8.0s
  hitsRequired: number; // 1 (phases 1-2) or 2 (phase 3)
  currentHits: number;
  hitCooldown: number;
  pulseTimer: number;
}

export class SingularityBoss {
  public active: boolean = false;
  public x: number = 0;
  public y: number = 0;
  public radius: number = T * 1.8;

  public maxHp: number = 3000;
  public hp: number = 3000;
  public phase: 1 | 2 | 3 = 1;

  public shieldActive: boolean = true;
  public shieldAngle: number = 0;
  public exposedTimer: number = 0;
  public readonly EXPOSED_DURATION: number = 7.0;

  public relays: BossRelay[] = [];

  public arenaW: number = 0;
  public arenaH: number = 0;

  // Attack timers & state
  public beamTimer: number = 4.0;
  public beamWarning: number = 0;
  public beamActive: number = 0;
  public beamAngle: number = 0;

  public vortexTimer: number = 6.0;
  public vortexActive: number = 0;

  public pulseWaveTimer: number = 3.5;
  public pulseRingRadius: number = 0;

  public hitFlash: number = 0;
  public coreContactCooldown: number = 0;
  public isDefeated: boolean = false;
  public deathTimer: number = 0;
  public hasSpawnedPhase2Titans: boolean = false;

  constructor() {
    this.reset();
  }

  public init(cols: number, rows: number) {
    this.arenaW = cols * T;
    this.arenaH = rows * T;
    this.x = (cols * T) / 2;
    this.y = (rows * T) / 2;
    this.radius = T * 2.2;
    this.hp = this.maxHp;
    this.phase = 1;
    this.shieldActive = true;
    this.exposedTimer = 0;
    this.isDefeated = false;
    this.deathTimer = 0;
    this.active = true;
    this.hasSpawnedPhase2Titans = false;
    this.coreContactCooldown = 0;

    // 4 Corner Relay positions adapted to the macro-arena
    const marginX = (cols >= 40 ? 5.5 : 3.5) * T;
    const marginY = (rows >= 30 ? 6.5 : 3.5) * T;
    const rightX = (cols * T) - marginX;
    const bottomY = (rows * T) - marginY;

    this.relays = [
      { id: 'NW', x: marginX, y: marginY, radius: T * 1.1, isOverloaded: false, overloadTimer: 0, hitsRequired: 1, currentHits: 0, hitCooldown: 0, pulseTimer: 0 },
      { id: 'NE', x: rightX, y: marginY, radius: T * 1.1, isOverloaded: false, overloadTimer: 0, hitsRequired: 1, currentHits: 0, hitCooldown: 0, pulseTimer: 0 },
      { id: 'SW', x: marginX, y: bottomY, radius: T * 1.1, isOverloaded: false, overloadTimer: 0, hitsRequired: 1, currentHits: 0, hitCooldown: 0, pulseTimer: 0 },
      { id: 'SE', x: rightX, y: bottomY, radius: T * 1.1, isOverloaded: false, overloadTimer: 0, hitsRequired: 1, currentHits: 0, hitCooldown: 0, pulseTimer: 0 },
    ];

    sounds.play('nova');
    particles.flash('#ffd700', 0.5);
    particles.shake(12, 0.5);
    particles.addPop(this.x, this.y - 45, '« SINGULARITY CORE AWAKENED »', '#ffd700', 22);
  }

  public reset() {
    this.active = false;
    this.hp = this.maxHp;
    this.phase = 1;
    this.shieldActive = true;
    this.exposedTimer = 0;
    this.relays = [];
    this.isDefeated = false;
    this.deathTimer = 0;
    this.hasSpawnedPhase2Titans = false;
    this.coreContactCooldown = 0;
  }

  public update(dt: number, player: Player, enemyManager: EnemyManager, maze: MazeManager, time: number): { bossDefeated: boolean; scoreBonus: number } {
    if (!this.active) return { bossDefeated: false, scoreBonus: 0 };

    // Death sequence
    if (this.isDefeated) {
      this.deathTimer -= dt;
      if (Math.random() < 0.35) {
        const ox = this.x + (Math.random() - 0.5) * 80;
        const oy = this.y + (Math.random() - 0.5) * 80;
        particles.emit(ox, oy, 15, Math.random() < 0.5 ? '#ffd700' : '#00ffff', { speed: 180, size: 5, life: 0.6 });
        sounds.play('hit');
      }
      if (this.deathTimer <= 0) {
        this.active = false;
        return { bossDefeated: true, scoreBonus: 50000 };
      }
      return { bossDefeated: false, scoreBonus: 0 };
    }

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    this.shieldAngle += dt * 1.5;

    // Check Phase
    if (this.hp <= 1000 && this.phase !== 3) {
      this.phase = 3;
      particles.flash('#ff0055', 0.4);
      particles.shake(15, 0.45);
      particles.addPop(this.x, this.y - 45, '★ PHASE 3: CRITICAL OVERLOAD ★', '#ff0055', 22);
      for (const r of this.relays) {
        r.hitsRequired = 2;
        r.currentHits = 0;
        r.isOverloaded = false;
        r.overloadTimer = 0;
      }
      sounds.play('nova');
    } else if (this.hp <= 2000 && this.phase === 1) {
      this.phase = 2;
      particles.flash('#a855f7', 0.4);
      particles.shake(12, 0.4);
      particles.addPop(this.x, this.y - 45, '★ PHASE 2: GRAVITATIONAL VORTEX ★', '#a855f7', 22);
      sounds.play('powerup');
      if (!this.hasSpawnedPhase2Titans) {
        this.hasSpawnedPhase2Titans = true;
        // Spawn 2 Sentinel Titans to defend the core
        enemyManager.spawnMadness(2, 50, maze, maze.currentLevel);
      }
    }

    const pp = player.getPos();

    // ─── 1. Update Relays & Check Overload ───
    let allOverloaded = true;

    for (const r of this.relays) {
      if (r.hitCooldown > 0) r.hitCooldown = Math.max(0, r.hitCooldown - dt);
      r.pulseTimer += dt;

      if (r.isOverloaded) {
        // While boss is exposed, relays remain overloaded
        if (this.exposedTimer <= 0) {
          r.overloadTimer -= dt;
          if (r.overloadTimer <= 0) {
            r.isOverloaded = false;
            r.currentHits = 0;
            particles.addPop(r.x, r.y - 18, 'RELAY RESTORED', '#00ffff', 14);
          }
        }
      } else {
        allOverloaded = false;
      }

      // Passive proximity warning
      const distToRelay = Math.hypot(pp.x - r.x, pp.y - r.y);
      if (distToRelay < r.radius + T * 0.5 && !r.isOverloaded) {
        if (Math.random() < 0.15) {
          particles.emit(r.x, r.y, 2, '#00ffff', { speed: 40, size: 2.5, life: 0.25 });
        }
      }
    }

    // ─── 2. Exposed Core State ───
    if (this.shieldActive && allOverloaded && this.relays.length === 4) {
      this.shieldActive = false;
      this.exposedTimer = this.EXPOSED_DURATION;
      sounds.play('nova');
      sounds.play('powerup');
      particles.flash('#ffd700', 0.5);
      particles.shake(16, 0.5);
      particles.addPop(this.x, this.y - 50, '⚡ SHIELD BREACH! ATTACK THE CORE! ⚡', '#ffd700', 24);
    }

    if (this.exposedTimer > 0) {
      this.exposedTimer -= dt;
      if (this.exposedTimer <= 0) {
        this.shieldActive = true;
        for (const r of this.relays) {
          r.isOverloaded = false;
          r.overloadTimer = 0;
          r.currentHits = 0;
        }
        sounds.play('hit');
        particles.flash('#00ffff', 0.3);
        particles.addPop(this.x, this.y - 50, 'SHIELD RESTORED! OVERLOAD RELAYS!', '#00ffff', 20);
      }
    }

    // ─── 3. Player Proximity Collision with Core ───
    if (this.coreContactCooldown > 0) this.coreContactCooldown -= dt;
    const distToCore = Math.hypot(pp.x - this.x, pp.y - this.y);
    if (distToCore < this.radius + T * 0.7) {
      const angle = Math.atan2(pp.y - this.y, pp.x - this.x);
      if (this.shieldActive) {
        // Shield bounce-back with shockwave push
        player.applyRepulsion(angle, 2.5, maze);
        particles.emit(pp.x, pp.y, 16, '#00ffff', { speed: 140, size: 4, life: 0.35 });
        sounds.play('hit');
        particles.addPop(pp.x, pp.y - 20, 'SHIELD DEFLECT !', '#00ffff', 14);
      } else {
        // Core is exposed: contact deals damage and bounces player slightly
        if (this.coreContactCooldown <= 0) {
          this.coreContactCooldown = 0.5; // Prevent multi-hit per frame
          this.takeDamage(150);
          sounds.play('hit');
          particles.emit(pp.x, pp.y, 20, '#ffd700', { speed: 160, size: 4.5, life: 0.4 });
          particles.addPop(pp.x, pp.y - 24, 'CORE STRIKE -150', '#ffd700', 16);
        }
        player.applyRepulsion(angle, 1.8, maze);
      }
    }

    // ─── 4. Boss Attacks ───
    this.updateAttacks(dt, player, pp, maze);

    return { bossDefeated: false, scoreBonus: 0 };
  }

  private updateAttacks(dt: number, player: Player, pp: { x: number; y: number }, maze: MazeManager) {
    // Attack 1: Cardinal Laser Beams (Phases 1-3)
    this.beamTimer -= dt;
    if (this.beamTimer <= 0) {
      this.beamWarning = 1.0;
      this.beamTimer = this.phase === 3 ? 3.8 : 5.0;
    }

    if (this.beamWarning > 0) {
      this.beamWarning -= dt;
      if (this.beamWarning <= 0) {
        this.beamActive = 0.85;
        sounds.play('laser');
        particles.shake(8, 0.3);
      }
    }

    if (this.beamActive > 0) {
      this.beamActive -= dt;
      if (this.phase === 3) {
        this.beamAngle += dt * 0.6; // Rotating beams in Phase 3
      } else {
        this.beamAngle = 0;
      }

      // Check if player stands in cardinal beams
      const beamHalfWidth = T * 0.75;
      const beamReach = Math.max(this.arenaW || 1200, this.arenaH || 1000) * 1.5;
      const dx = pp.x - this.x;
      const dy = pp.y - this.y;

      const cos = Math.cos(-this.beamAngle);
      const sin = Math.sin(-this.beamAngle);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;

      const inHorizontalBeam = Math.abs(ry) < beamHalfWidth && Math.abs(rx) <= beamReach;
      const inVerticalBeam = Math.abs(rx) < beamHalfWidth && Math.abs(ry) <= beamReach;

      if ((inHorizontalBeam || inVerticalBeam) && player.invuln <= 0) {
        player.invuln = 1.0;
        sounds.play('hit');
        particles.flash('#ff0055', 0.2);
        particles.shake(6, 0.2);
        particles.addPop(pp.x, pp.y - 20, 'BEAM GLANCE!', '#ff0055', 16);
      }
    }

    // Attack 2: Gravitational Pull (Phase 2 & 3)
    if (this.phase >= 2) {
      this.vortexTimer -= dt;
      if (this.vortexTimer <= 0) {
        this.vortexActive = 2.2;
        this.vortexTimer = 6.5;
        particles.addPop(this.x, this.y - 40, 'GRAVITATIONAL COLLAPSE!', '#a855f7', 16);
      }

      if (this.vortexActive > 0) {
        this.vortexActive -= dt;
        const dist = Math.hypot(pp.x - this.x, pp.y - this.y);
        const maxVortexDist = Math.max(550, (this.arenaW || 1000) * 0.45);
        if (dist > this.radius && dist < maxVortexDist) {
          const pullAngle = Math.atan2(this.y - pp.y, this.x - pp.x);
          player.applyGravitationalPull(pullAngle, 85 * dt, maze);
          if (Math.random() < 0.25) {
            particles.emit(pp.x, pp.y, 2, '#a855f7', { speed: 40, size: 3, life: 0.3 });
          }
        }
      }
    }

    // Attack 3: Pulse Ring (Phase 3)
    if (this.phase === 3) {
      this.pulseWaveTimer -= dt;
      if (this.pulseWaveTimer <= 0) {
        this.pulseWaveTimer = 3.5;
        this.pulseRingRadius = this.radius;
        sounds.play('nova');
      }

      if (this.pulseRingRadius > 0) {
        this.pulseRingRadius += dt * 180;
        const dist = Math.hypot(pp.x - this.x, pp.y - this.y);
        if (Math.abs(dist - this.pulseRingRadius) < 16 && player.invuln <= 0) {
          player.invuln = 1.0;
          sounds.play('hit');
          particles.flash('#ff0055', 0.2);
          particles.shake(6, 0.2);
        }
        const maxRingRadius = Math.max(this.arenaW || 1200, this.arenaH || 1000) * 1.2;
        if (this.pulseRingRadius > maxRingRadius) {
          this.pulseRingRadius = 0;
        }
      }
    }
  }

  public handleDashTrajectory(startPos: { x: number; y: number }, endPos: { x: number; y: number }, player: Player) {
    if (!this.active || this.isDefeated) return;

    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    };

    // 1. Check Relays
    for (const r of this.relays) {
      const d = distToSegment(r.x, r.y, startPos.x, startPos.y, endPos.x, endPos.y);
      if (d < r.radius + T * 0.75 && r.hitCooldown <= 0 && !r.isOverloaded) {
        r.hitCooldown = 0.4;
        r.currentHits++;
        sounds.play('dash');
        sounds.play('hit');
        particles.shake(6, 0.22);
        particles.emit(r.x, r.y, 28, '#00ffff', { speed: 190, size: 4.5, life: 0.5 });

        if (r.currentHits >= r.hitsRequired) {
          r.isOverloaded = true;
          r.overloadTimer = 8.0;
          sounds.play('nova');
          particles.flash('#00ffff', 0.25);
          particles.addPop(r.x, r.y - 22, `⚡ ${r.id} RELAY OVERLOADED! ⚡`, '#00ffff', 18);
        } else {
          particles.addPop(r.x, r.y - 22, `RELAY HIT (1/${r.hitsRequired})`, '#ffd700', 14);
        }
      }
    }

    // 2. Check Core
    const dCore = distToSegment(this.x, this.y, startPos.x, startPos.y, endPos.x, endPos.y);
    if (dCore < this.radius + T * 0.8) {
      if (!this.shieldActive && this.exposedTimer > 0) {
        // Massive critical dash strike on exposed core!
        this.takeDamage(350);
        sounds.play('nova');
        particles.shake(14, 0.35);
        particles.flash('#ffd700', 0.25);
      } else {
        // Shielded: deflect dash
        sounds.play('hit');
        particles.emit(this.x, this.y, 20, '#00ffff', { speed: 150, size: 4, life: 0.35 });
        particles.addPop(this.x, this.y - 25, 'SHIELD DEFLECT!', '#00ffff', 16);
      }
    }
  }

  public takeDamage(amount: number) {
    if (this.isDefeated) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 1.0;
    sounds.play('hit');
    particles.shake(10, 0.3);
    particles.flash('#ffd700', 0.2);
    particles.emit(this.x, this.y, 35, '#ffd700', { speed: 200, size: 5, life: 0.5 });
    particles.addPop(this.x, this.y - 30, `-${amount} CRITICAL!`, '#ffd700', 20);

    if (this.hp <= 0) {
      this.isDefeated = true;
      this.deathTimer = 2.5;
      sounds.play('nova');
      particles.flash('#ffffff', 0.8);
      particles.shake(25, 1.0);
      particles.addPop(this.x, this.y - 60, '★ SINGULARITY CORE COLLAPSED! ★', '#ffd700', 28);
      badges.unlock('boss_slayer');
      experienceSystem.addXp(1500, 'boss_defeat');
    }
  }

  public draw(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.active) return;
    const c = ctx;

    // ─── 1. Beams & Precision Telegraphing ───
    const beamReach = Math.max(this.arenaW || 1200, this.arenaH || 1000) * 1.5;
    if (this.beamWarning > 0) {
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.beamAngle);

      const alpha = 0.4 + 0.35 * Math.sin(time * 24);
      const beamW = T * 1.5;

      // Telegraph Zone Corridor
      c.fillStyle = `rgba(255, 40, 0, ${alpha * 0.15})`;
      c.fillRect(-beamReach, -beamW / 2, beamReach * 2, beamW);
      c.fillRect(-beamW / 2, -beamReach, beamW, beamReach * 2);

      // Central Laser Sightlines
      c.strokeStyle = '#ff3300';
      c.shadowColor = '#ff4400';
      c.shadowBlur = 10;
      c.lineWidth = 1.8;
      c.globalAlpha = alpha;

      c.beginPath();
      c.moveTo(-beamReach, 0); c.lineTo(beamReach, 0);
      c.moveTo(0, -beamReach); c.lineTo(0, beamReach);
      c.stroke();

      // Scrolling Targeting Reticles along the sightlines
      const offset = (time * 180) % 120;
      for (let d = 90; d < beamReach; d += 120) {
        for (const sign of [-1, 1]) {
          const px = (d + offset) * sign;
          c.strokeRect(px - 5, -5, 10, 10);
          const py = (d + offset) * sign;
          c.strokeRect(-5, py - 5, 10, 10);
        }
      }
      c.restore();
    } else if (this.beamActive > 0) {
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.beamAngle);

      const beamW = T * 1.6;
      const colOuter = this.phase === 3 ? '#ff0055' : '#00ffff';

      // Outer High-Energy Laser Aura
      c.fillStyle = colOuter;
      c.shadowColor = colOuter;
      c.shadowBlur = 24;
      c.globalAlpha = 0.85;
      c.fillRect(-beamReach, -beamW / 2, beamReach * 2, beamW);
      c.fillRect(-beamW / 2, -beamReach, beamW, beamReach * 2);

      // Intense White Core Beam
      c.fillStyle = '#ffffff';
      c.shadowBlur = 0;
      c.globalAlpha = 0.95;
      c.fillRect(-beamReach, -beamW * 0.22, beamReach * 2, beamW * 0.44);
      c.fillRect(-beamW * 0.22, -beamReach, beamW * 0.44, beamReach * 2);

      c.restore();
    }

    // ─── 2. Pulse Ring (Phase 3) ───
    if (this.pulseRingRadius > 0) {
      c.save();
      c.beginPath();
      c.arc(this.x, this.y, this.pulseRingRadius, 0, Math.PI * 2);
      c.strokeStyle = '#ff0055';
      c.shadowColor = '#ff0055';
      c.shadowBlur = 12;
      c.lineWidth = 4;
      c.stroke();
      c.restore();
    }

    // ─── 3. Gravitational Pull Spiral ───
    if (this.vortexActive > 0) {
      c.save();
      c.beginPath();
      c.arc(this.x, this.y, 220 + 30 * Math.sin(time * 8), 0, Math.PI * 2);
      c.strokeStyle = 'rgba(168, 85, 247, 0.45)';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.stroke();
      c.restore();
    }

    // ─── 4. Relays & High-Tech Plasma Conduits ───
    for (const r of this.relays) {
      c.save();
      // Conduit Tether to Core
      c.beginPath();
      c.moveTo(this.x, this.y);
      c.lineTo(r.x, r.y);

      if (r.isOverloaded) {
        // Severed conduit with flickering electrical spark discharges
        c.strokeStyle = 'rgba(255, 60, 60, 0.35)';
        c.setLineDash([4, 8]);
        c.lineWidth = 1.5;
        c.stroke();
        c.setLineDash([]);

        if (Math.random() < 0.35) {
          const sparkT = Math.random();
          const sx = this.x + (r.x - this.x) * sparkT + (Math.random() - 0.5) * 8;
          const sy = this.y + (r.y - this.y) * sparkT + (Math.random() - 0.5) * 8;
          c.fillStyle = '#00ffff';
          c.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        }
      } else {
        // Active High-Energy Power Conduit
        const conduitCol = this.shieldActive ? '#ff007f' : '#ffd700';
        c.strokeStyle = conduitCol;
        c.shadowColor = conduitCol;
        c.shadowBlur = 8;
        c.lineWidth = 2.5;
        c.globalAlpha = 0.6 + 0.2 * Math.sin(time * 6 + r.pulseTimer);
        c.stroke();

        // Flowing plasma packets heading towards the core
        for (let p = 0; p < 4; p++) {
          const tNode = (time * 0.7 + p * 0.25) % 1.0;
          const flowT = 1.0 - tNode;
          const nx = this.x + (r.x - this.x) * flowT;
          const ny = this.y + (r.y - this.y) * flowT;
          c.beginPath();
          c.arc(nx, ny, 3.5, 0, Math.PI * 2);
          c.fillStyle = '#00ffff';
          c.shadowColor = '#00ffff';
          c.shadowBlur = 10;
          c.fill();
        }
      }
      c.restore();

      // Relay Pillar Base
      c.save();
      c.beginPath();
      c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      c.fillStyle = r.isOverloaded ? 'rgba(0, 240, 255, 0.2)' : 'rgba(25, 10, 30, 0.9)';
      c.strokeStyle = r.isOverloaded ? '#00ffff' : '#8899bb';
      c.lineWidth = 2.5;
      c.shadowColor = r.isOverloaded ? '#00ffff' : '#556677';
      c.shadowBlur = r.isOverloaded ? 14 : 4;
      c.fill();
      c.stroke();

      // Relay Core Indicator
      c.beginPath();
      c.arc(r.x, r.y, r.radius * 0.45, 0, Math.PI * 2);
      c.fillStyle = r.isOverloaded ? '#00ffff' : (r.currentHits > 0 ? '#ffd700' : '#475569');
      c.fill();

      // Overload Timer Ring or Hit Requirement
      if (r.isOverloaded && this.exposedTimer <= 0) {
        const prog = r.overloadTimer / 8.0;
        c.beginPath();
        c.arc(r.x, r.y, r.radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
        c.strokeStyle = '#00ffff';
        c.lineWidth = 2.5;
        c.stroke();
      }

      // Relay Label
      c.font = 'bold 9.5px monospace';
      c.fillStyle = r.isOverloaded ? '#00ffff' : '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(r.id, r.x, r.y);

      c.restore();
    }

    // ─── 5. Central Singularity Core & Kinetic Shields ───
    c.save();
    c.translate(this.x, this.y);

    // Accretion disk
    const diskRadius = this.radius * (1.35 + 0.1 * Math.sin(time * 4));
    const grad = c.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, diskRadius);
    const coreColor = this.hitFlash > 0 ? '#ffffff' : (this.shieldActive ? '#a855f7' : '#ffd700');
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.6, coreColor);
    grad.addColorStop(1, 'transparent');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, diskRadius, 0, Math.PI * 2);
    c.fill();

    // Dark Core Body
    c.beginPath();
    c.arc(0, 0, this.radius, 0, Math.PI * 2);
    c.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#05020a';
    c.strokeStyle = coreColor;
    c.lineWidth = 3.5;
    c.shadowColor = coreColor;
    c.shadowBlur = 20;
    c.fill();
    c.stroke();

    // Shield or Exposed State
    if (this.shieldActive) {
      // Ring 1 (Inner Arc Plates)
      c.save();
      c.rotate(this.shieldAngle);
      c.strokeStyle = '#00ffff';
      c.lineWidth = 3.5;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 14;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(0, 0, this.radius + 10, (i * Math.PI) / 2 + 0.15, ((i + 1) * Math.PI) / 2 - 0.15);
        c.stroke();
      }
      c.restore();

      // Ring 2 (Middle Hex Force Barrier)
      c.save();
      c.rotate(-this.shieldAngle * 1.3);
      c.strokeStyle = '#a855f7';
      c.lineWidth = 2;
      c.shadowColor = '#a855f7';
      c.shadowBlur = 10;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.arc(0, 0, this.radius + 20, (i * Math.PI) / 3 + 0.1, ((i + 1) * Math.PI) / 3 - 0.1);
        c.stroke();
      }
      c.restore();

      // Ring 3 (Outer Kinetic Deflector Nodes)
      c.save();
      c.rotate(this.shieldAngle * 0.7);
      c.fillStyle = '#00ffff';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 8;
      for (let i = 0; i < 8; i++) {
        const nodeAng = (i * Math.PI) / 4;
        const nx = Math.cos(nodeAng) * (this.radius + 28);
        const ny = Math.sin(nodeAng) * (this.radius + 28);
        c.beginPath();
        c.arc(nx, ny, 3, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    } else {
      // Golden exposed radiant aura & pulsating flare beams
      c.beginPath();
      c.arc(0, 0, this.radius + 8 + 5 * Math.sin(time * 12), 0, Math.PI * 2);
      c.strokeStyle = '#ffd700';
      c.shadowColor = '#ffd700';
      c.shadowBlur = 28;
      c.lineWidth = 3.5;
      c.stroke();

      // Radial energy rays bursting out
      c.save();
      c.rotate(time * 0.5);
      c.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI) / 6;
        c.beginPath();
        c.moveTo(Math.cos(ang) * (this.radius + 12), Math.sin(ang) * (this.radius + 12));
        c.lineTo(Math.cos(ang) * (this.radius + 38), Math.sin(ang) * (this.radius + 38));
        c.stroke();
      }
      c.restore();
    }

    c.restore();

    // ─── 6. Boss HP Bar ───
    this.drawBossHPBar(c);
  }

  private drawBossHPBar(c: CanvasRenderingContext2D) {
    const barW = Math.min(360, this.x * 2 - 40);
    const barH = 10;
    const barX = this.x - barW / 2;
    const barY = 56;

    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const phaseCol = this.phase === 3 ? '#ff0055' : (this.phase === 2 ? '#a855f7' : '#00ffff');

    c.save();

    // Container
    c.fillStyle = 'rgba(5, 8, 18, 0.9)';
    c.strokeStyle = phaseCol;
    c.lineWidth = 1.5;
    c.shadowColor = phaseCol;
    c.shadowBlur = 8;
    c.strokeRect(barX, barY, barW, barH);
    c.fillRect(barX, barY, barW, barH);

    // HP Fill
    if (hpRatio > 0) {
      const fillW = Math.max(2, (barW - 2) * hpRatio);
      const grad = c.createLinearGradient(barX, barY, barX + fillW, barY);
      grad.addColorStop(0, '#9333ea');
      grad.addColorStop(0.5, phaseCol);
      grad.addColorStop(1, '#ffffff');
      c.fillStyle = grad;
      c.fillRect(barX + 1, barY + 1, fillW, barH - 2);
    }

    // Text Header
    c.font = 'bold 9.5px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillStyle = '#ffffff';
    c.shadowColor = phaseCol;
    c.shadowBlur = 6;
    c.fillText(`SINGULARITY CORE [PHASE ${this.phase}] • ${Math.round(this.hp)} / ${this.maxHp} HP`, this.x, barY - 3);

    // Shield / Exposed Status line
    c.font = 'bold 8.5px monospace';
    c.textBaseline = 'top';
    if (this.shieldActive) {
      const overloadedCount = this.relays.filter(r => r.isOverloaded).length;
      c.fillStyle = '#00ffff';
      c.shadowColor = '#00ffff';
      c.fillText(`SHIELD ACTIVE: DASH OVERLOAD 4 RELAYS (${overloadedCount}/4)`, this.x, barY + barH + 3);
    } else {
      c.fillStyle = '#ffd700';
      c.shadowColor = '#ffd700';
      c.fillText(`⚡ CORE EXPOSED: STRIKE NOW! (${this.exposedTimer.toFixed(1)}s) ⚡`, this.x, barY + barH + 3);
    }

    c.restore();
  }
}
