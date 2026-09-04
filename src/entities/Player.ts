// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PLAYER ENTITY & OFFENSIVE DASH
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, CW, P_RAD, C_PLAYER, PI, PI2, DASH_DIST, DASH_CD, DASH_MADNESS_CD, P_SPEED, P_MADNESS_SPEED, CC, COMBO_DECAY, getComboTier } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from '../systems/ParticleSystem';
import { MazeManager } from '../levels/levels';
import { progression } from '../systems/ProgressionSystem';

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

  public reset(isMadness: boolean, maze?: MazeManager, speedMult: number = 1.0) {
    let sx = 10, sy = 16;
    if (maze && !maze.isWalkable(sx, sy, false)) {
      let found = false;
      for (let dist = 1; dist <= 6 && !found; dist++) {
        for (let dy = -dist; dy <= dist && !found; dy++) {
          for (let dx = -dist; dx <= dist && !found; dx++) {
            if (maze.isWalkable(10 + dx, 16 + dy, false)) {
              sx = 10 + dx;
              sy = 16 + dy;
              found = true;
            }
          }
        }
      }
    }
    this.x = this.fx = sx;
    this.y = this.fy = sy;
    this.t = 1;
    this.dx = this.dy = this.ndx = this.ndy = 0;
    this.lastDx = 1;
    this.lastDy = 0;
    this.sq = 1;
    this.st = 1;
    this.trail = [];
    this.speed = (isMadness ? P_MADNESS_SPEED : P_SPEED) * speedMult;
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

  public doMove(dx: number, dy: number, _maze: MazeManager) {
    this.dx = dx;
    this.dy = dy;
    this.lastDx = dx;
    this.lastDy = dy;
    this.fx = this.x;
    this.fy = this.y;
    this.x = this.wrapX(this.x + dx);
    this.y = this.y + dy;
    const ov = this.t - 1;
    this.t = Math.max(0, ov);
    this.sq = 0.72;
    this.st = 1.28;
  }

  public update(
    dt: number,
    maze: MazeManager,
    isMadness: boolean,
    isNitro: boolean,
    inputDir: { x: number; y: number },
    onCollectDot: (c: number, r: number) => void,
    speedMult: number = 1.0
  ) {
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
    this.speed = curSpeed * speedMult;

    // Accept input direction
    if (inputDir.x !== 0 || inputDir.y !== 0) {
      this.ndx = inputDir.x;
      this.ndy = inputDir.y;
    }

    // Immediate 180° turn responsiveness
    if (this.ndx === -this.dx && this.ndy === -this.dy && (this.ndx !== 0 || this.ndy !== 0)) {
      const tempX = this.x, tempY = this.y;
      this.x = this.fx; this.y = this.fy;
      this.fx = tempX; this.fy = tempY;
      this.dx = this.ndx; this.dy = this.ndy;
      this.lastDx = this.dx; this.lastDy = this.dy;
      this.t = Math.max(0, 1 - this.t);
    }

    if (this.t >= 1) {
      if (this.ndx !== 0 || this.ndy !== 0) {
        const nx = this.wrapX(this.x + this.ndx), ny = this.y + this.ndy;
        if (maze.isWalkable(nx, ny, false)) {
          this.doMove(this.ndx, this.ndy, maze);
        } else if (this.dx !== 0 || this.dy !== 0) {
          const mx = this.wrapX(this.x + this.dx), my = this.y + this.dy;
          if (maze.isWalkable(mx, my, false)) {
            this.doMove(this.dx, this.dy, maze);
          } else {
            this.dx = 0; this.dy = 0;
          }
        } else {
          this.dx = 0; this.dy = 0;
        }
      } else if (this.dx !== 0 || this.dy !== 0) {
        const mx = this.wrapX(this.x + this.dx), my = this.y + this.dy;
        if (maze.isWalkable(mx, my, false)) {
          this.doMove(this.dx, this.dy, maze);
        } else {
          this.dx = 0; this.dy = 0;
        }
      }
    }

    if (this.dx !== 0 || this.dy !== 0) {
      this.t += dt * this.speed;
      this.ma += dt * 15;
      if (this.t >= 1) {
        onCollectDot(this.x, this.y);
      }
    }

    // Motion trail
    const pp = this.getPos();
    this.trail.unshift({ x: pp.x, y: pp.y });
    if (this.trail.length > 8) this.trail.pop();
  }

  public triggerDash(
    maze: MazeManager,
    isMadness: boolean,
    enemies: any[],
    onKillGhost: (e: any, x: number, y: number) => void,
    onCollectDot: (c: number, r: number) => void,
    hasForceField: boolean = false,
    isOverdrive: boolean = false
  ): boolean {
    if (this.dashCd > 0 && !isOverdrive) return false;

    const dashLvl = progression.getSkillLevel('dash');
    if (dashLvl === 0) {
      const pp = this.getPos();
      particles.addPop(pp.x, pp.y - 20, '🔒 DASH DÉBLOQUÉ À 5 👻', '#ffaa00', 12);
      return false;
    }

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

    const maxDist = dashLvl >= 2 ? 4 : DASH_DIST;
    for (let i = 0; i < maxDist; i++) {
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

      // If Force Field active, vacuum dots in a wide corridor along dash!
      if (hasForceField) {
        for (let radY = -2; radY <= 2; radY++) {
          for (let radX = -2; radX <= 2; radX++) {
            const rx = this.wrapX(nx + radX), ry = ny + radY;
            if (ry >= 0 && ry < ROWS && Math.hypot(radX, radY) <= 2.2) {
              onCollectDot(rx, ry);
            }
          }
        }
      }

      const px = nx * T + HALF, py = ny * T + HALF;
      particles.emit(px, py, 6, isOverdrive ? '#00ffcc' : '#00ffff', { speed: 80, size: 3, life: 0.35 });
    }

    if (dashed === 0) {
      particles.shake(2, 0.08);
      return false;
    }

    const endPos = this.getPos();
    const cdMult = dashLvl >= 2 ? 0.75 : 1.0;
    this.dashCd = isOverdrive ? 0 : (isMadness ? DASH_MADNESS_CD * cdMult : DASH_CD * cdMult);

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
        const d = distToSegment(ep.x, ep.y, startPos.x, startPos.y, endPos.x, endPos.y);
        if (d < T * 1.2) {
          onKillGhost(e, ep.x, ep.y);
        }
      }
    }

    // Cyber Dash V2 arrival shockwave
    if (dashLvl >= 2) {
      particles.emit(endPos.x, endPos.y, 30, '#00ffff', { speed: 170, size: 5, life: 0.45 });
      particles.shake(5, 0.2);
      for (const e of enemies) {
        if (e.st !== 'dead' && e.st !== 'return') {
          const ep = { x: (e.fx + (e.x - e.fx) * e.t) * T + HALF, y: (e.fy + (e.y - e.fy) * e.t) * T + HALF };
          if (Math.hypot(ep.x - endPos.x, ep.y - endPos.y) < T * 1.8) {
            onKillGhost(e, ep.x, ep.y);
          }
        }
      }
      particles.addPop(endPos.x, endPos.y - 20, isOverdrive ? '⚡ CYBER OVERDRIVE !' : '⚡ CYBER DASH V2 !', '#00ffff', 16);
    } else {
      particles.addPop(endPos.x, endPos.y - 20, isOverdrive ? '⚡ HYPER DASH !' : '⚡ DASH !', isOverdrive ? '#00ffcc' : '#00ffff', 16);
    }

    particles.emit(startPos.x, startPos.y, 16, isOverdrive ? '#00ffcc' : '#00e5ff', { speed: 130, size: 4, life: 0.45 });
    particles.emit(endPos.x, endPos.y, 20, isOverdrive ? '#00ffcc' : '#ffffff', { speed: 150, size: 4.5, life: 0.45 });
    particles.shake(isOverdrive ? 3 : 4, 0.15);
    particles.flash(isOverdrive ? '#00ffcc' : '#00e5ff', 0.22);
    sounds.play('dash');
    this.invuln = Math.max(this.invuln, 0.35);
    return true;
  }

  public wrapX(c: number): number {
    if (c < 0) return COLS - 1;
    if (c >= COLS) return 0;
    return c;
  }

  public draw(
    c: CanvasRenderingContext2D,
    time: number,
    isMadness: boolean,
    isGodMode: boolean = false,
    isPredator: boolean = false,
    predTimer: number = 0,
    predMaxTimer: number = 7.0,
    combo: { m: number; t: number; n: number } = { m: 1, t: 0, n: 0 }
  ) {
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

    // Motion Trail & Predator Chromatic Ghost Afterimages
    const tl = this.trail.length;
    for (let i = 0; i < tl; i++) {
      const t = i / tl, tp = this.trail[i];
      c.globalAlpha = t * (isPredator || isGodMode ? 0.45 : 0.25);
      c.fillStyle = isPredator
        ? (i % 2 === 0 ? '#00ffff' : '#ff007f')
        : (isGodMode ? '#00ffff' : (isMadness ? '#ffd700' : '#00ffff'));
      c.beginPath();
      c.arc(tp.x, tp.y, P_RAD * t * (isPredator ? 0.85 : 0.6), 0, PI2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Body & Aura rendering (with seamless dual-edge wrap for tunnels)
    const renderPlayer = (ox: number = 0) => {
      c.save();
      c.translate(pp.x + ox, pp.y);
      const faceAngle = (this.dx || this.dy) ? Math.atan2(this.dy, this.dx) : Math.atan2(this.lastDy, this.lastDx);
      c.rotate(faceAngle);
      if (this.dx || this.dy) c.scale(this.st, this.sq);
      if (this.invuln > 0 && Math.sin(time * 16) > 0) c.globalAlpha = 0.4;

      const isWarn = isPredator && predTimer < 2.5;

      // Dynamic Predator / God glow
      if (isPredator) {
        c.shadowColor = '#00ffff';
        c.shadowBlur = 18;
      } else {
        c.shadowColor = isGodMode ? '#00ffff' : (isMadness ? '#ffd700' : '#00ffff');
        c.shadowBlur = isGodMode ? 22 : 12;
      }

      const mouth = Math.abs(Math.sin(this.ma)) * 0.7;

      c.fillStyle = isGodMode ? '#ffffff' : C_PLAYER;

      c.beginPath();
      c.arc(0, 0, P_RAD, mouth, PI2 - mouth);
      c.lineTo(0, 0);
      c.fill();
      c.shadowBlur = 0;

      // Predator electric sparks
      if (isPredator) {
        c.save();
        c.strokeStyle = '#00ffff';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 10;
        c.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
          const a = time * 8 + (i * Math.PI) / 2;
          const r1 = P_RAD + 2;
          const r2 = P_RAD + 7 + Math.sin(time * 20 + i * 3) * 3;
          c.beginPath();
          c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          c.lineTo(Math.cos(a + 0.15) * ((r1 + r2) / 2), Math.sin(a + 0.15) * ((r1 + r2) / 2));
          c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          c.stroke();
        }
        c.restore();
      }

      // God Mode x32 Radiant Aura & Star Crown
      if (isGodMode && !isPredator) {
        c.save();
        const auraPulse = 1 + Math.sin(time * 12) * 0.15;
        c.strokeStyle = '#00ffff';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 24;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, 0, (P_RAD + 7) * auraPulse, 0, PI2);
        c.stroke();

        c.strokeStyle = '#ffd700';
        c.shadowColor = '#ffd700';
        c.shadowBlur = 16;
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = time * 4 + (i * PI2) / 6;
          const r1 = P_RAD + 7;
          const r2 = P_RAD + 13 + Math.sin(time * 10 + i) * 3;
          c.beginPath();
          c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          c.stroke();
        }
        c.restore();
      }

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
    };

    // Circular Countdown Ring around Pac-Man (World coordinates)
    const renderCountdownRing = (ox: number = 0) => {
      if (isPredator && predTimer > 0) {
        const prog = Math.max(0, Math.min(1, predTimer / predMaxTimer));
        const isWarn = predTimer < 2.5;
        const arcCol = isWarn ? '#ffaa00' : '#00ffff';
        const r = P_RAD + 8;

        c.save();
        c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(pp.x + ox, pp.y, r, 0, PI2);
        c.stroke();

        c.strokeStyle = arcCol;
        c.shadowColor = arcCol;
        c.shadowBlur = 10;
        c.lineWidth = 3.2;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(pp.x + ox, pp.y, r, -Math.PI / 2, -Math.PI / 2 + prog * PI2);
        c.stroke();

        const headAng = -Math.PI / 2 + prog * PI2;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(pp.x + ox + Math.cos(headAng) * r, pp.y + Math.sin(headAng) * r, 2.5, 0, PI2);
        c.fill();
        c.restore();
      }
    };

    // Upright Floating Overhead HUD Pill directly above Pac-Man (World coordinates)
    const renderOverheadHUD = (ox: number = 0) => {
      if (isPredator || combo.m > 1) {
        c.save();
        const badgeY = pp.y - P_RAD - 14;
        const isWarn = isPredator && predTimer < 2.5;

        let badgeText = '';
        let badgeCol = '#00ffff';
        let prog = 1;

        if (isPredator) {
          badgeCol = isWarn ? '#ffaa00' : '#00ffff';
          badgeText = combo.m > 1 ? `⚡ x${combo.m} • ${predTimer.toFixed(1)}s` : `⚡ ${predTimer.toFixed(1)}s`;
          if (isWarn) badgeText = combo.m > 1 ? `⏳ x${combo.m} • ${predTimer.toFixed(1)}s` : `⏳ ${predTimer.toFixed(1)}s`;
          prog = Math.max(0, Math.min(1, predTimer / predMaxTimer));
        } else if (combo.m > 1) {
          const tier = getComboTier(combo.n);
          badgeCol = CC[tier] || '#00ffff';
          badgeText = `🔥 x${combo.m}`;
          prog = Math.max(0, Math.min(1, combo.t / COMBO_DECAY));
        }

        c.font = 'bold 9.5px monospace';
        const tw = c.measureText(badgeText).width;
        const bw = tw + 12;
        const bh = 14;
        const bx = pp.x + ox - bw / 2;
        const by = badgeY - bh / 2;

        // Container
        c.fillStyle = 'rgba(8, 12, 24, 0.9)';
        c.strokeStyle = badgeCol;
        c.lineWidth = 1.2;
        c.shadowColor = badgeCol;
        c.shadowBlur = 8;
        c.beginPath();
        c.roundRect(bx, by, bw, bh, 3.5);
        c.fill();
        c.stroke();
        c.shadowBlur = 0;

        // Progress decay line
        if (prog < 1) {
          c.fillStyle = badgeCol;
          c.fillRect(bx + 2, by + bh - 2, (bw - 4) * prog, 1.5);
        }

        // Text
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(badgeText, pp.x + ox, badgeY);

        c.restore();
      }
    };

    renderPlayer(0);
    renderCountdownRing(0);
    renderOverheadHUD(0);

    if (pp.x < P_RAD * 2) {
      renderPlayer(CW);
      renderCountdownRing(CW);
      renderOverheadHUD(CW);
    } else if (pp.x > CW - P_RAD * 2) {
      renderPlayer(-CW);
      renderCountdownRing(-CW);
      renderOverheadHUD(-CW);
    }

    c.globalAlpha = 1;
  }

  public drawForceField(c: CanvasRenderingContext2D, px: number, py: number, radius: number, time: number) {
    c.save();
    c.translate(px, py);

    const pulse = 1 + Math.sin(time * 12) * 0.08;
    const curR = radius * pulse;

    // Outer plasma radial field
    const grad = c.createRadialGradient(0, 0, curR * 0.2, 0, 0, curR);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.04)');
    grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.16)');
    grad.addColorStop(0.85, 'rgba(217, 70, 239, 0.35)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.7)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, curR, 0, PI2);
    c.fill();

    // Boundary neon rings
    c.strokeStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 18;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(0, 0, curR, 0, PI2);
    c.stroke();

    c.strokeStyle = '#d946ef';
    c.shadowColor = '#d946ef';
    c.shadowBlur = 14;
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(0, 0, curR - 4, 0, PI2);
    c.stroke();

    // Orbiting electromagnetic shield emitter nodes
    for (let i = 0; i < 4; i++) {
      const a = time * 4 + (i * PI2) / 4;
      const nx = Math.cos(a) * (curR - 2);
      const ny = Math.sin(a) * (curR - 2);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#00ffff';
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(nx, ny, 3.5, 0, PI2);
      c.fill();

      // Electric arc segment
      c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, curR - 2, a, a + 0.35);
      c.stroke();
    }

    // Crackling electric discharges inside
    c.strokeStyle = '#00ffff';
    c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + i * 2.1;
      const r1 = curR * 0.3;
      const r2 = curR * 0.85;
      c.beginPath();
      c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      c.lineTo(Math.cos(a + 0.2) * ((r1 + r2) / 2), Math.sin(a + 0.2) * ((r1 + r2) / 2));
      c.lineTo(Math.cos(a - 0.1) * r2, Math.sin(a - 0.1) * r2);
      c.stroke();
    }

    c.restore();
  }

  public drawBonusPacman(c: CanvasRenderingContext2D, px: number, py: number, time: number, angle: number) {
    c.save();
    c.translate(px, py);
    c.rotate(angle);

    // Glowing core body (miniaturized for zoomed-out perspective)
    const mouth = Math.abs(Math.sin(time * 18)) * 0.7;
    c.shadowColor = '#00ffff';
    c.shadowBlur = 16;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(0, 0, 7.5, mouth, PI2 - mouth);
    c.lineTo(0, 0);
    c.fill();
    c.shadowBlur = 0;

    c.restore();
  }
}
