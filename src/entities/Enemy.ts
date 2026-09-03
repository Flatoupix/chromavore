// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — ENEMY GHOSTS & AI LOGIC
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, EC, PI, PI2, E_SPEED } from '../config/constants';
import { MazeManager } from '../levels/levels';

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
}

export class EnemyManager {
  public enemies: Ghost[] = [];

  public spawnClassic(count: number = 4) {
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
        speed: E_SPEED * (tp === 'rusher' ? 1.25 : tp === 'orbiter' ? 1.08 : 1.0),
        delay: i * 1.5,
        fl: 0,
        nm: false,
        frozen: false
      });
    }
  }

  public spawnMadness(count: number, madnessKills: number) {
    const types = ['stalker', 'rusher', 'orbiter', 'phaser'];
    const pts = [
      { x: 10, y: 9 }, { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 11, y: 10 },
      { x: 0, y: 10 }, { x: COLS - 1, y: 10 }
    ];
    for (let i = 0; i < count; i++) {
      if (this.enemies.length >= 36) break;
      const pt = pts[(Math.random() * pts.length) | 0];
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
          e.x = 10; e.y = 8;
          e.fx = 10; e.fy = 8;
          e.t = 1;
        }
        continue;
      }

      if (e.frozen) continue; // Skip moving when cryo-frozen

      let spd = e.speed;
      if (e.st === 'flee') spd *= 0.55;
      if (e.st === 'return') spd *= 2.5;
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
        // Returned to ghost house
        if (e.st === 'return' && e.x >= 9 && e.x <= 11 && e.y >= 9 && e.y <= 11) {
          e.st = 'active';
          e.speed = E_SPEED;
          e.isTitan = false;
        }
        this.decideNextStep(e, maze, plPos);
      }
    }
  }

  private decideNextStep(e: Ghost, maze: MazeManager, plPos: { x: number; y: number }) {
    const isPhaser = e.type === 'phaser' && e.st !== 'return';
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const valid = dirs.filter(d => {
      // Prevent immediate 180 reverse unless trapped
      if (d.x === -e.dx && d.y === -e.dy && dirs.some(o => (o.x !== d.x || o.y !== d.y) && maze.isWalkable(this.wrapX(e.x + o.x), e.y + o.y, true, isPhaser))) {
        return false;
      }
      return maze.isWalkable(this.wrapX(e.x + d.x), e.y + d.y, true, isPhaser);
    });

    if (valid.length === 0) {
      // Reverse
      const rev = { x: -e.dx, y: -e.dy };
      if (maze.isWalkable(this.wrapX(e.x + rev.x), e.y + rev.y, true, isPhaser)) {
        valid.push(rev);
      }
    }
    if (valid.length === 0) return;

    let target = { x: Math.floor(plPos.x / T), y: Math.floor(plPos.y / T) };
    if (e.st === 'flee') {
      target = { x: COLS - 1 - target.x, y: ROWS - 1 - target.y };
    } else if (e.st === 'return') {
      target = { x: 10, y: 9 };
    } else if (e.type === 'rusher') {
      target = { x: target.x + e.dx * 3, y: target.y + e.dy * 3 };
    } else if (e.type === 'orbiter') {
      target = { x: (target.x + 5) % COLS, y: (target.y + 4) % ROWS };
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
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = ret ? 4 : e.isTitan ? 20 : 10;

      if (!ret) {
        c.beginPath();
        c.arc(ep.x, ep.y - 2, r, PI, 0);
        const segW = (r * 2) / 4, wa = 3;
        for (let i = 0; i < 4; i++) {
          const sx = ep.x - r + i * segW, ex = sx + segW, my = ep.y + r - 2;
          c.quadraticCurveTo(sx + segW / 2, my + wa * Math.sin(time * 8 + i * 2), ex, my - wa * 0.3);
        }
        c.fill();
      }
      c.shadowBlur = 0;

      // Eyes
      const eo = r * 0.28, er = r * 0.28, pr = er * 0.55;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(ep.x - eo, ep.y - 3, er, 0, PI2);
      c.arc(ep.x + eo, ep.y - 3, er, 0, PI2);
      c.fill();

      const pd = pr * 0.5;
      c.fillStyle = e.st === 'flee' ? '#ff0000' : '#111';
      c.beginPath();
      c.arc(ep.x - eo + e.dx * pd, ep.y - 3 + e.dy * pd, pr, 0, PI2);
      c.arc(ep.x + eo + e.dx * pd, ep.y - 3 + e.dy * pd, pr, 0, PI2);
      c.fill();

      // Frozen crystal overlay
      if (e.frozen) {
        c.save();
        c.fillStyle = 'rgba(160,240,255,0.7)';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;
        c.shadowColor = '#aaffff';
        c.shadowBlur = 12;
        c.fillRect(ep.x - r - 1, ep.y - r - 2, r * 2 + 2, r * 2 + 4);
        c.strokeRect(ep.x - r - 1, ep.y - r - 2, r * 2 + 2, r * 2 + 4);
        c.restore();
      }

      c.globalAlpha = 1;
    }
  }
}
