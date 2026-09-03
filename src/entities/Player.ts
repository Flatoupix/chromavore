// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PLAYER ENTITY & OFFENSIVE DASH
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, P_RAD, C_PLAYER, PI, PI2, DASH_DIST, DASH_CD, DASH_MADNESS_CD, P_SPEED, P_MADNESS_SPEED } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from '../systems/ParticleSystem';
import { MazeManager } from '../levels/levels';

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export class Player {
  public x: number = 10;
  public y: number = 16;
  public fx: number = 10;
  public fy: number = 16;
  public t: number = 1;
  public dx: number = 0;
  public dy: number = 0;
  public ndx: number = 0;
  public ndy: number = 0;
  public lastDx: number = 1;
  public lastDy: number = 0;
  public speed: number = P_SPEED;
  public sq: number = 1;
  public st: number = 1;
  public ma: number = 0;
  public trail: { x: number; y: number }[] = [];

  public dashCd: number = 0;
  public dashStreaks: { x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number }[] = [];
  public invuln: number = 2;

  public reset(isMadness: boolean) {
    this.x = this.fx = 10;
    this.y = this.fy = 16;
    this.t = 1;
    this.dx = this.dy = this.ndx = this.ndy = 0;
    this.lastDx = 1;
    this.lastDy = 0;
    this.sq = 1;
    this.st = 1;
    this.trail = [];
    this.speed = isMadness ? P_MADNESS_SPEED : P_SPEED;
    this.invuln = 2.0;
    this.dashCd = 0;
    this.dashStreaks = [];
  }

  public getPos(): { x: number; y: number } {
    let fx_ = this.fx, fy_ = this.fy, tx = this.x, ty = this.y;
    if (Math.abs(tx - fx_) > COLS / 2) {
      if (tx > fx_) fx_ += COLS;
      else tx += COLS;
    }
    const t = Math.min(this.t, 1);
    let px = (fx_ + (tx - fx_) * t) * T + HALF;
    let py = (fy_ + (ty - fy_) * t) * T + HALF;
    if (px < 0) px += COLS * T;
    if (px >= COLS * T) px -= COLS * T;
    return { x: px, y: py };
  }

  public update(dt: number, maze: MazeManager, isMadness: boolean, isNitro: boolean, onCollectDot: (c: number, r: number) => void) {
    // Dash streaks
    for (let i = this.dashStreaks.length - 1; i >= 0; i--) {
      const s = this.dashStreaks[i];
      s.life -= dt;
      if (s.life <= 0) this.dashStreaks.splice(i, 1);
    }
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    // Movement interpolation
    this.st += (1 - this.st) * 0.12;
    this.sq += (1 - this.sq) * 0.12;

    const curSpeed = isMadness ? (isNitro ? P_MADNESS_SPEED * 1.35 : P_MADNESS_SPEED) : P_SPEED;
    this.speed = curSpeed;

    if (this.t < 1) {
      this.t += dt * this.speed;
      if (this.dx !== 0 || this.dy !== 0) this.ma += dt * 15;
      if (this.t >= 1) {
        this.t = 1;
        this.fx = this.x;
        this.fy = this.y;
        onCollectDot(this.x, this.y);
      }
    }

    if (this.t >= 1) {
      // Try next desired direction
      if (this.ndx !== 0 || this.ndy !== 0) {
        const nx = this.wrapX(this.x + this.ndx);
        const ny = this.y + this.ndy;
        if (maze.isWalkable(nx, ny, false)) {
          this.dx = this.ndx;
          this.dy = this.ndy;
          this.lastDx = this.dx;
          this.lastDy = this.dy;
        }
      }

      // Move along current direction
      if (this.dx !== 0 || this.dy !== 0) {
        const nx = this.wrapX(this.x + this.dx);
        const ny = this.y + this.dy;
        if (maze.isWalkable(nx, ny, false)) {
          this.fx = this.x;
          this.fy = this.y;
          this.x = nx;
          this.y = ny;
          this.t = 0;
          this.lastDx = this.dx;
          this.lastDy = this.dy;
        } else {
          this.dx = 0;
          this.dy = 0;
        }
      }
    }

    // Motion trail
    const pp = this.getPos();
    this.trail.unshift({ x: pp.x, y: pp.y });
    if (this.trail.length > 8) this.trail.pop();
  }

  public triggerDash(maze: MazeManager, isMadness: boolean, enemies: any[], onKillGhost: (e: any, x: number, y: number) => void, onCollectDot: (c: number, r: number) => void): boolean {
    if (this.dashCd > 0) return false;
    let dx = this.dx, dy = this.dy;
    if (!dx && !dy) { dx = this.ndx; dy = this.ndy; }
    if (!dx && !dy) { dx = this.lastDx || 1; dy = this.lastDy || 0; }

    const startPos = this.getPos();
    let dashed = 0;

    if (this.t < 1) {
      this.fx = this.x;
      this.fy = this.y;
      this.t = 1;
    }

    for (let i = 0; i < DASH_DIST; i++) {
      const nx = this.wrapX(this.x + dx);
      const ny = this.y + dy;
      if (!maze.isWalkable(nx, ny, false)) break;

      this.fx = this.x;
      this.fy = this.y;
      this.x = nx;
      this.y = ny;
      this.t = 1;
      dashed++;

      onCollectDot(nx, ny);
      const px = nx * T + HALF, py = ny * T + HALF;
      particles.emit(px, py, 4, '#00ffff', { speed: 80, size: 3, life: 0.35 });
    }

    if (dashed === 0) {
      particles.shake(2, 0.08);
      return false;
    }

    const endPos = this.getPos();
    this.dashCd = isMadness ? DASH_MADNESS_CD : DASH_CD;

    if (dx !== 0) { this.st = 1.9; this.sq = 0.52; }
    else { this.st = 0.52; this.sq = 1.9; }

    this.dashStreaks.push({
      x1: startPos.x, y1: startPos.y,
      x2: endPos.x, y2: endPos.y,
      life: 0.24, maxLife: 0.24
    });

    // Offensive Dash: Slay all ghosts in dash trajectory!
    for (const e of enemies) {
      if (e.st !== 'dead' && e.st !== 'return') {
        const ep = { x: (e.fx + (e.x - e.fx) * e.t) * T + HALF, y: (e.fy + (e.y - e.fy) * e.t) * T + HALF };
        if (distToSegment(ep.x, ep.y, startPos.x, startPos.y, endPos.x, endPos.y) < T * 1.2) {
          onKillGhost(e, ep.x, ep.y);
        }
      }
    }

    particles.emit(startPos.x, startPos.y, 12, '#00e5ff', { speed: 120, size: 4, life: 0.4 });
    particles.emit(endPos.x, endPos.y, 16, '#ffffff', { speed: 140, size: 4.5, life: 0.45 });
    particles.shake(4, 0.15);
    particles.flash('#00e5ff', 0.22);
    sounds.play('dash');
    this.invuln = Math.max(this.invuln, 0.35);
    particles.addPop(endPos.x, endPos.y - 20, '⚡ DASH !', '#00ffff', 16);
    return true;
  }

  public wrapX(c: number): number {
    if (c < 0) return COLS - 1;
    if (c >= COLS) return 0;
    return c;
  }

  public draw(c: CanvasRenderingContext2D, time: number, isMadness: boolean) {
    const pp = this.getPos();

    // Dash streaks
    for (const s of this.dashStreaks) {
      const a = s.life / s.maxLife;
      c.save();
      c.globalAlpha = a * 0.85;
      c.strokeStyle = '#00ffff';
      c.lineWidth = 14 * a;
      c.shadowColor = '#00ffff';
      c.shadowBlur = 18;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2);
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4 * a;
      c.beginPath();
      c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2);
      c.stroke();
      c.restore();
    }

    // Motion Trail
    const tl = this.trail.length;
    for (let i = 0; i < tl; i++) {
      const t = i / tl, tp = this.trail[i];
      c.globalAlpha = t * 0.25;
      c.fillStyle = isMadness ? '#ffd700' : '#00ffff';
      c.beginPath();
      c.arc(tp.x, tp.y, P_RAD * t * 0.6, 0, PI2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Body
    c.save();
    c.translate(pp.x, pp.y);
    const faceAngle = (this.dx || this.dy) ? Math.atan2(this.dy, this.dx) : Math.atan2(this.lastDy, this.lastDx);
    c.rotate(faceAngle);
    if (this.dx || this.dy) c.scale(this.st, this.sq);
    if (this.invuln > 0 && Math.sin(time * 16) > 0) c.globalAlpha = 0.4;
    c.shadowColor = isMadness ? '#ffd700' : '#00ffff';
    c.shadowBlur = 12;
    const mouth = Math.abs(Math.sin(this.ma)) * 0.7;
    c.fillStyle = C_PLAYER;
    c.beginPath();
    c.arc(0, 0, P_RAD, mouth, PI2 - mouth);
    c.lineTo(0, 0);
    c.fill();
    c.shadowBlur = 0;

    // Dash Ring
    const maxCd = isMadness ? DASH_MADNESS_CD : DASH_CD;
    if (this.dashCd > 0) {
      const ringAngle = (1 - this.dashCd / maxCd) * PI2;
      c.save();
      c.strokeStyle = isMadness ? 'rgba(255,180,0,0.75)' : 'rgba(0,255,255,0.45)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, P_RAD + 4, -Math.PI / 2, -Math.PI / 2 + ringAngle);
      c.stroke();
      c.restore();
    } else {
      const pulse = 0.3 + Math.sin(time * 8) * 0.2;
      c.save();
      c.strokeStyle = isMadness ? '#ffd700' : `rgba(0,255,255,${pulse})`;
      c.shadowColor = isMadness ? '#ffd700' : '#00ffff';
      c.shadowBlur = 8;
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(0, 0, P_RAD + 4, 0, PI2);
      c.stroke();
      c.restore();
    }

    // Invulnerability shield
    if (this.invuln > 0) {
      c.save();
      c.strokeStyle = 'rgba(0,255,255,0.85)';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 16;
      c.lineWidth = 2;
      c.setLineDash([4, 3]);
      c.beginPath();
      c.arc(0, 0, P_RAD + 6, time * 12, time * 12 + PI2);
      c.stroke();
      c.restore();
    }

    c.restore();
    c.globalAlpha = 1;
  }
}
