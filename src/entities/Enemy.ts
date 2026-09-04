// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — ENEMY GHOSTS & AI LOGIC
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, CW, EC, PI, PI2, E_SPEED } from '../config/constants';
import { MazeManager } from '../levels/levels';
import { superItems } from '../systems/SuperItems';
import { progression } from '../systems/ProgressionSystem';

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
  public speedMultiplier: number = 1.0;

  public spawnClassic(count: number = 4, speedMult: number = 1.0) {
    this.speedMultiplier = speedMult;
    this.enemies = [];
    const types = ['stalker', 'rusher', 'orbiter', 'phaser'];
    for (let i = 0; i < count; i++) {
      const tp = types[i % types.length];
      this.enemies.push({
        type: tp,
        x: [9, 10, 11, 10][i % 4],
        y: 10,
        fx: [9, 10, 11, 10][i % 4],
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

  public spawnMadness(count: number, madnessKills: number, maze?: MazeManager) {
    const types = ['stalker', 'rusher', 'orbiter', 'phaser'];
    const pts = [
      { x: 10, y: 8 }, { x: 10, y: 9 }, { x: 9, y: 8 }, { x: 11, y: 8 },
      { x: 0, y: 10 }, { x: COLS - 1, y: 10 }
    ];
    for (let i = 0; i < count; i++) {
      if (this.enemies.length >= 36) break;
      const ptCandidate = pts[(Math.random() * pts.length) | 0];
      const pt = maze ? (maze.isWalkable(ptCandidate.x, ptCandidate.y, true) ? ptCandidate : maze.findNearestWalkable(ptCandidate.x, ptCandidate.y, true)) : ptCandidate;
      const tp = types[(Math.random() * types.length) | 0];
      const spd = (E_SPEED + Math.min(2.5, madnessKills * 0.015)) * (tp === 'rusher' ? 1.3 : tp === 'orbiter' ? 1.1 : 1.0);
      this.enemies.push({
        type: tp,
        x: pt.x,
        y: pt.y,
        fx: pt.x,
        fy: pt.y,
        t: 1,
        dx: 0,
        dy: -1,
        st: 'active',
        speed: spd,
        delay: 0,
        fl: 0,
        nm: false,
        frozen: false
      });
    }
  }

  public getPos(e: Ghost): { x: number; y: number } {
    let fx_ = e.fx, fy_ = e.fy, tx = e.x, ty = e.y;
    if (Math.abs(tx - fx_) > COLS / 2) {
      if (tx > fx_) fx_ += COLS;
      else tx += COLS;
    }
    const t = Math.min(e.t, 1);
    let px = (fx_ + (tx - fx_) * t) * T + HALF;
    let py = (fy_ + (ty - fy_) * t) * T + HALF;
    if (px < 0) px += COLS * T;
    if (px >= COLS * T) px -= COLS * T;
    return { x: px, y: py };
  }

  public update(dt: number, maze: MazeManager, plPos: { x: number; y: number }, timewarp: number) {
    for (const e of this.enemies) {
      if (e.st === 'dead') continue;
      if (e.fl > 0) e.fl -= dt;

      if (e.st === 'spawn') {
        e.delay -= dt;
        if (e.delay <= 0) {
          e.st = 'active';
          let ex = 10, ey = 8;
          if (!maze.isWalkable(ex, ey, true)) {
            for (let dy = -2; dy <= 2 && !maze.isWalkable(ex, ey, true); dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                if (maze.isWalkable(10 + dx, 8 + dy, true)) {
                  ex = 10 + dx;
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

        // Returned to ghost house or timeout (max 3.5s): revive immediately outside the door
        const atHome = (e.x >= 9 && e.x <= 11 && e.y >= 8 && e.y <= 11) ||
                       (maze.ghostReturnDist && maze.ghostReturnDist[e.y] && maze.ghostReturnDist[e.y][e.x] === 0);
        if (e.st === 'return' && (atHome || (e.returnTimer && e.returnTimer >= 3.5))) {
          e.st = 'active';
          e.speed = E_SPEED * (e.type === 'rusher' ? 1.25 : e.type === 'orbiter' ? 1.08 : 1.0) * this.speedMultiplier;
          e.isTitan = false;
          e.returnTimer = 0;
          const exitPt = maze.isWalkable(10, 8, true) ? { x: 10, y: 8 } : maze.findNearestWalkable(10, 8, true);
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
          : (nx - 10) ** 2 + (ny - 8) ** 2;

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
      target = { x: COLS - 1 - target.x, y: ROWS - 1 - target.y };
    } else if (e.type === 'rusher') {
      target = { x: target.x + e.dx * 3, y: target.y + e.dy * 3 };
    } else if (e.type === 'orbiter') {
      target = { x: (target.x + 5) % COLS, y: (target.y + 4) % ROWS };
    } else if (e.type === 'phaser') {
      // Phantom Stalker: smart ambush flanking AI, strictly respecting maze corridors
      target = { x: (target.x - e.dx * 2 + COLS) % COLS, y: Math.max(1, Math.min(ROWS - 2, target.y - e.dy * 2)) };
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
    if (c < 0) return COLS - 1;
    if (c >= COLS) return 0;
    return c;
  }

  public draw(c: CanvasRenderingContext2D, time: number, predWarn: boolean) {
    for (const e of this.enemies) {
      if (e.st === 'dead') continue;
      const ep = this.getPos(e);
      const ret = e.st === 'return';
      let col = e.isTitan ? '#ff0055' : EC[e.type] || '#00ffff';
      let alpha = 1;

      if (e.st === 'flee') col = predWarn && Math.sin(time * 12) > 0 ? EC[e.type] : '#2244ff';
      if (ret) alpha = 0.5;
      if (e.type === 'phaser' && !ret) alpha = 0.7 + Math.sin(time * 6) * 0.15;
      if (e.st === 'spawn') alpha = 0.4;
      if (e.fl > 0) col = '#ffffff';

      c.globalAlpha = alpha;
      const r = T * (e.isTitan ? 0.48 : 0.38);

      const renderGhost = (ox: number = 0) => {
        const gx = ep.x + ox;
        const gy = ep.y;
        c.globalAlpha = alpha;
        c.fillStyle = col;
        c.shadowColor = col;
        c.shadowBlur = ret ? 4 : e.isTitan ? 20 : 10;

        if (!ret) {
          c.beginPath();
          c.arc(gx, gy - 2, r, PI, 0);
          const segW = (r * 2) / 4, wa = 3;
          for (let i = 0; i < 4; i++) {
            const sx = gx - r + i * segW, ex = sx + segW, my = gy + r - 2;
            c.quadraticCurveTo(sx + segW / 2, my + wa * Math.sin(time * 8 + i * 2), ex, my - wa * 0.3);
          }
          c.fill();
        }
        c.shadowBlur = 0;

        // Eyes
        const eo = r * 0.28, er = r * 0.28, pr = er * 0.55;
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(gx - eo, gy - 3, er, 0, PI2);
        c.arc(gx + eo, gy - 3, er, 0, PI2);
        c.fill();

        const pd = pr * 0.5;
        c.fillStyle = e.st === 'flee' ? '#ff0000' : '#111';
        c.beginPath();
        c.arc(gx - eo + e.dx * pd, gy - 3 + e.dy * pd, pr, 0, PI2);
        c.arc(gx + eo + e.dx * pd, gy - 3 + e.dy * pd, pr, 0, PI2);
        c.fill();

        // Frozen crystal overlay
        if (e.frozen) {
          c.save();
          c.fillStyle = 'rgba(160,240,255,0.7)';
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1.5;
          c.shadowColor = '#aaffff';
          c.shadowBlur = 12;
          c.fillRect(gx - r - 1, gy - r - 2, r * 2 + 2, r * 2 + 4);
          c.strokeRect(gx - r - 1, gy - r - 2, r * 2 + 2, r * 2 + 4);
          c.restore();
        }
      };

      renderGhost(0);
      if (ep.x < r * 2) renderGhost(CW);
      else if (ep.x > CW - r * 2) renderGhost(-CW);

      c.globalAlpha = 1;
    }
  }
}
