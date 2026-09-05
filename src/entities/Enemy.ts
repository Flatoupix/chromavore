// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — ENEMY GHOSTS & AI LOGIC
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, CW, EC, PI, PI2, E_SPEED } from '../config/constants';
import { MazeManager } from '../levels/levels';
import { superItems } from '../systems/SuperItems';
import { progression } from '../systems/ProgressionSystem';
import { spriteAtlas } from '../graphics/SpriteAtlas';
import { powerups } from './Powerups';

export interface Ghost {
  type: string;
  x: number;
  y: number;
  fx: number;
  fy: number;
  t: number;
  dx: number;
  dy: number;
  st: 'active' | 'flee' | 'return' | 'spawn' | 'dead';
  speed: number;
  delay: number;
  fl: number;
  nm: boolean;
  frozen: boolean;
  isTitan?: boolean;
  returnTimer?: number;
}

export class EnemyManager {
  public enemies: Ghost[] = [];
  public currentCols: number = COLS;
  public speedMultiplier: number = 1.0;

  public spawnClassic(count: number = 4, speedMult: number = 1.0, maze?: MazeManager) {
    if (maze) this.currentCols = maze.cols;
    const centerCol = maze ? Math.floor(maze.cols / 2) : Math.floor(this.currentCols / 2);
    this.speedMultiplier = speedMult;
    this.enemies = [];
    const types = ['stalker', 'rusher', 'orbiter', 'phaser'];
    for (let i = 0; i < count; i++) {
      const tp = types[i % types.length];
      const spawnX = [centerCol - 1, centerCol, centerCol + 1, centerCol][i % 4];
      this.enemies.push({
        type: tp,
        x: spawnX,
        y: 10,
        fx: spawnX,
        fy: 10,
        t: 1,
        dx: 0,
        dy: -1,
        st: 'spawn',
        speed: E_SPEED * (tp === 'rusher' ? 1.25 : tp === 'orbiter' ? 1.08 : 1.0) * this.speedMultiplier,
        delay: i * 1.5,
        fl: 0,
        nm: false,
        frozen: false
      });
    }
  }

  public spawnToggle: number = 0;

  public getMadnessSpawnSpots(maze?: MazeManager): { left: { x: number; y: number }; right: { x: number; y: number } } {
    const cols = maze ? maze.cols : 39;
    const leftCol = Math.round(cols * 0.24); // e.g. col 9 on 39 cols
    const rightCol = Math.round(cols * 0.76); // e.g. col 30 on 39 cols
    const row = 10;
    const lPt = maze ? (maze.isWalkable(leftCol, row, true) ? { x: leftCol, y: row } : maze.findNearestWalkable(leftCol, row, true)) : { x: leftCol, y: row };
    const rPt = maze ? (maze.isWalkable(rightCol, row, true) ? { x: rightCol, y: row } : maze.findNearestWalkable(rightCol, row, true)) : { x: rightCol, y: row };
    return { left: lPt, right: rPt };
  }

  public spawnMadness(count: number, madnessKills: number, maze?: MazeManager) {
    if (maze) this.currentCols = maze.cols;
    const isWide = maze ? (maze.cols > 21) : (this.currentCols > 21);
    const spawns = this.getMadnessSpawnSpots(maze);
    const centerCol = maze ? Math.floor(maze.cols / 2) : 10;
    const types = ['stalker', 'rusher', 'orbiter', 'phaser'];

    for (let i = 0; i < count; i++) {
      if (this.enemies.length >= 36) break;
      let pt: { x: number; y: number };

      if (isWide) {
        // In 16:9 widescreen: Alternate between Left Wing Nest and Right Wing Nest
        const isLeft = (this.spawnToggle++ % 2 === 0);
        const chosenNest = isLeft ? spawns.left : spawns.right;
        const jx = Math.floor(Math.random() * 3) - 1;
        const jy = Math.floor(Math.random() * 3) - 1;
        const ptCandidate = { x: chosenNest.x + jx, y: chosenNest.y + jy };
        pt = maze ? (maze.isWalkable(ptCandidate.x, ptCandidate.y, true) ? ptCandidate : chosenNest) : ptCandidate;
      } else {
        // In 4:3 (early game / classic): strictly 100% Central Ghost House (no lateral wings!)
        const centralExit = maze && maze.isWalkable(centerCol, 8, true)
          ? { x: centerCol, y: 8 }
          : (maze ? maze.findNearestWalkable(centerCol, 8, true) : { x: centerCol, y: 8 });
        pt = centralExit;
      }

      const tp = types[(Math.random() * types.length) | 0];
      const spd = (E_SPEED + Math.min(2.5, madnessKills * 0.015)) * (tp === 'rusher' ? 1.3 : tp === 'orbiter' ? 1.1 : 1.0);
      const isFlee = powerups && powerups.pred.on && powerups.pred.t > 0;

      this.enemies.push({
        type: tp,
        x: pt.x,
        y: pt.y,
        fx: pt.x,
        fy: pt.y,
        t: 1,
        dx: 0,
        dy: -1,
        st: isFlee ? 'flee' : 'active',
        speed: spd,
        delay: 0,
        fl: 0,
        nm: false,
        frozen: false
      });
    }
  }

  public getPos(e: Ghost): { x: number; y: number } {
    const cols = this.currentCols;
    let fx_ = e.fx, fy_ = e.fy, tx = e.x, ty = e.y;
    if (Math.abs(tx - fx_) > cols / 2) {
      if (tx > fx_) fx_ += cols;
      else tx += cols;
    }
    const t = Math.min(e.t, 1);
    let px = (fx_ + (tx - fx_) * t) * T + HALF;
    let py = (fy_ + (ty - fy_) * t) * T + HALF;
    if (px < 0) px += cols * T;
    if (px >= cols * T) px -= cols * T;
    return { x: px, y: py };
  }

  public update(dt: number, maze: MazeManager, plPos: { x: number; y: number }, timewarp: number) {
    this.currentCols = maze.cols;
    for (const e of this.enemies) {
      if (e.st === 'dead') continue;
      if (e.fl > 0) e.fl -= dt;

      if (e.st === 'spawn') {
        e.delay -= dt;
        if (e.delay <= 0) {
          e.st = (powerups && powerups.pred.on && powerups.pred.t > 0) ? 'flee' : 'active';
          const centerCol = Math.floor(maze.cols / 2);
          let ex = centerCol, ey = 8;
          if (!maze.isWalkable(ex, ey, true)) {
            for (let dy = -2; dy <= 2 && !maze.isWalkable(ex, ey, true); dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                if (maze.isWalkable(centerCol + dx, 8 + dy, true)) {
                  ex = centerCol + dx;
                  ey = 8 + dy;
                  break;
                }
              }
            }
          }
          e.x = ex; e.y = ey;
          e.fx = ex; e.fy = ey;
          e.t = 1;
        }
        continue;
      }

      if (e.frozen) continue; // Skip moving when cryo-frozen

      let spd = e.speed;
      if (e.st === 'flee') spd *= 0.55;
      if (e.st === 'return') {
        spd *= 2.5;
        e.returnTimer = (e.returnTimer || 0) + dt;
      } else {
        e.returnTimer = 0;
      }
      if (timewarp > 0) spd *= 0.45;

      if (e.t < 1) {
        e.t += dt * spd;
        if (e.t >= 1) {
          e.t = 1;
          e.fx = e.x;
          e.fy = e.y;
        }
      }

      if (e.t >= 1) {
        // Wall safety check for ghost: if inside decor / wall, relocate to nearest walkable corridor
        if (!maze.isWalkable(e.x, e.y, true)) {
          const safe = maze.findNearestWalkable(e.x, e.y, true);
          e.x = e.fx = safe.x;
          e.y = e.fy = safe.y;
          e.t = 1;
        }

        // Active ghost inside ghost house safety: eject outside the door
        if (e.st === 'active' && e.x >= 9 && e.x <= 11 && e.y >= 9 && e.y <= 11) {
          const exitPt = maze.isWalkable(10, 8, true) ? { x: 10, y: 8 } : maze.findNearestWalkable(10, 8, true);
          e.x = e.fx = exitPt.x;
          e.y = e.fy = exitPt.y;
          e.t = 1;
          e.dy = -1;
          e.dx = 0;
        }

        // Returned to ghost house or nearest nest, or timeout (max 3.5s): revive immediately!
        let atHome = false;
        let exitPt = { x: 10, y: 8 };

        if (maze.cols > 21) {
          const spawns = this.getMadnessSpawnSpots(maze);
          const dLeft = Math.hypot(e.x - spawns.left.x, e.y - spawns.left.y);
          const dRight = Math.hypot(e.x - spawns.right.x, e.y - spawns.right.y);
          if (dLeft < 2.2) {
            atHome = true;
            exitPt = spawns.left;
          } else if (dRight < 2.2) {
            atHome = true;
            exitPt = spawns.right;
          } else {
            exitPt = dLeft < dRight ? spawns.left : spawns.right;
          }
        } else {
          atHome = (e.x >= 9 && e.x <= 11 && e.y >= 8 && e.y <= 11) ||
                   (maze.ghostReturnDist && maze.ghostReturnDist[e.y] && maze.ghostReturnDist[e.y][e.x] === 0);
          exitPt = maze.isWalkable(10, 8, true) ? { x: 10, y: 8 } : maze.findNearestWalkable(10, 8, true);
        }

        if (e.st === 'return' && (atHome || (e.returnTimer && e.returnTimer >= 3.5))) {
          e.st = (powerups && powerups.pred.on && powerups.pred.t > 0) ? 'flee' : 'active';
          e.speed = E_SPEED * (e.type === 'rusher' ? 1.25 : e.type === 'orbiter' ? 1.08 : 1.0) * this.speedMultiplier;
          e.isTitan = false;
          e.returnTimer = 0;
          e.x = e.fx = exitPt.x;
          e.y = e.fy = exitPt.y;
          e.t = 1;
          e.dy = -1;
          e.dx = 0;
        }

        this.decideNextStep(e, maze, plPos);
      }
    }
  }

  private decideNextStep(e: Ghost, maze: MazeManager, plPos: { x: number; y: number }) {
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const valid = dirs.filter(d => {
      // Prevent immediate 180 reverse unless trapped
      if (d.x === -e.dx && d.y === -e.dy && dirs.some(o => (o.x !== d.x || o.y !== d.y) && maze.isWalkable(this.wrapX(e.x + o.x), e.y + o.y, true))) {
        return false;
      }
      return maze.isWalkable(this.wrapX(e.x + d.x), e.y + d.y, true);
    });

    if (valid.length === 0) {
      // Reverse
      const rev = { x: -e.dx, y: -e.dy };
      if (maze.isWalkable(this.wrapX(e.x + rev.x), e.y + rev.y, true)) {
        valid.push(rev);
      }
    }
    if (valid.length === 0) {
      // Ghost is trapped in decor / walls: emergency rescue to nearest walkable corridor!
      const safe = maze.findNearestWalkable(e.x, e.y, true);
      e.x = e.fx = safe.x;
      e.y = e.fy = safe.y;
      e.t = 1;
      return;
    }

    // BFS Shortest-Path flow-field for returning ghosts: guarantees optimal corridor traversal without getting stuck
    if (e.st === 'return') {
      let bestDir = valid[0];
      let bestDist = Infinity;
      for (const d of valid) {
        const nx = this.wrapX(e.x + d.x), ny = e.y + d.y;
        const dist = (maze.ghostReturnDist && maze.ghostReturnDist[ny] && maze.ghostReturnDist[ny][nx] !== undefined)
          ? maze.ghostReturnDist[ny][nx]
          : (maze.cols > 21
              ? Math.min(
                  (nx - Math.round(maze.cols * 0.24)) ** 2 + (ny - 10) ** 2,
                  (nx - Math.round(maze.cols * 0.76)) ** 2 + (ny - 10) ** 2
                )
              : (nx - 10) ** 2 + (ny - 8) ** 2);

        if (dist < bestDist) {
          bestDist = dist;
          bestDir = d;
        }
      }
      e.dx = bestDir.x;
      e.dy = bestDir.y;
      e.fx = e.x;
      e.fy = e.y;
      e.x = this.wrapX(e.x + e.dx);
      e.y = e.y + e.dy;
      e.t = 0;
      return;
    }

    let target = { x: Math.floor(plPos.x / T), y: Math.floor(plPos.y / T) };
    if (superItems.vortex && e.st !== 'spawn') {
      const vDist = Math.hypot(superItems.vortex.x - (e.x * T + T / 2), superItems.vortex.y - (e.y * T + T / 2));
      const vRadius = progression.getSkillLevel('vortex') >= 2 ? 250 : 180;
      if (vDist < vRadius) {
        // Gravitational singularity overrides pathfinding: pulled toward black hole along corridors
        target = {
          x: Math.floor(superItems.vortex.x / T),
          y: Math.floor(superItems.vortex.y / T)
        };
      }
    } else if (e.st === 'flee') {
      target = { x: maze.cols - 1 - target.x, y: ROWS - 1 - target.y };
    } else if (e.type === 'rusher') {
      target = { x: target.x + e.dx * 3, y: target.y + e.dy * 3 };
    } else if (e.type === 'orbiter') {
      target = { x: (target.x + 5) % maze.cols, y: (target.y + 4) % ROWS };
    } else if (e.type === 'phaser') {
      // Phantom Stalker: smart ambush flanking AI, strictly respecting maze corridors
      target = { x: (target.x - e.dx * 2 + maze.cols) % maze.cols, y: Math.max(1, Math.min(ROWS - 2, target.y - e.dy * 2)) };
    }

    let bestDir = valid[0];
    let bestDist = Infinity;
    for (const d of valid) {
      const nx = this.wrapX(e.x + d.x), ny = e.y + d.y;
      const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      if (e.st === 'flee') {
        if (dist > bestDist || bestDist === Infinity) {
          bestDist = dist;
          bestDir = d;
        }
      } else {
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = d;
        }
      }
    }

    e.dx = bestDir.x;
    e.dy = bestDir.y;
    e.fx = e.x;
    e.fy = e.y;
    e.x = this.wrapX(e.x + e.dx);
    e.y = e.y + e.dy;
    e.t = 0;
  }

  private wrapX(c: number): number {
    if (c < 0) return this.currentCols - 1;
    if (c >= this.currentCols) return 0;
    return c;
  }

  public draw(c: CanvasRenderingContext2D, time: number, predWarn: boolean, isChronoActive: boolean = false) {
    for (const e of this.enemies) {
      if (e.st === 'dead') continue;
      const ep = this.getPos(e);
      const ret = e.st === 'return';
      let col = e.isTitan ? '#ff0055' : EC[e.type] || '#00ffff';
      let alpha = 1;

      if (e.st === 'flee') {
        col = predWarn ? '#6366f1' : '#2563eb';
      }
      if (ret) alpha = 0.5;
      if (e.type === 'phaser' && !ret) alpha = 0.7 + Math.sin(time * 6) * 0.15;
      if (e.st === 'spawn') alpha = 0.4;
      if (e.fl > 0) col = '#ffffff';

      c.globalAlpha = alpha;
      const r = T * (e.isTitan ? 0.48 : 0.38);

      const renderGhost = (ox: number = 0) => {
        // Panic shiver tremor when fleeing
        const shiverX = e.st === 'flee' ? Math.sin(time * 36 + e.x * 5) * 1.5 : 0;
        const shiverY = e.st === 'flee' ? Math.cos(time * 36 + e.y * 5) * 1.5 : 0;
        const gx = ep.x + ox + shiverX;
        const gy = ep.y + shiverY;

        if (ret) {
          // Returning eyes only
          c.save();
          c.globalAlpha = 0.85;
          c.fillStyle = '#ffffff';
          c.shadowColor = '#00ffff';
          c.shadowBlur = 8;
          c.beginPath();
          c.arc(gx - 4, gy - 2, 3, 0, PI2);
          c.arc(gx + 4, gy - 2, 3, 0, PI2);
          c.fill();
          c.shadowBlur = 0;

          c.fillStyle = '#00ffff';
          c.beginPath();
          c.arc(gx - 4 + e.dx * 1.6, gy - 2 + e.dy * 1.6, 1.5, 0, PI2);
          c.arc(gx + 4 + e.dx * 1.6, gy - 2 + e.dy * 1.6, 1.5, 0, PI2);
          c.fill();
          c.restore();
          return;
        }

        // Modern Ambient Neon Halo Aura behind the crisp pixel-art sprite
        c.save();
        c.globalAlpha = alpha * (e.isTitan ? 0.45 : 0.28);
        c.fillStyle = col;
        c.shadowColor = col;
        c.shadowBlur = e.isTitan ? 24 : (e.st === 'flee' ? 18 : 12);
        c.beginPath();
        c.arc(gx, gy, r * 0.95, 0, PI2);
        c.fill();
        c.restore();

        // Specific Archetype VFX
        if (e.type === 'rusher' && e.st === 'active') {
          // Dual aft plasma spark trail
          const revX = -e.dx * 10;
          const revY = -e.dy * 10;
          c.save();
          c.fillStyle = '#ffee00';
          c.shadowColor = '#ff8800';
          c.shadowBlur = 8;
          c.beginPath();
          c.arc(gx + revX + (Math.random() - 0.5) * 4, gy + revY + (Math.random() - 0.5) * 4, 1.8, 0, PI2);
          c.fill();
          c.restore();
        } else if (e.type === 'phaser' && e.st === 'active') {
          // Ghostly phasing echo clone
          c.save();
          c.globalAlpha = alpha * 0.35;
          const phaseOffset = Math.sin(time * 12) * 4;
          spriteAtlas.drawGhost(c, e.type, false, e.dx, e.dy, time, gx + phaseOffset, gy, r * 2.35, false);
          c.restore();
        }

        // Draw the crisp modern pixel-art core sprite from atlas
        c.save();
        c.globalAlpha = alpha;
        spriteAtlas.drawGhost(
          c,
          e.type,
          e.st === 'flee',
          e.dx,
          e.dy,
          time,
          gx,
          gy,
          r * 2.35,
          !!e.isTitan
        );
        c.restore();

        // Chrono Stasis / Temporal Refraction Aura
        if (isChronoActive && e.st === 'active') {
          c.save();
          c.strokeStyle = 'rgba(0, 240, 255, 0.85)';
          c.shadowColor = '#00f0ff';
          c.shadowBlur = 10;
          c.lineWidth = 1.6;
          c.setLineDash([3, 3]);
          c.beginPath();
          c.arc(gx, gy, r * 1.35, -time * 3, -time * 3 + PI2);
          c.stroke();

          // Small frozen refraction diamond markers
          c.fillStyle = '#00f0ff';
          for (let i = 0; i < 3; i++) {
            const da = time * 2 + (i * PI2) / 3;
            const mX = gx + Math.cos(da) * (r * 1.5);
            const mY = gy + Math.sin(da) * (r * 1.5);
            c.fillRect(mX - 1.5, mY - 1.5, 3, 3);
          }
          c.restore();
        }

        // Frozen crystal overlay
        if (e.frozen) {
          c.save();
          c.fillStyle = 'rgba(160, 240, 255, 0.65)';
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1.5;
          c.shadowColor = '#00ffff';
          c.shadowBlur = 14;
          c.fillRect(gx - r - 2, gy - r - 2, r * 2 + 4, r * 2 + 4);
          c.strokeRect(gx - r - 2, gy - r - 2, r * 2 + 4, r * 2 + 4);
          c.restore();
        }
      };

      const cw = this.currentCols * T;
      renderGhost(0);
      if (ep.x < r * 2) renderGhost(cw);
      else if (ep.x > cw - r * 2) renderGhost(-cw);

      c.globalAlpha = 1;
    }
  }
}
