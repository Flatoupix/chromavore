// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — PLAYER ENTITY & OFFENSIVE DASH
// ═══════════════════════════════════════════════════════════════

import { T, HALF, COLS, ROWS, CW, P_RAD, C_PLAYER, PI, PI2, DASH_DIST, DASH_CD, DASH_MADNESS_CD, P_SPEED, P_MADNESS_BASE_SPEED, P_MADNESS_SPEED, CC, COMBO_DECAY, getComboTier } from '../config/constants';
import { sounds } from '../audio/SoundManager';
import { particles } from '../systems/ParticleSystem';
import { MazeManager } from '../levels/levels';
import { progression } from '../systems/ProgressionSystem';
import { spriteAtlas } from '../graphics/SpriteAtlas';

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
  public pelletSpeedBonus: number = 0;
  public superPelletBoostTimer: number = 0;
  public sq: number = 1;
  public st: number = 1;
  public ma: number = 0;
  public trail: { x: number; y: number }[] = [];

  public dashCd: number = 0;
  public dashStreaks: { x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number }[] = [];
  public invuln: number = 2;
  public currentCols: number = COLS;

  public addDotSpeed() {
    // Each eaten dot ramps up speed (+0.04 up to +3.2 tiles/sec max)
    this.pelletSpeedBonus = Math.min(3.2, this.pelletSpeedBonus + 0.04);
  }

  public addSuperPelletBoost() {
    // Super-pellet provides immediate high-octane speed surge
    this.superPelletBoostTimer = 3.5;
    this.pelletSpeedBonus = Math.min(3.5, this.pelletSpeedBonus + 1.2);
  }

  public reset(isMadness: boolean, maze?: MazeManager, speedMult: number = 1.0) {
    let sx = isMadness ? 19 : 10, sy = 16;
    if (maze) {
      this.currentCols = maze.cols;
      const sp = maze.getSpawn();
      sx = sp.x;
      sy = sp.y;
      if (!maze.isWalkable(sx, sy, false)) {
        const safe = maze.findNearestWalkable(sx, sy, false);
        sx = safe.x;
        sy = safe.y;
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
    this.pelletSpeedBonus = 0;
    const isWide = maze ? maze.cols > 21 : false;
    const progressionBoost = isWide ? 4.3 : Math.min(2.5, (progression.totalGhosts / 300) * 2.5);
    const madnessCalculatedSpeed = P_MADNESS_BASE_SPEED + progressionBoost;
    this.speed = (isMadness ? madnessCalculatedSpeed : P_SPEED) * speedMult;
    this.invuln = 2.0;
    this.dashCd = 0;
    this.dashStreaks = [];
  }

  public getPos(): { x: number; y: number } {
    const cols = this.currentCols;
    let fx_ = this.fx, fy_ = this.fy, tx = this.x, ty = this.y;
    if (Math.abs(tx - fx_) > cols / 2) {
      if (tx > fx_) fx_ += cols;
      else tx += cols;
    }
    const t = Math.min(this.t, 1);
    let px = (fx_ + (tx - fx_) * t) * T + HALF;
    let py = (fy_ + (ty - fy_) * t) * T + HALF;
    if (px < 0) px += cols * T;
    if (px >= cols * T) px -= cols * T;
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

  private handleCornerAutoTurn(maze: MazeManager, heldDirections: { x: number; y: number }[] = []) {
    // If forward is blocked, look for open orthogonal turns (excluding backward)
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ].filter(d => !(this.dx !== 0 && d.x === -this.dx && d.y === -this.dy));

    const openDirs = dirs.filter(d => maze.isWalkable(this.wrapX(this.x + d.x), this.y + d.y, false));
    if (openDirs.length === 0) {
      this.dx = 0;
      this.dy = 0;
      return;
    }

    // 1. If any held direction matches an open dir, take it immediately!
    for (let i = heldDirections.length - 1; i >= 0; i--) {
      const h = heldDirections[i];
      const match = openDirs.find(d => d.x === h.x && d.y === h.y);
      if (match) {
        this.doMove(match.x, match.y, maze);
        return;
      }
    }

    // 2. If unambiguous 90-degree corner: enrouler la courbe naturellement (virage unique)
    if (openDirs.length === 1) {
      this.doMove(openDirs[0].x, openDirs[0].y, maze);
      return;
    }

    // 3. At T-junction or crossroads: never make autonomous decisions!
    // Pac-Man stops against the wall until the player commands a direction.
    this.dx = 0;
    this.dy = 0;
  }

  public update(
    dt: number,
    maze: MazeManager,
    isMadness: boolean,
    isNitro: boolean,
    inputDir: { x: number; y: number },
    onCollectDot: (c: number, r: number) => void,
    speedMult: number = 1.0,
    heldDirections: { x: number; y: number; code: string }[] = []
  ) {
    this.currentCols = maze.cols;
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

    // Dynamic speed ramp: base speed + pellet eating bonus + super-pellet boost, scaled by combo
    if (this.superPelletBoostTimer > 0) this.superPelletBoostTimer -= dt;
    if (this.pelletSpeedBonus > 0) {
      this.pelletSpeedBonus = Math.max(0, this.pelletSpeedBonus - dt * 0.45);
    }
    const pelletSurge = (this.superPelletBoostTimer > 0 ? 1.8 : 0) + this.pelletSpeedBonus;
    const isWide = maze ? maze.cols > 21 : false;
    const progressionBoost = isWide ? 4.3 : Math.min(2.5, (progression.totalGhosts / 300) * 2.5);
    const madnessCalculatedSpeed = P_MADNESS_BASE_SPEED + progressionBoost;
    const baseSpeed = isMadness ? (isNitro ? madnessCalculatedSpeed * 1.30 : madnessCalculatedSpeed) : P_SPEED;
    this.speed = (baseSpeed + pelletSurge) * speedMult;

    // Accept input direction
    if (inputDir.x !== 0 || inputDir.y !== 0) {
      this.ndx = inputDir.x;
      this.ndy = inputDir.y;
    }

    // 1. Immediate 180° turn responsiveness
    if (this.ndx === -this.dx && this.ndy === -this.dy && (this.ndx !== 0 || this.ndy !== 0)) {
      const tempX = this.x, tempY = this.y;
      this.x = this.fx; this.y = this.fy;
      this.fx = tempX; this.fy = tempY;
      this.dx = this.ndx; this.dy = this.ndy;
      this.lastDx = this.dx; this.lastDy = this.dy;
      this.t = Math.max(0, 1 - this.t);
    }

    // 2. Corner Leniency (Late Turn / Post-Intersection Slide)
    // If player tapped perpendicular turn slightly late (within first 38% of tile), check if opening at previous tile was valid
    const isPerp = (this.ndx !== 0 && this.dx === 0) || (this.ndy !== 0 && this.dy === 0);
    if (isPerp && (this.dx !== 0 || this.dy !== 0) && this.t <= 0.38) {
      const lateTurnX = this.wrapX(this.fx + this.ndx);
      const lateTurnY = this.fy + this.ndy;
      if (maze.isWalkable(lateTurnX, lateTurnY, false)) {
        this.x = lateTurnX;
        this.y = lateTurnY;
        this.dx = this.ndx;
        this.dy = this.ndy;
        this.lastDx = this.dx;
        this.lastDy = this.dy;
        this.t = Math.max(0.08, this.t * 0.4);
        onCollectDot(this.fx, this.fy);
      }
    }

    // 3. Tile Reached / Step Decision with Wall-Sliding Contour Assistance
    if (this.t >= 1) {
      // Find best walkable direction among desired input and held keys
      let targetDir = { x: this.ndx, y: this.ndy };
      let nx = this.wrapX(this.x + targetDir.x), ny = this.y + targetDir.y;
      if (!maze.isWalkable(nx, ny, false)) {
        // Desired direction blocked by wall! Check if another held key is walkable (wall-contouring)
        for (let i = heldDirections.length - 1; i >= 0; i--) {
          const h = heldDirections[i];
          const hx = this.wrapX(this.x + h.x), hy = this.y + h.y;
          if (maze.isWalkable(hx, hy, false)) {
            targetDir = { x: h.x, y: h.y };
            nx = hx;
            ny = hy;
            break;
          }
        }
      }

      if (maze.isWalkable(nx, ny, false) && (targetDir.x !== 0 || targetDir.y !== 0)) {
        this.doMove(targetDir.x, targetDir.y, maze);
      } else if (this.dx !== 0 || this.dy !== 0) {
        // Forward is open along the current corridor: keep gliding along the wall!
        const mx = this.wrapX(this.x + this.dx), my = this.y + this.dy;
        if (maze.isWalkable(mx, my, false)) {
          this.doMove(this.dx, this.dy, maze);
        } else {
          this.handleCornerAutoTurn(maze, heldDirections);
        }
      } else {
        // Stopped: unstick by sliding along wall if orthogonal path is open
        this.handleCornerAutoTurn(maze, heldDirections);
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
    if (!isMadness) return false;
    if (this.dashCd > 0 && !isOverdrive) return false;

    const dashLvl = progression.getSkillLevel('dash');
    if (dashLvl === 0) {
      const pp = this.getPos();
      particles.addPop(pp.x, pp.y - 20, 'DASH DÉBLOQUÉ À 10 SPECTRES', '#ffaa00', 12);
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
        const isWide = this.currentCols > 21;
        const dashR = isWide ? 3.2 : 2.2;
        const radLimit = Math.ceil(dashR);
        for (let radY = -radLimit; radY <= radLimit; radY++) {
          for (let radX = -radLimit; radX <= radLimit; radX++) {
            const rx = this.wrapX(nx + radX), ry = ny + radY;
            if (ry >= 0 && ry < ROWS && Math.hypot(radX, radY) <= dashR) {
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
      particles.addPop(endPos.x, endPos.y - 20, isOverdrive ? 'CYBER OVERDRIVE !' : 'CYBER DASH V2 !', '#00ffff', 16);
    } else {
      particles.addPop(endPos.x, endPos.y - 20, isOverdrive ? 'HYPER DASH !' : 'DASH !', isOverdrive ? '#00ffcc' : '#00ffff', 16);
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
    if (c < 0) return this.currentCols - 1;
    if (c >= this.currentCols) return 0;
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
    combo: { m: number; t: number; n: number } = { m: 1, t: 0, n: 0 },
    isChronoActive: boolean = false
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

    // Chrono-Shift Temporal Strobe Afterimages
    if (isChronoActive) {
      const pAngle = (this.dx || this.dy) ? Math.atan2(this.dy, this.dx) : Math.atan2(this.lastDy, this.lastDx);
      const echoDistances = [12, 24, 36];
      const echoColors = ['rgba(0, 240, 255, 0.45)', 'rgba(255, 0, 127, 0.35)', 'rgba(0, 255, 200, 0.25)'];
      for (let i = 0; i < echoDistances.length; i++) {
        const d = echoDistances[i];
        const ex = pp.x - Math.cos(pAngle) * d;
        const ey = pp.y - Math.sin(pAngle) * d;
        c.save();
        c.fillStyle = echoColors[i];
        c.shadowColor = echoColors[i];
        c.shadowBlur = 10;
        c.beginPath();
        c.arc(ex, ey, P_RAD * (0.85 - i * 0.12), 0, PI2);
        c.fill();
        c.restore();
      }
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
      if (isGodMode) {
        c.shadowColor = '#00ffff';
        c.shadowBlur = 30;
      } else if (isPredator) {
        c.shadowColor = '#00ffff';
        c.shadowBlur = 18;
      } else {
        c.shadowColor = isMadness ? '#ffd700' : '#00ffff';
        c.shadowBlur = 12;
      }

      if (isMadness) {
        this.drawChromavoreEntity(
          c,
          P_RAD,
          time,
          this.ma,
          isGodMode,
          isPredator,
          combo.m,
          true
        );
      } else {
        // Pure Classic Retro Pac-Man
        c.fillStyle = C_PLAYER;
        c.beginPath();
        c.arc(0, 0, P_RAD, this.ma, PI2 - this.ma);
        c.lineTo(0, 0);
        c.fill();
      }

      // Electric plasma sparks (Predator or God mode)
      if (isPredator || isGodMode) {
        c.save();
        c.strokeStyle = isGodMode ? '#ffd700' : '#00ffff';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 12;
        c.lineWidth = isGodMode ? 2.0 : 1.6;
        const sparkCount = isGodMode ? 6 : 4;
        for (let i = 0; i < sparkCount; i++) {
          const a = time * 8 + (i * PI2) / sparkCount;
          const r1 = P_RAD + 2;
          const r2 = P_RAD + 8 + Math.sin(time * 20 + i * 3) * 3;
          c.beginPath();
          c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          c.lineTo(Math.cos(a + 0.15) * ((r1 + r2) / 2), Math.sin(a + 0.15) * ((r1 + r2) / 2));
          c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          c.stroke();
        }
        c.restore();
      }

      // God Mode x32 Radiant Aura & Star Crown
      if (isGodMode) {
        c.save();
        const auraPulse = 1 + Math.sin(time * 8) * 0.12;
        c.strokeStyle = '#00ffff';
        c.shadowColor = '#00ffff';
        c.shadowBlur = 24;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, 0, (P_RAD + 6) * auraPulse, 0, PI2);
        c.stroke();

        c.strokeStyle = '#ffd700';
        c.shadowColor = '#ffd700';
        c.shadowBlur = 18;
        c.lineWidth = 2.2;
        for (let i = 0; i < 6; i++) {
          const a = time * 3 + (i * PI2) / 6;
          const r1 = P_RAD + 7;
          const r2 = P_RAD + 14 + Math.sin(time * 8 + i) * 3;
          c.beginPath();
          c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          c.stroke();
        }
        c.restore();
      }

      // Chrono-Shift Quantum Bubble (Dilatation Temporelle)
      if (isChronoActive) {
        c.save();
        const chPulse = 1 + Math.sin(time * 12) * 0.12;
        c.strokeStyle = '#00f0ff';
        c.shadowColor = '#00f0ff';
        c.shadowBlur = 18;
        c.lineWidth = 2.4;
        c.beginPath();
        c.arc(0, 0, P_RAD * 1.4 * chPulse, 0, PI2);
        c.stroke();

        // Technical rotating reticle ticks around player
        c.strokeStyle = 'rgba(255, 0, 128, 0.7)';
        c.lineWidth = 1.2;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.arc(0, 0, P_RAD * 1.7, time * 4, time * 4 + PI2);
        c.stroke();
        c.restore();
      }

      // Dash Ring (Mode Madness only)
      if (isMadness) {
        const maxCd = DASH_MADNESS_CD;
        if (this.dashCd > 0) {
          const ringAngle = (1 - this.dashCd / maxCd) * PI2;
          c.save();
          c.strokeStyle = 'rgba(255,180,0,0.75)';
          c.lineWidth = 2.5;
          c.beginPath();
          c.arc(0, 0, P_RAD + 4, -Math.PI / 2, -Math.PI / 2 + ringAngle);
          c.stroke();
          c.restore();
        } else {
          const pulse = 0.3 + Math.sin(time * 8) * 0.2;
          c.save();
          c.strokeStyle = '#ffd700';
          c.shadowColor = '#ffd700';
          c.shadowBlur = 8;
          c.lineWidth = 1.8;
          c.beginPath();
          c.arc(0, 0, P_RAD + 4, 0, PI2);
          c.stroke();
          c.restore();
        }
      }

      // Invulnerability shield (Mode Madness only)
      if (isMadness && this.invuln > 0) {
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
      if ((isPredator || isGodMode) && predTimer > 0) {
        const prog = Math.max(0, Math.min(1, predTimer / (predMaxTimer || 7.0)));
        const arcCol = isGodMode ? '#ffd700' : '#00ffff';
        const r = P_RAD + 8;

        c.save();
        c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(pp.x + ox, pp.y, r, 0, PI2);
        c.stroke();

        c.strokeStyle = arcCol;
        c.shadowColor = isGodMode ? '#00ffff' : arcCol;
        c.shadowBlur = 12;
        c.lineWidth = 3.5;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(pp.x + ox, pp.y, r, -Math.PI / 2, -Math.PI / 2 + prog * PI2);
        c.stroke();

        const headAng = -Math.PI / 2 + prog * PI2;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(pp.x + ox + Math.cos(headAng) * r, pp.y + Math.sin(headAng) * r, 2.8, 0, PI2);
        c.fill();
        c.restore();
      }
    };

    // Upright Floating Overhead HUD Pill directly above Pac-Man (World coordinates)
    const renderOverheadHUD = (ox: number = 0) => {
      if (isGodMode || isPredator || combo.m > 1) {
        c.save();
        const badgeY = pp.y - P_RAD - 15;

        let badgeText = '';
        let badgeIcon = '';
        let badgeCol = '#00ffff';
        let prog = 1;

        if (isGodMode || combo.m >= 32) {
          badgeCol = '#ffd700';
          badgeIcon = 'crown';
          badgeText = `x32 • ${predTimer.toFixed(1)}s`;
          prog = Math.max(0, Math.min(1, predTimer / (predMaxTimer || 7.0)));
        } else if (isPredator) {
          badgeCol = '#00ffff';
          badgeIcon = 'lightning';
          badgeText = combo.m > 1 ? `x${combo.m} • ${predTimer.toFixed(1)}s` : `${predTimer.toFixed(1)}s`;
          prog = Math.max(0, Math.min(1, predTimer / (predMaxTimer || 7.0)));
        } else if (combo.m > 1) {
          const tier = getComboTier(combo.n);
          badgeCol = CC[tier] || '#00ffff';
          badgeIcon = 'flame';
          badgeText = `x${combo.m}`;
          prog = Math.max(0, Math.min(1, combo.t / COMBO_DECAY));
        }

        c.font = 'bold 9.5px monospace';
        const tw = c.measureText(badgeText).width;
        const iconPad = badgeIcon ? 14 : 0;
        const bw = tw + 12 + iconPad;
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

        // Icon & Text
        if (badgeIcon) {
          spriteAtlas.drawIcon(c, badgeIcon, bx + 7, badgeY, 10);
        }
        c.fillStyle = '#ffffff';
        c.textAlign = badgeIcon ? 'left' : 'center';
        c.textBaseline = 'middle';
        c.fillText(badgeText, badgeIcon ? bx + 14 : pp.x + ox, badgeY);

        c.restore();
      }
    };

    renderPlayer(0);
    renderCountdownRing(0);
    renderOverheadHUD(0);

    const cw = this.currentCols * T;
    if (pp.x < P_RAD * 2) {
      renderPlayer(cw);
      renderCountdownRing(cw);
      renderOverheadHUD(cw);
    } else if (pp.x > cw - P_RAD * 2) {
      renderPlayer(-cw);
      renderCountdownRing(-cw);
      renderOverheadHUD(-cw);
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

  public drawChromavoreEntity(
    c: CanvasRenderingContext2D,
    rad: number,
    time: number,
    mouthAnim: number,
    isGodMode: boolean = false,
    isPredator: boolean = false,
    comboMultiplier: number = 1,
    isMadness: boolean = true
  ) {
    Player.drawChromavore(c, rad, time, mouthAnim, isGodMode, isPredator, comboMultiplier, isMadness);
  }

  public static drawChromavore(
    c: CanvasRenderingContext2D,
    rad: number,
    time: number,
    mouthAnim: number,
    isGodMode: boolean = false,
    isPredator: boolean = false,
    comboMultiplier: number = 1,
    isMadness: boolean = true
  ) {
    // Dynamic Chroma palette
    let coreColor = '#00f0ff';
    let carapaceColor = '#100326';
    let accentGlow = '#00ffff';
    let eyeColor = '#00ffff';

    if (isGodMode) {
      coreColor = '#ffffff';
      accentGlow = '#00ffff';
      eyeColor = '#ffffff';
      carapaceColor = '#05182e';
    } else if (isPredator || comboMultiplier >= 16) {
      coreColor = '#ff007f';
      accentGlow = '#ff0055';
      eyeColor = '#ffff00';
      carapaceColor = '#240217';
    } else if (comboMultiplier >= 8) {
      coreColor = '#ffd700';
      accentGlow = '#ffd700';
      eyeColor = '#ffffff';
      carapaceColor = '#1f1602';
    } else if (isMadness) {
      coreColor = '#00f0ff';
      accentGlow = '#00f0ff';
      eyeColor = '#ffffff';
      carapaceColor = '#08021a';
    } else {
      coreColor = '#00ffcc';
      accentGlow = '#00f0ff';
      eyeColor = '#ffffff';
      carapaceColor = '#051515';
    }

    // 1. Dual Rear Ion Thrusters (Flickering propulsion flamelets at -X)
    const thrusterLength = (rad * 0.42) + Math.sin(time * 32) * (rad * 0.22);
    c.save();
    c.fillStyle = coreColor;
    c.shadowColor = accentGlow;
    c.shadowBlur = 8;
    // Upper thruster
    c.beginPath();
    c.moveTo(-rad * 0.65, -rad * 0.35);
    c.lineTo(-rad * 0.65 - thrusterLength, -rad * 0.22);
    c.lineTo(-rad * 0.65, -rad * 0.08);
    c.closePath();
    c.fill();
    // Lower thruster
    c.beginPath();
    c.moveTo(-rad * 0.65, rad * 0.08);
    c.lineTo(-rad * 0.65 - thrusterLength, rad * 0.22);
    c.lineTo(-rad * 0.65, rad * 0.35);
    c.closePath();
    c.fill();
    c.restore();

    // 2. Aerodynamic Cyber Carapace (Layered Biomechanical Shell)
    c.save();
    c.fillStyle = carapaceColor;
    c.strokeStyle = accentGlow;
    c.lineWidth = 1.6;
    c.shadowColor = accentGlow;
    c.shadowBlur = 10;

    c.beginPath();
    c.moveTo(rad * 0.45, -rad * 0.75);
    c.quadraticCurveTo(-rad * 0.2, -rad * 0.95, -rad * 0.75, -rad * 0.45);
    c.lineTo(-rad * 0.75, rad * 0.45);
    c.quadraticCurveTo(-rad * 0.2, rad * 0.95, rad * 0.45, rad * 0.75);
    c.lineTo(rad * 0.2, 0);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    // 3. Articulated Plasma Mandibles (The Devourer Maw at +X)
    const jawSpread = 0.24 + Math.abs(Math.sin(mouthAnim)) * 0.58;
    const upperJawY = -Math.sin(jawSpread) * (rad * 0.95);
    const lowerJawY = Math.sin(jawSpread) * (rad * 0.95);
    const jawTipX = rad * 1.18;

    c.save();
    c.fillStyle = coreColor;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    c.shadowColor = accentGlow;
    c.shadowBlur = 12;

    // Upper Plasma Mandible
    c.beginPath();
    c.moveTo(rad * 0.35, -rad * 0.65);
    c.quadraticCurveTo(rad * 0.8, upperJawY * 1.15, jawTipX, upperJawY);
    c.lineTo(rad * 0.75, upperJawY * 0.5);
    c.quadraticCurveTo(rad * 0.4, -rad * 0.25, rad * 0.1, -rad * 0.15);
    c.closePath();
    c.fill();
    c.stroke();

    // Lower Plasma Mandible
    c.beginPath();
    c.moveTo(rad * 0.35, rad * 0.65);
    c.quadraticCurveTo(rad * 0.8, lowerJawY * 1.15, jawTipX, lowerJawY);
    c.lineTo(rad * 0.75, lowerJawY * 0.5);
    c.quadraticCurveTo(rad * 0.4, rad * 0.25, rad * 0.1, rad * 0.15);
    c.closePath();
    c.fill();
    c.stroke();

    // Suction Core Singularity (inward light vortex in the throat)
    const vortexPulse = 0.6 + Math.sin(time * 20) * 0.3;
    c.fillStyle = isGodMode ? '#ffffff' : coreColor;
    c.beginPath();
    c.ellipse(rad * 0.2, 0, Math.max(0.1, rad * 0.28 * vortexPulse), Math.max(0.1, rad * 0.45 * Math.sin(jawSpread)), 0, 0, PI2);
    c.fill();
    c.restore();

    // 4. Chroma Core (Central Pulsing Singularity Nucleus)
    const corePulse = 1 + Math.sin(time * 14) * 0.15;
    c.save();
    c.shadowColor = accentGlow;
    c.shadowBlur = 16;
    c.fillStyle = coreColor;
    c.beginPath();
    c.arc(-rad * 0.1, 0, rad * 0.38 * corePulse, 0, PI2);
    c.fill();

    // Inner incandescent white hot-spot
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-rad * 0.1, 0, rad * 0.18, 0, PI2);
    c.fill();
    c.restore();

    // 5. Predatory Cyber-Optic Visor
    c.save();
    c.fillStyle = eyeColor;
    c.shadowColor = eyeColor;
    c.shadowBlur = 10;
    c.beginPath();
    c.moveTo(rad * 0.1, -rad * 0.38);
    c.lineTo(rad * 0.45, -rad * 0.22);
    c.lineTo(rad * 0.4, -rad * 0.08);
    c.lineTo(rad * 0.05, -rad * 0.24);
    c.closePath();
    c.fill();
    c.restore();
  }

  public drawBonusPacman(c: CanvasRenderingContext2D, px: number, py: number, time: number, angle: number) {
    c.save();
    c.translate(px, py);

    // High-contrast isolation backing (guarantees visibility against any density of colored ghosts)
    c.fillStyle = '#050114';
    c.beginPath();
    c.arc(0, 0, 11, 0, PI2);
    c.fill();

    // Outer plasma pulse ring
    const ringPulse = 1 + Math.sin(time * 15) * 0.15;
    c.strokeStyle = '#00ffff';
    c.shadowColor = '#00ffff';
    c.shadowBlur = 12;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 10 * ringPulse, 0, PI2);
    c.stroke();
    c.shadowBlur = 0;

    c.rotate(angle);
    this.drawChromavoreEntity(
      c,
      10,
      time,
      time * 18,
      false,
      true,
      32,
      true
    );

    c.restore();
  }
}
