// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — ARCADE OBJECT LAB (SANDBOX & REPEATABLE TRIALS)
// ═══════════════════════════════════════════════════════════════

import { T, HALF, BASE_COLS, COLS, ROWS, CW, CH, HUD_H, BOTTOM_BAR_H, WALL, EMPTY, EC, PI2 } from '../config/constants';
import { progression } from './ProgressionSystem';
import { superItems, SuperItem } from './SuperItems';
import { sounds } from '../audio/SoundManager';
import { particles } from './ParticleSystem';
import { spriteAtlas } from '../graphics/SpriteAtlas';
import { MazeManager } from '../levels/levels';
import { Player } from '../entities/Player';
import { powerups } from '../entities/Powerups';

export interface LabItemDef {
  id: string;
  type: SuperItem['type'] | 'super_pellet';
  name: string;
  shortName: string;
  icon: string;
  color: string;
  desc: string;
  requiredSkillId: string;
  tileX: number;
  tileY: number;
  active: boolean;
  respawnTimer: number;
  respawnDuration: number;
}

export interface LabGhost {
  id: number;
  type: 'blinky' | 'pinky' | 'inky' | 'clyde';
  x: number;
  y: number;
  fx: number;
  fy: number;
  t: number;
  dx: number;
  dy: number;
  st: 'active' | 'dead' | 'flee';
  speed: number;
  delay: number;
  fl: number;
  nm: boolean;
  frozen: boolean;
  frozenTimer: number;
  frightened: boolean;
  homeX: number;
  homeY: number;
  respawnTimer: number;
  patrolMinX: number;
  patrolMaxX: number;
}

// 21 columns x 22 rows training layout
// Open interior with corner columns and clean corridors for weapon testing
export const LAB_LAYOUT: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,1,1,4,4,1,1,4,4,4],
  [1,4,1,1,4,4,1,1,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,1,1,4,4,4,1,1,4,4],
  [1,4,1,1,4,4,4,1,1,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,1,1,4,4,4,1,1,4,4],
  [1,4,1,1,4,4,4,1,1,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,1,1,4,4,1,1,4,4,4],
  [1,4,1,1,4,4,1,1,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,4,4,4,4,4,4,4,4,4,4],
  [1,1,1,1,1,1,1,1,1,1,1]
];

export class LabManager {
  public maze: MazeManager;
  public items: LabItemDef[] = [];
  public ghosts: LabGhost[] = [];
  public activeNotice: string = 'STEP ON AN ITEM PAD TO TEST ITS REAL IN-GAME EFFECT';
  public activeNoticeTimer: number = 5.0;
  public lastTriedName: string = '';
  public lastTriedDesc: string = '';
  public playerHurtCooldown: number = 0;
  public frightenedTimer: number = 0;

  // Preset definition of all arcade super items and their required unlock IDs
  private static readonly ITEM_CONFIGS: Array<Omit<LabItemDef, 'active' | 'respawnTimer' | 'respawnDuration'>> = [
    {
      id: 'nova',
      type: 'nova',
      name: 'MEGA NOVA',
      shortName: 'NOVA',
      icon: 'nova',
      color: '#ffd700',
      desc: 'Thermo-nuclear burst instantly vaporizing all ghosts on screen.',
      requiredSkillId: 'nova_v1',
      tileX: 3,
      tileY: 15
    },
    {
      id: 'overdrive',
      type: 'overdrive',
      name: 'INFINITE DASH',
      shortName: 'DASH ∞',
      icon: 'overdrive',
      color: '#00ffcc',
      desc: 'Zero-cooldown infinite dash for 8 adrenaline-filled seconds.',
      requiredSkillId: 'overdrive_v1',
      tileX: 7,
      tileY: 15
    },
    {
      id: 'vortex',
      type: 'vortex',
      name: 'BLACK HOLE',
      shortName: 'VORTEX',
      icon: 'black_hole',
      color: '#bb44ff',
      desc: 'Gravitational singularity pulling and crushing all spectres in range.',
      requiredSkillId: 'vortex_v1',
      tileX: 13,
      tileY: 15
    },
    {
      id: 'super_pellet',
      type: 'super_pellet',
      name: 'SUPER PELLET',
      shortName: 'PELLET',
      icon: 'super_pellet',
      color: '#00f0ff',
      desc: 'Frightens ghosts with flashing vulnerability to devour them on contact.',
      requiredSkillId: 'super_pellet_v1',
      tileX: 17,
      tileY: 15
    },
    {
      id: 'laser',
      type: 'laser',
      name: 'HYPER BEAMS',
      shortName: 'LASER',
      icon: 'laser',
      color: '#00ffff',
      desc: 'Cross-axial laser cannons cutting through horizontal and vertical corridors.',
      requiredSkillId: 'laser_v1',
      tileX: 5,
      tileY: 19
    },
    {
      id: 'cryo',
      type: 'cryo',
      name: 'CRYO SHATTER',
      shortName: 'CRYO',
      icon: 'cryo',
      color: '#aaffff',
      desc: 'Absolute zero: freezes all ghosts in place to shatter them on contact.',
      requiredSkillId: 'cryo_v1',
      tileX: 10,
      tileY: 19
    },
    {
      id: 'tsunami',
      type: 'tsunami',
      name: 'LIGHT TSUNAMI',
      shortName: 'TSUNAMI',
      icon: 'tsunami',
      color: '#ffffff',
      desc: 'Sweeping wall of coherent light annihilating any target in its path.',
      requiredSkillId: 'tsunami_v1',
      tileX: 15,
      tileY: 19
    }
  ];

  constructor() {
    this.maze = new MazeManager(true);
  }

  public init(preferredItemType?: string) {
    // Build clean 4/3 maze for lab
    this.maze.build(0, false);
    // Replace layout with training arena
    this.applyLabLayout();
    this.maze.renderOffscreen(4);

    // Setup item pedestals strictly for unlocked items
    this.items = [];
    for (const cfg of LabManager.ITEM_CONFIGS) {
      if (progression.isSkillUnlocked(cfg.requiredSkillId)) {
        this.items.push({
          ...cfg,
          active: true,
          respawnTimer: 0,
          respawnDuration: 2.5
        });
      }
    }

    this.spawnTargetGhosts();
    this.playerHurtCooldown = 0;
    this.activeNotice = 'ARCADE OBJECT LAB • ZERO RISK SANDBOX';
    this.activeNoticeTimer = 4.0;
    this.lastTriedName = '';
    this.lastTriedDesc = '';

    // If entering lab with a specific preferred item, announce it
    if (preferredItemType) {
      const match = this.items.find(it => it.type === preferredItemType || it.id === preferredItemType);
      if (match) {
        this.lastTriedName = match.name;
        this.lastTriedDesc = match.desc;
        this.activeNotice = `FOCUS: ${match.name} • ${match.desc}`;
        this.activeNoticeTimer = 6.0;
      }
    }
  }

  private applyLabLayout() {
    this.maze.cols = BASE_COLS;
    this.maze.rows = ROWS;
    this.maze.map = [];
    this.maze.dotMap = [];
    this.maze.totalDots = 0;
    this.maze.remainingDots = 0;

    for (let r = 0; r < ROWS; r++) {
      this.maze.map[r] = [];
      this.maze.dotMap[r] = [];
      const halfRow = LAB_LAYOUT[r] || LAB_LAYOUT[0];
      for (let c = 0; c < BASE_COLS; c++) {
        let val: number;
        if (c < 11) {
          val = halfRow[c];
        } else {
          val = halfRow[BASE_COLS - 1 - c];
        }
        this.maze.map[r][c] = val;
        this.maze.dotMap[r][c] = EMPTY;
      }
    }
  }

  public spawnTargetGhosts() {
    this.ghosts = [];
    const ghostColors: Array<'blinky' | 'pinky' | 'inky' | 'clyde'> = ['blinky', 'pinky', 'inky', 'clyde'];

    // 4 target ghosts patrolling in the upper training zone
    const spawnY = [2, 5, 2, 5];
    const spawnX = [4, 7, 13, 16];
    const dirs = [1, -1, 1, -1];

    for (let i = 0; i < 4; i++) {
      const gx = spawnX[i];
      const gy = spawnY[i];
      this.ghosts.push({
        id: i,
        type: ghostColors[i % ghostColors.length],
        x: gx,
        y: gy,
        fx: gx,
        fy: gy,
        t: 0,
        dx: dirs[i],
        dy: 0,
        st: 'active',
        speed: 4.8,
        delay: 0,
        fl: 0,
        nm: false,
        frozen: false,
        frozenTimer: 0,
        frightened: false,
        homeX: gx,
        homeY: gy,
        respawnTimer: 0,
        patrolMinX: 2,
        patrolMaxX: 18
      });
    }
  }

  public reset(player?: Player) {
    superItems.resetEffects();
    particles.clearAll();
    powerups.fx.overdrive = 0;
    superItems.resetEffects();
    this.spawnTargetGhosts();
    for (const item of this.items) {
      item.active = true;
      item.respawnTimer = 0;
    }
    this.playerHurtCooldown = 0;
    this.frightenedTimer = 0;
    this.activeNotice = 'LABORATORY RESET • TARGETS & ITEMS REPLENISHED';
    this.activeNoticeTimer = 2.5;

    if (player) {
      player.reset(this.maze, 1.0);
      player.x = 10;
      player.y = 11;
      player.fx = 10;
      player.fy = 11;
      player.t = 0;
      player.dx = 0;
      player.dy = 0;
      player.lastDx = 1;
      player.lastDy = 0;
      player.invuln = 1.0;
    }
    sounds.play('powerup');
  }

  public update(
    dt: number,
    player: Player,
    onActivateOverdrive: () => void
  ) {
    if (this.activeNoticeTimer > 0) {
      this.activeNoticeTimer = Math.max(0, this.activeNoticeTimer - dt);
    }
    if (this.playerHurtCooldown > 0) {
      this.playerHurtCooldown = Math.max(0, this.playerHurtCooldown - dt);
    }
    if (this.frightenedTimer > 0) {
      this.frightenedTimer = Math.max(0, this.frightenedTimer - dt);
      if (this.frightenedTimer === 0) {
        for (const g of this.ghosts) {
          g.frightened = false;
        }
      }
    }

    const pp = player.getPos();

    // 1. Update and respawn item pedestals
    for (const item of this.items) {
      if (!item.active) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.active = true;
          item.respawnTimer = 0;
          particles.emit(item.tileX * T + HALF, item.tileY * T + HALF, 10, item.color, { speed: 80, size: 3, life: 0.4 });
          sounds.play('pellet');
        }
      } else {
        // Check collection collision
        const ix = item.tileX * T + HALF;
        const iy = item.tileY * T + HALF;
        const dist = Math.hypot(pp.x - ix, pp.y - iy);
        if (dist < 22) {
          this.collectItem(item, player, onActivateOverdrive);
        }
      }
    }

    // 2. Update Target Ghosts Movement & States
    for (const g of this.ghosts) {
      if (g.st === 'dead') {
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) {
          // Respawn at home
          g.st = 'active';
          g.x = g.homeX;
          g.y = g.homeY;
          g.fx = g.homeX;
          g.fy = g.homeY;
          g.t = 0;
          g.dx = 1;
          g.dy = 0;
          g.frozen = false;
          g.frightened = this.frightenedTimer > 0;
          particles.emit(g.homeX * T + HALF, g.homeY * T + HALF, 12, EC[g.type] || '#00f0ff', { speed: 90, size: 3.5, life: 0.4 });
        }
        continue;
      }

      // Frozen state from Cryo
      if (g.frozen) {
        if (superItems.cryoTimer <= 0) {
          g.frozen = false;
        }
        continue;
      }

      // Frightened state from Super Pellet
      g.frightened = this.frightenedTimer > 0;

      // Normal patrol movement
      const moveSpd = g.frightened ? g.speed * 0.6 : g.speed;
      g.t += moveSpd * dt;
      if (g.t >= 1) {
        g.t = 0;
        g.fx = g.x;
        g.fy = g.y;
        g.x += g.dx;
        g.y += g.dy;

        // Turn around at patrol limits or walls
        if (g.x <= g.patrolMinX) {
          g.dx = 1;
        } else if (g.x >= g.patrolMaxX) {
          g.dx = -1;
        } else if (!this.maze.isWalkable(g.x + g.dx, g.y, true)) {
          g.dx = -g.dx;
        }
      }

      // Check collision with player
      const gx = (g.fx + (g.x - g.fx) * g.t) * T + HALF;
      const gy = (g.fy + (g.y - g.fy) * g.t) * T + HALF;
      const pDist = Math.hypot(pp.x - gx, pp.y - gy);

      if (pDist < 20) {
        const isVulnerable = g.frightened || g.frozen || powerups.fx.overdrive > 0 || player.invuln > 0 || player.dashStreaks.length > 0;
        if (isVulnerable) {
          this.defeatGhost(g, gx, gy);
        } else if (this.playerHurtCooldown <= 0) {
          // Harmless gentle bounce without losing lives or game over!
          this.playerHurtCooldown = 0.6;
          sounds.play('bump');
          particles.shake(5, 0.15);
          particles.flash('#ff0055', 0.15);
          particles.emit(pp.x, pp.y, 8, '#ff3366', { speed: 100, size: 3, life: 0.3 });
          // Nudge player backwards
          player.x = Math.max(1, Math.min(BASE_COLS - 2, player.x - player.lastDx));
          player.y = Math.max(1, Math.min(ROWS - 2, player.y - player.lastDy));
          player.fx = player.x;
          player.fy = player.y;
          player.t = 0;
        }
      }
    }

    // 3. Update SuperItems ongoing effects on lab target ghosts
    if (superItems.isRunning()) {
      superItems.update(
        dt,
        pp,
        this.ghosts as any,
        (e, x, y) => this.defeatGhost(e, x, y),
        this.maze
      );
    }
  }

  private collectItem(
    item: LabItemDef,
    player: Player,
    onActivateOverdrive: () => void
  ) {
    item.active = false;
    item.respawnTimer = item.respawnDuration;

    this.lastTriedName = item.name;
    this.lastTriedDesc = item.desc;
    this.activeNotice = `${item.name} • ${item.desc}`;
    this.activeNoticeTimer = 5.0;

    // Reset previous ongoing super-item effect to prevent chaotic stacking
    superItems.resetEffects();

    if (item.type === 'super_pellet') {
      this.frightenedTimer = 6.0;
      player.addSuperPelletBoost();
      for (const g of this.ghosts) {
        g.frightened = true;
      }
      sounds.play('powerup');
      particles.flash('#00f0ff', 0.25);
      particles.shake(6, 0.2);
    } else {
      superItems.triggerSuperItem(
        item.type,
        player.getPos(),
        this.ghosts as any,
        (e, x, y) => this.defeatGhost(e, x, y),
        onActivateOverdrive
      );
    }
  }

  public defeatGhost(g: LabGhost, gx: number, gy: number) {
    g.st = 'dead';
    g.frozen = false;
    g.frightened = false;
    g.respawnTimer = 2.0;

    sounds.play('crunch');
    particles.emit(gx, gy, 14, EC[g.type] || '#ffd700', { speed: 140, size: 4, life: 0.45 });
  }

  public draw(c: CanvasRenderingContext2D, time: number) {
    // 1. Draw Item Pedestals
    for (const item of this.items) {
      const ix = item.tileX * T + HALF;
      const iy = item.tileY * T + HALF;

      c.save();
      if (item.active) {
        // Glowing halo
        const pulse = 0.8 + 0.2 * Math.sin(time * 4 + item.tileX);
        c.fillStyle = 'rgba(10, 16, 32, 0.85)';
        c.strokeStyle = item.color;
        c.lineWidth = 1.6;
        c.shadowColor = item.color;
        c.shadowBlur = 10 * pulse;

        c.beginPath();
        c.arc(ix, iy, 14, 0, PI2);
        c.fill();
        c.stroke();
        c.shadowBlur = 0;

        // Draw item icon
        spriteAtlas.drawIcon(c, item.icon, ix - 8, iy - 8, 16);

        // Name tag below pad
        c.font = 'bold 8px monospace';
        c.textAlign = 'center';
        c.fillStyle = '#ffffff';
        c.fillText(item.shortName, ix, iy + 22);
      } else {
        // Inactive / recharging pedestal
        c.fillStyle = 'rgba(6, 8, 16, 0.5)';
        c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(ix, iy, 12, 0, PI2);
        c.fill();
        c.stroke();

        // Respawn radial progress
        const pct = 1 - (item.respawnTimer / item.respawnDuration);
        c.strokeStyle = item.color;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(ix, iy, 12, -Math.PI / 2, -Math.PI / 2 + pct * PI2);
        c.stroke();
      }
      c.restore();
    }

    // 2. Draw Target Ghosts
    for (const g of this.ghosts) {
      if (g.st === 'dead') continue;
      const gx = (g.fx + (g.x - g.fx) * g.t) * T + HALF;
      const gy = (g.fy + (g.y - g.fy) * g.t) * T + HALF;

      c.save();
      const col = g.frightened ? (Math.sin(time * 12) > 0 ? '#ffffff' : '#00aaff') : (g.frozen ? '#aaffff' : (EC[g.type] || '#ff0055'));
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = g.frozen ? 8 : 4;

      // Simple body dome
      c.beginPath();
      c.arc(gx, gy - 2, 10, Math.PI, 0);
      c.lineTo(gx + 10, gy + 8);
      c.lineTo(gx - 10, gy + 8);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;

      // Eyes
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(gx - 4 + g.dx * 2, gy - 2, 2.5, 0, PI2);
      c.arc(gx + 4 + g.dx * 2, gy - 2, 2.5, 0, PI2);
      c.fill();

      // Pupils
      c.fillStyle = '#050818';
      c.beginPath();
      c.arc(gx - 4 + g.dx * 3, gy - 2, 1.2, 0, PI2);
      c.arc(gx + 4 + g.dx * 3, gy - 2, 1.2, 0, PI2);
      c.fill();

      // Frozen Ice Overlay
      if (g.frozen) {
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.2;
        c.strokeRect(gx - 11, gy - 12, 22, 22);
      }

      c.restore();
    }
  }

  public drawHUD(c: CanvasRenderingContext2D, cw: number, ch: number, _time: number) {
    c.save();

    // Top Navigation & Header Bar
    c.fillStyle = 'rgba(6, 9, 20, 0.95)';
    c.fillRect(0, 0, cw, HUD_H);

    c.strokeStyle = '#00f0ff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, HUD_H);
    c.lineTo(cw, HUD_H);
    c.stroke();

    // Top Left: Back button
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = 'bold 9.5px monospace';
    c.fillStyle = '#00ffff';
    c.fillText('◀ [ESC / C] BACK TO ARSENAL', 12, HUD_H / 2);

    // Top Center: Title
    c.textAlign = 'center';
    c.font = 'bold 12px monospace';
    c.fillStyle = '#ffd700';
    c.fillText('★ ARCADE OBJECT LAB ★', cw / 2, HUD_H / 2 - 6);
    c.font = 'bold 8.5px monospace';
    c.fillStyle = '#8899bb';
    c.fillText('FREE TRIAL • NO SCORE • NO RISK', cw / 2, HUD_H / 2 + 10);

    // Top Right: Reset button
    c.textAlign = 'right';
    c.font = 'bold 9.5px monospace';
    c.fillStyle = '#00ffaa';
    c.fillText('[R] RESET LAB ▶', cw - 12, HUD_H / 2);

    // Bottom Information Pill (Active power explanation)
    const botBarY = ch - BOTTOM_BAR_H;
    c.fillStyle = 'rgba(6, 9, 20, 0.95)';
    c.fillRect(0, botBarY, cw, BOTTOM_BAR_H);

    c.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    c.beginPath();
    c.moveTo(0, botBarY);
    c.lineTo(cw, botBarY);
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 9px monospace';
    c.fillStyle = '#ffffff';
    c.fillText(this.activeNotice, cw / 2, botBarY + BOTTOM_BAR_H / 2);

    c.restore();
  }
}

export const labManager = new LabManager();
